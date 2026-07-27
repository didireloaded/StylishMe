import { env } from "cloudflare:workers";

import { ensureCustomerStoryTables } from "../../../../customer-story-storage";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  await ensureCustomerStoryTables();
  const { id } = await context.params;
  const story = await env.DB.prepare("SELECT image_key FROM customer_outfit_stories WHERE id = ? AND status = 'published'").bind(id).first() as { image_key: string } | null;
  if (!story) return new Response("Not found", { status: 404 });
  const object = await env.MEDIA.get(story.image_key);
  if (!object) return new Response("Not found", { status: 404 });
  return new Response(object.body, { headers: { "content-type": "image/webp", "cache-control": "public, max-age=3600", "x-content-type-options": "nosniff" } });
}
