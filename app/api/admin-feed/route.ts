import { desc } from "drizzle-orm";

import { getDb } from "../../../db";
import { activityEvents, customerState, sellerState, tryOnUsage } from "../../../db/schema";
import { ensureActivityTable } from "../../activity";
import { buildProduct } from "../../product-catalog";

type StoredOrder = {
  id?: unknown;
  date?: unknown;
  status?: unknown;
  total?: unknown;
  fulfilment?: unknown;
  items?: unknown;
};

const safeJson = (value: string, fallback: unknown) => {
  try { return JSON.parse(value); } catch { return fallback; }
};

const text = (value: unknown, fallback = "") => typeof value === "string" ? value.slice(0, 140) : fallback;
const number = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : 0;
const catalogue = Array.from({ length: 41 }, (_, index) => buildProduct(index));
const productById = new Map(catalogue.map(product => [product.id, product]));

async function authorized(request: Request) {
  const expected = process.env.STYLISHME_ADMIN_API_KEY;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || !supplied) return false;
  const [left, right] = await Promise.all([
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(expected)),
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(supplied)),
  ]);
  const a = new Uint8Array(left);
  const b = new Uint8Array(right);
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

export async function GET(request: Request) {
  if (!await authorized(request)) {
    return Response.json({ error: "Not authorized" }, { status: 401 });
  }

  const db = getDb();
  await ensureActivityTable();
  const [customers, sellers, tryOns, events] = await Promise.all([
    db.select().from(customerState),
    db.select().from(sellerState),
    db.select().from(tryOnUsage),
    db.select().from(activityEvents).orderBy(desc(activityEvents.createdAt)).limit(3000),
  ]);

  const orders = customers.flatMap((row) => {
    const stored = safeJson(row.ordersJson, []);
    const profile = safeJson(row.profileJson, {}) as { city?: unknown };
    return Array.isArray(stored) ? stored.slice(0, 100).flatMap((value) => {
      if (!value || typeof value !== "object") return [];
      const order = value as StoredOrder;
      const items = Array.isArray(order.items) ? order.items : [];
      const sellerValues = new Map<string, number>();
      items.forEach(item => {
        if (!item || typeof item !== "object") return;
        const line = item as { productId?: unknown; quantity?: unknown };
        const product = typeof line.productId === "string" ? productById.get(line.productId) : null;
        if (!product) return;
        sellerValues.set(product.designer, (sellerValues.get(product.designer) ?? 0) + product.price * Math.max(1, number(line.quantity)));
      });
      return [{
        id: text(order.id, "Order"),
        date: text(order.date),
        status: text(order.status, "Order confirmed"),
        total: number(order.total),
        fulfilment: text(order.fulfilment, "Standard delivery"),
        itemCount: items.length,
        city: text(profile.city, "Not selected"),
        sellerNames: [...sellerValues.keys()],
        sellerValues: [...sellerValues.entries()].map(([seller, value]) => ({ seller, value })),
      }];
    }) : [];
  });

  const sellerSummaries = sellers.map((row) => {
    const state = safeJson(row.stateJson, {}) as {
      store?: { name?: unknown; type?: unknown; city?: unknown };
      products?: Array<{ status?: unknown; variants?: Array<{ quantity?: unknown }> }>;
    };
    const products = Array.isArray(state.products) ? state.products : [];
    const stock = products.reduce((sum, product) => sum + (Array.isArray(product.variants)
      ? product.variants.reduce((variantSum, variant) => variantSum + Math.max(0, number(variant.quantity)), 0)
      : 0), 0);
    const lowStock = products.filter((product) => {
      const quantity = Array.isArray(product.variants)
        ? product.variants.reduce((sum, variant) => sum + Math.max(0, number(variant.quantity)), 0)
        : 0;
      return quantity < 3;
    }).length;
    return {
      storeName: text(state.store?.name, row.storeName),
      type: text(state.store?.type, "Seller"),
      city: text(state.store?.city, "Namibia"),
      approved: row.approved,
      products: products.length,
      liveProducts: products.filter(product => product.status === "Live").length,
      stock,
      lowStock,
      orderValue: orders.reduce((sum, order) => sum + order.sellerValues.filter(item => item.seller === row.storeName).reduce((value, item) => value + item.value, 0), 0),
      orders: orders.filter(order => order.sellerNames.includes(row.storeName)).length,
      updatedAt: row.updatedAt,
    };
  });

  const profiles = customers.map(row => safeJson(row.profileJson, {}) as { accountRole?: unknown; city?: unknown });
  const carts = customers.map(row => safeJson(row.cartJson, []));
  const wishlists = customers.map(row => safeJson(row.wishlistJson, []));
  const activeOrders = orders.filter(order => !["Delivered", "Cancelled", "Collected"].includes(order.status));
  const completedRevenue = orders.filter(order => order.status !== "Cancelled").reduce((sum, order) => sum + order.total, 0);
  const cancelledValue = orders.filter(order => order.status === "Cancelled").reduce((sum, order) => sum + order.total, 0);
  const purchasingCustomers = customers.filter(row => {
    const stored = safeJson(row.ordersJson, []);
    return Array.isArray(stored) && stored.some(order => order && typeof order === "object" && (order as { status?: unknown }).status !== "Cancelled");
  }).length;
  const repeatPurchasers = customers.filter(row => {
    const stored = safeJson(row.ordersJson, []);
    return Array.isArray(stored) && stored.filter(order => order && typeof order === "object" && (order as { status?: unknown }).status !== "Cancelled").length > 1;
  }).length;
  const totalProducts = sellerSummaries.reduce((sum, seller) => sum + seller.products, 0);
  const countEvent = (event: string) => events.filter(item => item.eventType === event).length;
  const sessionKeys = new Set(events.map(event => event.sessionHash).filter(Boolean));
  const sources = new Map<string, number>();
  events.forEach(event => {
    const metadata = safeJson(event.metadataJson, {}) as { source?: unknown };
    const source = text(metadata.source, "direct") || "direct";
    sources.set(source, (sources.get(source) ?? 0) + 1);
  });
  const daily = Array.from({ length: 30 }, (_, offset) => {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - (29 - offset));
    const key = date.toISOString().slice(0, 10);
    const dayEvents = events.filter(event => event.createdAt.slice(0, 10) === key);
    return {
      date: key,
      visits: dayEvents.filter(event => event.eventType === "page_viewed" || event.eventType === "demo_viewed").length,
      signups: dayEvents.filter(event => event.eventType === "customer_joined" || event.eventType === "seller_joined").length,
      orders: dayEvents.filter(event => event.eventType === "order_placed").length,
      productViews: dayEvents.filter(event => event.eventType === "product_viewed").length,
      cartAdds: dayEvents.filter(event => event.eventType === "cart_added").length,
      errors: dayEvents.filter(event => event.eventType === "app_error").length,
    };
  });
  const visits = countEvent("page_viewed") + countEvent("demo_viewed");
  const signupStarts = countEvent("signup_started");
  const signups = countEvent("customer_joined") + countEvent("seller_joined");
  const checkoutStarts = countEvent("checkout_started");
  const productSignals = new Map<string, { views: number; saves: number; cartAdds: number }>();
  events.forEach(event => {
    if (!event.targetId || !["product_viewed", "wishlist_saved", "cart_added"].includes(event.eventType)) return;
    const signal = productSignals.get(event.targetId) ?? { views: 0, saves: 0, cartAdds: 0 };
    if (event.eventType === "product_viewed") signal.views += 1;
    if (event.eventType === "wishlist_saved") signal.saves += 1;
    if (event.eventType === "cart_added") signal.cartAdds += 1;
    productSignals.set(event.targetId, signal);
  });
  const topProducts = [...productSignals.entries()].flatMap(([id, signal]) => {
    const product = productById.get(id);
    return product ? [{ id, name: product.name, seller: product.designer, ...signal, interest: signal.views + signal.saves * 2 + signal.cartAdds * 3 }] : [];
  }).sort((a, b) => b.interest - a.interest).slice(0, 8);
  const cityCounts = new Map<string, number>();
  profiles.forEach(profile => {
    const city = text(profile.city, "Not selected") || "Not selected";
    cityCounts.set(city, (cityCounts.get(city) ?? 0) + 1);
  });
  const activityByCity = [...cityCounts.entries()].map(([city, customers]) => ({ city, customers })).sort((a, b) => b.customers - a.customers);

  return Response.json({
    generatedAt: new Date().toISOString(),
    privacy: {
      message: "Personal contact details, addresses, payment information and private photos are intentionally excluded.",
      excludes: ["email", "phone", "address", "payment details", "personal photos", "try-on images"],
    },
    metrics: {
      customers: profiles.filter(profile => profile.accountRole !== "seller").length,
      purchasingCustomers,
      repeatPurchasers,
      sellers: sellers.length,
      approvedSellers: sellers.filter(seller => seller.approved).length,
      products: totalProducts,
      orders: orders.length,
      activeOrders: activeOrders.length,
      revenue: completedRevenue,
      tryOns: tryOns.reduce((sum, row) => sum + row.count, 0),
      cartsInProgress: carts.filter(cart => Array.isArray(cart) && cart.length > 0).length,
      savedPieces: wishlists.reduce((sum, list) => sum + (Array.isArray(list) ? list.length : 0), 0),
      visitors: new Set(events.map(event => event.actorHash)).size,
      sessions: sessionKeys.size,
      visits,
      demoViews: countEvent("demo_viewed"),
      signupStarts,
      signups,
      signupConversion: signupStarts ? Math.round(signups / signupStarts * 1000) / 10 : 0,
      checkoutStarts,
      checkoutConversion: checkoutStarts ? Math.round(countEvent("order_placed") / checkoutStarts * 1000) / 10 : 0,
      errors: countEvent("app_error"),
    },
    analytics: {
      daily,
      topProducts,
      activityByCity,
      customerStories: {
        published: countEvent("customer_story_published"),
        views: countEvent("customer_story_viewed"),
        likes: countEvent("customer_story_liked"),
        unlikes: countEvent("customer_story_unliked"),
        shares: countEvent("customer_story_shared"),
        reports: countEvent("customer_story_reported"),
      },
      sources: [...sources.entries()].map(([source, events]) => ({ source, events })).sort((a, b) => b.events - a.events).slice(0, 12),
      funnel: [
        { label: "Visits", value: visits },
        { label: "Product views", value: countEvent("product_viewed") },
        { label: "Wishlist saves", value: countEvent("wishlist_saved") },
        { label: "Cart additions", value: countEvent("cart_added") },
        { label: "Checkout starts", value: checkoutStarts },
        { label: "Orders", value: countEvent("order_placed") },
      ],
    },
    customerSegments: {
      registeredCustomers: profiles.filter(profile => profile.accountRole !== "seller").length,
      purchasingCustomers,
      repeatPurchasers,
      abandonedCarts: carts.filter(cart => Array.isArray(cart) && cart.length > 0).length,
      wishlistOnly: customers.filter((row, index) => {
        const list = wishlists[index];
        const stored = safeJson(row.ordersJson, []);
        return Array.isArray(list) && list.length > 0 && (!Array.isArray(stored) || stored.length === 0);
      }).length,
    },
    revenueSummary: {
      recordedOrderValue: completedRevenue,
      cancelledOrderValue: cancelledValue,
      averageOrderValue: orders.filter(order => order.status !== "Cancelled").length ? completedRevenue / orders.filter(order => order.status !== "Cancelled").length : 0,
      paymentProviderConnected: false,
      platformRevenueAvailable: false,
    },
    fulfilment: {
      delivery: orders.filter(order => order.fulfilment !== "Store collection").length,
      collection: orders.filter(order => order.fulfilment === "Store collection").length,
    },
    alerts: {
      pendingSellers: sellerSummaries.filter(seller => !seller.approved).length,
      lowStockProducts: sellerSummaries.reduce((sum, seller) => sum + seller.lowStock, 0),
      ordersToPrepare: activeOrders.length,
    },
    sellers: sellerSummaries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    orders: orders.map(order => ({
      id: order.id,
      date: order.date,
      status: order.status,
      total: order.total,
      fulfilment: order.fulfilment,
      itemCount: order.itemCount,
      city: order.city,
      sellerNames: order.sellerNames,
    })).sort((a, b) => b.id.localeCompare(a.id)).slice(0, 80),
    activity: events.map(event => ({
      id: event.id,
      event: event.eventType,
      actorKind: event.actorKind,
      targetType: event.targetType,
      targetId: event.targetId,
      createdAt: event.createdAt,
    })),
  }, {
    headers: {
      "cache-control": "no-store, private",
      "x-content-type-options": "nosniff",
    },
  });
}
