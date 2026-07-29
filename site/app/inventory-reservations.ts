export type D1StatementLike = {
  bind: (...values: unknown[]) => D1StatementLike;
  first: <T = Record<string, unknown>>() => Promise<T | null>;
  all: <T = Record<string, unknown>>() => Promise<{ results?: T[] }>;
  run: () => Promise<unknown>;
};

export type D1DatabaseLike = {
  prepare: (sql: string) => D1StatementLike;
  batch: (statements: D1StatementLike[]) => Promise<unknown[]>;
};

export type ReservationLine = { variantId: string; quantity: number };

export class StockReservationError extends Error {
  constructor(message = "One or more pieces no longer have enough stock") {
    super(message);
    this.name = "StockReservationError";
  }
}

export function reservationExpiry(now = new Date(), minutes = 15) {
  return new Date(now.getTime() + minutes * 60_000).toISOString();
}

export function reservationStatements(
  db: D1DatabaseLike,
  input: { orderId: string; checkoutKey: string; expiresAt: string; lines: ReservationLine[] },
) {
  const now = new Date().toISOString();
  return input.lines.flatMap((line, index) => [
    // The inventory CHECK (reserved_quantity <= available_quantity) makes an
    // over-reservation abort the entire D1 batch instead of partially ordering.
    db.prepare(`UPDATE inventory_variants
      SET reserved_quantity = reserved_quantity + ?, version = version + 1, updated_at = ?
      WHERE id = ?`).bind(line.quantity, now, line.variantId),
    db.prepare(`INSERT INTO inventory_reservations
      (id, idempotency_key, order_id, variant_id, quantity, status, expires_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)`)
      .bind(crypto.randomUUID(), `${input.checkoutKey}:${index}`, input.orderId, line.variantId, line.quantity, input.expiresAt, now, now),
  ]);
}

export async function reserveOrderInventory(
  db: D1DatabaseLike,
  input: { orderId: string; checkoutKey: string; expiresAt: string; lines: ReservationLine[] },
) {
  if (!input.lines.length || input.lines.some((line) => !line.variantId || !Number.isInteger(line.quantity) || line.quantity < 1)) {
    throw new StockReservationError("The order does not contain reservable stock");
  }
  try {
    await db.batch(reservationStatements(db, input));
  } catch {
    throw new StockReservationError();
  }
}

export async function releaseExpiredReservations(db: D1DatabaseLike, now = new Date()) {
  const timestamp = now.toISOString();
  await db.batch([
    db.prepare(`UPDATE inventory_variants
      SET reserved_quantity = MAX(0, reserved_quantity - COALESCE((
        SELECT SUM(quantity) FROM inventory_reservations
        WHERE variant_id = inventory_variants.id AND status = 'active' AND expires_at <= ?
      ), 0)), version = version + 1, updated_at = ?
      WHERE EXISTS (
        SELECT 1 FROM inventory_reservations
        WHERE variant_id = inventory_variants.id AND status = 'active' AND expires_at <= ?
      )`).bind(timestamp, timestamp, timestamp),
    db.prepare(`UPDATE inventory_reservations
      SET status = 'expired', updated_at = ?
      WHERE status = 'active' AND expires_at <= ?`).bind(timestamp, timestamp),
  ]);
}

export async function confirmReservation(db: D1DatabaseLike, orderId: string, now = new Date()) {
  const timestamp = now.toISOString();
  const coverageGuard = `EXISTS (SELECT 1 FROM commerce_order_items required WHERE required.order_id = ?)
    AND NOT EXISTS (
      SELECT 1 FROM (
        SELECT variant_id, SUM(quantity) AS required_quantity FROM commerce_order_items
        WHERE order_id = ? GROUP BY variant_id
      ) required
      LEFT JOIN (
        SELECT variant_id, SUM(quantity) AS held_quantity FROM inventory_reservations
        WHERE order_id = ? AND status = 'active' AND expires_at > ? GROUP BY variant_id
      ) held ON held.variant_id = required.variant_id
      WHERE required.required_quantity != COALESCE(held.held_quantity, 0)
    )`;
  await db.batch([
    db.prepare(`UPDATE inventory_variants
      SET available_quantity = available_quantity - COALESCE((
        SELECT SUM(quantity) FROM inventory_reservations
        WHERE variant_id = inventory_variants.id AND order_id = ? AND status = 'active' AND expires_at > ?
      ), 0), reserved_quantity = reserved_quantity - COALESCE((
        SELECT SUM(quantity) FROM inventory_reservations
        WHERE variant_id = inventory_variants.id AND order_id = ? AND status = 'active' AND expires_at > ?
      ), 0), version = version + 1, updated_at = ?
      WHERE EXISTS (
        SELECT 1 FROM inventory_reservations
        WHERE variant_id = inventory_variants.id AND order_id = ? AND status = 'active' AND expires_at > ?
      ) AND ${coverageGuard}`)
      .bind(orderId, timestamp, orderId, timestamp, timestamp, orderId, timestamp, orderId, orderId, orderId, timestamp),
    db.prepare(`UPDATE inventory_reservations SET status = 'confirmed', updated_at = ?
      WHERE order_id = ? AND status = 'active' AND expires_at > ? AND ${coverageGuard}`)
      .bind(timestamp, orderId, timestamp, orderId, orderId, orderId, timestamp),
  ]);
  const confirmed = await db.prepare(`SELECT CASE WHEN EXISTS (
      SELECT 1 FROM commerce_order_items required WHERE required.order_id = ?
    ) AND NOT EXISTS (
      SELECT 1 FROM (
        SELECT variant_id, SUM(quantity) AS required_quantity FROM commerce_order_items
        WHERE order_id = ? GROUP BY variant_id
      ) required
      LEFT JOIN (
        SELECT variant_id, SUM(quantity) AS held_quantity FROM inventory_reservations
        WHERE order_id = ? AND status = 'confirmed' GROUP BY variant_id
      ) held ON held.variant_id = required.variant_id
      WHERE required.required_quantity != COALESCE(held.held_quantity, 0)
    ) THEN 1 ELSE 0 END AS complete`).bind(orderId, orderId, orderId).first<{ complete: number }>();
  return confirmed?.complete === 1;
}

export async function releaseOrderReservations(db: D1DatabaseLike, orderId: string, now = new Date()) {
  const timestamp = now.toISOString();
  await db.batch([
    db.prepare(`UPDATE inventory_variants
      SET reserved_quantity = MAX(0, reserved_quantity - COALESCE((
        SELECT SUM(quantity) FROM inventory_reservations
        WHERE variant_id = inventory_variants.id AND order_id = ? AND status = 'active'
      ), 0)), version = version + 1, updated_at = ?
      WHERE EXISTS (
        SELECT 1 FROM inventory_reservations
        WHERE variant_id = inventory_variants.id AND order_id = ? AND status = 'active'
      )`).bind(orderId, timestamp, orderId),
    db.prepare(`UPDATE inventory_reservations SET status = 'released', updated_at = ?
      WHERE order_id = ? AND status = 'active'`).bind(timestamp, orderId),
  ]);
}
