import { env } from "cloudflare:workers";

import { confirmEmailVerification } from "../../../../auth-actions";
import { safeRelativeReturnPath } from "../../../../stylishme-auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const returnTo = safeRelativeReturnPath(url.searchParams.get("returnTo") ?? "/");
  const verified = await confirmEmailVerification(env.DB, token).catch(() => false);
  const destination = new URL(`/login?reason=${verified ? "verified" : "verification-invalid"}&returnTo=${encodeURIComponent(returnTo)}`, url.origin);
  return new Response(null, { status: 303, headers: { location: destination.toString(), "cache-control": "no-store" } });
}
