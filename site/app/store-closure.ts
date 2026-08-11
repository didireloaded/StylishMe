import type { D1DatabaseLike } from "./inventory-reservations";
import { publicBlockerMessage, recoveryDeadline, type AccountLifecycleBlocker, type LifecycleEligibility } from "./account-lifecycle";

type MediaStore = { delete: (key: string) => Promise<unknown> };
type SellerRow = { invite_token: string; store_name: string; state_json: string };
type ClosureRow = {
  seller_id: string;
  status: string;
  previous_product_statuses_json: string;
  scheduled_for: string;
};

export class StoreClosureError extends Error {
  constructor(public code: "store_not_found" | "confirmation_invalid" | "closure_blocked", message: string, public blockers: ReturnType<typeof publicBlockerMessage>[] = []) {
    super(message);
  }
}

async function ownedSeller(db: D1DatabaseLike, email: string) {
  return db.prepare("SELECT invite_token, store_name, state_json FROM seller_state WHERE owner_email = ? LIMIT 1")
    .bind(email.trim().toLowerCase()).first<SellerRow>();
}

async function count(db: D1DatabaseLike, sql: string, sellerId: string) {
  const row = await db.prepare(sql).bind(sellerId).first<{ count: number }>();
  return Number(row?.count ?? 0);
}

export async function checkStoreClosureEligibility(db: D1DatabaseLike, email: string): Promise<LifecycleEligibility> {
  const seller = await ownedSeller(db, email);
  if (!seller) return { allowed: true, blockers: [] };
  const [activeOrders, reservedStock, pendingRefunds] = await Promise.all([
    count(db, "SELECT COUNT(*) AS count FROM seller_orders WHERE seller_id = ? AND status NOT IN ('completed', 'cancelled')", seller.invite_token),
    count(db, `SELECT COUNT(*) AS count FROM inventory_reservations r
      JOIN inventory_variants v ON v.id = r.variant_id
      JOIN catalog_products p ON p.id = v.product_id
      WHERE p.seller_id = ? AND r.status = 'active'`, seller.invite_token),
    count(db, `SELECT COUNT(*) AS count FROM refunds f
      JOIN seller_orders so ON so.id = f.seller_order_id
      WHERE so.seller_id = ? AND f.status NOT IN ('refunded', 'declined', 'cancelled')`, seller.invite_token),
  ]);
  const blockers: AccountLifecycleBlocker[] = [];
  if (activeOrders) blockers.push({ code: "active_order", count: activeOrders, route: "/seller/orders?filter=needs-action" });
  if (reservedStock) blockers.push({ code: "reserved_stock", count: reservedStock, route: "/seller/inventory" });
  if (pendingRefunds) blockers.push({ code: "pending_refund", count: pendingRefunds, route: "/seller/orders?filter=returns" });
  return blockers.length ? { allowed: false, blockers } : { allowed: true, blockers: [] };
}

function withRole(profileJson: string, accountRole: "customer" | "seller") {
  try { return JSON.stringify({ ...JSON.parse(profileJson), accountRole }); }
  catch { return JSON.stringify({ accountRole }); }
}

export async function scheduleStoreClosure(db: D1DatabaseLike, email: string, confirmation: string, now = new Date()) {
  const normalized = email.trim().toLowerCase();
  const seller = await ownedSeller(db, normalized);
  if (!seller) throw new StoreClosureError("store_not_found", "No active seller store was found");
  if (confirmation.trim() !== seller.store_name) throw new StoreClosureError("confirmation_invalid", "Enter the store name exactly as shown");
  const existing = await db.prepare(`SELECT seller_id, status, previous_product_statuses_json, scheduled_for
    FROM seller_store_closure_requests WHERE seller_id = ? AND status = 'pending' LIMIT 1`)
    .bind(seller.invite_token).first<ClosureRow>();
  if (existing) return { scheduledFor: existing.scheduled_for, storeName: seller.store_name };
  const eligibility = await checkStoreClosureEligibility(db, normalized);
  if (!eligibility.allowed) throw new StoreClosureError("closure_blocked", "Resolve store obligations before closing", eligibility.blockers.map(publicBlockerMessage));
  const products = await db.prepare("SELECT id, status FROM catalog_products WHERE seller_id = ?")
    .bind(seller.invite_token).all<{ id: string; status: string }>();
  const statuses = Object.fromEntries((products.results ?? []).map(product => [product.id, product.status]));
  const profile = await db.prepare("SELECT profile_json FROM customer_state WHERE email = ? LIMIT 1")
    .bind(normalized).first<{ profile_json: string }>();
  const requestedAt = now.toISOString();
  const scheduledFor = recoveryDeadline(now);
  await db.batch([
    db.prepare(`INSERT INTO seller_store_closure_requests
      (id, seller_id, account_email, status, previous_product_statuses_json, requested_at, scheduled_for, cancelled_at, completed_at)
      VALUES (?, ?, ?, 'pending', ?, ?, ?, NULL, NULL)`)
      .bind(crypto.randomUUID(), seller.invite_token, normalized, JSON.stringify(statuses), requestedAt, scheduledFor),
    db.prepare("UPDATE seller_state SET approved = 0, updated_at = ? WHERE invite_token = ?").bind(requestedAt, seller.invite_token),
    db.prepare("UPDATE catalog_products SET status = 'archived', updated_at = ? WHERE seller_id = ?").bind(requestedAt, seller.invite_token),
    db.prepare("UPDATE customer_state SET profile_json = ?, updated_at = ? WHERE email = ?")
      .bind(withRole(profile?.profile_json ?? "{}", "customer"), requestedAt, normalized),
  ]);
  return { scheduledFor, storeName: seller.store_name };
}

export async function pendingStoreClosure(db: D1DatabaseLike, email: string) {
  return db.prepare(`SELECT r.scheduled_for, s.store_name FROM seller_store_closure_requests r
    JOIN seller_state s ON s.invite_token = r.seller_id
    WHERE r.account_email = ? AND r.status = 'pending' LIMIT 1`)
    .bind(email.trim().toLowerCase()).first<{ scheduled_for: string; store_name: string }>();
}

export async function cancelStoreClosure(db: D1DatabaseLike, email: string, now = new Date()) {
  const normalized = email.trim().toLowerCase();
  const request = await db.prepare(`SELECT r.seller_id, r.status, r.previous_product_statuses_json, r.scheduled_for
    FROM seller_store_closure_requests r WHERE r.account_email = ? AND r.status = 'pending' LIMIT 1`)
    .bind(normalized).first<ClosureRow>();
  if (!request || request.scheduled_for <= now.toISOString()) return false;
  let statuses: Record<string, string> = {};
  try { statuses = JSON.parse(request.previous_product_statuses_json) as Record<string, string>; } catch {}
  const profile = await db.prepare("SELECT profile_json FROM customer_state WHERE email = ? LIMIT 1")
    .bind(normalized).first<{ profile_json: string }>();
  const timestamp = now.toISOString();
  const statements = [
    db.prepare("UPDATE seller_store_closure_requests SET status = 'cancelled', cancelled_at = ? WHERE seller_id = ? AND status = 'pending'").bind(timestamp, request.seller_id),
    db.prepare("UPDATE seller_state SET approved = 1, updated_at = ? WHERE invite_token = ?").bind(timestamp, request.seller_id),
    db.prepare("UPDATE customer_state SET profile_json = ?, updated_at = ? WHERE email = ?").bind(withRole(profile?.profile_json ?? "{}", "seller"), timestamp, normalized),
    ...Object.entries(statuses).map(([productId, status]) => db.prepare("UPDATE catalog_products SET status = ?, updated_at = ? WHERE id = ? AND seller_id = ?")
      .bind(status, timestamp, productId, request.seller_id)),
  ];
  await db.batch(statements);
  return true;
}

function sellerMediaKeys(stateJson: string) {
  const keys = new Set<string>();
  try {
    const state = JSON.parse(stateJson) as { products?: Array<{ images?: string[] }> };
    for (const product of state.products ?? []) for (const image of product.images ?? []) {
      const marker = "/api/seller-images/";
      const index = image.indexOf(marker);
      if (index >= 0) keys.add(decodeURIComponent(image.slice(index + marker.length)));
    }
  } catch {}
  return [...keys];
}

export async function processDueStoreClosures(db: D1DatabaseLike, media: MediaStore, now = new Date()) {
  const due = await db.prepare(`SELECT r.seller_id, r.account_email, s.state_json
    FROM seller_store_closure_requests r JOIN seller_state s ON s.invite_token = r.seller_id
    WHERE r.status = 'pending' AND r.scheduled_for <= ? LIMIT 25`)
    .bind(now.toISOString()).all<{ seller_id: string; account_email: string; state_json: string }>();
  let processed = 0; let failed = 0;
  for (const closure of due.results ?? []) {
    try {
      await Promise.all(sellerMediaKeys(closure.state_json).map(key => media.delete(key)));
      await db.batch([
        db.prepare("UPDATE catalog_products SET status = 'archived', updated_at = ? WHERE seller_id = ?").bind(now.toISOString(), closure.seller_id),
        db.prepare("UPDATE seller_state SET owner_email = NULL, approved = 0, state_json = '{}', updated_at = ? WHERE invite_token = ?").bind(now.toISOString(), closure.seller_id),
        db.prepare("UPDATE seller_store_closure_requests SET status = 'completed', completed_at = ? WHERE seller_id = ? AND status = 'pending'").bind(now.toISOString(), closure.seller_id),
      ]);
      processed += 1;
    } catch { failed += 1; }
  }
  return { processed, failed };
}
