import assert from "node:assert/strict";
import test from "node:test";

import { consumeOAuthAttempt, createOAuthAttempt, consumePendingOAuthProfile, createPendingOAuthProfile } from "../app/oauth-storage.ts";
import { SqliteD1 } from "./sqlite-d1.mjs";

function database() {
  const db = new SqliteD1();
  db.database.exec(`
    CREATE TABLE auth_oauth_states (id TEXT PRIMARY KEY, state_hash TEXT NOT NULL UNIQUE, binding_hash TEXT NOT NULL, nonce_hash TEXT NOT NULL, provider TEXT NOT NULL, code_verifier TEXT NOT NULL, role TEXT NOT NULL, intent TEXT NOT NULL, link_email TEXT, return_to TEXT NOT NULL, expires_at TEXT NOT NULL, used_at TEXT, created_at TEXT NOT NULL);
    CREATE TABLE auth_oauth_pending_profiles (id TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE, provider TEXT NOT NULL, provider_subject TEXT NOT NULL, email TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL, return_to TEXT NOT NULL, encrypted_refresh_token TEXT, expires_at TEXT NOT NULL, used_at TEXT, created_at TEXT NOT NULL, UNIQUE(provider, provider_subject));
  `);
  return db;
}

test("OAuth transactions store hashes and are consumed atomically once", async () => {
  const db = database(); const now = new Date("2026-07-29T10:00:00.000Z");
  const created = await createOAuthAttempt(db, { provider: "google", role: "seller", intent: "login", returnTo: "/shop?category=Designer", now });
  const stored = db.database.prepare("SELECT state_hash, binding_hash, nonce_hash, role, return_to FROM auth_oauth_states").get();
  assert.notEqual(stored.state_hash, created.state);
  assert.notEqual(stored.binding_hash, created.binding);
  assert.notEqual(stored.nonce_hash, created.nonce);
  assert.equal(stored.role, "seller");
  const consumed = await consumeOAuthAttempt(db, { provider: "google", state: created.state, binding: created.binding, nonce: created.nonce, now });
  assert.equal(consumed.returnTo, "/shop?category=Designer");
  assert.equal(consumed.role, "seller");
  assert.equal(await consumeOAuthAttempt(db, { provider: "google", state: created.state, binding: created.binding, nonce: created.nonce, now }), null);
  db.close();
});

test("pending provider registration is also hash-only, expiring and single-use", async () => {
  const db = database(); const now = new Date("2026-07-29T10:00:00.000Z");
  const token = await createPendingOAuthProfile(db, { provider: "apple", role: "customer", returnTo: "/", identity: { subject: "apple-person", email: "relay@example.com", name: "Didi" }, encryptedRefreshToken: "ciphertext", now });
  const stored = db.database.prepare("SELECT token_hash FROM auth_oauth_pending_profiles").get();
  assert.notEqual(stored.token_hash, token);
  const pending = await consumePendingOAuthProfile(db, token, now);
  assert.equal(pending.providerSubject, "apple-person");
  assert.equal(pending.encryptedRefreshToken, "ciphertext");
  assert.equal(await consumePendingOAuthProfile(db, token, now), null);
  db.close();
});

test("an interrupted provider profile can restart without waiting for stale state expiry", async () => {
  const db = database(); const now = new Date("2026-07-29T10:00:00.000Z");
  const input = { provider: "google", role: "customer", returnTo: "/", identity: { subject: "google-person", email: "didi@example.com", name: "Didi" }, now };
  const first = await createPendingOAuthProfile(db, input);
  const second = await createPendingOAuthProfile(db, { ...input, now: new Date("2026-07-29T10:01:00.000Z") });
  assert.notEqual(first, second);
  assert.equal(await consumePendingOAuthProfile(db, first, new Date("2026-07-29T10:02:00.000Z")), null);
  assert.equal((await consumePendingOAuthProfile(db, second, new Date("2026-07-29T10:02:00.000Z")))?.providerSubject, "google-person");
  assert.equal(db.database.prepare("SELECT COUNT(*) AS count FROM auth_oauth_pending_profiles").get().count, 1);
  db.close();
});