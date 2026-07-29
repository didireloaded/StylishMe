import { env } from "cloudflare:workers";

import { buildAuthorizationUrl, currentOAuthConfig, type OAuthProvider } from "../../../../../oauth";
import { createOAuthAttempt } from "../../../../../oauth-storage";
import { consumeAuthAttempt, ensureAuthTables, safeRelativeReturnPath } from "../../../../../stylishme-auth";

const providerFrom = (value: string): OAuthProvider | null => value === "google" || value === "apple" ? value : null;

export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: rawProvider } = await params;
  const provider = providerFrom(rawProvider);
  if (!provider) return new Response(null, { status: 404 });
  const config = currentOAuthConfig(provider);
  if (!config.available) return Response.json({ error: `${provider === "google" ? "Google" : "Apple"} sign-in is not available` }, { status: 503, headers: { "cache-control": "no-store" } });
  const url = new URL(request.url);
  const role = url.searchParams.get("role") === "seller" ? "seller" : "customer";
  const returnTo = safeRelativeReturnPath(url.searchParams.get("returnTo") ?? "/");
  if (!await consumeAuthAttempt(request, `${provider}:visitor`, 20, "oauth")) return Response.json({ error: "Too many sign-in attempts. Try again later." }, { status: 429, headers: { "cache-control": "no-store" } });
  await ensureAuthTables();
  const attempt = await createOAuthAttempt(env.DB, { provider, role, intent: "login", linkEmail: null, returnTo });
  const authorizationUrl = buildAuthorizationUrl(config, attempt);
  const headers = new Headers({ location: authorizationUrl, "cache-control": "no-store", "referrer-policy": "no-referrer" });
  headers.append("set-cookie", `stylishme_oauth_${provider}=${attempt.binding}.${attempt.nonce}; Path=/api/auth/oauth/${provider}/callback; Max-Age=600; HttpOnly; Secure; SameSite=None`);
  return new Response(null, { status: 303, headers });
}
