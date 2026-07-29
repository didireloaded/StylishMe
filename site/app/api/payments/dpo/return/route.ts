import { env } from "cloudflare:workers";

import { currentDpoConfig } from "../../../../dpo-pay";
import { reconcileDpoPayment } from "../../../../payment-service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const transactionToken = url.searchParams.get("TransactionToken") ?? url.searchParams.get("TransToken") ?? "";
  const orderId = url.searchParams.get("CompanyRef") ?? url.searchParams.get("orderId") ?? "";
  let status = "pending";
  let safeOrderId = "";
  try {
    const result = await reconcileDpoPayment(env.DB, currentDpoConfig(), { transactionToken, orderId });
    status = result.status;
    safeOrderId = result.orderId;
  } catch {
    status = "verification-error";
  }
  const target = new URL("/orders", process.env.PUBLIC_APP_ORIGIN ?? url.origin);
  target.searchParams.set("payment", status);
  if (safeOrderId) target.searchParams.set("order", safeOrderId);
  return Response.redirect(target, 303);
}
