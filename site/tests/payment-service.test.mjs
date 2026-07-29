import assert from "node:assert/strict";
import test from "node:test";

import { createDpoRefund, reconcileDpoPayment, startDpoCheckout } from "../app/payment-service.ts";
import { updateSellerFulfilment } from "../app/fulfilment-service.ts";
import { createCommerceTables, SqliteD1 } from "./sqlite-d1.mjs";

const config = {
  available: true,
  companyToken: "merchant-token",
  serviceType: "5525",
  apiUrl: "https://secure.3gdirectpay.com/API/v6/",
  checkoutUrl: "https://secure.3gdirectpay.com/payv2.php",
};

const xmlResponse = (xml) => async () => new Response(xml, { status: 200, headers: { "content-type": "application/xml" } });

function database({ orderId = "SM-2026-PAY1", reservationStatus = "active" } = {}) {
  const db = new SqliteD1();
  createCommerceTables(db);
  db.database.exec(`
    ALTER TABLE seller_orders ADD COLUMN payout_eligible_at TEXT;
    CREATE TABLE payment_attempts (
      id TEXT PRIMARY KEY, order_id TEXT NOT NULL, provider TEXT NOT NULL, provider_reference TEXT,
      idempotency_key TEXT NOT NULL UNIQUE, amount_cents INTEGER NOT NULL, currency TEXT NOT NULL,
      status TEXT NOT NULL, verified_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
      UNIQUE(provider, provider_reference)
    );
    CREATE TABLE refunds (
      id TEXT PRIMARY KEY, order_id TEXT NOT NULL, payment_attempt_id TEXT NOT NULL, seller_order_id TEXT,
      idempotency_key TEXT NOT NULL UNIQUE, provider_reference TEXT, amount_cents INTEGER NOT NULL,
      reason TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE payout_batches (
      id TEXT PRIMARY KEY, seller_id TEXT NOT NULL, idempotency_key TEXT NOT NULL UNIQUE, amount_cents INTEGER NOT NULL,
      currency TEXT NOT NULL, status TEXT NOT NULL, provider_reference TEXT, created_at TEXT NOT NULL, released_at TEXT
    );
    CREATE TABLE ledger_entries (
      id TEXT PRIMARY KEY, seller_order_id TEXT NOT NULL, payout_batch_id TEXT, entry_type TEXT NOT NULL, amount_cents INTEGER NOT NULL,
      currency TEXT NOT NULL, source_type TEXT NOT NULL, source_id TEXT NOT NULL, idempotency_key TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL,
      UNIQUE(source_type, source_id, entry_type)
    );
  `);
  const now = "2026-07-29T10:00:00.000Z";
  db.database.prepare("INSERT INTO seller_state VALUES (?, ?, ?, ?, ?, ?)").run("seller-1", "seller@example.com", 1, "Omutima", "{}", now);
  db.database.prepare("INSERT INTO catalog_products VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run("product-1", "seller-1", "omutima", "coral-hoodie", "Coral Hoodie", "", "Clothing", "NAD", 10000, "published", "/hoodie.jpg", "{}", now, now, now);
  db.database.prepare("INSERT INTO inventory_variants VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run("variant-1", "product-1", "M", "Coral", "SKU-1", 3, reservationStatus === "active" ? 1 : 0, 0, now);
  db.database.prepare("INSERT INTO commerce_orders VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run(orderId, "customer@example.com", `checkout-${orderId}`, "NAD", 10000, 6500, 16500, "pending_payment", "unpaid", "delivery", "{}", null, "2026-07-29T10:15:00.000Z", now, now);
  db.database.prepare("INSERT INTO seller_orders VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run("seller-order-1", orderId, "seller-1", 10000, 1200, 8800, "awaiting_payment", now, now, null);
  db.database.prepare("INSERT INTO inventory_reservations VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run("reservation-1", `reserve-${orderId}`, orderId, "variant-1", 1, reservationStatus, "2026-07-29T10:15:00.000Z", now, now);
  db.database.prepare("INSERT INTO commerce_order_items VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run("item-1", orderId, "seller-order-1", "seller-1", "product-1", "variant-1", "Coral Hoodie", "Omutima", JSON.stringify({ size: "M", colour: "Coral" }), 10000, 1, 10000);
  return db;
}

test("hosted checkout is retry-safe and stores only the DPO token", async () => {
  const db = database();
  const input = { customerEmail: "customer@example.com", orderId: "SM-2026-PAY1", requestKey: "checkout-payment-1234", origin: "https://stylish.me", now: new Date("2026-07-29T10:00:00.000Z") };
  const fetcher = xmlResponse("<API3G><Result>000</Result><TransToken>dpo-token-1</TransToken><TransRef>R1</TransRef></API3G>");
  const first = await startDpoCheckout(db, config, { ...input, fetcher });
  const second = await startDpoCheckout(db, config, { ...input, fetcher: async () => { throw new Error("must not call DPO twice"); } });
  assert.equal(first.checkoutUrl, "https://secure.3gdirectpay.com/payv2.php?ID=dpo-token-1");
  assert.equal(second.reused, true);
  assert.equal(db.database.prepare("SELECT COUNT(*) AS count FROM payment_attempts").get().count, 1);
  assert.deepEqual({ ...db.database.prepare("SELECT provider_reference, status FROM payment_attempts").get() }, { provider_reference: "dpo-token-1", status: "awaiting_customer" });
  db.close();
});

test("hosted checkout can recover after a transient provider failure", async () => {
  const db = database();
  const input = { customerEmail: "customer@example.com", orderId: "SM-2026-PAY1", requestKey: "checkout-payment-retry", origin: "https://stylish.me", now: new Date("2026-07-29T10:00:00.000Z") };
  await assert.rejects(() => startDpoCheckout(db, config, { ...input, fetcher: async () => { throw new Error("temporary outage"); } }), /temporarily unavailable/i);
  const retried = await startDpoCheckout(db, config, { ...input, fetcher: xmlResponse("<API3G><Result>000</Result><TransToken>dpo-token-retry</TransToken></API3G>") });
  assert.equal(retried.checkoutUrl, "https://secure.3gdirectpay.com/payv2.php?ID=dpo-token-retry");
  assert.equal(db.database.prepare("SELECT status FROM payment_attempts").get().status, "awaiting_customer");
  db.close();
});

test("a stale creating attempt is released so checkout can recover", async () => {
  const db = database();
  db.database.prepare("INSERT INTO payment_attempts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run("stale-attempt", "SM-2026-PAY1", "dpo", null, "dpo:SM-2026-PAY1:old-request", 16500, "NAD", "creating", null, "2026-07-29T09:58:00.000Z", "2026-07-29T09:58:00.000Z");
  const result = await startDpoCheckout(db, config, {
    customerEmail: "customer@example.com", orderId: "SM-2026-PAY1", requestKey: "checkout-payment-after-stale",
    origin: "https://stylish.me", now: new Date("2026-07-29T10:00:00.000Z"),
    fetcher: xmlResponse("<API3G><Result>000</Result><TransToken>dpo-token-new</TransToken></API3G>"),
  });
  assert.equal(result.checkoutUrl, "https://secure.3gdirectpay.com/payv2.php?ID=dpo-token-new");
  assert.deepEqual(db.database.prepare("SELECT status FROM payment_attempts ORDER BY created_at").all().map(row => row.status), ["provider_error", "awaiting_customer"]);
  db.close();
});

test("a created DPO token is salvaged when the local batch write fails", async () => {
  const db = database();
  const originalBatch = db.batch.bind(db);
  let failBatch = true;
  db.batch = async statements => {
    if (failBatch) { failBatch = false; throw new Error("temporary D1 batch failure"); }
    return originalBatch(statements);
  };
  const result = await startDpoCheckout(db, config, {
    customerEmail: "customer@example.com", orderId: "SM-2026-PAY1", requestKey: "checkout-payment-salvage",
    origin: "https://stylish.me", now: new Date("2026-07-29T10:00:00.000Z"),
    fetcher: xmlResponse("<API3G><Result>000</Result><TransToken>dpo-token-salvaged</TransToken></API3G>"),
  });
  assert.equal(result.checkoutUrl, "https://secure.3gdirectpay.com/payv2.php?ID=dpo-token-salvaged");
  assert.deepEqual({ ...db.database.prepare("SELECT provider_reference, status FROM payment_attempts").get() }, { provider_reference: "dpo-token-salvaged", status: "awaiting_customer" });
  db.close();
});

test("verified payment confirms stock exactly once even when DPO calls back twice", async () => {
  const db = database();
  const now = "2026-07-29T10:00:00.000Z";
  db.database.prepare("INSERT INTO payment_attempts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run("payment-1", "SM-2026-PAY1", "dpo", "dpo-token-1", "dpo:SM-2026-PAY1", 16500, "NAD", "awaiting_customer", null, now, now);
  const paid = xmlResponse("<API3G><Result>000</Result><CompanyRef>SM-2026-PAY1</CompanyRef><TransactionAmount>165.00</TransactionAmount><TransactionCurrency>NAD</TransactionCurrency><FraudAlert>000</FraudAlert></API3G>");
  await reconcileDpoPayment(db, config, { transactionToken: "dpo-token-1", fetcher: paid, now: new Date(now) });
  await reconcileDpoPayment(db, config, { transactionToken: "dpo-token-1", fetcher: paid, now: new Date(now) });
  assert.deepEqual({ ...db.database.prepare("SELECT available_quantity, reserved_quantity FROM inventory_variants WHERE id = 'variant-1'").get() }, { available_quantity: 2, reserved_quantity: 0 });
  assert.equal(db.database.prepare("SELECT status FROM inventory_reservations").get().status, "confirmed");
  assert.deepEqual({ ...db.database.prepare("SELECT status, payment_status FROM commerce_orders").get() }, { status: "confirmed", payment_status: "paid" });
  assert.equal(db.database.prepare("SELECT status FROM seller_orders").get().status, "new");
  assert.equal(db.database.prepare("SELECT COUNT(*) AS count FROM ledger_entries").get().count, 2);
  db.close();
});

test("declined payment releases stock and never marks the order paid", async () => {
  const db = database();
  const now = "2026-07-29T10:00:00.000Z";
  db.database.prepare("INSERT INTO payment_attempts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run("payment-1", "SM-2026-PAY1", "dpo", "dpo-token-1", "dpo:SM-2026-PAY1", 16500, "NAD", "awaiting_customer", null, now, now);
  const result = await reconcileDpoPayment(db, config, {
    transactionToken: "dpo-token-1",
    fetcher: xmlResponse("<API3G><Result>901</Result><ResultExplanation>Declined</ResultExplanation></API3G>"),
    now: new Date(now),
  });
  assert.equal(result.status, "declined");
  assert.deepEqual({ ...db.database.prepare("SELECT available_quantity, reserved_quantity FROM inventory_variants").get() }, { available_quantity: 3, reserved_quantity: 0 });
  assert.deepEqual({ ...db.database.prepare("SELECT status, payment_status FROM commerce_orders").get() }, { status: "cancelled", payment_status: "declined" });
  db.close();
});

test("a paid callback after reservation expiry is refunded and never consumes stock", async () => {
  const db = database();
  const startedAt = "2026-07-29T10:00:00.000Z";
  db.database.prepare("INSERT INTO payment_attempts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run("payment-expired", "SM-2026-PAY1", "dpo", "dpo-token-expired", "dpo:SM-2026-PAY1", 16500, "NAD", "awaiting_customer", null, startedAt, startedAt);
  let calls = 0;
  const fetcher = async (_url, init) => {
    calls += 1;
    const body = String(init.body);
    if (body.includes("verifyToken")) return new Response("<API3G><Result>000</Result><CompanyRef>SM-2026-PAY1</CompanyRef><TransactionAmount>165.00</TransactionAmount><TransactionCurrency>NAD</TransactionCurrency><FraudAlert>000</FraudAlert></API3G>");
    assert.match(body, /refundToken/);
    return new Response("<API3G><Result>000</Result><TransRef>refund-1</TransRef></API3G>");
  };
  const result = await reconcileDpoPayment(db, config, { transactionToken: "dpo-token-expired", fetcher, now: new Date("2026-07-29T10:16:00.000Z") });
  assert.equal(result.status, "refunded_stock_expired");
  assert.equal(calls, 2);
  assert.deepEqual({ ...db.database.prepare("SELECT available_quantity, reserved_quantity FROM inventory_variants").get() }, { available_quantity: 3, reserved_quantity: 0 });
  assert.equal(db.database.prepare("SELECT status FROM inventory_reservations").get().status, "released");
  assert.deepEqual({ ...db.database.prepare("SELECT status, payment_status FROM commerce_orders").get() }, { status: "cancelled", payment_status: "refunded" });
  assert.equal(db.database.prepare("SELECT COUNT(*) AS count FROM ledger_entries").get().count, 0);
  assert.equal(db.database.prepare("SELECT status FROM refunds").get().status, "succeeded");
  db.close();
});

test("refunds are bounded by paid amount and idempotent", async () => {
  const db = database({ reservationStatus: "confirmed" });
  const now = "2026-07-29T10:00:00.000Z";
  db.database.prepare("UPDATE commerce_orders SET status='confirmed', payment_status='paid'").run();
  db.database.prepare("INSERT INTO payment_attempts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run("payment-1", "SM-2026-PAY1", "dpo", "dpo-token-1", "dpo:SM-2026-PAY1", 16500, "NAD", "paid", now, now, now);
  const input = { orderId: "SM-2026-PAY1", sellerOrderId: "seller-order-1", amountCents: 5000, reason: "Approved return", idempotencyKey: "refund-request-1234", now: new Date(now) };
  const first = await createDpoRefund(db, config, { ...input, fetcher: xmlResponse("<API3G><Result>000</Result><ResultExplanation>Refund successful</ResultExplanation></API3G>") });
  const second = await createDpoRefund(db, config, { ...input, fetcher: async () => { throw new Error("must not refund twice"); } });
  assert.equal(first.status, "succeeded");
  assert.equal(second.reused, true);
  assert.equal(db.database.prepare("SELECT COUNT(*) AS count FROM refunds").get().count, 1);
  assert.equal(db.database.prepare("SELECT payment_status FROM commerce_orders").get().payment_status, "partially_refunded");
  assert.equal(db.database.prepare("SELECT COUNT(*) AS count FROM ledger_entries WHERE entry_type LIKE '%refund%' OR entry_type LIKE '%reversal%'").get().count, 2);
  await assert.rejects(() => createDpoRefund(db, config, { ...input, amountCents: 12000, idempotencyKey: "refund-request-5678", fetcher: xmlResponse("<API3G><Result>000</Result></API3G>") }), /exceeds/);
  db.close();
});

test("an in-flight refund reserves capacity before calling the provider", async () => {
  const db = database({ reservationStatus: "confirmed" });
  const now = "2026-07-29T10:00:00.000Z";
  db.database.prepare("UPDATE commerce_orders SET status='confirmed', payment_status='paid'").run();
  db.database.prepare("INSERT INTO payment_attempts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run("payment-1", "SM-2026-PAY1", "dpo", "dpo-token-1", "dpo:SM-2026-PAY1", 16500, "NAD", "paid", now, now, now);
  let releaseProvider;
  const providerGate = new Promise(resolve => { releaseProvider = resolve; });
  const first = createDpoRefund(db, config, {
    orderId: "SM-2026-PAY1", sellerOrderId: "seller-order-1", amountCents: 7000,
    reason: "First approved return", idempotencyKey: "refund-concurrent-one", now: new Date(now),
    fetcher: async () => { await providerGate; return new Response("<API3G><Result>000</Result></API3G>"); },
  });
  await new Promise(resolve => setImmediate(resolve));
  let secondError;
  try {
    await createDpoRefund(db, config, {
      orderId: "SM-2026-PAY1", sellerOrderId: "seller-order-1", amountCents: 4000,
      reason: "Second approved return", idempotencyKey: "refund-concurrent-two", now: new Date(now),
      fetcher: xmlResponse("<API3G><Result>000</Result></API3G>"),
    });
  } catch (error) { secondError = error; }
  releaseProvider();
  await first;
  assert.match(secondError?.message ?? "", /exceeds|already being refunded/i);
  assert.equal(db.database.prepare("SELECT SUM(amount_cents) AS total FROM refunds WHERE status IN ('requested','pending_review','succeeded')").get().total, 7000);
  db.close();
});

test("seller and delivery portions can be fully refunded without fulfilment remaining open", async () => {
  const db = database({ reservationStatus: "confirmed" });
  const now = "2026-07-29T10:00:00.000Z";
  db.database.prepare("UPDATE commerce_orders SET status='confirmed', payment_status='paid'").run();
  db.database.prepare("UPDATE seller_orders SET status='new'").run();
  db.database.prepare("INSERT INTO payment_attempts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run("payment-1", "SM-2026-PAY1", "dpo", "dpo-token-1", "dpo:SM-2026-PAY1", 16500, "NAD", "paid", now, now, now);
  const refunded = xmlResponse("<API3G><Result>000</Result><TransRef>refund-ok</TransRef></API3G>");
  await createDpoRefund(db, config, { orderId: "SM-2026-PAY1", sellerOrderId: "seller-order-1", amountCents: 10000, reason: "Order cancelled", idempotencyKey: "refund-full-seller-1", fetcher: refunded, now: new Date(now) });
  assert.equal(db.database.prepare("SELECT status FROM seller_orders").get().status, "refunded");
  await assert.rejects(() => updateSellerFulfilment(db, "seller-1", "seller-order-1", { status: "preparing" }), /refunded/i);
  assert.equal(db.database.prepare("SELECT payment_status FROM commerce_orders").get().payment_status, "partially_refunded");
  await createDpoRefund(db, config, { orderId: "SM-2026-PAY1", sellerOrderId: "", amountCents: 6500, reason: "Delivery did not occur", idempotencyKey: "refund-full-delivery", fetcher: refunded, now: new Date(now) });
  assert.deepEqual({ ...db.database.prepare("SELECT status, payment_status FROM commerce_orders").get() }, { status: "refunded", payment_status: "refunded" });
  assert.equal(db.database.prepare("SELECT SUM(amount_cents) AS total FROM refunds WHERE status = 'succeeded'").get().total, 16500);
  db.close();
});