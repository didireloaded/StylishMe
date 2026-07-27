import { env } from "cloudflare:workers";
import { getStylishMeUser } from "../../../stylishme-auth";

export async function GET() {
  const user = await getStylishMeUser();
  if (!user) return new Response(null, { status: 401 });
  const row = await env.DB.prepare("SELECT avatar_key FROM auth_accounts WHERE email = ? LIMIT 1").bind(user.email).first() as { avatar_key: string } | null;
  if (!row) return new Response(null, { status: 404 });
  const object = await env.MEDIA.get(row.avatar_key);
  if (!object) return new Response(null, { status: 404 });
  return new Response(object.body, { headers: { "content-type": object.httpMetadata?.contentType ?? "image/webp", "cache-control": "private, max-age=3600", "x-content-type-options": "nosniff" } });
}
