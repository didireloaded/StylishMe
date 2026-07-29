import assert from "node:assert/strict";
import test from "node:test";

import {
  createHeldPayoutBatch,
  getSellerSettlementSummary,
  paidOrderLedgerStatements,
  refundLedgerStatements,
} from "../app/settlement-ledger.ts";
import { createCommerceTables, SqliteD1 } from "./sqlite-d1.mjs";

function database() {
  const db = new SqliteD1();
  createCommerceTables(db);
  db.database.exec(`
    ALTER TABLE seller_orders ADD COLUMN payout_eligible_at TEXT;
    CREATE TABLE payout_batches (
      id TEXT PRIMARY KEY, seller_id TEXT NOT NULL, idempotency_key TEXT NOT NULL UNIQUE,
      amount_cents INTEGER NOT NULL, currency TEXT NOT NULL, status TEXT NOT NULL,
      provider_reference TEXT, created_at TEXT NOT NULL, released_at TEXT
    );
    CREATE TABLE ledger_entries (
      id TEXT PRIMARY KEY, seller_order_id TEXT NOT NULL, payout_batch_id TEXT, entry_type TEXT NOT NULL,
      amount_cents INTEGER NOT NULL, currency TEXT NOT NULL, source_type TEXT NOT NULL, source_id TEXT NOT NULL,
      idempotency_key TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL,
      UNIQUE(source_type, source_id, entry_type)
    );
  `);
  const now = "2026-07-01T10:00:00.000Z";
  db.database.prepare("INSERT INTO seller_state VALUES (?, ?, ?, ?, ?, ?)").run("seller-1", "seller@example.com", 1, "Omutima", "{}", now);
  db.database.prepare("INSERT INTO commerce_orders VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run("order-1", "customer@example.com", "checkout-order-1", "NAD", 20000, 6500, 26500, "confirmed", "paid", "delivery", "{}", null, null, now, now);
  db.database.prepare("INSERT INTO seller_orders (id, order_id, seller_id, subtotal_cents, commission_cents, seller_net_cents, status, created_at, updated_at, payout_eligible_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run("seller-order-1", "order-1", "seller-1", 20000, 2400, 17600, "delivered", now, now, "2026-07-15T10:00:00.000Z");
  return db;
}

test("verified sales write idempotent seller and platform ledger entries", async () => {
  const db = database();
  const statements = paidOrderLedgerStatements(db, "order-1", "payment-1", "2026-07-01T10:01:00.000Z");
  await db.batch(statements);
  await db.batch(paidOrderLedgerStatements(db, "order-1", "payment-1", "2026-07-01T10:02:00.000Z"));
  const rows = db.database.prepare("SELECT entry_type, amount_cents FROM ledger_entries ORDER BY entry_type").all().map((row) => ({ ...row }));
  assert.deepEqual(rows, [
    { entry_type: "platform_commission_credit", amount_cents: 2400 },
    { entry_type: "seller_sale_credit", amount_cents: 17600 },
  ]);
  db.close();
});

test("refund ledger reverses only the seller order involved", async () => {
  const db = database();
  await db.batch(paidOrderLedgerStatements(db, "order-1", "payment-1", "2026-07-01T10:01:00.000Z"));
  await db.batch(refundLedgerStatements(db, {
    sellerOrderId: "seller-order-1",
    refundId: "refund-1",
    sellerDebitCents: 4400,
    commissionDebitCents: 600,
    now: "2026-07-02T10:00:00.000Z",
  }));
  const summary = await getSellerSettlementSummary(db, "seller-1", new Date("2026-07-20T10:00:00.000Z"));
  assert.equal(summary.availableCents, 13200);
  assert.equal(summary.commissionCents, 1800);
  assert.equal(summary.pendingCents, 0);
  db.close();
});

test("payout batches attach only eligible seller credits and are retry-safe", async () => {
  const db = database();
  await db.batch(paidOrderLedgerStatements(db, "order-1", "payment-1", "2026-07-01T10:01:00.000Z"));
  const first = await createHeldPayoutBatch(db, { sellerId: "seller-1", idempotencyKey: "payout-batch-1234", now: new Date("2026-07-20T10:00:00.000Z") });
  const second = await createHeldPayoutBatch(db, { sellerId: "seller-1", idempotencyKey: "payout-batch-1234", now: new Date("2026-07-20T10:00:00.000Z") });
  assert.equal(first.amountCents, 17600);
  assert.equal(first.status, "held");
  assert.equal(second.reused, true);
  assert.equal(db.database.prepare("SELECT COUNT(*) AS count FROM payout_batches").get().count, 1);
  assert.equal(db.database.prepare("SELECT COUNT(*) AS count FROM ledger_entries WHERE payout_batch_id = ?").get(first.id).count, 1);
  const summary = await getSellerSettlementSummary(db, "seller-1", new Date("2026-07-20T10:00:00.000Z"));
  assert.equal(summary.inPayoutCents, 17600);
  assert.equal(summary.availableCents, 0);
  db.close();
});

test("credits remain pending until fulfilment and the return window have completed", async () => {
  const db = database();
  db.database.prepare("UPDATE seller_orders SET payout_eligible_at = ?").run("2026-08-01T10:00:00.000Z");
  await db.batch(paidOrderLedgerStatements(db, "order-1", "payment-1", "2026-07-01T10:01:00.000Z"));
  const summary = await getSellerSettlementSummary(db, "seller-1", new Date("2026-07-20T10:00:00.000Z"));
  assert.equal(summary.pendingCents, 17600);
  assert.equal(summary.availableCents, 0);
  await assert.rejects(() => createHeldPayoutBatch(db, { sellerId: "seller-1", idempotencyKey: "payout-batch-5678", now: new Date("2026-07-20T10:00:00.000Z") }), /No eligible/);
  db.close();
});
