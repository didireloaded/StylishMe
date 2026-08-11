import type { D1DatabaseLike } from "./inventory-reservations";
import { createPasswordHash } from "./stylishme-auth";
import { sendTransactionalEmail, type EmailConfig } from "./transactional-email";
import { scheduleStoreClosure } from "./store-closure";
import { checkAccountDeletionEligibility } from "./account-deletion";
import { recoveryDeadline } from "./account-lifecycle";

type AuthAction = "verify_email" | "reset_password" | "confirm_deletion" | "confirm_store_closure";
const encoder = new TextEncoder();
const base64 = (bytes: Uint8Array) => {
  let value = "";
  bytes.forEach(byte => { value += String.fromCharCode(byte); });
  return btoa(value).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
};
const randomToken = () => { const bytes = new Uint8Array(32); crypto.getRandomValues(bytes); return base64(bytes); };
const tokenHash = async (value: string) => base64(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))));

async function issueToken(db: D1DatabaseLike, email: string, action: AuthAction, now: Date, ttlMinutes: number) {
  const raw = randomToken();
  const hash = await tokenHash(raw);
  const timestamp = now.toISOString();
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60_000).toISOString();
  await db.batch([
    db.prepare("DELETE FROM auth_action_tokens WHERE account_email = ? AND action = ? AND used_at IS NULL").bind(email, action),
    db.prepare(`INSERT INTO auth_action_tokens (id, account_email, token_hash, action, expires_at, used_at, created_at)
      VALUES (?, ?, ?, ?, ?, NULL, ?)`).bind(crypto.randomUUID(), email, hash, action, expiresAt, timestamp),
  ]);
  return raw;
}

async function consumeToken(db: D1DatabaseLike, raw: unknown, action: AuthAction, now: Date, statements: (email: string, marker: string) => ReturnType<D1DatabaseLike["prepare"]>[]) {
  const token = typeof raw === "string" ? raw.trim() : "";
  if (!/^[a-zA-Z0-9_-]{30,100}$/.test(token)) return false;
  const hash = await tokenHash(token);
  const timestamp = now.toISOString();
  const row = await db.prepare(`SELECT account_email FROM auth_action_tokens
    WHERE token_hash = ? AND action = ? AND used_at IS NULL AND expires_at > ? LIMIT 1`).bind(hash, action, timestamp).first<{ account_email: string }>();
  if (!row) return false;
  const marker = `${timestamp}:${crypto.randomUUID()}`;
  await db.batch([
    db.prepare(`UPDATE auth_action_tokens SET used_at = ?
      WHERE token_hash = ? AND action = ? AND used_at IS NULL AND expires_at > ?`).bind(marker, hash, action, timestamp),
    ...statements(row.account_email, marker),
  ]);
  const consumed = await db.prepare("SELECT used_at FROM auth_action_tokens WHERE token_hash = ? LIMIT 1").bind(hash).first<{ used_at: string | null }>();
  return consumed?.used_at === marker;
}

export async function requestEmailVerification(db: D1DatabaseLike, email: string, config: EmailConfig, fetcher: typeof fetch = fetch, now = new Date()) {
  const normalized = email.trim().toLowerCase();
  const account = await db.prepare("SELECT email, email_verified_at, deleted_at FROM auth_accounts WHERE email = ? LIMIT 1")
    .bind(normalized).first<{ email: string; email_verified_at: string | null; deleted_at: string | null }>();
  if (!account || account.email_verified_at || account.deleted_at) return { sent: false };
  const token = await issueToken(db, account.email, "verify_email", now, 24 * 60);
  const link = `${config.publicOrigin}/api/auth/verification/confirm?token=${encodeURIComponent(token)}`;
  try {
    await sendTransactionalEmail(config, { to: account.email, subject: "Verify your StylishMe email", text: `Verify your email: ${link}` }, fetcher);
    return { sent: true };
  } catch (error) {
    await db.prepare("DELETE FROM auth_action_tokens WHERE token_hash = ?").bind(await tokenHash(token)).run().catch(() => undefined);
    throw error;
  }
}

export async function confirmEmailVerification(db: D1DatabaseLike, rawToken: unknown, now = new Date()) {
  const timestamp = now.toISOString();
  return consumeToken(db, rawToken, "verify_email", now, (email, marker) => [
    db.prepare(`UPDATE auth_accounts SET email_verified_at = ?, updated_at = ? WHERE email = ?
      AND EXISTS (SELECT 1 FROM auth_action_tokens WHERE account_email = ? AND action = 'verify_email' AND used_at = ?)`)
      .bind(timestamp, timestamp, email, email, marker),
  ]);
}

export async function requestPasswordReset(db: D1DatabaseLike, email: string, config: EmailConfig, fetcher: typeof fetch = fetch, now = new Date()) {
  const normalized = email.trim().toLowerCase();
  const account = await db.prepare("SELECT email FROM auth_accounts WHERE email = ? AND email_verified_at IS NOT NULL AND deleted_at IS NULL LIMIT 1")
    .bind(normalized).first<{ email: string }>();
  if (!account) return { sent: false };
  const token = await issueToken(db, account.email, "reset_password", now, 30);
  const link = `${config.publicOrigin}/reset-password?token=${encodeURIComponent(token)}`;
  try {
    await sendTransactionalEmail(config, { to: account.email, subject: "Reset your StylishMe password", text: `Reset your password: ${link}\nThis link expires in 30 minutes.` }, fetcher);
    return { sent: true };
  } catch (error) {
    await db.prepare("DELETE FROM auth_action_tokens WHERE token_hash = ?").bind(await tokenHash(token)).run().catch(() => undefined);
    throw error;
  }
}

export async function resetPasswordWithToken(db: D1DatabaseLike, rawToken: unknown, password: unknown, now = new Date()) {
  const value = typeof password === "string" ? password : "";
  if (new TextEncoder().encode(value).byteLength > 256 || value.length < 10 || !/[A-Za-z]/.test(value) || !/\d/.test(value)) return false;
  const token = typeof rawToken === "string" ? rawToken.trim() : "";
  if (!/^[a-zA-Z0-9_-]{30,100}$/.test(token)) return false;
  const hash = await tokenHash(token);
  const timestamp = now.toISOString();
  const valid = await db.prepare(`SELECT account_email FROM auth_action_tokens
    WHERE token_hash = ? AND action = 'reset_password' AND used_at IS NULL AND expires_at > ? LIMIT 1`)
    .bind(hash, timestamp).first<{ account_email: string }>();
  if (!valid) return false;
  const passwordRecord = await createPasswordHash(value);
  const marker = `${timestamp}:${crypto.randomUUID()}`;
  await db.batch([
    db.prepare(`UPDATE auth_action_tokens SET used_at = ?
      WHERE token_hash = ? AND action = 'reset_password' AND used_at IS NULL AND expires_at > ?`).bind(marker, hash, timestamp),
    db.prepare(`UPDATE auth_accounts SET password_hash = ?, password_salt = ?, updated_at = ? WHERE email = ?
      AND EXISTS (SELECT 1 FROM auth_action_tokens WHERE account_email = ? AND action = 'reset_password' AND used_at = ?)`)
      .bind(passwordRecord.hash, passwordRecord.salt, timestamp, valid.account_email, valid.account_email, marker),
    db.prepare(`DELETE FROM auth_sessions WHERE email = ? AND EXISTS
      (SELECT 1 FROM auth_action_tokens WHERE account_email = ? AND action = 'reset_password' AND used_at = ?)`)
      .bind(valid.account_email, valid.account_email, marker),
  ]);
  const consumed = await db.prepare("SELECT used_at FROM auth_action_tokens WHERE token_hash = ? LIMIT 1")
    .bind(hash).first<{ used_at: string | null }>();
  return consumed?.used_at === marker;
}

export async function requestAccountDeletionConfirmation(db: D1DatabaseLike, email: string, config: EmailConfig, fetcher: typeof fetch = fetch, now = new Date()) {
  const normalized = email.trim().toLowerCase();
  const account = await db.prepare("SELECT email FROM auth_accounts WHERE email = ? AND email_verified_at IS NOT NULL AND deleted_at IS NULL LIMIT 1")
    .bind(normalized).first<{ email: string }>();
  if (!account) return { sent: false };
  const token = await issueToken(db, account.email, "confirm_deletion", now, 30);
  const link = `${config.publicOrigin}/api/account/deletion/confirm?token=${encodeURIComponent(token)}`;
  try {
    await sendTransactionalEmail(config, {
      to: account.email,
      subject: "Confirm your StylishMe account deletion",
      text: `Confirm account deletion: ${link}\nThis link expires in 30 minutes. Your seven-day recovery period starts only after you confirm.`,
    }, fetcher);
    return { sent: true };
  } catch (error) {
    await db.prepare("DELETE FROM auth_action_tokens WHERE token_hash = ?").bind(await tokenHash(token)).run().catch(() => undefined);
    throw error;
  }
}

export async function confirmAccountDeletionConfirmation(db: D1DatabaseLike, rawToken: unknown, now = new Date()) {
  const requestedAt = now.toISOString();
  const token = typeof rawToken === "string" ? rawToken.trim() : "";
  if (!/^[a-zA-Z0-9_-]{30,100}$/.test(token)) return null;
  const pending = await db.prepare("SELECT account_email FROM auth_action_tokens WHERE token_hash = ? AND action = 'confirm_deletion' AND used_at IS NULL AND expires_at > ? LIMIT 1")
    .bind(await tokenHash(token), requestedAt).first<{ account_email: string }>();
  if (!pending || !(await checkAccountDeletionEligibility(db, pending.account_email)).allowed) return null;
  const scheduledFor = recoveryDeadline(now);
  const id = crypto.randomUUID();
  const consumed = await consumeToken(db, rawToken, "confirm_deletion", now, (email, marker) => [
    db.prepare(`INSERT INTO account_deletion_requests (id, account_email, status, requested_at, scheduled_for, completed_at)
      SELECT ?, ?, 'pending', ?, ?, NULL WHERE EXISTS (
        SELECT 1 FROM auth_action_tokens WHERE account_email = ? AND action = 'confirm_deletion' AND used_at = ?
      ) ON CONFLICT(account_email, status) DO UPDATE SET requested_at = excluded.requested_at,
        scheduled_for = excluded.scheduled_for, completed_at = NULL`)
      .bind(id, email, requestedAt, scheduledFor, email, marker),
    db.prepare("DELETE FROM auth_sessions WHERE email = ?").bind(email),
  ]);
  return consumed ? { scheduledFor } : null;
}

export async function requestStoreClosureConfirmation(db: D1DatabaseLike, email: string, config: EmailConfig, fetcher: typeof fetch = fetch, now = new Date()) {
  const normalized = email.trim().toLowerCase();
  const seller = await db.prepare(`SELECT a.email, s.store_name FROM auth_accounts a
    JOIN seller_state s ON s.owner_email = a.email
    WHERE a.email = ? AND a.email_verified_at IS NOT NULL AND a.deleted_at IS NULL AND s.approved = 1 LIMIT 1`)
    .bind(normalized).first<{ email: string; store_name: string }>();
  if (!seller) return { sent: false };
  const token = await issueToken(db, seller.email, "confirm_store_closure", now, 30);
  const link = `${config.publicOrigin}/api/seller/store-closure/confirm?token=${encodeURIComponent(token)}`;
  try {
    await sendTransactionalEmail(config, {
      to: seller.email,
      subject: `Confirm closure of ${seller.store_name}`,
      text: `Confirm store closure: ${link}\nThis link expires in 30 minutes. Your seven-day recovery period starts only after confirmation.`,
    }, fetcher);
    return { sent: true };
  } catch (error) {
    await db.prepare("DELETE FROM auth_action_tokens WHERE token_hash = ?").bind(await tokenHash(token)).run().catch(() => undefined);
    throw error;
  }
}

export async function confirmStoreClosureConfirmation(db: D1DatabaseLike, rawToken: unknown, now = new Date()) {
  const token = typeof rawToken === "string" ? rawToken.trim() : "";
  if (!/^[a-zA-Z0-9_-]{30,100}$/.test(token)) return null;
  const hash = await tokenHash(token);
  const timestamp = now.toISOString();
  const row = await db.prepare(`SELECT t.account_email, s.store_name FROM auth_action_tokens t
    JOIN seller_state s ON s.owner_email = t.account_email
    WHERE t.token_hash = ? AND t.action = 'confirm_store_closure' AND t.used_at IS NULL AND t.expires_at > ? LIMIT 1`)
    .bind(hash, timestamp).first<{ account_email: string; store_name: string }>();
  if (!row) return null;
  const result = await scheduleStoreClosure(db, row.account_email, row.store_name, now);
  await db.prepare("UPDATE auth_action_tokens SET used_at = ? WHERE token_hash = ? AND action = 'confirm_store_closure' AND used_at IS NULL")
    .bind(timestamp, hash).run();
  return result;
}
