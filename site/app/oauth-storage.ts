import type { D1DatabaseLike } from "./inventory-reservations";
import type { OAuthProvider, VerifiedProviderIdentity } from "./oauth";

const encoder = new TextEncoder();
const base64Url = (bytes: Uint8Array) => {
  let binary = "";
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
};
const randomToken = (bytes: number) => { const value = new Uint8Array(bytes); crypto.getRandomValues(value); return base64Url(value); };
const hash = async (value: string) => base64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))));

export type OAuthAttempt = {
  id: string;
  provider: OAuthProvider;
  role: "customer" | "seller";
  intent: "login" | "link";
  linkEmail: string | null;
  returnTo: string;
  nonce: string;
  codeVerifier: string;
};

export async function createOAuthAttempt(db: D1DatabaseLike, input: { provider: OAuthProvider; role: "customer" | "seller"; intent: "login" | "link"; linkEmail?: string | null; returnTo: string; now?: Date }) {
  const state = randomToken(32); const binding = randomToken(32); const nonce = randomToken(32); const codeVerifier = randomToken(64);
  const codeChallenge = base64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(codeVerifier))));
  const now = input.now ?? new Date();
  await db.prepare(`INSERT INTO auth_oauth_states (id, state_hash, binding_hash, nonce_hash, provider, code_verifier, role, intent, link_email, return_to, expires_at, used_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`).bind(
      crypto.randomUUID(), await hash(state), await hash(binding), await hash(nonce), input.provider, codeVerifier, input.role, input.intent, input.linkEmail ?? null, input.returnTo,
      new Date(now.getTime() + 10 * 60 * 1000).toISOString(), now.toISOString(),
    ).run();
  await db.prepare("DELETE FROM auth_oauth_states WHERE expires_at < ?").bind(new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()).run().catch(() => undefined);
  return { state, binding, nonce, codeVerifier, codeChallenge };
}

export async function consumeOAuthAttempt(db: D1DatabaseLike, input: { provider: OAuthProvider; state: string; binding: string; nonce: string; now?: Date }): Promise<OAuthAttempt | null> {
  const now = input.now ?? new Date();
  const row = await db.prepare(`UPDATE auth_oauth_states SET used_at = ?
    WHERE state_hash = ? AND binding_hash = ? AND nonce_hash = ? AND provider = ? AND used_at IS NULL AND expires_at > ?
    RETURNING id, provider, role, intent, link_email AS linkEmail, return_to AS returnTo, code_verifier AS codeVerifier`)
    .bind(now.toISOString(), await hash(input.state), await hash(input.binding), await hash(input.nonce), input.provider, now.toISOString())
    .first<Omit<OAuthAttempt, "nonce">>();
  return row ? { ...row, nonce: input.nonce } : null;
}

export async function createPendingOAuthProfile(db: D1DatabaseLike, input: { identity: VerifiedProviderIdentity; provider: OAuthProvider; role: "customer" | "seller"; returnTo: string; encryptedRefreshToken?: string | null; now?: Date }) {
  const token = randomToken(32); const now = input.now ?? new Date();
  await db.prepare(`INSERT INTO auth_oauth_pending_profiles (id, token_hash, provider, provider_subject, email, name, role, return_to, encrypted_refresh_token, expires_at, used_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)
    ON CONFLICT(provider, provider_subject) DO UPDATE SET id = excluded.id, token_hash = excluded.token_hash,
      email = excluded.email, name = excluded.name, role = excluded.role, return_to = excluded.return_to,
      encrypted_refresh_token = excluded.encrypted_refresh_token, expires_at = excluded.expires_at,
      used_at = NULL, created_at = excluded.created_at`).bind(
      crypto.randomUUID(), await hash(token), input.provider, input.identity.subject, input.identity.email, input.identity.name, input.role, input.returnTo,
      input.encryptedRefreshToken ?? null, new Date(now.getTime() + 15 * 60 * 1000).toISOString(), now.toISOString(),
    ).run();
  await db.prepare("DELETE FROM auth_oauth_pending_profiles WHERE expires_at < ?").bind(new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()).run().catch(() => undefined);
  return token;
}

export type PendingOAuthProfile = { id: string; provider: OAuthProvider; providerSubject: string; email: string; name: string; role: "customer" | "seller"; returnTo: string; encryptedRefreshToken: string | null };

export async function consumePendingOAuthProfile(db: D1DatabaseLike, token: string, now = new Date()): Promise<PendingOAuthProfile | null> {
  return db.prepare(`UPDATE auth_oauth_pending_profiles SET used_at = ? WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?
    RETURNING id, provider, provider_subject AS providerSubject, email, name, role, return_to AS returnTo, encrypted_refresh_token AS encryptedRefreshToken`)
    .bind(now.toISOString(), await hash(token), now.toISOString()).first<PendingOAuthProfile>();
}
