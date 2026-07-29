import { env } from "cloudflare:workers";

import { currentDpoConfig } from "../../../dpo-pay";
import { createDpoRefund, PaymentUnavailableError, PaymentValidationError } from "../../../payment-service";

const secureEquals = (left: string, right: string) => {
  if (!left || left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
};

export async function POST(request: Request) {
  const configuredKey = process.env.STYLISHME_ADMIN_API_KEY ?? "";
  const suppliedKey = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!configuredKey || !secureEquals(configuredKey, suppliedKey)) return Response.json({ error: "Not authorized" }, { status: 401, headers: { "cache-control": "no-store" } });
  try {
    const body = await request.json() as Record<string, unknown>;
    const result = await createDpoRefund(env.DB, currentDpoConfig(), {
      orderId: typeof body.orderId === "string" ? body.orderId : "",
      sellerOrderId: typeof body.sellerOrderId === "string" ? body.sellerOrderId : "",
      amountCents: Number(body.amountCents),
      reason: typeof body.reason === "string" ? body.reason : "",
      idempotencyKey: request.headers.get("idempotency-key")?.trim() ?? "",
    });
    return Response.json(result, { status: result.reused ? 200 : 201, headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof PaymentValidationError) return Response.json({ error: error.message }, { status: 400, headers: { "cache-control": "no-store" } });
    if (error instanceof PaymentUnavailableError) return Response.json({ error: error.message }, { status: 503, headers: { "cache-control": "no-store" } });
    return Response.json({ error: "Refund could not be completed; it has been held for reconciliation" }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
