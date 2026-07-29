import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";

import { getDb } from "../../../db";
import { customerState } from "../../../db/schema";
import { recordActivity } from "../../activity";
import { createCommerceOrder, getCustomerOrders } from "../../commerce-orders";
import { StockReservationError } from "../../inventory-reservations";
import { OrderValidationError } from "../../order-creation";
import { getStylishMeUser } from "../../stylishme-auth";

const safeJson = (value: string, fallback: unknown) => {
  try { return JSON.parse(value); } catch { return fallback; }
};

export async function GET() {
  try {
    const user = await getStylishMeUser();
    if (!user) return Response.json({ error: "Sign in to view orders" }, { status: 401, headers: { "cache-control": "no-store" } });
    const orders = await getCustomerOrders(env.DB, user.email);
    return Response.json({ orders }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "Orders are unavailable" }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getStylishMeUser();
    if (!user) return Response.json({ error: "Sign in to continue to payment" }, { status: 401, headers: { "cache-control": "no-store" } });
    const size = Number(request.headers.get("content-length") ?? "0");
    if (size > 10_000) return Response.json({ error: "Order request is too large" }, { status: 413 });
    const idempotencyKey = request.headers.get("idempotency-key")?.trim() ?? "";
    const body = await request.json() as Record<string, unknown>;
    const [account] = await getDb().select().from(customerState).where(eq(customerState.email, user.email)).limit(1);
    const result = await createCommerceOrder(env.DB, {
      email: user.email,
      cart: account ? safeJson(account.cartJson, []) : [],
      fulfilment: body.fulfilment,
      idempotencyKey,
      profile: account ? safeJson(account.profileJson, {}) : {},
    });
    if (!result.reused) await recordActivity(request, "order_placed", "order", result.order.id).catch(() => undefined);
    return Response.json(result, { status: result.reused ? 200 : 201, headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof StockReservationError) {
      return Response.json({ error: error.message }, { status: 409, headers: { "cache-control": "no-store" } });
    }
    if (error instanceof OrderValidationError) {
      return Response.json({ error: error.message }, { status: 400, headers: { "cache-control": "no-store" } });
    }
    return Response.json({ error: "Unable to prepare your order" }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
