import { env } from "cloudflare:workers";

import { getCustomerFulfilments } from "../../../../fulfilment-service";
import { getStylishMeUser } from "../../../../stylishme-auth";

const noStore = { "cache-control": "no-store" };

export async function GET(_request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const user = await getStylishMeUser();
    if (!user) return Response.json({ error: "Sign in to track this order" }, { status: 401, headers: noStore });
    const { orderId } = await params;
    if (!/^SM-\d{4}-[A-Z0-9]{8}$/.test(orderId)) return Response.json({ error: "Order not found" }, { status: 404, headers: noStore });
    const owned = await env.DB.prepare("SELECT id FROM commerce_orders WHERE id = ? AND customer_email = ? LIMIT 1")
      .bind(orderId, user.email).first();
    if (!owned) return Response.json({ error: "Order not found" }, { status: 404, headers: noStore });
    const fulfilments = await getCustomerFulfilments(env.DB, user.email, orderId);
    return Response.json({ fulfilments }, { headers: noStore });
  } catch {
    return Response.json({ error: "Tracking is temporarily unavailable" }, { status: 503, headers: noStore });
  }
}
