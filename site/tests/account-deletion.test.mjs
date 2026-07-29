import assert from "node:assert/strict";
import test from "node:test";

import { cancelAccountDeletion, processDueAccountDeletions, scheduleAccountDeletion } from "../app/account-deletion.ts";
import { SqliteD1 } from "./sqlite-d1.mjs";

function database() {
  const db = new SqliteD1();
  db.database.exec(`
    CREATE TABLE auth_accounts (email TEXT PRIMARY KEY, name TEXT, password_hash TEXT, password_salt TEXT, avatar_key TEXT, email_verified_at TEXT, deleted_at TEXT, created_at TEXT, updated_at TEXT);
    CREATE TABLE auth_sessions (token_hash TEXT PRIMARY KEY, email TEXT, expires_at TEXT, created_at TEXT);
    CREATE TABLE auth_action_tokens (id TEXT PRIMARY KEY, account_email TEXT, token_hash TEXT, action TEXT, expires_at TEXT, used_at TEXT, created_at TEXT);
    CREATE TABLE auth_identities (id TEXT PRIMARY KEY, account_email TEXT, provider TEXT, provider_subject TEXT, provider_email TEXT, created_at TEXT, last_used_at TEXT);
    CREATE TABLE auth_provider_credentials (identity_id TEXT PRIMARY KEY, encrypted_refresh_token TEXT, created_at TEXT, updated_at TEXT);
    CREATE TABLE customer_state (email TEXT PRIMARY KEY, cart_json TEXT, wishlist_json TEXT, orders_json TEXT, profile_json TEXT, updated_at TEXT);
    CREATE TABLE seller_state (invite_token TEXT PRIMARY KEY, owner_email TEXT, approved INTEGER, store_name TEXT, state_json TEXT, updated_at TEXT);
    CREATE TABLE catalog_products (id TEXT PRIMARY KEY, seller_id TEXT, status TEXT, updated_at TEXT);
    CREATE TABLE commerce_orders (id TEXT PRIMARY KEY, customer_email TEXT);
    CREATE TABLE customer_outfit_stories (id TEXT PRIMARY KEY, owner_email TEXT, image_key TEXT);
    CREATE TABLE customer_outfit_story_products (story_id TEXT);
    CREATE TABLE customer_outfit_story_likes (story_id TEXT);
    CREATE TABLE customer_outfit_story_reports (story_id TEXT);
    CREATE TABLE try_on_usage (key TEXT PRIMARY KEY, email TEXT);
    CREATE TABLE account_deletion_requests (id TEXT PRIMARY KEY, account_email TEXT, status TEXT, requested_at TEXT, scheduled_for TEXT, completed_at TEXT, UNIQUE(account_email, status));
  `);
  db.database.prepare("INSERT INTO auth_accounts VALUES ('didi@example.com','Didi','hash','salt','private-avatar.jpg','2026-07-01',NULL,'2026-07-01','2026-07-01')").run();
  db.database.prepare("INSERT INTO customer_state VALUES ('didi@example.com','[]','[]','[]','{}','2026-07-01')").run();
  db.database.prepare("INSERT INTO seller_state VALUES ('seller-1','didi@example.com',1,'Didi Studio','{}','2026-07-01')").run();
  db.database.prepare("INSERT INTO catalog_products VALUES ('product-1','seller-1','published','2026-07-01')").run();
  db.database.prepare("INSERT INTO commerce_orders VALUES ('order-1','didi@example.com')").run();
  db.database.prepare("INSERT INTO customer_outfit_stories VALUES ('story-1','didi@example.com','private-story.jpg')").run();
  db.database.prepare("INSERT INTO customer_outfit_story_products VALUES ('story-1')").run();
  return db;
}

test("account deletion can be scheduled and cancelled during the grace period", async () => {
  const db = database();
  const scheduled = await scheduleAccountDeletion(db, "didi@example.com", new Date("2026-07-29T10:00:00.000Z"));
  assert.equal(scheduled.scheduledFor, "2026-08-28T10:00:00.000Z");
  assert.equal(await cancelAccountDeletion(db, "didi@example.com"), true);
  assert.equal(db.database.prepare("SELECT status FROM account_deletion_requests").get().status, "cancelled");
  db.close();
});

test("due deletion removes personal records and keeps anonymized commerce history", async () => {
  const db = database();
  await scheduleAccountDeletion(db, "didi@example.com", new Date("2026-06-01T10:00:00.000Z"));
  const deletedMedia = [];
  const result = await processDueAccountDeletions(db, { delete: async key => deletedMedia.push(key) }, new Date("2026-07-29T10:00:00.000Z"));
  assert.equal(result.processed, 1);
  assert.equal(db.database.prepare("SELECT COUNT(*) AS count FROM auth_accounts").get().count, 0);
  assert.equal(db.database.prepare("SELECT COUNT(*) AS count FROM customer_state").get().count, 0);
  assert.equal(db.database.prepare("SELECT customer_email FROM commerce_orders").get().customer_email, null);
  assert.deepEqual({ ...db.database.prepare("SELECT owner_email, approved, state_json FROM seller_state").get() }, { owner_email: null, approved: 0, state_json: "{}" });
  assert.equal(db.database.prepare("SELECT status FROM catalog_products").get().status, "archived");
  assert.deepEqual(deletedMedia.sort(), ["private-avatar.jpg", "private-story.jpg"]);
  db.close();
});
test("account deletion waits when external provider revocation fails", async () => {
  const db = database();
  await scheduleAccountDeletion(db, "didi@example.com", new Date("2026-06-01T10:00:00.000Z"));
  const result = await processDueAccountDeletions(db, { delete: async () => undefined }, new Date("2026-07-29T10:00:00.000Z"), async () => { throw new Error("provider unavailable"); });
  assert.deepEqual(result, { processed: 0, failed: 1 });
  assert.equal(db.database.prepare("SELECT COUNT(*) AS count FROM auth_accounts").get().count, 1);
  db.close();
});

test("account deletion keeps the account retryable when private media removal fails", async () => {
  const db = database();
  await scheduleAccountDeletion(db, "didi@example.com", new Date("2026-06-01T10:00:00.000Z"));
  const result = await processDueAccountDeletions(db, { delete: async key => { if (key === "private-story.jpg") throw new Error("R2 unavailable"); } }, new Date("2026-07-29T10:00:00.000Z"));
  assert.deepEqual(result, { processed: 0, failed: 1 });
  assert.equal(db.database.prepare("SELECT COUNT(*) AS count FROM auth_accounts").get().count, 1);
  assert.equal(db.database.prepare("SELECT status FROM account_deletion_requests").get().status, "pending");
  assert.equal(db.database.prepare("SELECT COUNT(*) AS count FROM customer_outfit_stories").get().count, 1);
  db.close();
});