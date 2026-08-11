import { env } from "cloudflare:workers";

import { requestStoreClosureConfirmation } from "../../../auth-actions";
import { publicBlockerMessage } from "../../../account-lifecycle";
import { cancelStoreClosure, checkStoreClosureEligibility, pendingStoreClosure, scheduleStoreClosure, StoreClosureError } from "../../../store-closure";
import { consumeAuthAttempt, getStylishMeUser, passwordMatches } from "../../../stylishme-auth";
import { currentEmailConfig } from "../../../transactional-email";
import { requireAccountRole } from "../../../account-role";

const noStore = { "cache-control": "no-store" };

export async function GET() {
  const user = await getStylishMeUser();
  if (!user) return Response.json({ error: "Sign in to manage your store" }, { status: 401, headers: noStore });
  const pending = await pendingStoreClosure(env.DB, user.email);
  if (!pending && !await requireAccountRole(user.email, "seller")) return Response.json({ error: "Seller access is required" }, { status: 403, headers: noStore });
  const account = await env.DB.prepare("SELECT password_hash FROM auth_accounts WHERE email = ? LIMIT 1").bind(user.email).first() as { password_hash: string } | null;
  const eligibility = pending ? { allowed: true, blockers: [] } : await checkStoreClosureEligibility(env.DB, user.email);
  return Response.json({ pending: Boolean(pending), scheduledFor: pending?.scheduled_for ?? null, storeName: pending?.store_name ?? null, passwordEnabled: Boolean(account?.password_hash), eligibility: eligibility.allowed ? eligibility : { ...eligibility, blockers: eligibility.blockers.map(publicBlockerMessage) } }, { headers: noStore });
}

export async function POST(request: Request) {
  try {
    const user = await getStylishMeUser();
    if (!user) return Response.json({ error: "Sign in to manage your store" }, { status: 401, headers: noStore });
    if (!await requireAccountRole(user.email, "seller")) return Response.json({ error: "Seller access is required" }, { status: 403, headers: noStore });
    if (Number(request.headers.get("content-length") ?? 0) > 16_384) return Response.json({ error: "Request is too large" }, { status: 413, headers: noStore });
    const body = await request.json() as { password?: unknown; storeName?: unknown };
    const storeName = typeof body.storeName === "string" ? body.storeName : "";
    const account = await env.DB.prepare("SELECT password_hash, password_salt FROM auth_accounts WHERE email = ? LIMIT 1").bind(user.email).first() as { password_hash: string; password_salt: string } | null;
    if (!account) return Response.json({ error: "Account could not be verified" }, { status: 401, headers: noStore });
    if (!await consumeAuthAttempt(request, user.email, 3, "recovery")) return Response.json({ error: "Too many attempts. Try again later." }, { status: 429, headers: noStore });
    if (!account.password_hash) {
      const config = currentEmailConfig();
      if (!config.available) return Response.json({ error: "Secure account email is temporarily unavailable" }, { status: 503, headers: noStore });
      await requestStoreClosureConfirmation(env.DB, user.email, config);
      return Response.json({ success: true, confirmationRequired: true }, { headers: noStore });
    }
    const password = typeof body.password === "string" ? body.password : "";
    if (!await passwordMatches(password, account.password_salt, account.password_hash)) return Response.json({ error: "Password is incorrect" }, { status: 401, headers: noStore });
    const result = await scheduleStoreClosure(env.DB, user.email, storeName);
    return Response.json({ success: true, ...result }, { headers: noStore });
  } catch (error) {
    if (error instanceof StoreClosureError) return Response.json({ error: error.message, code: error.code, blockers: error.blockers }, { status: error.code === "closure_blocked" ? 409 : 400, headers: noStore });
    return Response.json({ error: "Store closure could not be scheduled" }, { status: 503, headers: noStore });
  }
}

export async function DELETE() {
  const user = await getStylishMeUser();
  if (!user) return Response.json({ error: "Sign in to manage your store" }, { status: 401, headers: noStore });
  const cancelled = await cancelStoreClosure(env.DB, user.email);
  return Response.json({ success: cancelled }, { status: cancelled ? 200 : 404, headers: noStore });
}
