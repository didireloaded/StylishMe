import { and, count, eq, gte } from "drizzle-orm";
import { env } from "cloudflare:workers";

import { getDb } from "../db";
import { activityEvents } from "../db/schema";
import { getStylishMeUser } from "./stylishme-auth";

export const ACTIVITY_TYPES = [
  "customer_joined",
  "seller_joined",
  "product_viewed",
  "designer_viewed",
  "outfit_viewed",
  "wishlist_saved",
  "cart_added",
  "order_placed",
  "try_on_opened",
  "seller_updated",
  "product_submitted",
  "page_viewed",
  "demo_viewed",
  "role_selected",
  "signup_started",
  "checkout_started",
  "app_error",
  "customer_story_published",
  "customer_story_viewed",
  "customer_story_liked",
  "customer_story_unliked",
  "customer_story_shared",
  "customer_story_reported",
] as const;

export type ActivityType = typeof ACTIVITY_TYPES[number];

const validEvents = new Set<string>(ACTIVITY_TYPES);
const validTargetTypes = new Set(["product", "designer", "outfit", "order", "store", "story", "page", "role", "flow", "error"]);
let activityTableReady: Promise<unknown> | null = null;

export function ensureActivityTable() {
  if (!activityTableReady) {
    activityTableReady = (async () => {
      await env.DB.batch([
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS activity_events (
        id text PRIMARY KEY NOT NULL,
        actor_hash text NOT NULL,
        actor_kind text NOT NULL,
        event_type text NOT NULL,
        target_type text,
        target_id text,
        session_hash text,
        metadata_json text DEFAULT '{}' NOT NULL,
        created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
      )`),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS activity_events_created_at_idx ON activity_events (created_at)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS activity_events_actor_hash_idx ON activity_events (actor_hash)"),
      ]);
      const columns = await env.DB.prepare("PRAGMA table_info(activity_events)").all() as { results?: Array<{ name: string }> };
      const names = new Set((columns.results ?? []).map((column: { name: string }) => column.name));
      if (!names.has("session_hash")) await env.DB.prepare("ALTER TABLE activity_events ADD COLUMN session_hash text").run();
      if (!names.has("metadata_json")) await env.DB.prepare("ALTER TABLE activity_events ADD COLUMN metadata_json text DEFAULT '{}' NOT NULL").run();
    })().catch((error: unknown) => {
      activityTableReady = null;
      throw error;
    });
  }
  return activityTableReady;
}

function cleanTarget(value: unknown, max = 100) {
  return typeof value === "string" && /^[a-zA-Z0-9 _.-]+$/.test(value)
    ? value.trim().slice(0, max)
    : null;
}

function cleanMetadata(value: unknown) {
  if (!value || typeof value !== "object") return {};
  const source = value as Record<string, unknown>;
  const allow = ["source", "medium", "campaign", "referrerHost", "path"];
  return Object.fromEntries(allow.flatMap(key => {
    const cleaned = cleanTarget(source[key], 80);
    return cleaned ? [[key, cleaned]] : [];
  }));
}

async function sha256(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes)).map(byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function recordActivity(
  request: Request,
  eventType: ActivityType,
  targetType?: string | null,
  targetId?: string | null,
  context?: unknown,
  sessionId?: unknown,
) {
  if (!validEvents.has(eventType)) return;
  await ensureActivityTable();

  const user = await getStylishMeUser();
  const forwarded = request.headers.get("cf-connecting-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "anonymous";
  const salt = process.env.ACTIVITY_HASH_SALT ?? process.env.STYLISHME_ADMIN_API_KEY ?? "stylishme-private-activity-v1";
  const actorHash = (await sha256(`${salt}:${user?.email.toLowerCase() ?? forwarded}`)).slice(0, 32);
  const sessionHash = typeof sessionId === "string" && sessionId.length >= 8
    ? (await sha256(`${salt}:session:${sessionId.slice(0, 100)}`)).slice(0, 32)
    : actorHash;
  const now = new Date();
  const hourStart = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const db = getDb();
  const [{ value }] = await db.select({ value: count() }).from(activityEvents)
    .where(and(eq(activityEvents.actorHash, actorHash), gte(activityEvents.createdAt, hourStart)));
  if (value >= 120) return;

  await db.insert(activityEvents).values({
    id: crypto.randomUUID(),
    actorHash,
    actorKind: user ? "customer" : "guest",
    eventType,
    targetType: validTargetTypes.has(targetType ?? "") ? targetType : null,
    targetId: cleanTarget(targetId),
    sessionHash,
    metadataJson: JSON.stringify(cleanMetadata(context)),
    createdAt: now.toISOString(),
  });
}
