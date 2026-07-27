import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type StylishMeUser = { displayName: string; email: string; fullName: string; avatarUrl: string };

const COOKIE = "stylishme_session";
const SESSION_SECONDS = 60 * 60 * 24 * 30;
const encoder = new TextEncoder();
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
    env.DB.prepare("CREATE TABLE IF NOT EXISTS auth_accounts (email TEXT PRIMARY KEY, name TEXT NOT NULL, password_hash TEXT NOT NULL, password_salt TEXT NOT NULL, avatar_key TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS auth_sessions (token_hash TEXT PRIMARY KEY, email TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY (email) REFERENCES auth_accounts(email) ON DELETE CASCADE)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS auth_sessions_email_idx ON auth_sessions(email)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS auth_sessions_expiry_idx ON auth_sessions(expires_at)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS auth_attempts (attempt_key TEXT PRIMARY KEY, attempt_count INTEGER NOT NULL, window_start TEXT NOT NULL)"),
  ]);
}

export async function createPasswordHash(password: string, salt = randomToken(18)) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: encoder.encode(salt), iterations: 210_000 }, key, 256);
  return { hash: base64(new Uint8Array(bits)), salt };
}

export async function passwordMatches(password: string, salt: string, expected: string) {
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

export async function consumeAuthAttempt(request: Request, email: string, limit: number) {
  await ensureAuthTables();
  const env = await runtime();
  const address = request.headers.get("cf-connecting-ip") ?? "unknown";
  const key = await digest(`${address}:${email.toLowerCase()}`);
  const now = Date.now();
  const row = await env.DB.prepare("SELECT attempt_count, window_start FROM auth_attempts WHERE attempt_key = ?").bind(key).first() as { attempt_count: number; window_start: string } | null;
  const active = row && now - new Date(row.window_start).getTime() < 15 * 60 * 1000;
  const count = active ? row.attempt_count + 1 : 1;
  const windowStart = active ? row.window_start : new Date(now).toISOString();
  await env.DB.prepare("INSERT INTO auth_attempts (attempt_key, attempt_count, window_start) VALUES (?, ?, ?) ON CONFLICT(attempt_key) DO UPDATE SET attempt_count = excluded.attempt_count, window_start = excluded.window_start").bind(key, count, windowStart).run();
  return count <= limit;
}

export async function clearAuthAttempts(request: Request, email: string) {
  const env = await runtime();
  const address = request.headers.get("cf-connecting-ip") ?? "unknown";
  await env.DB.prepare("DELETE FROM auth_attempts WHERE attempt_key = ?").bind(await digest(`${address}:${email.toLowerCase()}`)).run();
}

export async function getStylishMeUser(): Promise<StylishMeUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  await ensureAuthTables();
  const env = await runtime();
  const row = await env.DB.prepare("SELECT a.email, a.name, a.avatar_key FROM auth_sessions s JOIN auth_accounts a ON a.email = s.email WHERE s.token_hash = ? AND s.expires_at > ? LIMIT 1")
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
