import { env } from "cloudflare:workers";

import { requireAccountRole } from "../../account-role";
import { getSellerSettlementSummary } from "../../settlement-ledger";
import { getStylishMeUser } from "../../stylishme-auth";

export async function GET() {
  try {
    const user = await getStylishMeUser();
    if (!user) return Response.json({ error: "Sign in securely to view payouts" }, { status: 401, headers: { "cache-control": "no-store" } });
    if (!await requireAccountRole(user.email, "seller")) return Response.json({ error: "Seller access is required" }, { status: 403, headers: { "cache-control": "no-store" } });
    const seller = await env.DB.prepare("SELECT invite_token FROM seller_state WHERE owner_email = ? LIMIT 1")
      .bind(user.email).first() as { invite_token: string } | null;
    if (!seller) return Response.json({ summary: { availableCents: 0, pendingCents: 0, inPayoutCents: 0, paidCents: 0, commissionCents: 0 }, batches: [], payoutAccountStatus: "not_connected" }, { headers: { "cache-control": "no-store" } });
    const [summary, batches, payoutAccount] = await Promise.all([
      getSellerSettlementSummary(env.DB, seller.invite_token),
      env.DB.prepare(`SELECT id, amount_cents, currency, status, created_at, released_at
        FROM payout_batches WHERE seller_id = ? ORDER BY created_at DESC LIMIT 50`).bind(seller.invite_token).all(),
      env.DB.prepare("SELECT status FROM seller_payout_accounts WHERE seller_id = ? LIMIT 1").bind(seller.invite_token).first(),
    ]);
    return Response.json({
      summary,
      batches: (batches.results ?? []).map((batch: Record<string, unknown>) => ({
        id: batch.id,
        amountCents: batch.amount_cents,
        currency: batch.currency,
        status: batch.status,
        createdAt: batch.created_at,
        releasedAt: batch.released_at,
      })),
      payoutAccountStatus: (payoutAccount as { status?: string } | null)?.status ?? "not_connected",
    }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "Payout records are temporarily unavailable" }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
