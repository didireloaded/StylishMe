import assert from "node:assert/strict";
import test from "node:test";

import {
  cancelStoreClosure,
  checkStoreClosureEligibility,
  processDueStoreClosures,
  scheduleStoreClosure,
} from "../app/store-closure.ts";
import { SqliteD1 } from "./sqlite-d1.mjs";

function database() {
  const db = new SqliteD1();
  db.database.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE auth_accounts (email TEXT PRIMARY KEY);
    CREATE TABLE customer_state (email TEXT PRIMARY KEY, profile_json TEXT NOT NULL, updated_at TEXT);
    CREATE TABLE seller_state (invite_token TEXT PRIMARY KEY, owner_email TEXT, approved INTEGER, store_name TEXT, state_json TEXT, updated_at TEXT);
    CREATE TABLE catalog_products (id TEXT PRIMARY KEY, seller_id TEXT, status TEXT, updated_at TEXT);
    CREATE TABLE inventory_variants (id TEXT PRIMARY KEY, product_id TEXT, available_quantity INTEGER, reserved_quantity INTEGER);
    CREATE TABLE commerce_orders (id TEXT PRIMARY KEY, customer_email TEXT, status TEXT, fulfilment_method TEXT);
    CREATE TABLE seller_orders (id TEXT PRIMARY KEY, order_id TEXT, seller_id TEXT, status TEXT);
    CREATE TABLE inventory_reservations (id TEXT PRIMARY KEY, order_id TEXT, variant_id TEXT, status TEXT);
    CREATE TABLE refunds (id TEXT PRIMARY KEY, seller_order_id TEXT, status TEXT);
    CREATE TABLE seller_store_closure_requests (
      id TEXT PRIMARY KEY, seller_id TEXT, account_email TEXT, status TEXT,
      previous_product_statuses_json TEXT, requested_at TEXT, scheduled_for TEXT,
      cancelled_at TEXT, completed_at TEXT, UNIQUE(seller_id, status)
    );
  `);
  db.database.prepare("INSERT INTO auth_accounts VALUES (?)").run("seller@example.com");
  db.database.prepare("INSERT INTO customer_state VALUES (?, ?, ?)").run("seller@example.com", JSON.stringify({ accountRole: "seller", city: "Windhoek" }), "2026-08-01");
  db.database.prepare("INSERT INTO seller_state VALUES (?, ?, 1, ?, ?, ?)").run("seller-1", "seller@example.com", "Omutima", JSON.stringify({ products: [] }), "2026-08-01");
  db.database.prepare("INSERT INTO catalog_products VALUES (?, ?, ?, ?)").run("product-live", "seller-1", "published", "2026-08-01");
  db.database.prepare("INSERT INTO catalog_products VALUES (?, ?, ?, ?)").run("product-draft", "seller-1", "draft", "2026-08-01");
  db.database.prepare("INSERT INTO inventory_variants VALUES (?, ?, 4, 0)").run("variant-1", "product-live");
  return db;
}

test("store closure reports active order and reserved stock blockers", async () => {
  const db = database();
  db.database.prepare("INSERT INTO commerce_orders VALUES ('order-1', 'buyer@example.com', 'confirmed', 'delivery')").run();
  db.database.prepare("INSERT INTO seller_orders VALUES ('seller-order-1', 'order-1', 'seller-1', 'confirmed')").run();
  db.database.prepare("INSERT INTO inventory_reservations VALUES ('reservation-1', 'order-1', 'variant-1', 'active')").run();
  const result = await checkStoreClosureEligibility(db, "seller@example.com");
  assert.deepEqual(result.blockers.map(item => item.code), ["active_order", "reserved_stock"]);
  db.close();
});

test("eligible closure immediately hides the store and returns the identity to customer role", async () => {
  const db = database();
  const result = await scheduleStoreClosure(db, "seller@example.com", "Omutima", new Date("2026-08-12T08:00:00.000Z"));
  assert.deepEqual(result, { scheduledFor: "2026-08-19T08:00:00.000Z", storeName: "Omutima" });
  assert.equal(db.database.prepare("SELECT approved FROM seller_state").get().approved, 0);
  assert.deepEqual(db.database.prepare("SELECT status FROM catalog_products ORDER BY id").all().map(row => row.status), ["archived", "archived"]);
  assert.equal(JSON.parse(db.database.prepare("SELECT profile_json FROM customer_state").get().profile_json).accountRole, "customer");
  db.close();
});

test("store name confirmation is exact and a duplicate request is idempotent", async () => {
  const db = database();
  await assert.rejects(() => scheduleStoreClosure(db, "seller@example.com", "Wrong store", new Date()), /store name/i);
  const first = await scheduleStoreClosure(db, "seller@example.com", "Omutima", new Date("2026-08-12T08:00:00.000Z"));
  const second = await scheduleStoreClosure(db, "seller@example.com", "Omutima", new Date("2026-08-12T09:00:00.000Z"));
  assert.deepEqual(second, first);
  assert.equal(db.database.prepare("SELECT COUNT(*) AS count FROM seller_store_closure_requests").get().count, 1);
  db.close();
});

test("cancelling during recovery restores only products that were previously published", async () => {
  const db = database();
  await scheduleStoreClosure(db, "seller@example.com", "Omutima", new Date("2026-08-12T08:00:00.000Z"));
  assert.equal(await cancelStoreClosure(db, "seller@example.com", new Date("2026-08-13T08:00:00.000Z")), true);
  assert.equal(db.database.prepare("SELECT approved FROM seller_state").get().approved, 1);
  assert.deepEqual(db.database.prepare("SELECT id, status FROM catalog_products ORDER BY id").all().map(row => ({ ...row })), [
    { id: "product-draft", status: "draft" },
    { id: "product-live", status: "published" },
  ]);
  assert.equal(JSON.parse(db.database.prepare("SELECT profile_json FROM customer_state").get().profile_json).accountRole, "seller");
  db.close();
});

test("due closure removes private seller state but preserves historical seller identity", async () => {
  const db = database();
  await scheduleStoreClosure(db, "seller@example.com", "Omutima", new Date("2026-08-01T08:00:00.000Z"));
  const deleted = [];
  const result = await processDueStoreClosures(db, { delete: async key => deleted.push(key) }, new Date("2026-08-12T08:00:00.000Z"));
  assert.deepEqual(result, { processed: 1, failed: 0 });
  assert.deepEqual({ ...db.database.prepare("SELECT owner_email, approved, state_json FROM seller_state").get() }, { owner_email: null, approved: 0, state_json: "{}" });
  assert.equal(db.database.prepare("SELECT status FROM seller_store_closure_requests").get().status, "completed");
  db.close();
});
