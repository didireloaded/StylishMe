import assert from "node:assert/strict";
import test from "node:test";

import { createCommerceOrder } from "../app/commerce-orders.ts";
import { buildProduct } from "../app/product-catalog.ts";
import { createCommerceTables, SqliteD1 } from "./sqlite-d1.mjs";

test("a retry key creates one normalized multi-seller order and reserves stock once", async () => {
  const db = new SqliteD1();
  createCommerceTables(db);
  const first = buildProduct(0);
  const second = buildProduct(1);
  const cart = [
    { productId: first.id, size: first.sizes[1], color: first.colors[0], quantity: 1 },
    { productId: second.id, size: second.sizes[1], color: second.colors[0], quantity: 1 },
  ];
  db.database.prepare("INSERT INTO customer_state VALUES (?, ?, '[]', '[]', ?, ?)")
    .run("customer@example.com", JSON.stringify(cart), JSON.stringify({ addresses: [{ label: "Home", street: "12 Main Road", city: "Windhoek" }] }), "2026-07-29T10:00:00.000Z");

  const input = {
    email: "customer@example.com",
    cart,
    fulfilment: "Standard delivery",
    idempotencyKey: "checkout-key-123456789",
    profile: { addresses: [{ label: "Home", street: "12 Main Road", city: "Windhoek" }] },
    now: new Date("2026-07-29T10:00:00.000Z"),
  };
  const created = await createCommerceOrder(db, input);
  const retried = await createCommerceOrder(db, input);

  assert.equal(created.order.id, retried.order.id);
  assert.equal(retried.reused, true);
  assert.equal(db.database.prepare("SELECT COUNT(*) AS count FROM commerce_orders").get().count, 1);
  assert.equal(db.database.prepare("SELECT COUNT(*) AS count FROM seller_orders").get().count, 2);
  assert.equal(db.database.prepare("SELECT COUNT(*) AS count FROM commerce_order_items").get().count, 2);
  assert.equal(db.database.prepare("SELECT SUM(reserved_quantity) AS count FROM inventory_variants").get().count, 2);
  assert.equal(db.database.prepare("SELECT cart_json FROM customer_state WHERE email = ?").get("customer@example.com").cart_json, "[]");
  db.close();
});
