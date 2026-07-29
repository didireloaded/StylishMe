import { eq } from "drizzle-orm";

import { getDb } from "../../../db";
import { customerState } from "../../../db/schema";
import { recordActivity } from "../../activity";
import { OrderValidationError, prepareSandboxOrder } from "../../order-creation";
import { getStylishMeUser } from "../../stylishme-auth";

const safeJson = (value: string, fallback: unknown) => {
  try { return JSON.parse(value); } catch { return fallback; }
};

function orderDate(now: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "short", year: "numeric", timeZone: "UTC",
  }).format(now);
}

export async function POST(request: Request) {
  try {
    const user = await getStylishMeUser();
    if (!user) return Response.json({ error: "Sign in to place a sandbox order" }, { status: 401 });
    const size = Number(request.headers.get("content-length") ?? "0");
    if (size > 10_000) return Response.json({ error: "Order request is too large" }, { status: 413 });
    const body = await request.json() as Record<string, unknown>;
    const db = getDb();
    const [account] = await db.select().from(customerState).where(eq(customerState.email, user.email)).limit(1);
    const draft = prepareSandboxOrder(account ? safeJson(account.cartJson, []) : [], body.fulfilment);
    const now = new Date();
    const order = {
      id: `SM-${now.getUTCFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      date: orderDate(now),
      ...draft,
    };
    const previousOrders = account ? safeJson(account.ordersJson, []) : [];
    const orders = Array.isArray(previousOrders) ? [order, ...previousOrders].slice(0, 100) : [order];
    const values = {
      email: user.email,
      cartJson: "[]",
      wishlistJson: account?.wishlistJson ?? "[]",
      ordersJson: JSON.stringify(orders),
      profileJson: account?.profileJson ?? "{}",
      updatedAt: now.toISOString(),
    };
    await db.insert(customerState).values(values).onConflictDoUpdate({
      target: customerState.email,
      set: values,
    });
    await recordActivity(request, "order_placed", "order", order.id).catch(() => undefined);
    return Response.json({ order }, { status: 201, headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof OrderValidationError) {
      return Response.json({ error: error.message }, { status: 400, headers: { "cache-control": "no-store" } });
    }
    return Response.json({ error: "Unable to place the sandbox order" }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
