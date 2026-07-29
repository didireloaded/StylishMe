import { env } from "cloudflare:workers";

import { currentDpoConfig } from "../../../../dpo-pay";
import { PaymentUnavailableError, PaymentValidationError, reconcileDpoPayment } from "../../../../payment-service";

async function references(request: Request) {
  const url = new URL(request.url);
  let transactionToken = url.searchParams.get("TransactionToken") ?? url.searchParams.get("TransToken") ?? "";
  let orderId = url.searchParams.get("CompanyRef") ?? url.searchParams.get("orderId") ?? "";
  if (request.method === "POST") {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = await request.json().catch(() => ({})) as Record<string, unknown>;
      transactionToken ||= typeof body.TransactionToken === "string" ? body.TransactionToken : typeof body.TransToken === "string" ? body.TransToken : "";
      orderId ||= typeof body.CompanyRef === "string" ? body.CompanyRef : typeof body.orderId === "string" ? body.orderId : "";
    } else {
      const body = await request.formData().catch(() => null);
      transactionToken ||= String(body?.get("TransactionToken") ?? body?.get("TransToken") ?? "");
      orderId ||= String(body?.get("CompanyRef") ?? body?.get("orderId") ?? "");
    }
  }
  return { transactionToken, orderId };
}

async function handle(request: Request) {
  try {
    const refs = await references(request);
    const result = await reconcileDpoPayment(env.DB, currentDpoConfig(), refs);
    return Response.json({ received: true, status: result.status, orderId: result.orderId }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof PaymentValidationError) return Response.json({ received: false, error: error.message }, { status: 400, headers: { "cache-control": "no-store" } });
    if (error instanceof PaymentUnavailableError) return Response.json({ received: false, error: "Verification is temporarily unavailable" }, { status: 503, headers: { "cache-control": "no-store", "retry-after": "30" } });
    return Response.json({ received: false, error: "Verification is temporarily unavailable" }, { status: 503, headers: { "cache-control": "no-store", "retry-after": "30" } });
  }
}

export const GET = handle;
export const POST = handle;
