import { env } from "cloudflare:workers";

import { currentDpoConfig } from "../../../dpo-pay";
import { PaymentUnavailableError, PaymentValidationError, startDpoCheckout } from "../../../payment-service";
import { getStylishMeUser } from "../../../stylishme-auth";

export async function POST(request: Request) {
  try {
    const user = await getStylishMeUser();
    if (!user) return Response.json({ error: "Sign in to continue to payment" }, { status: 401, headers: { "cache-control": "no-store" } });
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (contentLength > 5_000) return Response.json({ error: "Payment request is too large" }, { status: 413 });
    const body = await request.json() as { orderId?: unknown };
    const orderId = typeof body.orderId === "string" ? body.orderId : "";
    const requestKey = request.headers.get("idempotency-key")?.trim() ?? "";
    const origin = process.env.PUBLIC_APP_ORIGIN?.trim();
    if (!origin) throw new PaymentUnavailableError("Secure payments are being connected");
    const result = await startDpoCheckout(env.DB, currentDpoConfig(), {
      customerEmail: user.email,
      orderId,
      requestKey,
      origin,
    });
    return Response.json(result, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof PaymentValidationError) return Response.json({ error: error.message }, { status: 400, headers: { "cache-control": "no-store" } });
    if (error instanceof PaymentUnavailableError) return Response.json({ error: error.message }, { status: 503, headers: { "cache-control": "no-store", "retry-after": "30" } });
    return Response.json({ error: "Secure payments are temporarily unavailable" }, { status: 503, headers: { "cache-control": "no-store", "retry-after": "30" } });
  }
}
