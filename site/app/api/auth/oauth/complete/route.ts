import { env } from "cloudflare:workers";

import { inspectProfileImage } from "../../../../customer-story-image";
import { consumePendingOAuthProfile } from "../../../../oauth-storage";
import { createSession, ensureAuthTables } from "../../../../stylishme-auth";

const noStore = { "cache-control": "no-store", "referrer-policy": "no-referrer" };
const cookieValue = (request: Request, name: string) => request.headers.get("cookie")?.split(";").map(value => value.trim()).find(value => value.startsWith(`${name}=`))?.slice(name.length + 1) ?? "";
const clearProfileCookie = "stylishme_oauth_profile=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax";

export async function POST(request: Request) {
  let avatarKey = "";
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "Request not accepted" }, { status: 403, headers: noStore });
    const token = cookieValue(request, "stylishme_oauth_profile");
    if (!token || token.length > 512) return Response.json({ error: "This sign-in has expired. Start again." }, { status: 400, headers: { ...noStore, "set-cookie": clearProfileCookie } });
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (contentLength > 6 * 1024 * 1024) return Response.json({ error: "Profile request is too large" }, { status: 413, headers: noStore });
    const form = await request.formData();
    const name = String(form.get("name") ?? "").trim().replace(/[\u0000-\u001f]/g, "").slice(0, 80);
    const avatar = form.get("avatar");
    if (name.length < 2) return Response.json({ error: "Complete your name and try again" }, { status: 400, headers: noStore });
    if (!(avatar instanceof File) || !avatar.size || avatar.size > 5 * 1024 * 1024) return Response.json({ error: "Profile photo is required and must be under 5 MB" }, { status: 400, headers: noStore });
    const processed = await inspectProfileImage(new Uint8Array(await avatar.arrayBuffer()), avatar.type);
    await ensureAuthTables();
    const pending = await consumePendingOAuthProfile(env.DB, token);
    if (!pending) return Response.json({ error: "This sign-in has expired. Start again." }, { status: 400, headers: { ...noStore, "set-cookie": clearProfileCookie } });
    const collision = await env.DB.prepare("SELECT email FROM auth_accounts WHERE email = ? UNION ALL SELECT account_email AS email FROM auth_identities WHERE provider = ? AND provider_subject = ? LIMIT 1")
      .bind(pending.email, pending.provider, pending.providerSubject).first();
    if (collision) return Response.json({ error: "An account already exists. Sign in with email, then connect this provider in Security settings." }, { status: 409, headers: noStore });
    avatarKey = `profile-photos/${crypto.randomUUID()}.${processed.extension}`;
    await env.MEDIA.put(avatarKey, processed.bytes, { httpMetadata: { contentType: processed.contentType } });

    const now = new Date().toISOString(); const identityId = crypto.randomUUID();
    const statements = [
      env.DB.prepare("INSERT INTO auth_accounts (email, name, password_hash, password_salt, avatar_key, email_verified_at, deleted_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)").bind(pending.email, name, "", "", avatarKey, now, now, now),
      env.DB.prepare("INSERT INTO auth_identities (id, account_email, provider, provider_subject, provider_email, created_at, last_used_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(identityId, pending.email, pending.provider, pending.providerSubject, pending.email, now, now),
      env.DB.prepare("INSERT INTO customer_state (email, cart_json, wishlist_json, orders_json, profile_json, updated_at) VALUES (?, '[]', '[]', '[]', ?, ?)").bind(pending.email, JSON.stringify({ accountRole: pending.role, displayName: name }), now),
    ];
    if (pending.encryptedRefreshToken) statements.push(env.DB.prepare("INSERT INTO auth_provider_credentials (identity_id, encrypted_refresh_token, created_at, updated_at) VALUES (?, ?, ?, ?)").bind(identityId, pending.encryptedRefreshToken, now, now));
    await env.DB.batch(statements);
    const session = await createSession(pending.email);
    const headers = new Headers(noStore);
    headers.append("set-cookie", session.cookie);
    headers.append("set-cookie", clearProfileCookie);
    return Response.json({ success: true, returnTo: pending.returnTo }, { headers });
  } catch {
    if (avatarKey) await env.MEDIA.delete(avatarKey).catch(() => undefined);
    return Response.json({ error: "Unable to complete your profile right now" }, { status: 500, headers: noStore });
  }
}
