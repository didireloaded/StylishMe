import { env } from "cloudflare:workers";

import { buildAuthorizationUrl, currentOAuthConfig, type OAuthProvider } from "../../../../../oauth";
import { createOAuthAttempt } from "../../../../../oauth-storage";
import { consumeAuthAttempt, ensureAuthTables, getStylishMeUser, passwordMatches, safeRelativeReturnPath } from "../../../../../stylishme-auth";

const providerFrom = (value: string): OAuthProvider | null => value === "google" || value === "apple" ? value : null;
const noStore = { "cache-control": "no-store" };

export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  try {
    const provider = providerFrom((await params).provider);
    if (!provider) return new Response(null, { status: 404 });
    const user = await getStylishMeUser();
    if (!user) return Response.json({ error: "Sign in again to connect an account" }, { status: 401, headers: noStore });
    const body = await request.json() as { password?: unknown; returnTo?: unknown };
    const password = typeof body.password === "string" ? body.password : "";
    if (!await consumeAuthAttempt(request, `${provider}:${user.email}`, 5, "oauth")) return Response.json({ error: "Too many attempts. Try again later." }, { status: 429, headers: noStore });
    await ensureAuthTables();
    const account = await env.DB.prepare("SELECT password_hash AS passwordHash, password_salt AS passwordSalt, deleted_at AS deletedAt FROM auth_accounts WHERE email = ? LIMIT 1")
      .bind(user.email).first() as { passwordHash: string; passwordSalt: string; deletedAt: string | null } | null;
    if (!account || account.deletedAt || !await passwordMatches(password, account.passwordSalt, account.passwordHash)) return Response.json({ error: "Password is incorrect" }, { status: 401, headers: noStore });
    const alreadyLinked = await env.DB.prepare("SELECT id FROM auth_identities WHERE account_email = ? AND provider = ? LIMIT 1").bind(user.email, provider).first();
    if (alreadyLinked) return Response.json({ error: `${provider === "google" ? "Google" : "Apple"} is already connected` }, { status: 409, headers: noStore });
    const config = currentOAuthConfig(provider);
    if (!config.available) return Response.json({ error: `${provider === "google" ? "Google" : "Apple"} connection is unavailable` }, { status: 503, headers: noStore });
    const returnTo = safeRelativeReturnPath(typeof body.returnTo === "string" ? body.returnTo : "/?view=settings");
    const attempt = await createOAuthAttempt(env.DB, { provider, role: "customer", intent: "link", linkEmail: user.email, returnTo });
    const headers = new Headers({ ...noStore });
    headers.append("set-cookie", `stylishme_oauth_${provider}=${attempt.binding}.${attempt.nonce}; Path=/api/auth/oauth/${provider}/callback; Max-Age=600; HttpOnly; Secure; SameSite=None`);
    return Response.json({ authorizationUrl: buildAuthorizationUrl(config, attempt) }, { headers });
  } catch { return Response.json({ error: "Unable to connect this account right now" }, { status: 500, headers: noStore }); }
}
