import { env } from "cloudflare:workers";

import { resetPasswordWithToken } from "../../../../auth-actions";
import { consumeAuthAttempt, safeRelativeReturnPath } from "../../../../stylishme-auth";

const noStore = { "cache-control": "no-store" };

export async function POST(request: Request) {
  try {
    if (Number(request.headers.get("content-length") ?? 0) > 8_000) return Response.json({ error: "Request is too large" }, { status: 413, headers: noStore });
    const body = await request.json() as Record<string, unknown>;
    const tokenIdentity = typeof body.token === "string" ? body.token.slice(0, 100) : "invalid";
    if (!await consumeAuthAttempt(request, tokenIdentity, 8, "recovery")) return Response.json({ error: "Too many attempts. Try again later." }, { status: 429, headers: noStore });
    const success = await resetPasswordWithToken(env.DB, body.token, body.password);
    if (!success) return Response.json({ error: "This reset link is invalid or has expired" }, { status: 400, headers: noStore });
    return Response.json({ success: true, returnTo: `/login?reason=password-reset&returnTo=${encodeURIComponent(safeRelativeReturnPath(typeof body.returnTo === "string" ? body.returnTo : "/"))}` }, { headers: noStore });
  } catch {
    return Response.json({ error: "Password could not be reset" }, { status: 503, headers: noStore });
  }
}
