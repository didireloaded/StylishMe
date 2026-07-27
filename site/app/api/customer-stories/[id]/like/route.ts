import { env } from "cloudflare:workers";

import { recordActivity } from "../../../../activity";
import { getStylishMeUser } from "../../../../stylishme-auth";
import { ensureCustomerStoryTables, storyActorHash } from "../../../../customer-story-storage";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getStylishMeUser();
  if (!user) return Response.json({ error: "Sign in to like this outfit" }, { status: 401 });
  await ensureCustomerStoryTables();
  const { id } = await context.params;
  const story = await env.DB.prepare("SELECT id FROM customer_outfit_stories WHERE id = ? AND status = 'published'").bind(id).first() as { id: string } | null;
  if (!story) return Response.json({ error: "This outfit is unavailable" }, { status: 404 });
  const actorHash = await storyActorHash(user.email);
  const existing = await env.DB.prepare("SELECT story_id FROM customer_outfit_story_likes WHERE story_id = ? AND actor_hash = ?").bind(id, actorHash).first();
  if (existing) {
    await env.DB.prepare("DELETE FROM customer_outfit_story_likes WHERE story_id = ? AND actor_hash = ?").bind(id, actorHash).run();
    await recordActivity(request, "customer_story_unliked", "story", id).catch(() => undefined);
  } else {
    await env.DB.prepare("INSERT INTO customer_outfit_story_likes (story_id, actor_hash, created_at) VALUES (?, ?, ?)").bind(id, actorHash, new Date().toISOString()).run();
    await recordActivity(request, "customer_story_liked", "story", id).catch(() => undefined);
  }
  const count = await env.DB.prepare("SELECT COUNT(*) AS value FROM customer_outfit_story_likes WHERE story_id = ?").bind(id).first() as { value?: number } | null;
  return Response.json({ liked: !existing, likeCount: Number(count?.value ?? 0) }, { headers: { "cache-control": "no-store" } });
}
