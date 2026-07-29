import { env } from "cloudflare:workers";

import { requestEmailVerification } from "../../../../auth-actions";
import { consumeAuthAttempt, safeRelativeReturnPath } from "../../../../stylishme-auth";
import { currentEmailConfig, EmailUnavailableError } from "../../../../transactional-email";

const noStore = { "cache-control": "no-store" };

export async function POST(request: Request) {
  try {
    if (Number(request.headers.get("content-length") ?? 0) > 4_000) return Response.json({ error: "Request is too large" }, { status: 413, headers: noStore });
    const body = await request.json() as Record<string, unknown>;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 180) : "";
    safeRelativeReturnPath(typeof body.returnTo === "string" ? body.returnTo : "/");
    if (!await consumeAuthAttempt(request, email, 3, "recovery")) return Response.json({ error: "Too many attempts. Try again later." }, { status: 429, headers: noStore });
    await requestEmailVerification(env.DB, email, currentEmailConfig());
    return Response.json({ success: true, message: "If this account needs verification, a new link has been sent." }, { headers: noStore });
  } catch (error) {
    if (error instanceof EmailUnavailableError) return Response.json({ error: error.message }, { status: 503, headers: noStore });
    return Response.json({ error: "Unable to send a verification email" }, { status: 503, headers: noStore });
  }
}
