import {
  createDpoCheckout,
  type DpoConfig,
  mapDpoStatus,
  refundDpoPayment,
  verifiedPaymentMatches,
  verifyDpoPayment,
} from "./dpo-pay";
import { confirmReservation, type D1DatabaseLike, releaseOrderReservations } from "./inventory-reservations";

type PaymentOrderRow = {
  id: string;
  customer_email: string;
  total_cents: number;
  currency: string;
  status: string;
  payment_status: string;
  reservation_expires_at: string | null;
};

type PaymentAttemptRow = {
  id: string;
  order_id: string;
  provider_reference: string | null;
  amount_cents: number;
  currency: string;
  status: string;
};

export class PaymentValidationError extends Error {
  constructor(message: string) { super(message); this.name = "PaymentValidationError"; }
}

export class PaymentUnavailableError extends Error {
  constructor(message = "Secure payments are temporarily unavailable") { super(message); this.name = "PaymentUnavailableError"; }
}

const safeOrigin = (value: string) => {
  const url = new URL(value);
  if (url.protocol !== "https:" && url.hostname !== "localhost") throw new PaymentValidationError("A secure application URL is required");
  return url.origin;
};

const checkoutUrlForToken = (config: DpoConfig, token: string) => {
  const url = new URL(config.checkoutUrl);
  url.searchParams.set("ID", token);
  return url.toString();
};

export async function startDpoCheckout(db: D1DatabaseLike, config: DpoConfig, input: {
  customerEmail: string;
  orderId: string;
  requestKey: string;
  origin: string;
  now?: Date;
  fetcher?: typeof fetch;
}) {
  if (!config.available) throw new PaymentUnavailableError("Secure payments are being connected");
  if (!/^[A-Z0-9-]{8,80}$/i.test(input.orderId) || !/^[a-zA-Z0-9_-]{16,100}$/.test(input.requestKey)) {
    throw new PaymentValidationError("Payment request could not be verified");
  }
  const order = await db.prepare(`SELECT id, customer_email, total_cents, currency, status, payment_status, reservation_expires_at
    FROM commerce_orders WHERE id = ? AND customer_email = ? LIMIT 1`)
    .bind(input.orderId, input.customerEmail).first<PaymentOrderRow>();
  if (!order) throw new PaymentValidationError("Order was not found");
  if (order.payment_status === "paid") throw new PaymentValidationError("This order is already paid");
  if (["cancelled", "expired", "refunded"].includes(order.status)) throw new PaymentValidationError("This order can no longer be paid");
  const now = input.now ?? new Date();
  if (order.reservation_expires_at && order.reservation_expires_at <= now.toISOString()) {
    await releaseOrderReservations(db, order.id, now);
    await db.batch([
      db.prepare("UPDATE commerce_orders SET status = 'expired', payment_status = 'expired', updated_at = ? WHERE id = ? AND payment_status != 'paid'").bind(now.toISOString(), order.id),
      db.prepare("UPDATE seller_orders SET status = 'payment_expired', updated_at = ? WHERE order_id = ? AND status = 'awaiting_payment'").bind(now.toISOString(), order.id),
    ]);
    throw new PaymentValidationError("Your stock reservation expired. Return to your bag and try again");
  }

  const existing = await db.prepare(`SELECT id, order_id, provider_reference, amount_cents, currency, status
    FROM payment_attempts WHERE order_id = ? AND provider = 'dpo' ORDER BY created_at DESC LIMIT 1`)
    .bind(order.id).first<PaymentAttemptRow>();
  if (existing?.provider_reference && ["awaiting_customer", "pending"].includes(existing.status)) {
    return { checkoutUrl: checkoutUrlForToken(config, existing.provider_reference), orderId: order.id, reused: true };
  }
  if (existing?.status === "creating") throw new PaymentUnavailableError("Payment setup is still being confirmed. Please try again shortly");

  const attemptId = crypto.randomUUID();
  const attemptKey = `dpo:${order.id}`;
  const timestamp = now.toISOString();
  try {
    await db.prepare(`INSERT INTO payment_attempts
      (id, order_id, provider, provider_reference, idempotency_key, amount_cents, currency, status, created_at, updated_at)
      VALUES (?, ?, 'dpo', NULL, ?, ?, ?, 'creating', ?, ?)`)
      .bind(attemptId, order.id, attemptKey, order.total_cents, order.currency, timestamp, timestamp).run();
  } catch {
    const raced = await db.prepare(`SELECT id, order_id, provider_reference, amount_cents, currency, status
      FROM payment_attempts WHERE idempotency_key = ? LIMIT 1`).bind(attemptKey).first<PaymentAttemptRow>();
    if (raced?.provider_reference) return { checkoutUrl: checkoutUrlForToken(config, raced.provider_reference), orderId: order.id, reused: true };
    throw new PaymentUnavailableError("Payment setup is still being confirmed. Please try again shortly");
  }

  const origin = safeOrigin(input.origin);
  try {
    const created = await createDpoCheckout(config, {
      orderId: order.id,
      amountCents: order.total_cents,
      customerEmail: order.customer_email,
      returnUrl: `${origin}/api/payments/dpo/return?orderId=${encodeURIComponent(order.id)}`,
      callbackUrl: `${origin}/api/payments/dpo/callback?orderId=${encodeURIComponent(order.id)}`,
      serviceDate: now,
    }, input.fetcher);
    await db.batch([
      db.prepare("UPDATE payment_attempts SET provider_reference = ?, status = 'awaiting_customer', updated_at = ? WHERE id = ? AND status = 'creating'")
        .bind(created.transactionToken, timestamp, attemptId),
      db.prepare("UPDATE commerce_orders SET payment_status = 'awaiting_customer', updated_at = ? WHERE id = ? AND payment_status = 'unpaid'")
        .bind(timestamp, order.id),
    ]);
    return { checkoutUrl: created.checkoutUrl, orderId: order.id, reused: false };
  } catch (error) {
    await db.prepare("UPDATE payment_attempts SET status = 'provider_error', updated_at = ? WHERE id = ? AND status = 'creating'")
      .bind(new Date().toISOString(), attemptId).run().catch(() => undefined);
    throw error instanceof PaymentValidationError ? error : new PaymentUnavailableError();
  }
}

export async function reconcileDpoPayment(db: D1DatabaseLike, config: DpoConfig, input: {
  transactionToken?: string;
  orderId?: string;
  fetcher?: typeof fetch;
  now?: Date;
}) {
  if (!config.available) throw new PaymentUnavailableError();
  const token = typeof input.transactionToken === "string" ? input.transactionToken.trim() : "";
  const requestedOrder = typeof input.orderId === "string" ? input.orderId.trim() : "";
  if (token.length > 200 || requestedOrder.length > 100 || (!token && !requestedOrder)) throw new PaymentValidationError("Payment reference is invalid");
  const attempt = token
    ? await db.prepare(`SELECT id, order_id, provider_reference, amount_cents, currency, status FROM payment_attempts
        WHERE provider = 'dpo' AND provider_reference = ? LIMIT 1`).bind(token).first<PaymentAttemptRow>()
    : await db.prepare(`SELECT id, order_id, provider_reference, amount_cents, currency, status FROM payment_attempts
        WHERE provider = 'dpo' AND order_id = ? ORDER BY created_at DESC LIMIT 1`).bind(requestedOrder).first<PaymentAttemptRow>();
  if (!attempt || !attempt.provider_reference) throw new PaymentValidationError("Payment attempt was not found");
  if (requestedOrder && requestedOrder !== attempt.order_id) throw new PaymentValidationError("Payment reference does not match the order");
  const verified = await verifyDpoPayment(config, {
    transactionToken: attempt.provider_reference,
    orderId: attempt.order_id,
    markVerified: true,
  }, input.fetcher);
  const mapped = mapDpoStatus(verified.result);
  const timestamp = (input.now ?? new Date()).toISOString();

  if (mapped === "paid") {
    if (!verifiedPaymentMatches(verified, { orderId: attempt.order_id, amountCents: attempt.amount_cents, currency: attempt.currency })) {
      await db.prepare("UPDATE payment_attempts SET status = 'verification_mismatch', updated_at = ? WHERE id = ? AND status != 'paid'")
        .bind(timestamp, attempt.id).run();
      throw new PaymentValidationError("Payment could not be matched to this order");
    }
    await confirmReservation(db, attempt.order_id, new Date(timestamp));
    await db.batch([
      db.prepare("UPDATE payment_attempts SET status = 'paid', verified_at = COALESCE(verified_at, ?), updated_at = ? WHERE id = ?")
        .bind(timestamp, timestamp, attempt.id),
      db.prepare("UPDATE commerce_orders SET status = 'confirmed', payment_status = 'paid', reservation_expires_at = NULL, updated_at = ? WHERE id = ?")
        .bind(timestamp, attempt.order_id),
      db.prepare("UPDATE seller_orders SET status = 'new', updated_at = ? WHERE order_id = ? AND status = 'awaiting_payment'")
        .bind(timestamp, attempt.order_id),
    ]);
    return { status: "paid" as const, orderId: attempt.order_id };
  }

  if (["declined", "expired", "cancelled"].includes(mapped)) {
    await releaseOrderReservations(db, attempt.order_id, new Date(timestamp));
    await db.batch([
      db.prepare("UPDATE payment_attempts SET status = ?, verified_at = ?, updated_at = ? WHERE id = ? AND status != 'paid'")
        .bind(mapped, timestamp, timestamp, attempt.id),
      db.prepare("UPDATE commerce_orders SET status = ?, payment_status = ?, updated_at = ? WHERE id = ? AND payment_status != 'paid'")
        .bind(mapped === "expired" ? "expired" : "cancelled", mapped, timestamp, attempt.order_id),
      db.prepare("UPDATE seller_orders SET status = 'payment_failed', updated_at = ? WHERE order_id = ? AND status = 'awaiting_payment'")
        .bind(timestamp, attempt.order_id),
    ]);
    return { status: mapped, orderId: attempt.order_id };
  }

  await db.prepare("UPDATE payment_attempts SET status = ?, verified_at = ?, updated_at = ? WHERE id = ? AND status != 'paid'")
    .bind(mapped === "error" ? "verification_error" : "pending", timestamp, timestamp, attempt.id).run();
  return { status: mapped, orderId: attempt.order_id };
}

export async function createDpoRefund(db: D1DatabaseLike, config: DpoConfig, input: {
  orderId: string;
  amountCents: number;
  reason: string;
  idempotencyKey: string;
  fetcher?: typeof fetch;
  now?: Date;
}) {
  if (!config.available) throw new PaymentUnavailableError();
  if (!/^[a-zA-Z0-9_-]{16,100}$/.test(input.idempotencyKey) || !Number.isSafeInteger(input.amountCents) || input.amountCents < 1) {
    throw new PaymentValidationError("Refund request is invalid");
  }
  const reason = typeof input.reason === "string" ? input.reason.trim().slice(0, 300) : "";
  if (!reason) throw new PaymentValidationError("Refund reason is required");
  const existing = await db.prepare("SELECT id, status, amount_cents FROM refunds WHERE idempotency_key = ? LIMIT 1")
    .bind(input.idempotencyKey).first<{ id: string; status: string; amount_cents: number }>();
  if (existing) return { refundId: existing.id, status: existing.status, amountCents: existing.amount_cents, reused: true };
  const payment = await db.prepare(`SELECT p.id, p.provider_reference, p.amount_cents,
      COALESCE((SELECT SUM(r.amount_cents) FROM refunds r WHERE r.payment_attempt_id = p.id AND r.status IN ('succeeded','pending_review')), 0) AS refunded_cents
    FROM payment_attempts p JOIN commerce_orders o ON o.id = p.order_id
    WHERE p.order_id = ? AND p.provider = 'dpo' AND p.status = 'paid' AND o.payment_status IN ('paid','partially_refunded') LIMIT 1`)
    .bind(input.orderId).first<{ id: string; provider_reference: string; amount_cents: number; refunded_cents: number }>();
  if (!payment?.provider_reference) throw new PaymentValidationError("A verified paid transaction was not found");
  if (input.amountCents > payment.amount_cents - Number(payment.refunded_cents ?? 0)) throw new PaymentValidationError("Refund exceeds the remaining paid amount");

  const refundId = crypto.randomUUID();
  const timestamp = (input.now ?? new Date()).toISOString();
  await db.prepare(`INSERT INTO refunds
    (id, order_id, payment_attempt_id, idempotency_key, amount_cents, reason, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'requested', ?, ?)`)
    .bind(refundId, input.orderId, payment.id, input.idempotencyKey, input.amountCents, reason, timestamp, timestamp).run();
  try {
    const result = await refundDpoPayment(config, {
      transactionToken: payment.provider_reference,
      amountCents: input.amountCents,
      reason,
      refundReference: refundId,
    }, input.fetcher);
    const succeeded = result.result === "000";
    const status = succeeded ? "succeeded" : "failed";
    const totalRefunded = Number(payment.refunded_cents ?? 0) + (succeeded ? input.amountCents : 0);
    await db.batch([
      db.prepare("UPDATE refunds SET status = ?, provider_reference = ?, updated_at = ? WHERE id = ?")
        .bind(status, result.transactionReference ?? null, timestamp, refundId),
      ...(succeeded ? [db.prepare("UPDATE commerce_orders SET payment_status = ?, status = CASE WHEN ? = total_cents THEN 'refunded' ELSE status END, updated_at = ? WHERE id = ?")
        .bind(totalRefunded === payment.amount_cents ? "refunded" : "partially_refunded", totalRefunded, timestamp, input.orderId)] : []),
    ]);
    if (!succeeded) throw new PaymentUnavailableError(result.explanation || "Refund was declined by the payment provider");
    return { refundId, status, amountCents: input.amountCents, reused: false };
  } catch (error) {
    await db.prepare("UPDATE refunds SET status = CASE WHEN status = 'requested' THEN 'pending_review' ELSE status END, updated_at = ? WHERE id = ?")
      .bind(new Date().toISOString(), refundId).run().catch(() => undefined);
    throw error;
  }
}
