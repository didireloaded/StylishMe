import { env } from "cloudflare:workers";

import { getStylishMeUser } from "../../../stylishme-auth";
import { ensureCustomerStoryTables } from "../../../customer-story-storage";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getStylishMeUser();
  if (!user) return Response.json({ error: "Sign in to remove your outfit" }, { status: 401 });
  await ensureCustomerStoryTables();
  const { id } = await context.params;
  const story = await env.DB.prepare("SELECT owner_email, image_key FROM customer_outfit_stories WHERE id = ?").bind(id).first() as { owner_email: string; image_key: string } | null;
  if (!story) return Response.json({ error: "This outfit is unavailable" }, { status: 404 });
  if (story.owner_email !== user.email) return Response.json({ error: "You can only remove your own outfit" }, { status: 403 });
  await env.DB.prepare("UPDATE customer_outfit_stories SET status = 'deleted', updated_at = ? WHERE id = ?").bind(new Date().toISOString(), id).run();
  await env.MEDIA.delete(story.image_key);
  return Response.json({ deleted: true });
}
