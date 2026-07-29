import { env } from "cloudflare:workers";
import { clearAuthAttempts, consumeAuthAttempt, createSession, ensureAuthTables, passwordMatches, safeRelativeReturnPath } from "../../../stylishme-auth";

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (contentLength > 16 * 1024) return Response.json({ error: "Sign-in request is too large" }, { status: 413 });
    const body = await request.json() as { email?: unknown; password?: unknown; returnTo?: unknown };
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 180) : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (new TextEncoder().encode(password).byteLength > 256) return Response.json({ error: "Email or password is incorrect" }, { status: 401 });
    if (!await consumeAuthAttempt(request, email, 10, "login")) return Response.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });
    await ensureAuthTables();
    const row = await env.DB.prepare("SELECT email, password_hash, password_salt FROM auth_accounts WHERE email = ? LIMIT 1").bind(email).first() as { email: string; password_hash: string; password_salt: string } | null;
    if (!row || !await passwordMatches(password, row.password_salt, row.password_hash)) return Response.json({ error: "Email or password is incorrect" }, { status: 401 });
    await clearAuthAttempts(request, email, "login");
    const session = await createSession(row.email);
    return Response.json({ success: true, returnTo: safeRelativeReturnPath(typeof body.returnTo === "string" ? body.returnTo : "/") }, { headers: { "set-cookie": session.cookie, "cache-control": "no-store" } });
  } catch { return Response.json({ error: "Unable to sign in right now" }, { status: 500 }); }
}
