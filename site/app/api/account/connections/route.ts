import { env } from "cloudflare:workers";

import { oauthAvailability } from "../../../oauth";
import { ensureAuthTables, getStylishMeUser } from "../../../stylishme-auth";

export async function GET() {
  const user = await getStylishMeUser();
  if (!user) return Response.json({ error: "Sign in to manage security" }, { status: 401, headers: { "cache-control": "no-store" } });
  await ensureAuthTables();
  const [rows, account] = await Promise.all([
    env.DB.prepare("SELECT provider FROM auth_identities WHERE account_email = ?").bind(user.email).all() as Promise<{ results?: Array<{ provider: string }> }>,
    env.DB.prepare("SELECT password_hash FROM auth_accounts WHERE email = ? LIMIT 1").bind(user.email).first() as Promise<{ password_hash: string } | null>,
  ]);
  const connected = new Set((rows.results ?? []).map(row => row.provider));
  return Response.json({ available: oauthAvailability(), connected: { google: connected.has("google"), apple: connected.has("apple") }, passwordEnabled: Boolean(account?.password_hash) }, { headers: { "cache-control": "no-store" } });
}
