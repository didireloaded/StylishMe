import { currentDhlConfig, fetchDhlTracking, type DhlConfig } from "./courier-tracking";
import {
  assertFulfilmentTransition,
  FulfilmentValidationError,
  payoutEligibilityDate,
  statusLabel,
  type FulfilmentKind,
} from "./fulfilment-domain";
import type { D1DatabaseLike } from "./inventory-reservations";

type SellerOrderRow = {
  seller_order_id: string;
  order_id: string;
  seller_id: string;
  store_name: string;
  status: string;
  subtotal_cents: number;
  fulfilment_method: string;
  address_snapshot_json: string | null;
  payout_eligible_at: string | null;
  created_at: string;
};

type ItemRow = {
  product_id: string;
  product_name_snapshot: string;
  variant_snapshot_json: string;
  quantity: number;
  line_total_cents: number;
};

type ShipmentRow = {
  id: string;
  provider: string;
  tracking_number: string | null;
  tracking_url: string | null;
  status: string;
  estimated_delivery_at: string | null;
  last_synced_at: string | null;
};

type EventRow = {
  provider_event_id: string | null;
  status: string;
  description: string;
  location: string | null;
  occurred_at: string;
};

export type FulfilmentEvent = { status: string; label: string; description: string; location: string | null; occurredAt: string };
export type OrderFulfilment = {
  id: string;
  orderId: string;
  storeName: string;
  status: string;
  statusLabel: string;
  fulfilmentMethod: FulfilmentKind;
  subtotal: number;
  createdAt: string;
  payoutEligibleAt: string | null;
  deliveryAddress: { label: string; street: string; city: string } | null;
  items: Array<{ productId: string; name: string; size: string; colour: string; quantity: number; total: number }>;
  provider: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  estimatedDeliveryAt: string | null;
  lastSyncedAt: string | null;
  events: FulfilmentEvent[];
};

const fulfilmentKind = (value: string): FulfilmentKind => value === "collection" ? "collection" : "delivery";
const safeJson = (value: string | null) => { try { return value ? JSON.parse(value) : {}; } catch { return {}; } };
const deliveryAddress = (snapshot: string | null) => {
  const parsed = safeJson(snapshot) as { address?: Record<string, unknown> };
  const address = parsed.address;
  if (!address) return null;
  const clean = (value: unknown, length: number) => typeof value === "string" ? value.trim().slice(0, length) : "";
  const result = { label: clean(address.label, 60), street: clean(address.street, 180), city: clean(address.city, 100) };
  return result.street && result.city ? result : null;
};

async function projectOrder(db: D1DatabaseLike, row: SellerOrderRow): Promise<OrderFulfilment> {
  const [itemsResult, shipment] = await Promise.all([
    db.prepare(`SELECT product_id, product_name_snapshot, variant_snapshot_json, quantity, line_total_cents
      FROM commerce_order_items WHERE seller_order_id = ? ORDER BY id`).bind(row.seller_order_id).all<ItemRow>(),
    db.prepare(`SELECT id, provider, tracking_number, tracking_url, status, estimated_delivery_at, last_synced_at
      FROM shipments WHERE seller_order_id = ? LIMIT 1`).bind(row.seller_order_id).first<ShipmentRow>(),
  ]);
  const eventsResult = shipment
    ? await db.prepare(`SELECT provider_event_id, status, description, location, occurred_at
        FROM shipment_events WHERE shipment_id = ? ORDER BY occurred_at,
          CASE status WHEN 'new' THEN 1 WHEN 'preparing' THEN 2 WHEN 'shipped' THEN 3 WHEN 'in_transit' THEN 4
            WHEN 'out_for_delivery' THEN 5 WHEN 'delivered' THEN 6 WHEN 'ready_to_collect' THEN 3 WHEN 'collected' THEN 4 ELSE 9 END,
          id`).bind(shipment.id).all<EventRow>()
    : { results: [] as EventRow[] };
  const items = (itemsResult.results ?? []).map(item => {
    const variant = safeJson(item.variant_snapshot_json) as Record<string, unknown>;
    return {
      productId: item.product_id,
      name: item.product_name_snapshot,
      size: typeof variant.size === "string" ? variant.size : "",
      colour: typeof variant.displayColour === "string" ? variant.displayColour : typeof variant.colour === "string" ? variant.colour : "",
      quantity: item.quantity,
      total: item.line_total_cents / 100,
    };
  });
  return {
    id: row.seller_order_id,
    orderId: row.order_id,
    storeName: row.store_name,
    status: row.status,
    statusLabel: statusLabel(row.status),
    fulfilmentMethod: fulfilmentKind(row.fulfilment_method),
    subtotal: row.subtotal_cents / 100,
    createdAt: row.created_at,
    payoutEligibleAt: row.payout_eligible_at,
    deliveryAddress: fulfilmentKind(row.fulfilment_method) === "delivery" ? deliveryAddress(row.address_snapshot_json) : null,
    items,
    provider: shipment?.provider && !["stylishme", "store_collection"].includes(shipment.provider) ? shipment.provider : null,
    trackingNumber: shipment?.tracking_number ?? null,
    trackingUrl: shipment?.tracking_url ?? null,
    estimatedDeliveryAt: shipment?.estimated_delivery_at ?? null,
    lastSyncedAt: shipment?.last_synced_at ?? null,
    events: (eventsResult.results ?? []).map(event => ({
      status: event.status,
      label: statusLabel(event.status),
      description: event.description,
      location: event.location,
      occurredAt: event.occurred_at,
    })),
  };
}

async function projectOrders(db: D1DatabaseLike, rows: SellerOrderRow[]) {
  return Promise.all(rows.map(row => projectOrder(db, row)));
}

export async function getSellerOrders(db: D1DatabaseLike, sellerId: string, sellerOrderId?: string) {
  const where = sellerOrderId ? "so.seller_id = ? AND so.id = ?" : "so.seller_id = ?";
  const query = db.prepare(`SELECT so.id AS seller_order_id, so.order_id, so.seller_id, ss.store_name,
    so.status, so.subtotal_cents, so.payout_eligible_at, so.created_at, o.fulfilment_method, o.address_snapshot_json
    FROM seller_orders so JOIN commerce_orders o ON o.id = so.order_id
    JOIN seller_state ss ON ss.invite_token = so.seller_id
    WHERE ${where} ORDER BY so.created_at DESC LIMIT 100`);
  const result = sellerOrderId
    ? await query.bind(sellerId, sellerOrderId).all<SellerOrderRow>()
    : await query.bind(sellerId).all<SellerOrderRow>();
  return projectOrders(db, result.results ?? []);
}

export async function getCustomerFulfilments(db: D1DatabaseLike, customerEmail: string, orderId?: string) {
  const where = orderId ? "o.customer_email = ? AND o.id = ?" : "o.customer_email = ?";
  const query = db.prepare(`SELECT so.id AS seller_order_id, so.order_id, so.seller_id, ss.store_name,
    so.status, so.subtotal_cents, so.payout_eligible_at, so.created_at, o.fulfilment_method, o.address_snapshot_json
    FROM seller_orders so JOIN commerce_orders o ON o.id = so.order_id
    JOIN seller_state ss ON ss.invite_token = so.seller_id
    WHERE ${where} ORDER BY so.created_at DESC LIMIT 100`);
  const result = orderId
    ? await query.bind(customerEmail, orderId).all<SellerOrderRow>()
    : await query.bind(customerEmail).all<SellerOrderRow>();
  return projectOrders(db, result.results ?? []);
}

type UpdateInput = {
  status: string;
  provider?: unknown;
  trackingNumber?: unknown;
  trackingUrl?: unknown;
  now?: Date;
};

export async function updateSellerFulfilment(db: D1DatabaseLike, sellerId: string, sellerOrderId: string, input: UpdateInput) {
  const row = await db.prepare(`SELECT so.id AS seller_order_id, so.order_id, so.seller_id, so.status,
      o.fulfilment_method, o.payment_status
    FROM seller_orders so JOIN commerce_orders o ON o.id = so.order_id
    WHERE so.id = ? AND so.seller_id = ? LIMIT 1`).bind(sellerOrderId, sellerId).first<{
      seller_order_id: string; order_id: string; seller_id: string; status: string; fulfilment_method: string; payment_status: string;
    }>();
  if (!row) throw new FulfilmentValidationError("Seller order was not found");
  if (row.payment_status !== "paid" && row.payment_status !== "partially_refunded") throw new FulfilmentValidationError("Only verified paid orders can be fulfilled");
  const kind = fulfilmentKind(row.fulfilment_method);
  const transition = assertFulfilmentTransition(kind, row.status, input.status, input);
  const now = input.now ?? new Date();
  const timestamp = now.toISOString();
  const complete = transition.status === "delivered" || transition.status === "collected";
  const existing = await db.prepare("SELECT id, provider, tracking_number, tracking_url FROM shipments WHERE seller_order_id = ? LIMIT 1")
    .bind(sellerOrderId).first<ShipmentRow>();
  const shipmentId = existing?.id ?? crypto.randomUUID();
  const provider = kind === "collection" ? "store_collection" : transition.provider || existing?.provider || "stylishme";
  const trackingNumber = kind === "collection" ? null : transition.trackingNumber || existing?.tracking_number || null;
  const trackingUrl = kind === "collection" ? null : transition.trackingUrl || existing?.tracking_url || null;
  const eventId = `seller:${transition.status}`;
  const statements = [
    ...(!existing ? [db.prepare(`INSERT INTO shipments
      (id, seller_order_id, provider, tracking_number, tracking_url, status, estimated_delivery_at, last_synced_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)`).bind(shipmentId, sellerOrderId, provider, trackingNumber, trackingUrl, transition.status, timestamp, timestamp)] : []),
    ...(existing ? [db.prepare(`UPDATE shipments SET provider = ?, tracking_number = ?, tracking_url = ?, status = ?, updated_at = ? WHERE id = ?`)
      .bind(provider, trackingNumber, trackingUrl, transition.status, timestamp, shipmentId)] : []),
    db.prepare(`UPDATE seller_orders SET status = ?, payout_eligible_at = ?, updated_at = ? WHERE id = ? AND seller_id = ?`)
      .bind(transition.status, complete ? payoutEligibilityDate(now) : null, timestamp, sellerOrderId, sellerId),
    db.prepare(`INSERT INTO shipment_events
      (id, shipment_id, provider_event_id, status, description, location, occurred_at, created_at)
      VALUES (?, ?, ?, ?, ?, NULL, ?, ?) ON CONFLICT(shipment_id, provider_event_id) DO NOTHING`)
      .bind(crypto.randomUUID(), shipmentId, eventId, transition.status, transition.label, timestamp, timestamp),
    db.prepare(`UPDATE commerce_orders SET status = CASE
      WHEN NOT EXISTS (SELECT 1 FROM seller_orders child WHERE child.order_id = commerce_orders.id AND child.status NOT IN ('delivered','collected'))
      THEN CASE WHEN fulfilment_method = 'collection' THEN 'collected' ELSE 'delivered' END
      ELSE status END, updated_at = ? WHERE id = ?`).bind(timestamp, row.order_id),
  ];
  await db.batch(statements);
  const [updated] = await getSellerOrders(db, sellerId, sellerOrderId);
  if (!updated) throw new FulfilmentValidationError("Seller order could not be reloaded");
  return updated;
}

const progression = ["new", "preparing", "shipped", "in_transit", "out_for_delivery", "delivered"];

export async function syncEligibleDhlShipments(
  db: D1DatabaseLike,
  customerEmail: string,
  orderId: string,
  config: DhlConfig = currentDhlConfig(),
  fetcher: typeof fetch = fetch,
  now = new Date(),
) {
  if (!config.available) return { available: false, synced: 0 };
  const cutoff = new Date(now.getTime() - 15 * 60_000).toISOString();
  const result = await db.prepare(`SELECT sh.id, sh.tracking_number, sh.status, so.id AS seller_order_id
    FROM shipments sh JOIN seller_orders so ON so.id = sh.seller_order_id
    JOIN commerce_orders o ON o.id = so.order_id
    WHERE o.id = ? AND o.customer_email = ? AND sh.provider = 'dhl' AND sh.tracking_number IS NOT NULL
      AND sh.status != 'delivered' AND (sh.last_synced_at IS NULL OR sh.last_synced_at < ?)`)
    .bind(orderId, customerEmail, cutoff).all<{ id: string; tracking_number: string; status: string; seller_order_id: string }>();
  let synced = 0;
  for (const shipment of result.results ?? []) {
    const remote = await fetchDhlTracking(config, shipment.tracking_number, fetcher);
    const currentIndex = progression.indexOf(shipment.status);
    const remoteIndex = progression.indexOf(remote.status);
    const nextStatus = remoteIndex > currentIndex ? remote.status : shipment.status;
    const timestamp = now.toISOString();
    const complete = nextStatus === "delivered";
    await db.batch([
      db.prepare(`UPDATE shipments SET status = ?, tracking_url = COALESCE(?, tracking_url), estimated_delivery_at = ?,
        last_synced_at = ?, updated_at = ? WHERE id = ?`).bind(nextStatus, remote.trackingUrl, remote.estimatedDeliveryAt, timestamp, timestamp, shipment.id),
      db.prepare("UPDATE seller_orders SET status = ?, payout_eligible_at = CASE WHEN ? THEN COALESCE(payout_eligible_at, ?) ELSE payout_eligible_at END, updated_at = ? WHERE id = ?")
        .bind(nextStatus, complete ? 1 : 0, complete ? payoutEligibilityDate(now) : null, timestamp, shipment.seller_order_id),
      ...remote.events.map(event => db.prepare(`INSERT INTO shipment_events
        (id, shipment_id, provider_event_id, status, description, location, occurred_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(shipment_id, provider_event_id) DO NOTHING`)
        .bind(crypto.randomUUID(), shipment.id, event.providerEventId, event.status, event.description, event.location, event.occurredAt, timestamp)),
      db.prepare(`UPDATE commerce_orders SET status = CASE
        WHEN NOT EXISTS (SELECT 1 FROM seller_orders child WHERE child.order_id = commerce_orders.id AND child.status NOT IN ('delivered','collected'))
        THEN 'delivered' ELSE status END, updated_at = ? WHERE id = ?`).bind(timestamp, orderId),
    ]);
    synced += 1;
  }
  return { available: true, synced };
}
