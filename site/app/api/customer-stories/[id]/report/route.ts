import { env } from "cloudflare:workers";

import { recordActivity } from "../../../../activity";
import { getStylishMeUser } from "../../../../stylishme-auth";
import { ensureCustomerStoryTables, storyActorHash } from "../../../../customer-story-storage";

const reasons = new Set(["inappropriate", "misleading", "privacy", "spam", "other"]);

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getStylishMeUser();
  if (!user) return Response.json({ error: "Sign in to report this outfit" }, { status: 401 });
  await ensureCustomerStoryTables();
  const { id } = await context.params;
  const body = await request.json() as { reason?: unknown };
  if (typeof body.reason !== "string" || !reasons.has(body.reason)) return Response.json({ error: "Choose a report reason" }, { status: 400 });
  const story = await env.DB.prepare("SELECT owner_email FROM customer_outfit_stories WHERE id = ? AND status = 'published'").bind(id).first() as { owner_email: string } | null;
  if (!story) return Response.json({ error: "This outfit is unavailable" }, { status: 404 });
  if (story.owner_email === user.email) return Response.json({ error: "You can delete your own outfit instead" }, { status: 400 });
  const reporterHash = await storyActorHash(user.email);
  const hourStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const recent = await env.DB.prepare("SELECT COUNT(*) AS value FROM customer_outfit_story_reports WHERE reporter_hash = ? AND created_at >= ?").bind(reporterHash, hourStart).first() as { value?: number } | null;
  if (Number(recent?.value ?? 0) >= 10) return Response.json({ error: "Please wait before sending another report" }, { status: 429 });
  await env.DB.prepare("INSERT OR IGNORE INTO customer_outfit_story_reports (id, story_id, reporter_hash, reason, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(crypto.randomUUID(), id, reporterHash, body.reason, new Date().toISOString()).run();
  await recordActivity(request, "customer_story_reported", "story", id).catch(() => undefined);
  return Response.json({ reported: true }, { status: 202 });
}
