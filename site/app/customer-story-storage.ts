import { env } from "cloudflare:workers";

import type { PublicCustomerStory } from "./customer-story-domain";

let tablesReady: Promise<unknown> | null = null;

export function ensureCustomerStoryTables() {
  if (!tablesReady) {
    tablesReady = env.DB.batch([
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS customer_outfit_stories (
        id text PRIMARY KEY NOT NULL, owner_email text NOT NULL, owner_display_name text DEFAULT '' NOT NULL,
        caption text DEFAULT '' NOT NULL, town text DEFAULT '' NOT NULL, image_key text NOT NULL,
        status text DEFAULT 'published' NOT NULL, quality_issues_json text DEFAULT '[]' NOT NULL,
        idempotency_key text NOT NULL, published_at text NOT NULL, ring_expires_at text NOT NULL,
        created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
      )`),
      env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS customer_stories_owner_idempotency_idx ON customer_outfit_stories (owner_email, idempotency_key)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS customer_stories_status_expiry_idx ON customer_outfit_stories (status, ring_expires_at)"),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS customer_outfit_story_products (
        story_id text NOT NULL, product_id text NOT NULL, order_id text NOT NULL,
        seller_name_snapshot text NOT NULL, product_name_snapshot text NOT NULL,
        product_image_snapshot text NOT NULL, product_price_snapshot integer NOT NULL,
        PRIMARY KEY(story_id, product_id), FOREIGN KEY(story_id) REFERENCES customer_outfit_stories(id)
      )`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS customer_outfit_story_likes (
        story_id text NOT NULL, actor_hash text NOT NULL, created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
        FOREIGN KEY(story_id) REFERENCES customer_outfit_stories(id)
      )`),
      env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS story_likes_story_actor_idx ON customer_outfit_story_likes (story_id, actor_hash)"),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS customer_outfit_story_reports (
        id text PRIMARY KEY NOT NULL, story_id text NOT NULL, reporter_hash text NOT NULL, reason text NOT NULL,
        created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL, FOREIGN KEY(story_id) REFERENCES customer_outfit_stories(id)
      )`),
      env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS story_reports_story_actor_reason_idx ON customer_outfit_story_reports (story_id, reporter_hash, reason)"),
    ]).catch((error: unknown) => { tablesReady = null; throw error; });
  }
  return tablesReady;
}

type PublicStorySource = Omit<PublicCustomerStory, "imageUrl">;

export function toPublicStory(source: PublicStorySource): PublicCustomerStory {
  return { ...source, imageUrl: `/api/customer-stories/media/${encodeURIComponent(source.id)}` };
}

async function sha256(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes)).map(byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function storyActorHash(email: string) {
  const salt = process.env.ACTIVITY_HASH_SALT ?? process.env.STYLISHME_ADMIN_API_KEY ?? "stylishme-private-activity-v1";
  return (await sha256(`${salt}:story:${email.toLowerCase()}`)).slice(0, 32);
}
