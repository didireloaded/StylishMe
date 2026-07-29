import type { CartLine } from "./cart-commerce";
import { slugify, stableSlugToken } from "./catalogue-domain";
import { buildProduct } from "./product-catalog";
import {
  releaseExpiredReservations,
  reservationExpiry,
  reservationStatements,
  StockReservationError,
  type D1DatabaseLike,
} from "./inventory-reservations";
import { getCustomerFulfilments, type OrderFulfilment } from "./fulfilment-service";
import { FULFILMENT_METHODS, OrderValidationError, type FulfilmentMethod } from "./order-creation";

export type ResolvedOrderLine = {
  productId: string;
  variantId: string;
  sellerId: string;
  sellerName: string;
  productName: string;
  size: string;
  colour: string;
  displayColour?: string;
  quantity: number;
  unitPriceCents: number;
};

type SellerOrderPlan = {
  id: string;
  sellerId: string;
  sellerName: string;
  subtotalCents: number;
  commissionCents: number;
  sellerNetCents: number;
};

type OrderItemPlan = ResolvedOrderLine & {
  id: string;
  sellerOrderId: string;
  lineTotalCents: number;
};

export type CustomerOrder = {
  id: string;
  date: string;
  status: string;
  paymentStatus: string;
  total: number;
  fulfilment: FulfilmentMethod;
  items: CartLine[];
  fulfilments: OrderFulfilment[];
};

type PublicOrderRow = {
  id: string;
  created_at: string;
  status: string;
  payment_status: string;
  total_cents: number;
  fulfilment_method: string;
  address_snapshot_json: string | null;
  product_id: string | null;
  variant_id: string | null;
  variant_snapshot_json: string | null;
  quantity: number | null;
};

const COMMISSION_BASIS_POINTS = 1200;
const launchProducts = Array.from({ length: 41 }, (_, index) => buildProduct(index));
const launchById = new Map(launchProducts.map((product) => [product.id, product]));

const orderStatus = (status: string, paymentStatus: string) => {
  if (status === "cancelled") return "Cancelled";
  if (status === "delivered") return "Delivered";
  if (status === "ready_to_collect") return "Ready to collect";
  if (status === "in_transit") return "In transit";
  if (paymentStatus !== "paid") return "Payment pending";
  return "Order confirmed";
};

const orderDate = (value: string) => new Intl.DateTimeFormat("en-GB", {
  day: "2-digit", month: "short", year: "numeric", timeZone: "UTC",
}).format(new Date(value));

const fulfilmentFromRow = (row: PublicOrderRow): FulfilmentMethod => {
  if (row.fulfilment_method === "collection") return "Store collection";
  try {
    const snapshot = row.address_snapshot_json ? JSON.parse(row.address_snapshot_json) as { method?: unknown } : {};
    if (snapshot.method === "Express delivery") return "Express delivery";
  } catch {}
  return "Standard delivery";
};

export function buildOrderPlan(lines: ResolvedOrderLine[], fulfilment: FulfilmentMethod, orderId: string) {
  if (!lines.length) throw new OrderValidationError("Your bag is empty");
  const items: OrderItemPlan[] = [];
  const sellers = new Map<string, SellerOrderPlan>();
  let subtotalCents = 0;
  lines.forEach((line, index) => {
    if (!Number.isInteger(line.unitPriceCents) || line.unitPriceCents < 0 || !Number.isInteger(line.quantity) || line.quantity < 1) {
      throw new OrderValidationError("A bag item has invalid pricing or quantity");
    }
    const lineTotalCents = line.unitPriceCents * line.quantity;
    subtotalCents += lineTotalCents;
    const existing = sellers.get(line.sellerId);
    const sellerOrderId = existing?.id ?? `${orderId}:seller:${stableSlugToken(line.sellerId)}`;
    const sellerSubtotal = (existing?.subtotalCents ?? 0) + lineTotalCents;
    sellers.set(line.sellerId, {
      id: sellerOrderId,
      sellerId: line.sellerId,
      sellerName: line.sellerName,
      subtotalCents: sellerSubtotal,
      commissionCents: Math.round(sellerSubtotal * COMMISSION_BASIS_POINTS / 10_000),
      sellerNetCents: sellerSubtotal - Math.round(sellerSubtotal * COMMISSION_BASIS_POINTS / 10_000),
    });
    items.push({ ...line, id: `${orderId}:item:${index + 1}`, sellerOrderId, lineTotalCents });
  });
  const deliveryCents = fulfilment === "Store collection" ? 0 : fulfilment === "Express delivery" ? 12_000 : 6_500;
  return { subtotalCents, deliveryCents, totalCents: subtotalCents + deliveryCents, sellerOrders: Array.from(sellers.values()), items };
}

function isCartLine(value: unknown): value is CartLine {
  if (!value || typeof value !== "object") return false;
  const line = value as Record<string, unknown>;
  return typeof line.productId === "string" && typeof line.size === "string" && typeof line.color === "string"
    && (line.variantId === undefined || typeof line.variantId === "string")
    && Number.isInteger(line.quantity) && Number(line.quantity) > 0 && Number(line.quantity) <= 20;
}

async function ensureLaunchCartProducts(db: D1DatabaseLike, productIds: string[], now: string) {
  const statements = [];
  const sellers = new Set<string>();
  for (const productId of [...new Set(productIds)]) {
    const product = launchById.get(productId);
    if (!product) continue;
    const existing = await db.prepare("SELECT id FROM catalog_products WHERE id = ? LIMIT 1").bind(product.id).first();
    if (existing) continue;
    const sellerId = `launch:${slugify(product.designer)}`;
    if (!sellers.has(sellerId)) {
      sellers.add(sellerId);
      statements.push(db.prepare(`INSERT INTO seller_state
        (invite_token, owner_email, approved, store_name, state_json, updated_at)
        VALUES (?, NULL, 1, ?, ?, ?) ON CONFLICT(invite_token) DO NOTHING`)
        .bind(sellerId, product.designer, JSON.stringify({ store: { name: product.designer, city: product.location, type: product.sellerType } }), now));
    }
    statements.push(db.prepare(`INSERT INTO catalog_products
      (id, seller_id, store_slug, product_slug, name, description, category, currency, price_cents, status,
       image_url, metadata_json, published_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'NAD', ?, 'published', ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO NOTHING`)
      .bind(product.id, sellerId, slugify(product.designer), slugify(product.name), product.name, product.description,
        product.category, Math.round(product.price * 100), product.image,
        JSON.stringify({ source: "launch", store: { name: product.designer, city: product.location, type: product.sellerType } }), now, now, now));
    product.sizes.forEach((size, index) => {
      const variantId = `launch:${product.id}:${stableSlugToken(size)}`;
      statements.push(db.prepare(`INSERT INTO inventory_variants
        (id, product_id, size, colour, sku, available_quantity, reserved_quantity, version, updated_at)
        VALUES (?, ?, ?, '*', ?, ?, 0, 0, ?) ON CONFLICT(id) DO NOTHING`)
        .bind(variantId, product.id, size, `LAUNCH-${product.id}-${stableSlugToken(size)}`.toUpperCase(), Math.max(0, product.stock[index] ?? 0), now));
    });
  }
  if (statements.length) await db.batch(statements);
}

type CatalogueRow = {
  product_id: string;
  product_name: string;
  seller_id: string;
  seller_name: string;
  price_cents: number;
  variant_id: string;
  size: string;
  colour: string;
  available_quantity: number;
  reserved_quantity: number;
};

async function resolveOrderLines(db: D1DatabaseLike, cart: unknown, now: string) {
  if (!Array.isArray(cart) || !cart.length || cart.length > 25 || !cart.every(isCartLine)) {
    throw new OrderValidationError(Array.isArray(cart) && cart.length ? "Your bag contains an invalid item" : "Your bag is empty");
  }
  await ensureLaunchCartProducts(db, cart.map((line) => line.productId), now);
  const resolved = new Map<string, ResolvedOrderLine>();
  for (const line of cart) {
    const rows = await db.prepare(`SELECT p.id AS product_id, p.name AS product_name, p.seller_id,
      s.store_name AS seller_name, p.price_cents, v.id AS variant_id, v.size, v.colour,
      v.available_quantity, v.reserved_quantity
      FROM catalog_products p JOIN seller_state s ON s.invite_token = p.seller_id
      JOIN inventory_variants v ON v.product_id = p.id
      WHERE p.id = ? AND p.status = 'published'`).bind(line.productId).all<CatalogueRow>();
    const choices = rows.results ?? [];
    const variant = line.variantId
      ? choices.find((choice) => choice.variant_id === line.variantId && choice.size === line.size)
      : choices.find((choice) => choice.size === line.size && choice.colour === "*");
    if (!variant) throw new OrderValidationError("A bag item is no longer available in the selected option");
    const existing = resolved.get(variant.variant_id);
    const quantity = (existing?.quantity ?? 0) + line.quantity;
    const available = variant.available_quantity - variant.reserved_quantity;
    if (quantity > available) throw new StockReservationError(`${variant.product_name} no longer has enough stock`);
    resolved.set(variant.variant_id, {
      productId: variant.product_id,
      variantId: variant.variant_id,
      sellerId: variant.seller_id,
      sellerName: variant.seller_name,
      productName: variant.product_name,
      size: variant.size,
      colour: variant.colour === "*" ? line.color : variant.colour,
      displayColour: line.color,
      quantity,
      unitPriceCents: variant.price_cents,
    });
  }
  return Array.from(resolved.values());
}

function safeAddressSnapshot(profile: unknown, fulfilment: FulfilmentMethod) {
  if (fulfilment === "Store collection") return null;
  const record = profile && typeof profile === "object" ? profile as Record<string, unknown> : {};
  const addresses = Array.isArray(record.addresses) ? record.addresses : [];
  const value = addresses[0];
  if (!value || typeof value !== "object") throw new OrderValidationError("Add a delivery address before checkout");
  const address = value as Record<string, unknown>;
  const clean = {
    label: typeof address.label === "string" ? address.label.trim().slice(0, 60) : "",
    street: typeof address.street === "string" ? address.street.trim().slice(0, 180) : "",
    city: typeof address.city === "string" ? address.city.trim().slice(0, 100) : "",
  };
  if (!clean.street || !clean.city) throw new OrderValidationError("Add a complete delivery address before checkout");
  return JSON.stringify({ method: fulfilment, address: clean });
}

function projectRows(rows: PublicOrderRow[]) {
  const orders = new Map<string, CustomerOrder>();
  for (const row of rows) {
    if (!orders.has(row.id)) {
      orders.set(row.id, {
        id: row.id,
        date: orderDate(row.created_at),
        status: orderStatus(row.status, row.payment_status),
        paymentStatus: row.payment_status,
        total: row.total_cents / 100,
        fulfilment: fulfilmentFromRow(row),
        items: [],
        fulfilments: [],
      });
    }
    if (!row.product_id || !row.variant_id || !row.variant_snapshot_json || !row.quantity) continue;
    try {
      const variant = JSON.parse(row.variant_snapshot_json) as { size?: unknown; colour?: unknown; displayColour?: unknown };
      orders.get(row.id)?.items.push({
        productId: row.product_id,
        variantId: row.variant_id,
        size: typeof variant.size === "string" ? variant.size : "",
        color: typeof variant.displayColour === "string" ? variant.displayColour : typeof variant.colour === "string" ? variant.colour : "",
        quantity: row.quantity,
      });
    } catch {}
  }
  return Array.from(orders.values());
}

export async function getCustomerOrders(db: D1DatabaseLike, email: string, orderId?: string) {
  const where = orderId ? "o.customer_email = ? AND o.id = ?" : "o.customer_email = ?";
  const statement = db.prepare(`SELECT o.id, o.created_at, o.status, o.payment_status, o.total_cents,
    o.fulfilment_method, o.address_snapshot_json, i.product_id, i.variant_id, i.variant_snapshot_json, i.quantity
    FROM commerce_orders o LEFT JOIN commerce_order_items i ON i.order_id = o.id
    WHERE ${where} ORDER BY o.created_at DESC, i.id ASC`);
  const rows = orderId
    ? await statement.bind(email, orderId).all<PublicOrderRow>()
    : await statement.bind(email).all<PublicOrderRow>();
  const orders = projectRows(rows.results ?? []);
  if (!orders.length) return orders;
  try {
    const fulfilments = await getCustomerFulfilments(db, email, orderId);
    const byOrder = new Map<string, OrderFulfilment[]>();
    fulfilments.forEach(fulfilment => byOrder.set(fulfilment.orderId, [...(byOrder.get(fulfilment.orderId) ?? []), fulfilment]));
    orders.forEach(order => { order.fulfilments = byOrder.get(order.id) ?? []; });
  } catch {
    // Keeps order history available during a rolling deploy before the fulfilment migration lands.
  }
  return orders;
}

export async function createCommerceOrder(db: D1DatabaseLike, input: {
  email: string;
  cart: unknown;
  fulfilment: unknown;
  idempotencyKey: string;
  profile: unknown;
  now?: Date;
}) {
  if (typeof input.fulfilment !== "string" || !(FULFILMENT_METHODS as readonly string[]).includes(input.fulfilment)) {
    throw new OrderValidationError("Choose a delivery or collection option");
  }
  if (!/^[a-zA-Z0-9_-]{16,100}$/.test(input.idempotencyKey)) {
    throw new OrderValidationError("Checkout could not be verified. Please try again");
  }
  const fulfilment = input.fulfilment as FulfilmentMethod;
  const existing = await db.prepare("SELECT id FROM commerce_orders WHERE customer_email = ? AND idempotency_key = ? LIMIT 1")
    .bind(input.email, input.idempotencyKey).first<{ id: string }>();
  if (existing) {
    const [order] = await getCustomerOrders(db, input.email, existing.id);
    if (!order) throw new Error("Existing order could not be read");
    return { order, reused: true };
  }
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  await releaseExpiredReservations(db, now);
  const lines = await resolveOrderLines(db, input.cart, nowIso);
  const orderId = `SM-${now.getUTCFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const plan = buildOrderPlan(lines, fulfilment, orderId);
  const expiresAt = reservationExpiry(now);
  const addressSnapshot = safeAddressSnapshot(input.profile, fulfilment);
  const statements = [
    db.prepare(`INSERT INTO commerce_orders
      (id, customer_email, idempotency_key, currency, subtotal_cents, delivery_cents, total_cents, status,
       payment_status, fulfilment_method, address_snapshot_json, collection_point_id, reservation_expires_at, created_at, updated_at)
      VALUES (?, ?, ?, 'NAD', ?, ?, ?, 'pending_payment', 'unpaid', ?, ?, ?, ?, ?, ?)`)
      .bind(orderId, input.email, input.idempotencyKey, plan.subtotalCents, plan.deliveryCents, plan.totalCents,
        fulfilment === "Store collection" ? "collection" : "delivery", addressSnapshot,
        fulfilment === "Store collection" ? "seller-collection" : null, expiresAt, nowIso, nowIso),
    ...plan.sellerOrders.map((seller) => db.prepare(`INSERT INTO seller_orders
      (id, order_id, seller_id, subtotal_cents, commission_cents, seller_net_cents, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'awaiting_payment', ?, ?)`)
      .bind(seller.id, orderId, seller.sellerId, seller.subtotalCents, seller.commissionCents, seller.sellerNetCents, nowIso, nowIso)),
    ...reservationStatements(db, {
      orderId,
      checkoutKey: input.idempotencyKey,
      expiresAt,
      lines: plan.items.map((item) => ({ variantId: item.variantId, quantity: item.quantity })),
    }),
    ...plan.items.map((item) => db.prepare(`INSERT INTO commerce_order_items
      (id, order_id, seller_order_id, seller_id, product_id, variant_id, product_name_snapshot,
       seller_name_snapshot, variant_snapshot_json, unit_price_cents, quantity, line_total_cents)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(item.id, orderId, item.sellerOrderId, item.sellerId, item.productId, item.variantId, item.productName,
        item.sellerName, JSON.stringify({ size: item.size, colour: item.colour, displayColour: item.displayColour }),
        item.unitPriceCents, item.quantity, item.lineTotalCents)),
    db.prepare("UPDATE customer_state SET cart_json = '[]', updated_at = ? WHERE email = ?").bind(nowIso, input.email),
  ];
  try {
    await db.batch(statements);
  } catch (error) {
    const raced = await db.prepare("SELECT id FROM commerce_orders WHERE customer_email = ? AND idempotency_key = ? LIMIT 1")
      .bind(input.email, input.idempotencyKey).first<{ id: string }>();
    if (raced) {
      const [order] = await getCustomerOrders(db, input.email, raced.id);
      if (order) return { order, reused: true };
    }
    if (error instanceof Error && /constraint|reserved_quantity|inventory/i.test(error.message)) throw new StockReservationError();
    throw error;
  }
  const [order] = await getCustomerOrders(db, input.email, orderId);
  if (!order) throw new Error("Order could not be read after creation");
  return { order, reused: false };
}
