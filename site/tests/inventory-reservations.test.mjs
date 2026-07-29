import assert from "node:assert/strict";
import test from "node:test";

import { createCommerceTables, SqliteD1 } from "./sqlite-d1.mjs";
import { releaseExpiredReservations, reserveOrderInventory } from "../app/inventory-reservations.ts";

function inventoryDatabase() {
  const db = new SqliteD1();
  createCommerceTables(db);
  db.database.prepare("INSERT INTO inventory_variants VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run("variant-1", "product-1", "M", "Black", "SKU-1", 2, 0, 0, "2026-07-29T10:00:00.000Z");
  return db;
}

test("atomic reservations reject a second shopper when the final stock is already held", async () => {
  const db = inventoryDatabase();
  await reserveOrderInventory(db, {
    orderId: "order-1",
    checkoutKey: "checkout-1",
    expiresAt: "2026-07-29T10:15:00.000Z",
    lines: [{ variantId: "variant-1", quantity: 2 }],
  });
  await assert.rejects(
    reserveOrderInventory(db, {
      orderId: "order-2",
      checkoutKey: "checkout-2",
      expiresAt: "2026-07-29T10:15:00.000Z",
      lines: [{ variantId: "variant-1", quantity: 1 }],
    }),
    /stock/i,
  );
  assert.equal(db.database.prepare("SELECT reserved_quantity FROM inventory_variants WHERE id = ?").get("variant-1").reserved_quantity, 2);
  assert.equal(db.database.prepare("SELECT COUNT(*) AS count FROM inventory_reservations").get().count, 1);
  db.close();
});

test("expired reservations release stock exactly once", async () => {
  const db = inventoryDatabase();
  await reserveOrderInventory(db, {
    orderId: "order-expired",
    checkoutKey: "checkout-expired",
    expiresAt: "2026-07-29T10:05:00.000Z",
    lines: [{ variantId: "variant-1", quantity: 1 }],
  });
  await releaseExpiredReservations(db, new Date("2026-07-29T10:06:00.000Z"));
  await releaseExpiredReservations(db, new Date("2026-07-29T10:07:00.000Z"));
  assert.equal(db.database.prepare("SELECT reserved_quantity FROM inventory_variants WHERE id = ?").get("variant-1").reserved_quantity, 0);
  assert.equal(db.database.prepare("SELECT status FROM inventory_reservations WHERE order_id = ?").get("order-expired").status, "expired");
  db.close();
});
