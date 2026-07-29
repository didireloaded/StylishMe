import { env } from "cloudflare:workers";

import { createSession, ensureAuthTables, safeRelativeReturnPath } from "../../../../../stylishme-auth";
import { currentOAuthConfig, encryptProviderCredential, exchangeAuthorizationCode, type OAuthProvider, verifyProviderIdToken } from "../../../../../oauth";
import { consumeOAuthAttempt, createPendingOAuthProfile } from "../../../../../oauth-storage";

const providerFrom = (value: string): OAuthProvider | null => value === "google" || value === "apple" ? value : null;
const noStore = { "cache-control": "no-store", "referrer-policy": "no-referrer" };
const cookieValue = (request: Request, name: string) => request.headers.get("cookie")?.split(";").map(value => value.trim()).find(value => value.startsWith(`${name}=`))?.slice(name.length + 1) ?? "";
const cleanCookie = (provider: OAuthProvider) => `stylishme_oauth_${provider}=; Path=/api/auth/oauth/${provider}/callback; Max-Age=0; HttpOnly; Secure; SameSite=None`;
const redirectTo = (location: string, provider: OAuthProvider, sessionCookie?: string, extraCookie?: string) => {
  const headers = new Headers({ ...noStore, location });
  headers.append("set-cookie", cleanCookie(provider));
  if (sessionCookie) headers.append("set-cookie", sessionCookie);
  if (extraCookie) headers.append("set-cookie", extraCookie);
  return new Response(null, { status: 303, headers });
};
const oauthFailure = (provider: OAuthProvider, reason = "oauth-error") => redirectTo(`/login?reason=${reason}`, provider);
const cleanAppleName = (value: string) => {
  try {
    const input = JSON.parse(value) as { name?: { firstName?: unknown; lastName?: unknown } };
    return [input.name?.firstName, input.name?.lastName].filter(part => typeof part === "string").join(" ").trim().replace(/[\u0000-\u001f]/g, "").slice(0, 80);
  } catch { return ""; }
};

async function callbackInput(request: Request) {
  if (request.method === "POST") {
    const form = await request.formData();
    return { code: String(form.get("code") ?? ""), state: String(form.get("state") ?? ""), error: String(form.get("error") ?? ""), user: String(form.get("user") ?? "") };
  }
  const url = new URL(request.url);
  return { code: url.searchParams.get("code") ?? "", state: url.searchParams.get("state") ?? "", error: url.searchParams.get("error") ?? "", user: "" };
}

async function handle(request: Request, rawProvider: string) {
  const provider = providerFrom(rawProvider);
  if (!provider) return new Response(null, { status: 404 });
  try {
    const input = await callbackInput(request);
    if (input.error) return oauthFailure(provider, "oauth-cancelled");
    if (!input.code || input.code.length > 4_096 || !input.state || input.state.length > 512) return oauthFailure(provider);
    const browserState = cookieValue(request, `stylishme_oauth_${provider}`).split(".");
    if (browserState.length !== 2) return oauthFailure(provider);
    await ensureAuthTables();
    const attempt = await consumeOAuthAttempt(env.DB, { provider, state: input.state, binding: browserState[0], nonce: browserState[1] });
    if (!attempt) return oauthFailure(provider);
    const config = currentOAuthConfig(provider);
    const tokens = await exchangeAuthorizationCode(config, { code: input.code, codeVerifier: attempt.codeVerifier });
    let identity = await verifyProviderIdToken(tokens.idToken, config, attempt.nonce);
    const appleName = provider === "apple" ? cleanAppleName(input.user) : "";
    if (appleName) identity = { ...identity, name: appleName };
    if (provider === "apple" && !tokens.refreshToken) return oauthFailure(provider);
    const encryptedRefreshToken = provider === "apple" && tokens.refreshToken ? await encryptProviderCredential(tokens.refreshToken, config.credentialEncryptionKey) : null;
    const linked = await env.DB.prepare(`SELECT i.id, i.account_email AS email, a.deleted_at AS deletedAt FROM auth_identities i
      JOIN auth_accounts a ON a.email = i.account_email WHERE i.provider = ? AND i.provider_subject = ? LIMIT 1`)
      .bind(provider, identity.subject).first() as { id: string; email: string; deletedAt: string | null } | null;
    if (linked) {
      if (linked.deletedAt) return oauthFailure(provider, "account-inactive");
      const now = new Date().toISOString();
      const statements = [
        env.DB.prepare("UPDATE auth_identities SET provider_email = ?, last_used_at = ? WHERE id = ?").bind(identity.email, now, linked.id),
        env.DB.prepare("UPDATE account_deletion_requests SET status = 'cancelled' WHERE account_email = ? AND status = 'pending'").bind(linked.email),
      ];
      if (encryptedRefreshToken) statements.push(env.DB.prepare(`INSERT INTO auth_provider_credentials (identity_id, encrypted_refresh_token, created_at, updated_at) VALUES (?, ?, ?, ?)
        ON CONFLICT(identity_id) DO UPDATE SET encrypted_refresh_token = excluded.encrypted_refresh_token, updated_at = excluded.updated_at`).bind(linked.id, encryptedRefreshToken, now, now));
      await env.DB.batch(statements);
      const session = await createSession(linked.email);
      return redirectTo(attempt.returnTo, provider, session.cookie);
    }
    if (attempt.intent === "link" && attempt.linkEmail) {
      const account = await env.DB.prepare("SELECT email, deleted_at AS deletedAt FROM auth_accounts WHERE email = ? LIMIT 1").bind(attempt.linkEmail).first() as { email: string; deletedAt: string | null } | null;
      if (!account || account.deletedAt) return oauthFailure(provider, "account-inactive");
      const now = new Date().toISOString(); const identityId = crypto.randomUUID();
      const statements = [env.DB.prepare("INSERT INTO auth_identities (id, account_email, provider, provider_subject, provider_email, created_at, last_used_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(identityId, account.email, provider, identity.subject, identity.email, now, now)];
      if (encryptedRefreshToken) statements.push(env.DB.prepare("INSERT INTO auth_provider_credentials (identity_id, encrypted_refresh_token, created_at, updated_at) VALUES (?, ?, ?, ?)").bind(identityId, encryptedRefreshToken, now, now));
      await env.DB.batch(statements);
      const session = await createSession(account.email);
      return redirectTo(safeRelativeReturnPath(attempt.returnTo), provider, session.cookie);
    }
    const accountWithEmail = await env.DB.prepare("SELECT email FROM auth_accounts WHERE email = ? LIMIT 1").bind(identity.email).first();
    if (accountWithEmail) return oauthFailure(provider, "account-link-required");
    const pendingToken = await createPendingOAuthProfile(env.DB, { identity, provider, role: attempt.role, returnTo: attempt.returnTo, encryptedRefreshToken });
    return redirectTo("/complete-profile", provider, undefined, `stylishme_oauth_profile=${pendingToken}; Path=/; Max-Age=900; HttpOnly; Secure; SameSite=Lax`);
  } catch { return oauthFailure(provider); }
}

export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  return handle(request, (await params).provider);
}

export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  return handle(request, (await params).provider);
}
