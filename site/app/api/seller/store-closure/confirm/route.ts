import { env } from "cloudflare:workers";
import { confirmStoreClosureConfirmation } from "../../../../auth-actions";

const noStore = { "cache-control": "no-store", "referrer-policy": "no-referrer" };

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const result = await confirmStoreClosureConfirmation(env.DB, token).catch(() => null);
  return new Response(null, { status: 303, headers: { ...noStore, location: result ? "/?role=customer&reason=store-closed" : "/seller/settings?closure=invalid" } });
}
