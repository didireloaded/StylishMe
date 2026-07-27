import OpenAI from "openai";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";

import { getDb } from "../../../db";
import { customerState } from "../../../db/schema";
import { recordActivity } from "../../activity";
import { getChatGPTUser } from "../../chatgpt-auth";
import { cleanStoryText, eligibleStoryItems, isRingActive } from "../../customer-story-domain";
import { inspectAndReencodeStoryImage } from "../../customer-story-image";
import { buildProduct } from "../../product-catalog";
import { ensureCustomerStoryTables, storyActorHash, toPublicStory } from "../../customer-story-storage";

const catalogue = Array.from({ length: 41 }, (_, index) => buildProduct(index));
const productById = new Map(catalogue.map(product => [product.id, product]));
const safeJson = (value: string, fallback: unknown) => { try { return JSON.parse(value); } catch { return fallback; } };

type StoryRow = {
  id: string; owner_email: string; owner_display_name: string; caption: string; town: string;
  status: string; published_at: string; ring_expires_at: string;
};
type TagRow = {
  story_id: string; product_id: string; seller_name_snapshot: string; product_name_snapshot: string;
  product_image_snapshot: string; product_price_snapshot: number;
};

async function publicStories(userEmail?: string) {
  await ensureCustomerStoryTables();
  const [storyRaw, tagRaw, likeRaw] = await Promise.all([
    env.DB.prepare("SELECT id, owner_email, owner_display_name, caption, town, status, published_at, ring_expires_at FROM customer_outfit_stories WHERE status = 'published' ORDER BY published_at DESC LIMIT 100").all(),
    env.DB.prepare("SELECT story_id, product_id, seller_name_snapshot, product_name_snapshot, product_image_snapshot, product_price_snapshot FROM customer_outfit_story_products").all(),
    env.DB.prepare("SELECT story_id, actor_hash FROM customer_outfit_story_likes").all(),
  ]);
  const storyResult = storyRaw as { results?: StoryRow[] };
  const tagResult = tagRaw as { results?: TagRow[] };
  const likeResult = likeRaw as { results?: Array<{ story_id: string; actor_hash: string }> };
  const actorHash = userEmail ? await storyActorHash(userEmail) : "";
  return (storyResult.results ?? []).map(row => toPublicStory({
    id: row.id,
    displayName: row.owner_display_name,
    caption: row.caption,
    town: row.town,
    status: "published",
    publishedAt: row.published_at,
    ringExpiresAt: row.ring_expires_at,
    likeCount: (likeResult.results ?? []).filter(like => like.story_id === row.id).length,
    liked: Boolean(actorHash && (likeResult.results ?? []).some(like => like.story_id === row.id && like.actor_hash === actorHash)),
    isOwner: row.owner_email === userEmail,
    products: (tagResult.results ?? []).filter(tag => tag.story_id === row.id).map(tag => ({
      id: tag.product_id, name: tag.product_name_snapshot, seller: tag.seller_name_snapshot,
      image: tag.product_image_snapshot, price: tag.product_price_snapshot,
    })),
  }));
}

export async function GET() {
  try {
    const user = await getChatGPTUser();
    const stories = await publicStories(user?.email);
    let eligibleItems: Array<{ orderId: string; productId: string }> = [];
    if (user) {
      const [row] = await getDb().select().from(customerState).where(eq(customerState.email, user.email)).limit(1);
      eligibleItems = row ? eligibleStoryItems(safeJson(row.ordersJson, [])) : [];
    }
    return Response.json({
      stories: stories.map(story => ({ ...story, inRing: isRingActive(story) })),
      eligibleItems,
      canPublish: eligibleItems.length > 0,
    }, { headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" } });
  } catch {
    return Response.json({ error: "Outfit stories are temporarily unavailable" }, { status: 503 });
  }
}

let client: OpenAI | null = null;
async function imageAllowed(bytes: Uint8Array) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.Stylishme;
  if (!apiKey) throw new Error("Safety checks unavailable");
  client ??= new OpenAI({ apiKey });
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  const response = await client.moderations.create({
    model: "omni-moderation-latest",
    input: [{ type: "image_url", image_url: { url: `data:image/webp;base64,${btoa(binary)}` } }],
  });
  return !response.results.some(result => result.flagged);
}

export async function POST(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "Sign in to share an outfit" }, { status: 401 });
    const form = await request.formData();
    const image = form.get("image");
    const idempotencyKey = cleanStoryText(form.get("idempotencyKey"), 100);
    const submittedIds = form.getAll("productId").filter((value): value is string => typeof value === "string");
    if (!(image instanceof File) || !image.size || image.size > 8 * 1024 * 1024) return Response.json({ error: "Choose one outfit photo under 8 MB" }, { status: 400 });
    if (!idempotencyKey || !submittedIds.length) return Response.json({ error: "Choose purchased pieces for this outfit" }, { status: 400 });
    const [account] = await getDb().select().from(customerState).where(eq(customerState.email, user.email)).limit(1);
    const eligible = account ? eligibleStoryItems(safeJson(account.ordersJson, [])) : [];
    const selected = submittedIds.flatMap(productId => {
      const match = eligible.find(item => item.productId === productId);
      return match ? [match] : [];
    });
    if (!selected.length || selected.length !== new Set(submittedIds).size) return Response.json({ error: "Tag only pieces from delivered or collected orders" }, { status: 403 });
    const processed = await inspectAndReencodeStoryImage(new Uint8Array(await image.arrayBuffer()), image.type);
    if (!await imageAllowed(processed.bytes)) return Response.json({ error: "Choose a clear, fully clothed outfit photograph" }, { status: 422 });
    await ensureCustomerStoryTables();
    const existing = await env.DB.prepare("SELECT id FROM customer_outfit_stories WHERE owner_email = ? AND idempotency_key = ?").bind(user.email, idempotencyKey).first() as { id: string } | null;
    if (existing) return Response.json({ success: true, storyId: existing.id });
    const id = crypto.randomUUID();
    const now = new Date();
    const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const key = `customer-stories/${id}.webp`;
    await env.MEDIA.put(key, processed.bytes, { httpMetadata: { contentType: processed.contentType } });
    const displayName = cleanStoryText(form.get("displayName"), 40).split(/\s+/)[0] ?? "";
    const caption = cleanStoryText(form.get("caption"), 180);
    const town = cleanStoryText(form.get("town"), 60);
    await env.DB.batch([
      env.DB.prepare("INSERT INTO customer_outfit_stories (id, owner_email, owner_display_name, caption, town, image_key, status, quality_issues_json, idempotency_key, published_at, ring_expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'published', '[]', ?, ?, ?, ?, ?)")
        .bind(id, user.email, displayName, caption, town, key, idempotencyKey, now.toISOString(), expires.toISOString(), now.toISOString(), now.toISOString()),
      ...selected.map(item => {
        const product = productById.get(item.productId)!;
        return env.DB.prepare("INSERT INTO customer_outfit_story_products (story_id, product_id, order_id, seller_name_snapshot, product_name_snapshot, product_image_snapshot, product_price_snapshot) VALUES (?, ?, ?, ?, ?, ?, ?)")
          .bind(id, product.id, item.orderId, product.designer, product.name, product.image, product.price);
      }),
    ]);
    await recordActivity(request, "customer_story_published", "story", id).catch(() => undefined);
    return Response.json({ success: true, storyId: id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error && /720|portrait|JPG|Safety/.test(error.message) ? error.message : "Unable to publish that outfit right now";
    return Response.json({ error: message }, { status: /Safety/.test(message) ? 503 : 400 });
  }
}
