import { env } from "cloudflare:workers";

import { getCustomerOrders } from "../../../commerce-orders";
import { getStylishMeUser } from "../../../stylishme-auth";

export async function GET(_request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const user = await getStylishMeUser();
    if (!user) return Response.json({ error: "Sign in to view this order" }, { status: 401, headers: { "cache-control": "no-store" } });
    const { orderId } = await params;
    if (!/^SM-\d{4}-[A-Z0-9]{8}$/.test(orderId)) return Response.json({ error: "Order not found" }, { status: 404 });
    const [order] = await getCustomerOrders(env.DB, user.email, orderId);
    if (!order) return Response.json({ error: "Order not found" }, { status: 404, headers: { "cache-control": "no-store" } });
    return Response.json({ order }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "Order unavailable" }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
