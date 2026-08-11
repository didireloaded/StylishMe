import assert from "node:assert/strict";
import test from "node:test";

import {
  confirmEmailVerification,
  requestEmailVerification,
  requestPasswordReset,
  requestAccountDeletionConfirmation,
  confirmAccountDeletionConfirmation,
  resetPasswordWithToken,
} from "../app/auth-actions.ts";
import { PASSWORD_HASH_ITERATIONS, passwordMatches } from "../app/stylishme-auth.ts";
import { currentEmailConfig, sendTransactionalEmail } from "../app/transactional-email.ts";
import { SqliteD1 } from "./sqlite-d1.mjs";

function database() {
  const db = new SqliteD1();
  db.database.exec(`
    CREATE TABLE auth_accounts (
      email TEXT PRIMARY KEY, name TEXT NOT NULL, password_hash TEXT NOT NULL, password_salt TEXT NOT NULL,
      avatar_key TEXT NOT NULL, email_verified_at TEXT, deleted_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE auth_sessions (token_hash TEXT PRIMARY KEY, email TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE account_deletion_requests (id TEXT PRIMARY KEY, account_email TEXT NOT NULL, status TEXT NOT NULL, requested_at TEXT NOT NULL, scheduled_for TEXT NOT NULL, completed_at TEXT, UNIQUE(account_email, status));
    CREATE TABLE auth_action_tokens (
      id TEXT PRIMARY KEY, account_email TEXT NOT NULL, token_hash TEXT NOT NULL UNIQUE, action TEXT NOT NULL CHECK (action IN ('verify_email', 'reset_password', 'confirm_deletion', 'confirm_store_closure')),
      expires_at TEXT NOT NULL, used_at TEXT, created_at TEXT NOT NULL
    );
    CREATE TABLE seller_state (invite_token TEXT PRIMARY KEY, owner_email TEXT, approved INTEGER, store_name TEXT, state_json TEXT, updated_at TEXT);
    CREATE TABLE commerce_orders (id TEXT PRIMARY KEY, customer_email TEXT, status TEXT);
  `);
  db.database.prepare("INSERT INTO auth_accounts VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, ?)")
    .run("didi@example.com", "Didi", "old-hash", "old-salt", "avatar.jpg", "2026-07-29T10:00:00.000Z", "2026-07-29T10:00:00.000Z");
  return db;
}

const emailConfig = { available: true, apiKey: "re_live", from: "StylishMe <hello@stylishme.na>", publicOrigin: "https://stylishme.na" };

test("password hashing stays within the production runtime PBKDF2 limit", () => {
  assert.equal(PASSWORD_HASH_ITERATIONS, 100_000);
});

test("transactional email is unavailable until every production value exists", () => {
  assert.equal(currentEmailConfig({ RESEND_API_KEY: "key" }).available, false);
  assert.equal(currentEmailConfig({ RESEND_API_KEY: "key", AUTH_EMAIL_FROM: "hello@stylishme.na", PUBLIC_APP_ORIGIN: "https://stylishme.na" }).available, true);
});

test("transactional email safely classifies Resend recipient restrictions", async () => {
  const fetcher = async () => Response.json({
    statusCode: 403,
    name: "validation_error",
    message: "You can only send testing emails to your own email address.",
  }, { status: 403 });
  await assert.rejects(
    sendTransactionalEmail(emailConfig, { to: "customer@example.com", subject: "Test", text: "Test" }, fetcher),
    error => error?.name === "EmailDeliveryError" && error?.reason === "recipient_restricted" && error?.status === 403,
  );
});

test("email verification stores only a hash and the link is single-use", async () => {
  const db = database();
  let emailBody;
  const fetcher = async (_url, init) => { emailBody = JSON.parse(init.body); return Response.json({ id: "email-1" }); };
  const issued = await requestEmailVerification(db, "didi@example.com", emailConfig, fetcher, new Date("2026-07-29T10:00:00.000Z"));
  assert.equal(issued.sent, true);
  const link = new URL(emailBody.text.match(/https:\/\/\S+/)[0]);
  const token = link.searchParams.get("token");
  const stored = db.database.prepare("SELECT token_hash FROM auth_action_tokens").get().token_hash;
  assert.notEqual(stored, token);
  assert.equal(await confirmEmailVerification(db, token, new Date("2026-07-29T10:05:00.000Z")), true);
  assert.equal(await confirmEmailVerification(db, token, new Date("2026-07-29T10:06:00.000Z")), false);
  assert.equal(db.database.prepare("SELECT email_verified_at FROM auth_accounts").get().email_verified_at, "2026-07-29T10:05:00.000Z");
  db.close();
});

test("password reset changes the password and revokes all sessions", async () => {
  const db = database();
  db.database.prepare("UPDATE auth_accounts SET email_verified_at = created_at").run();
  db.database.prepare("INSERT INTO auth_sessions VALUES ('session-a', 'didi@example.com', '2026-08-29', '2026-07-29')").run();
  let body;
  await requestPasswordReset(db, "didi@example.com", emailConfig, async (_url, init) => { body = JSON.parse(init.body); return Response.json({ id: "email-2" }); }, new Date("2026-07-29T10:00:00.000Z"));
  const token = new URL(body.text.match(/https:\/\/\S+/)[0]).searchParams.get("token");
  assert.equal(await resetPasswordWithToken(db, token, "new-secure-2026", new Date("2026-07-29T10:05:00.000Z")), true);
  const account = db.database.prepare("SELECT password_hash, password_salt FROM auth_accounts").get();
  assert.equal(await passwordMatches("new-secure-2026", account.password_salt, account.password_hash), true);
  assert.equal(db.database.prepare("SELECT COUNT(*) AS count FROM auth_sessions").get().count, 0);
  assert.equal(await resetPasswordWithToken(db, token, "another-secure-2026"), false);
  db.close();
});

test("OAuth-only accounts can confirm deletion through their verified email", async () => {
  const db = database();
  db.database.prepare("UPDATE auth_accounts SET email_verified_at = created_at, password_hash = '', password_salt = ''").run();
  let body;
  const requested = await requestAccountDeletionConfirmation(db, "didi@example.com", emailConfig, async (_url, init) => { body = JSON.parse(init.body); return Response.json({ id: "email-delete" }); }, new Date("2026-07-29T10:00:00.000Z"));
  assert.equal(requested.sent, true);
  const token = new URL(body.text.match(/https:\/\/\S+/)[0]).searchParams.get("token");
  const confirmed = await confirmAccountDeletionConfirmation(db, token, new Date("2026-07-29T10:05:00.000Z"));
  assert.equal(confirmed?.scheduledFor, "2026-08-05T10:05:00.000Z");
  assert.equal(db.database.prepare("SELECT status FROM account_deletion_requests").get().status, "pending");
  assert.equal(await confirmAccountDeletionConfirmation(db, token, new Date("2026-07-29T10:06:00.000Z")), null);
  db.close();
});
