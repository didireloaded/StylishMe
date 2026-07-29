import { env } from "cloudflare:workers";

import { createHeldPayoutBatch, recordPayoutConfirmation, SettlementValidationError } from "../../settlement-ledger";

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
    if (body.action === "create") {
      const result = await createHeldPayoutBatch(env.DB, {
        sellerId: typeof body.sellerId === "string" ? body.sellerId : "",
        idempotencyKey: request.headers.get("idempotency-key")?.trim() ?? "",
      });
      return Response.json(result, { status: result.reused ? 200 : 201, headers: { "cache-control": "no-store" } });
    }
    if (body.action === "confirm") {
      const result = await recordPayoutConfirmation(env.DB, {
        batchId: typeof body.batchId === "string" ? body.batchId : "",
        providerReference: typeof body.providerReference === "string" ? body.providerReference : "",
      });
      return Response.json(result, { headers: { "cache-control": "no-store" } });
    }
    return Response.json({ error: "Payout action is invalid" }, { status: 400, headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof SettlementValidationError) return Response.json({ error: error.message }, { status: 400, headers: { "cache-control": "no-store" } });
    return Response.json({ error: "Payout action could not be completed" }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
