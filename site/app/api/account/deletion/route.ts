import { env } from "cloudflare:workers";

import { cancelAccountDeletion, pendingAccountDeletion, scheduleAccountDeletion } from "../../../account-deletion";
import { requestAccountDeletionConfirmation } from "../../../auth-actions";
import { consumeAuthAttempt, getStylishMeUser, passwordMatches, safeRelativeReturnPath } from "../../../stylishme-auth";
import { currentEmailConfig, sendTransactionalEmail } from "../../../transactional-email";

const noStore = { "cache-control": "no-store" };

export async function GET() {
  const user = await getStylishMeUser();
  if (!user) return Response.json({ error: "Sign in to manage your account" }, { status: 401, headers: noStore });
  const [pending, account] = await Promise.all([
    pendingAccountDeletion(env.DB, user.email),
    env.DB.prepare("SELECT password_hash FROM auth_accounts WHERE email = ? LIMIT 1").bind(user.email).first() as Promise<{ password_hash: string } | null>,
  ]);
  return Response.json({ pending: Boolean(pending), scheduledFor: pending?.scheduled_for ?? null, passwordEnabled: Boolean(account?.password_hash) }, { headers: noStore });
}

export async function POST(request: Request) {
  try {
    const user = await getStylishMeUser();
    if (!user) return Response.json({ error: "Sign in to manage your account" }, { status: 401, headers: noStore });
    const body = await request.json() as Record<string, unknown>;
    const password = typeof body.password === "string" ? body.password : "";
    safeRelativeReturnPath(typeof body.returnTo === "string" ? body.returnTo : "/");
    const account = await env.DB.prepare("SELECT password_hash, password_salt FROM auth_accounts WHERE email = ? LIMIT 1")
      .bind(user.email).first() as { password_hash: string; password_salt: string } | null;
    if (!account) return Response.json({ error: "Account could not be verified" }, { status: 401, headers: noStore });
    if (!account.password_hash) {
      if (!await consumeAuthAttempt(request, user.email, 3, "recovery")) return Response.json({ error: "Too many attempts. Try again later." }, { status: 429, headers: noStore });
      const config = currentEmailConfig();
      if (!config.available) return Response.json({ error: "Secure account email is temporarily unavailable" }, { status: 503, headers: noStore });
      await requestAccountDeletionConfirmation(env.DB, user.email, config);
      return Response.json({ success: true, confirmationRequired: true }, { headers: noStore });
    }
    if (!await passwordMatches(password, account.password_salt, account.password_hash)) return Response.json({ error: "Password is incorrect" }, { status: 401, headers: noStore });
    const result = await scheduleAccountDeletion(env.DB, user.email);
    const config = currentEmailConfig();
    if (config.available) await sendTransactionalEmail(config, { to: user.email, subject: "StylishMe account deletion scheduled", text: `Your account is scheduled for deletion on ${new Date(result.scheduledFor).toLocaleDateString("en-NA")}. Sign in and open Settings before then if you want to keep your account.` }).catch(() => undefined);
    return Response.json({ success: true, ...result }, { headers: noStore });
  } catch {
    return Response.json({ error: "Account deletion could not be scheduled" }, { status: 503, headers: noStore });
  }
}

export async function DELETE() {
  const user = await getStylishMeUser();
  if (!user) return Response.json({ error: "Sign in to manage your account" }, { status: 401, headers: noStore });
  const cancelled = await cancelAccountDeletion(env.DB, user.email);
  return Response.json({ success: cancelled }, { status: cancelled ? 200 : 404, headers: noStore });
}
