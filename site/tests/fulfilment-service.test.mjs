import assert from "node:assert/strict";
import test from "node:test";

import { getCustomerFulfilments, getSellerOrders, updateSellerFulfilment } from "../app/fulfilment-service.ts";
import { createCommerceTables, SqliteD1 } from "./sqlite-d1.mjs";

function database(method = "delivery") {
  const db = new SqliteD1();
  createCommerceTables(db);
  db.database.exec(`
    ALTER TABLE seller_orders ADD COLUMN payout_eligible_at TEXT;
    CREATE TABLE shipments (
      id TEXT PRIMARY KEY, seller_order_id TEXT NOT NULL, provider TEXT NOT NULL, tracking_number TEXT,
      tracking_url TEXT, status TEXT NOT NULL, estimated_delivery_at TEXT, last_synced_at TEXT,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(provider, tracking_number)
    );
    CREATE TABLE shipment_events (
      id TEXT PRIMARY KEY, shipment_id TEXT NOT NULL, provider_event_id TEXT, status TEXT NOT NULL,
      description TEXT NOT NULL, location TEXT, occurred_at TEXT NOT NULL, created_at TEXT NOT NULL,
      UNIQUE(shipment_id, provider_event_id)
    );
  `);
  const now = "2026-07-29T10:00:00.000Z";
  db.database.prepare("INSERT INTO seller_state VALUES (?, ?, ?, ?, ?, ?)").run("seller-1", "seller@example.com", 1, "Omutima", "{}", now);
  db.database.prepare("INSERT INTO catalog_products VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run("product-1", "seller-1", "omutima", "coral-dress", "Coral Dress", "", "Women", "NAD", 10000, "published", "/dress.jpg", "{}", now, now, now);
  db.database.prepare("INSERT INTO inventory_variants VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run("variant-1", "product-1", "M", "Coral", "SKU-1", 2, 0, 1, now);
  db.database.prepare("INSERT INTO commerce_orders VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run("order-1", "customer@example.com", "checkout-order-0001", "NAD", 10000, method === "delivery" ? 6500 : 0, method === "delivery" ? 16500 : 10000, "confirmed", "paid", method, method === "delivery" ? JSON.stringify({ address: { label: "Home", street: "12 Independence Avenue", city: "Windhoek" } }) : null, method === "collection" ? "seller-collection" : null, null, now, now);
  db.database.prepare("INSERT INTO seller_orders VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run("seller-order-1", "order-1", "seller-1", 10000, 1200, 8800, "new", now, now, null);
  db.database.prepare("INSERT INTO commerce_order_items VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run("item-1", "order-1", "seller-order-1", "seller-1", "product-1", "variant-1", "Coral Dress", "Omutima", JSON.stringify({ size: "M", colour: "Coral" }), 10000, 1, 10000);
  return db;
}

test("seller order queries are ownership scoped and include only operational data", async () => {
  const db = database();
  const own = await getSellerOrders(db, "seller-1");
  const another = await getSellerOrders(db, "seller-2");
  assert.equal(own.length, 1);
  assert.equal(another.length, 0);
  assert.equal(own[0].deliveryAddress.street, "12 Independence Avenue");
  assert.equal(own[0].customerEmail, undefined);
  db.close();
});

test("seller delivery updates persist milestones and unlock payout only after delivery", async () => {
  const db = database();
  const at = new Date("2026-07-29T10:00:00.000Z");
  await updateSellerFulfilment(db, "seller-1", "seller-order-1", { status: "preparing", now: at });
  await updateSellerFulfilment(db, "seller-1", "seller-order-1", { status: "shipped", provider: "dhl", trackingNumber: "JD123", trackingUrl: "https://www.dhl.com/track?id=JD123", now: at });
  await updateSellerFulfilment(db, "seller-1", "seller-order-1", { status: "in_transit", now: at });
  await updateSellerFulfilment(db, "seller-1", "seller-order-1", { status: "out_for_delivery", now: at });
  await updateSellerFulfilment(db, "seller-1", "seller-order-1", { status: "delivered", now: at });
  assert.equal(db.database.prepare("SELECT payout_eligible_at FROM seller_orders").get().payout_eligible_at, "2026-08-12T10:00:00.000Z");
  assert.equal(db.database.prepare("SELECT status FROM commerce_orders").get().status, "delivered");
  assert.equal(db.database.prepare("SELECT COUNT(*) AS count FROM shipment_events").get().count, 5);
  const customer = await getCustomerFulfilments(db, "customer@example.com", "order-1");
  assert.equal(customer[0].trackingNumber, "JD123");
  assert.equal(customer[0].events.at(-1).status, "delivered");
  db.close();
});

test("store collection cannot accept courier data and completes on collection", async () => {
  const db = database("collection");
  await updateSellerFulfilment(db, "seller-1", "seller-order-1", { status: "preparing" });
  await assert.rejects(() => updateSellerFulfilment(db, "seller-1", "seller-order-1", { status: "ready_to_collect", provider: "dhl", trackingNumber: "123" }), /collection/i);
  await updateSellerFulfilment(db, "seller-1", "seller-order-1", { status: "ready_to_collect" });
  await updateSellerFulfilment(db, "seller-1", "seller-order-1", { status: "collected" });
  const customer = await getCustomerFulfilments(db, "customer@example.com", "order-1");
  assert.equal(customer[0].trackingNumber, null);
  assert.equal(customer[0].events.some(event => /courier|transit/i.test(event.description)), false);
  assert.equal(db.database.prepare("SELECT status FROM commerce_orders").get().status, "collected");
  db.close();
});
