import { env } from "cloudflare:workers";

import { resetPasswordWithToken } from "../../../../auth-actions";
import { safeRelativeReturnPath } from "../../../../stylishme-auth";

const noStore = { "cache-control": "no-store" };

export async function POST(request: Request) {
  try {
    if (Number(request.headers.get("content-length") ?? 0) > 8_000) return Response.json({ error: "Request is too large" }, { status: 413, headers: noStore });
    const body = await request.json() as Record<string, unknown>;
    const success = await resetPasswordWithToken(env.DB, body.token, body.password);
    if (!success) return Response.json({ error: "This reset link is invalid or has expired" }, { status: 400, headers: noStore });
    return Response.json({ success: true, returnTo: `/login?reason=password-reset&returnTo=${encodeURIComponent(safeRelativeReturnPath(typeof body.returnTo === "string" ? body.returnTo : "/"))}` }, { headers: noStore });
  } catch {
    return Response.json({ error: "Password could not be reset" }, { status: 503, headers: noStore });
  }
}
