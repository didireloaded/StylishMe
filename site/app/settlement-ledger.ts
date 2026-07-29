import type { D1DatabaseLike, D1StatementLike } from "./inventory-reservations";

export class SettlementValidationError extends Error {
  constructor(message: string) { super(message); this.name = "SettlementValidationError"; }
}

export function paidOrderLedgerStatements(db: D1DatabaseLike, orderId: string, paymentAttemptId: string, now = new Date().toISOString()): D1StatementLike[] {
  return [
    db.prepare(`INSERT OR IGNORE INTO ledger_entries
      (id, seller_order_id, payout_batch_id, entry_type, amount_cents, currency, source_type, source_id, idempotency_key, created_at)
      SELECT lower(hex(randomblob(16))), id, NULL, 'seller_sale_credit', seller_net_cents, 'NAD', 'payment', ? || ':' || id,
        'payment:' || ? || ':' || id || ':seller', ? FROM seller_orders WHERE order_id = ?`)
      .bind(paymentAttemptId, paymentAttemptId, now, orderId),
    db.prepare(`INSERT OR IGNORE INTO ledger_entries
      (id, seller_order_id, payout_batch_id, entry_type, amount_cents, currency, source_type, source_id, idempotency_key, created_at)
      SELECT lower(hex(randomblob(16))), id, NULL, 'platform_commission_credit', commission_cents, 'NAD', 'payment', ? || ':' || id,
        'payment:' || ? || ':' || id || ':commission', ? FROM seller_orders WHERE order_id = ?`)
      .bind(paymentAttemptId, paymentAttemptId, now, orderId),
  ];
}

export function refundLedgerStatements(db: D1DatabaseLike, input: {
  sellerOrderId: string;
  refundId: string;
  sellerDebitCents: number;
  commissionDebitCents: number;
  now?: string;
}): D1StatementLike[] {
  const now = input.now ?? new Date().toISOString();
  return [
    db.prepare(`INSERT OR IGNORE INTO ledger_entries
      (id, seller_order_id, payout_batch_id, entry_type, amount_cents, currency, source_type, source_id, idempotency_key, created_at)
      VALUES (lower(hex(randomblob(16))), ?, NULL, 'seller_refund_debit', ?, 'NAD', 'refund', ?, ?, ?)`)
      .bind(input.sellerOrderId, -Math.abs(input.sellerDebitCents), `${input.refundId}:${input.sellerOrderId}`, `refund:${input.refundId}:seller`, now),
    db.prepare(`INSERT OR IGNORE INTO ledger_entries
      (id, seller_order_id, payout_batch_id, entry_type, amount_cents, currency, source_type, source_id, idempotency_key, created_at)
      VALUES (lower(hex(randomblob(16))), ?, NULL, 'platform_commission_reversal', ?, 'NAD', 'refund', ?, ?, ?)`)
      .bind(input.sellerOrderId, -Math.abs(input.commissionDebitCents), `${input.refundId}:${input.sellerOrderId}`, `refund:${input.refundId}:commission`, now),
  ];
}

type SummaryRow = { available_cents: number; pending_cents: number; in_payout_cents: number; paid_cents: number; commission_cents: number };

export async function getSellerSettlementSummary(db: D1DatabaseLike, sellerId: string, now = new Date()) {
  const row = await db.prepare(`SELECT
      COALESCE(SUM(CASE WHEN le.entry_type LIKE 'seller_%' AND le.payout_batch_id IS NULL AND so.payout_eligible_at IS NOT NULL AND so.payout_eligible_at <= ? THEN le.amount_cents ELSE 0 END), 0) AS available_cents,
      COALESCE(SUM(CASE WHEN le.entry_type LIKE 'seller_%' AND le.payout_batch_id IS NULL AND (so.payout_eligible_at IS NULL OR so.payout_eligible_at > ?) THEN le.amount_cents ELSE 0 END), 0) AS pending_cents,
      COALESCE(SUM(CASE WHEN le.entry_type LIKE 'seller_%' AND pb.status IN ('held','ready_for_transfer','processing') THEN le.amount_cents ELSE 0 END), 0) AS in_payout_cents,
      COALESCE(SUM(CASE WHEN le.entry_type LIKE 'seller_%' AND pb.status = 'paid' THEN le.amount_cents ELSE 0 END), 0) AS paid_cents,
      COALESCE(SUM(CASE WHEN le.entry_type LIKE 'platform_%' THEN le.amount_cents ELSE 0 END), 0) AS commission_cents
    FROM seller_orders so LEFT JOIN ledger_entries le ON le.seller_order_id = so.id
      LEFT JOIN payout_batches pb ON pb.id = le.payout_batch_id
    WHERE so.seller_id = ?`)
    .bind(now.toISOString(), now.toISOString(), sellerId).first<SummaryRow>();
  return {
    availableCents: Number(row?.available_cents ?? 0),
    pendingCents: Number(row?.pending_cents ?? 0),
    inPayoutCents: Number(row?.in_payout_cents ?? 0),
    paidCents: Number(row?.paid_cents ?? 0),
    commissionCents: Number(row?.commission_cents ?? 0),
  };
}

export async function createHeldPayoutBatch(db: D1DatabaseLike, input: { sellerId: string; idempotencyKey: string; now?: Date }) {
  if (!input.sellerId || !/^[a-zA-Z0-9_-]{16,100}$/.test(input.idempotencyKey)) throw new SettlementValidationError("Payout request is invalid");
  const existing = await db.prepare("SELECT id, amount_cents, status FROM payout_batches WHERE idempotency_key = ? LIMIT 1")
    .bind(input.idempotencyKey).first<{ id: string; amount_cents: number; status: string }>();
  if (existing) return { id: existing.id, amountCents: existing.amount_cents, status: existing.status, reused: true };
  const id = crypto.randomUUID();
  const timestamp = (input.now ?? new Date()).toISOString();
  await db.batch([
    db.prepare(`INSERT INTO payout_batches
      (id, seller_id, idempotency_key, amount_cents, currency, status, created_at)
      SELECT ?, ?, ?, SUM(le.amount_cents), 'NAD', 'held', ?
      FROM ledger_entries le JOIN seller_orders so ON so.id = le.seller_order_id
      WHERE so.seller_id = ? AND le.entry_type LIKE 'seller_%' AND le.payout_batch_id IS NULL
        AND so.payout_eligible_at IS NOT NULL AND so.payout_eligible_at <= ?
      HAVING SUM(le.amount_cents) > 0`)
      .bind(id, input.sellerId, input.idempotencyKey, timestamp, input.sellerId, timestamp),
    db.prepare(`UPDATE ledger_entries SET payout_batch_id = ? WHERE payout_batch_id IS NULL
      AND entry_type LIKE 'seller_%' AND seller_order_id IN (
        SELECT id FROM seller_orders WHERE seller_id = ? AND payout_eligible_at IS NOT NULL AND payout_eligible_at <= ?
      ) AND EXISTS (SELECT 1 FROM payout_batches WHERE id = ?)`)
      .bind(id, input.sellerId, timestamp, id),
  ]);
  const batch = await db.prepare("SELECT id, amount_cents, status FROM payout_batches WHERE id = ? LIMIT 1")
    .bind(id).first<{ id: string; amount_cents: number; status: string }>();
  if (!batch) throw new SettlementValidationError("No eligible seller balance is ready for payout");
  return { id: batch.id, amountCents: batch.amount_cents, status: batch.status, reused: false };
}

export async function recordPayoutConfirmation(db: D1DatabaseLike, input: { batchId: string; providerReference: string; now?: Date }) {
  const reference = input.providerReference.trim().slice(0, 160);
  if (!reference) throw new SettlementValidationError("A verified transfer reference is required");
  const timestamp = (input.now ?? new Date()).toISOString();
  await db.prepare(`UPDATE payout_batches SET status = 'paid', provider_reference = ?, released_at = ?
    WHERE id = ? AND status IN ('held','ready_for_transfer','processing')`)
    .bind(reference, timestamp, input.batchId).run();
  const batch = await db.prepare("SELECT id, amount_cents, status, provider_reference FROM payout_batches WHERE id = ? LIMIT 1")
    .bind(input.batchId).first<{ id: string; amount_cents: number; status: string; provider_reference: string | null }>();
  if (!batch || batch.status !== "paid") throw new SettlementValidationError("Payout batch could not be confirmed");
  return { id: batch.id, amountCents: batch.amount_cents, status: batch.status, providerReference: batch.provider_reference };
}
