import { desc } from "drizzle-orm";
import { getDb } from "../../../db";
import { activityEvents, customerState } from "../../../db/schema";
import { buildProduct } from "../../product-catalog";

export async function GET() {
  try {
    const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const db = getDb();
    const [recentEvents, customers] = await Promise.all([
      db.select({ eventType: activityEvents.eventType, targetType: activityEvents.targetType, targetId: activityEvents.targetId, createdAt: activityEvents.createdAt }).from(activityEvents).orderBy(desc(activityEvents.createdAt)).limit(2500),
      db.select({ ordersJson: customerState.ordersJson }).from(customerState),
    ]);
    const events = recentEvents
      .filter(event => new Date(event.createdAt).getTime() >= cutoff && event.targetType === "product" && event.targetId);
    const scores = new Map<string, number>();
    for (const event of events) {
      const weight = event.eventType === "cart_added" ? 4 : event.eventType === "wishlist_saved" ? 2 : event.eventType === "product_viewed" ? 1 : 0;
      if (weight && event.targetId) scores.set(event.targetId, (scores.get(event.targetId) ?? 0) + weight);
    }
    const newProductIds = recentEvents.filter(event => event.eventType === "product_submitted" && event.targetType === "product" && event.targetId).map(event => event.targetId as string).filter((id, index, list) => list.indexOf(id) === index).slice(0, 8);
    const catalogue = new Map(Array.from({ length: 41 }, (_, index) => buildProduct(index)).map(product => [product.id, product]));
    const designerOrders = new Map<string, number>();
    for (const row of customers) {
      let orders: unknown = [];
      try { orders = JSON.parse(row.ordersJson); } catch {}
      if (!Array.isArray(orders)) continue;
      for (const order of orders) {
        if (!order || typeof order !== "object" || (order as { status?: unknown }).status === "Cancelled") continue;
        const items = (order as { items?: unknown }).items;
        if (!Array.isArray(items)) continue;
        for (const line of items) {
          if (!line || typeof line !== "object") continue;
          const product = catalogue.get(String((line as { productId?: unknown }).productId ?? ""));
          if (product) designerOrders.set(product.designer, (designerOrders.get(product.designer) ?? 0) + Math.max(1, Number((line as { quantity?: unknown }).quantity) || 1));
        }
      }
    }
    const featuredDesigner = [...designerOrders.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    return Response.json({ trendingProductIds: [...scores.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id]) => id), newProductIds, featuredDesigner }, { headers: { "cache-control": "public, max-age=300", "x-content-type-options": "nosniff" } });
  } catch {
    return Response.json({ trendingProductIds: [], newProductIds: [], featuredDesigner: null }, { headers: { "cache-control": "public, max-age=60" } });
  }
}
