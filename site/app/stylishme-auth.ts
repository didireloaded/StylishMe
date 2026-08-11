import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type StylishMeUser = { displayName: string; email: string; fullName: string; avatarUrl: string };

const COOKIE = "stylishme_session";
const SESSION_SECONDS = 60 * 60 * 24 * 30;
const encoder = new TextEncoder();
export const PASSWORD_HASH_ITERATIONS = 100_000;
const runtime = async () => (await import("cloudflare:workers")).env;

const base64 = (bytes: Uint8Array) => {
  let binary = "";
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary);
};
const randomToken = (length: number) => { const bytes = new Uint8Array(length); crypto.getRandomValues(bytes); return base64(bytes).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", ""); };
const digest = async (value: string) => base64(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))));

export async function ensureAuthTables() {
  const env = await runtime();
  await env.DB.batch([
    env.DB.prepare("CREATE TABLE IF NOT EXISTS auth_accounts (email TEXT PRIMARY KEY, name TEXT NOT NULL, password_hash TEXT NOT NULL, password_salt TEXT NOT NULL, avatar_key TEXT NOT NULL, email_verified_at TEXT, deleted_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS auth_sessions (token_hash TEXT PRIMARY KEY, email TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY (email) REFERENCES auth_accounts(email) ON DELETE CASCADE)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS auth_sessions_email_idx ON auth_sessions(email)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS auth_sessions_expiry_idx ON auth_sessions(expires_at)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS auth_attempts (attempt_key TEXT PRIMARY KEY, attempt_count INTEGER NOT NULL, window_start TEXT NOT NULL)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS auth_identities (id TEXT PRIMARY KEY, account_email TEXT NOT NULL, provider TEXT NOT NULL, provider_subject TEXT NOT NULL, provider_email TEXT, created_at TEXT NOT NULL, last_used_at TEXT NOT NULL, UNIQUE(provider, provider_subject))"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS auth_action_tokens (id TEXT PRIMARY KEY, account_email TEXT NOT NULL, token_hash TEXT NOT NULL UNIQUE, action TEXT NOT NULL, expires_at TEXT NOT NULL, used_at TEXT, created_at TEXT NOT NULL)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS auth_action_tokens_expiry_idx ON auth_action_tokens(action, expires_at)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS account_deletion_requests (id TEXT PRIMARY KEY, account_email TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', requested_at TEXT NOT NULL, scheduled_for TEXT NOT NULL, completed_at TEXT, UNIQUE(account_email, status))"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS account_deletion_requests_schedule_idx ON account_deletion_requests(status, scheduled_for)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS auth_oauth_states (id TEXT PRIMARY KEY, state_hash TEXT NOT NULL UNIQUE, binding_hash TEXT NOT NULL, nonce_hash TEXT NOT NULL, provider TEXT NOT NULL, code_verifier TEXT NOT NULL, role TEXT NOT NULL, intent TEXT NOT NULL, link_email TEXT, return_to TEXT NOT NULL, expires_at TEXT NOT NULL, used_at TEXT, created_at TEXT NOT NULL)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS auth_oauth_pending_profiles (id TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE, provider TEXT NOT NULL, provider_subject TEXT NOT NULL, email TEXT NOT NULL, name TEXT NOT NULL DEFAULT '', role TEXT NOT NULL, return_to TEXT NOT NULL, encrypted_refresh_token TEXT, expires_at TEXT NOT NULL, used_at TEXT, created_at TEXT NOT NULL, UNIQUE(provider, provider_subject))"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS auth_provider_credentials (identity_id TEXT PRIMARY KEY, encrypted_refresh_token TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"),
  ]);
}

export async function createPasswordHash(password: string, salt = randomToken(18)) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: encoder.encode(salt), iterations: PASSWORD_HASH_ITERATIONS }, key, 256);
  return { hash: base64(new Uint8Array(bits)), salt };
}

export async function passwordMatches(password: string, salt: string, expected: string) {
  if (!salt || !expected) return false;
  const { hash } = await createPasswordHash(password, salt);
  if (hash.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < hash.length; index += 1) difference |= hash.charCodeAt(index) ^ expected.charCodeAt(index);
  return difference === 0;
}

export async function createSession(email: string) {
  await ensureAuthTables();
  const env = await runtime();
  const token = randomToken(32);
  const tokenHash = await digest(token);
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_SECONDS * 1000);
  await env.DB.prepare("INSERT INTO auth_sessions (token_hash, email, expires_at, created_at) VALUES (?, ?, ?, ?)").bind(tokenHash, email, expires.toISOString(), now.toISOString()).run();
  return { token, cookie: `${COOKIE}=${token}; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Lax` };
}

export async function destroySession(token: string | undefined) {
  if (!token) return;
  await ensureAuthTables();
  const env = await runtime();
  await env.DB.prepare("DELETE FROM auth_sessions WHERE token_hash = ?").bind(await digest(token)).run();
}

export const expiredSessionCookie = () => `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;

type AuthAttemptScope = "login" | "signup" | "recovery" | "oauth";
const AUTH_WINDOW_MS = 15 * 60 * 1000;
const AUTH_COUNTER_RETENTION_MS = 24 * 60 * 60 * 1000;

async function incrementAuthAttempt(
  env: Awaited<ReturnType<typeof runtime>>,
  key: string,
  now: string,
  windowCutoff: string,
) {
  const row = await env.DB.prepare("INSERT INTO auth_attempts (attempt_key, attempt_count, window_start) VALUES (?, 1, ?) ON CONFLICT(attempt_key) DO UPDATE SET attempt_count = CASE WHEN window_start < ? THEN 1 ELSE attempt_count + 1 END, window_start = CASE WHEN window_start < ? THEN excluded.window_start ELSE window_start END RETURNING attempt_count")
    .bind(key, now, windowCutoff, windowCutoff)
    .first() as { attempt_count: number } | null;
  return Number(row?.attempt_count ?? Number.MAX_SAFE_INTEGER);
}

export async function consumeAuthAttempt(request: Request, email: string, limit: number, scope: AuthAttemptScope = "login") {
  await ensureAuthTables();
  const env = await runtime();
  const address = request.headers.get("cf-connecting-ip") ?? "unknown";
  const normalizedEmail = email.trim().toLowerCase();
  const nowMs = Date.now();
  const now = new Date(nowMs).toISOString();
  const windowCutoff = new Date(nowMs - AUTH_WINDOW_MS).toISOString();
  const identityKey = await digest(`${scope}:identity:${address}:${normalizedEmail}`);
  const ipKey = await digest(`${scope}:ip:${address}`);
  const ipLimit = scope === "signup" ? 20 : 100;
  const [identityCount, ipCount] = await Promise.all([
    incrementAuthAttempt(env, identityKey, now, windowCutoff),
    incrementAuthAttempt(env, ipKey, now, windowCutoff),
  ]);
  const retentionCutoff = new Date(nowMs - AUTH_COUNTER_RETENTION_MS).toISOString();
  await env.DB.prepare("DELETE FROM auth_attempts WHERE window_start < ?").bind(retentionCutoff).run().catch(() => undefined);
  return identityCount <= limit && ipCount <= ipLimit;
}

export async function clearAuthAttempts(request: Request, email: string, scope: AuthAttemptScope = "login") {
  const env = await runtime();
  const address = request.headers.get("cf-connecting-ip") ?? "unknown";
  const key = await digest(`${scope}:identity:${address}:${email.trim().toLowerCase()}`);
  await env.DB.prepare("DELETE FROM auth_attempts WHERE attempt_key = ?").bind(key).run();
}
export async function getStylishMeUser(): Promise<StylishMeUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  await ensureAuthTables();
  const env = await runtime();
  const row = await env.DB.prepare("SELECT a.email, a.name, a.avatar_key FROM auth_sessions s JOIN auth_accounts a ON a.email = s.email WHERE s.token_hash = ? AND s.expires_at > ? AND a.email_verified_at IS NOT NULL AND a.deleted_at IS NULL LIMIT 1")
    .bind(await digest(token), new Date().toISOString()).first() as { email: string; name: string; avatar_key: string } | null;
  if (!row) return null;
  return { email: row.email, fullName: row.name, displayName: row.name, avatarUrl: "/api/auth/avatar" };
}

export async function requireStylishMeUser(returnTo: string): Promise<StylishMeUser> {
  const user = await getStylishMeUser();
  if (user) return user;
  redirect(`/login?returnTo=${encodeURIComponent(safeRelativeReturnPath(returnTo))}`);
}

export function safeRelativeReturnPath(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  try {
    const url = new URL(value, "https://stylishme.local");
    if (url.origin !== "https://stylishme.local" || ["/login", "/api/auth/logout"].includes(url.pathname)) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return "/"; }
}

export async function currentSessionToken() { return (await cookies()).get(COOKIE)?.value; }
