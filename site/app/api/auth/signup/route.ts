import { env } from "cloudflare:workers";
import { consumeAuthAttempt, createPasswordHash, createSession, ensureAuthTables, safeRelativeReturnPath } from "../../../stylishme-auth";
import { inspectProfileImage } from "../../../customer-story-image";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let avatarKey = "";
  try {
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (contentLength > 6 * 1024 * 1024) return Response.json({ error: "Account request is too large" }, { status: 413 });
    const form = await request.formData();
    const name = String(form.get("name") ?? "").trim().replace(/[\u0000-\u001f]/g, "").slice(0, 80);
    const email = String(form.get("email") ?? "").trim().toLowerCase().slice(0, 180);
    const password = String(form.get("password") ?? "");
    if (new TextEncoder().encode(password).byteLength > 256) return Response.json({ error: "Password is too long" }, { status: 400 });
    const role = form.get("role") === "seller" ? "seller" : "customer";
    const returnTo = safeRelativeReturnPath(String(form.get("returnTo") ?? "/"));
    const avatar = form.get("avatar");
    if (!await consumeAuthAttempt(request, email, 5, "signup")) return Response.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });
    if (name.length < 2) return Response.json({ error: "Enter your full name" }, { status: 400 });
    if (!emailPattern.test(email)) return Response.json({ error: "Enter a valid email address" }, { status: 400 });
    if (password.length < 10 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) return Response.json({ error: "Use at least 10 characters with a letter and number" }, { status: 400 });
    if (!(avatar instanceof File) || !avatar.size || avatar.size > 5 * 1024 * 1024) return Response.json({ error: "Profile photo is required and must be under 5 MB" }, { status: 400 });
    const processed = await inspectProfileImage(new Uint8Array(await avatar.arrayBuffer()), avatar.type);
    await ensureAuthTables();
    const existing = await env.DB.prepare("SELECT email FROM auth_accounts WHERE email = ?").bind(email).first();
    if (existing) return Response.json({ error: "An account already exists for this email" }, { status: 409 });
    const passwordRecord = await createPasswordHash(password);
    avatarKey = `profile-photos/${crypto.randomUUID()}.${processed.extension}`;
    await env.MEDIA.put(avatarKey, processed.bytes, { httpMetadata: { contentType: processed.contentType } });
    const now = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare("INSERT INTO auth_accounts (email, name, password_hash, password_salt, avatar_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(email, name, passwordRecord.hash, passwordRecord.salt, avatarKey, now, now),
      env.DB.prepare("INSERT INTO customer_state (email, cart_json, wishlist_json, orders_json, profile_json, updated_at) VALUES (?, '[]', '[]', '[]', ?, ?) ON CONFLICT(email) DO UPDATE SET profile_json = excluded.profile_json, updated_at = excluded.updated_at").bind(email, JSON.stringify({ accountRole: role, displayName: name }), now),
    ]);
    const session = await createSession(email);
    return Response.json({ success: true, returnTo }, { status: 201, headers: { "set-cookie": session.cookie, "cache-control": "no-store" } });
  } catch {
    if (avatarKey) await env.MEDIA.delete(avatarKey).catch(() => undefined);
    return Response.json({ error: "Unable to create your account right now" }, { status: 500 });
  }
}
