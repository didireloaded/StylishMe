import { env } from "cloudflare:workers";

import { confirmAccountDeletionConfirmation } from "../../../../auth-actions";

const noStore = { "cache-control": "no-store", "referrer-policy": "no-referrer" };

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const result = await confirmAccountDeletionConfirmation(env.DB, token).catch(() => null);
  return new Response(null, {
    status: 303,
    headers: {
      ...noStore,
      location: result ? "/?view=settings&deletion=scheduled" : "/?view=settings&deletion=invalid",
    },
  });
}
