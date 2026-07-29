import { env } from "cloudflare:workers";

import { requireAccountRole } from "../../account-role";
import { FulfilmentValidationError } from "../../fulfilment-domain";
import { getSellerOrders, updateSellerFulfilment } from "../../fulfilment-service";
import { getStylishMeUser } from "../../stylishme-auth";

const noStore = { "cache-control": "no-store" };

async function currentSeller() {
  const user = await getStylishMeUser();
  if (!user) return { error: Response.json({ error: "Sign in to manage orders" }, { status: 401, headers: noStore }) };
  if (!await requireAccountRole(user.email, "seller")) return { error: Response.json({ error: "Seller access is required" }, { status: 403, headers: noStore }) };
  const seller = await env.DB.prepare("SELECT invite_token FROM seller_state WHERE owner_email = ? LIMIT 1")
    .bind(user.email).first() as { invite_token: string } | null;
  if (!seller) return { error: Response.json({ error: "Finish setting up your store first" }, { status: 404, headers: noStore }) };
  return { sellerId: seller.invite_token };
}

export async function GET() {
  try {
    const seller = await currentSeller();
    if (seller.error) return seller.error;
    return Response.json({ orders: await getSellerOrders(env.DB, seller.sellerId!) }, { headers: noStore });
  } catch {
    return Response.json({ error: "Seller orders are temporarily unavailable" }, { status: 503, headers: noStore });
  }
}

export async function PATCH(request: Request) {
  try {
    const seller = await currentSeller();
    if (seller.error) return seller.error;
    if (Number(request.headers.get("content-length") ?? 0) > 4_000) return Response.json({ error: "Order update is too large" }, { status: 413, headers: noStore });
    const body = await request.json() as Record<string, unknown>;
    const sellerOrderId = typeof body.sellerOrderId === "string" ? body.sellerOrderId.trim().slice(0, 140) : "";
    const status = typeof body.status === "string" ? body.status.trim().slice(0, 40) : "";
    const order = await updateSellerFulfilment(env.DB, seller.sellerId!, sellerOrderId, {
      status,
      provider: body.provider,
      trackingNumber: body.trackingNumber,
      trackingUrl: body.trackingUrl,
    });
    return Response.json({ order }, { headers: noStore });
  } catch (error) {
    if (error instanceof FulfilmentValidationError) return Response.json({ error: error.message }, { status: /not found/i.test(error.message) ? 404 : 400, headers: noStore });
    return Response.json({ error: "Order update could not be saved" }, { status: 503, headers: noStore });
  }
}
