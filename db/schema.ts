import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const customerState = sqliteTable("customer_state", {
  email: text("email").primaryKey(),
  cartJson: text("cart_json").notNull().default("[]"),
  wishlistJson: text("wishlist_json").notNull().default("[]"),
  ordersJson: text("orders_json").notNull().default("[]"),
  profileJson: text("profile_json").notNull().default("{}"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const sellerState = sqliteTable("seller_state", {
  inviteToken: text("invite_token").primaryKey(),
  ownerEmail: text("owner_email").unique(),
  approved: integer("approved", { mode: "boolean" }).notNull().default(false),
  storeName: text("store_name").notNull(),
  stateJson: text("state_json").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const tryOnUsage = sqliteTable("try_on_usage", {
  key: text("key").primaryKey(),
  email: text("email").notNull(),
  count: integer("count").notNull().default(0),
  windowStart: text("window_start").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const activityEvents = sqliteTable("activity_events", {
  id: text("id").primaryKey(),
  actorHash: text("actor_hash").notNull(),
  actorKind: text("actor_kind").notNull(),
  eventType: text("event_type").notNull(),
  targetType: text("target_type"),
  targetId: text("target_id"),
  sessionHash: text("session_hash"),
  metadataJson: text("metadata_json").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("activity_events_created_at_idx").on(table.createdAt),
  index("activity_events_actor_hash_idx").on(table.actorHash),
]);

export const authAccounts = sqliteTable("auth_accounts", {
  email: text("email").primaryKey(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  avatarKey: text("avatar_key").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const authSessions = sqliteTable("auth_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  email: text("email").notNull().references(() => authAccounts.email, { onDelete: "cascade" }),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [
  index("auth_sessions_email_idx").on(table.email),
  index("auth_sessions_expiry_idx").on(table.expiresAt),
]);

export const authAttempts = sqliteTable("auth_attempts", {
  attemptKey: text("attempt_key").primaryKey(),
  attemptCount: integer("attempt_count").notNull(),
  windowStart: text("window_start").notNull(),
});

export const customerOutfitStories = sqliteTable("customer_outfit_stories", {
  id: text("id").primaryKey(),
  ownerEmail: text("owner_email").notNull(),
  ownerDisplayName: text("owner_display_name").notNull().default(""),
  caption: text("caption").notNull().default(""),
  town: text("town").notNull().default(""),
  imageKey: text("image_key").notNull(),
  status: text("status").notNull().default("published"),
  qualityIssuesJson: text("quality_issues_json").notNull().default("[]"),
  idempotencyKey: text("idempotency_key").notNull(),
  publishedAt: text("published_at").notNull(),
  ringExpiresAt: text("ring_expires_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("customer_stories_owner_idempotency_idx").on(table.ownerEmail, table.idempotencyKey),
  index("customer_stories_status_expiry_idx").on(table.status, table.ringExpiresAt),
]);

export const customerOutfitStoryProducts = sqliteTable("customer_outfit_story_products", {
  storyId: text("story_id").notNull().references(() => customerOutfitStories.id),
  productId: text("product_id").notNull(),
  orderId: text("order_id").notNull(),
  sellerNameSnapshot: text("seller_name_snapshot").notNull(),
  productNameSnapshot: text("product_name_snapshot").notNull(),
  productImageSnapshot: text("product_image_snapshot").notNull(),
  productPriceSnapshot: integer("product_price_snapshot").notNull(),
}, (table) => [primaryKey({ columns: [table.storyId, table.productId] })]);

export const customerOutfitStoryLikes = sqliteTable("customer_outfit_story_likes", {
  storyId: text("story_id").notNull().references(() => customerOutfitStories.id),
  actorHash: text("actor_hash").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("story_likes_story_actor_idx").on(table.storyId, table.actorHash)]);

export const customerOutfitStoryReports = sqliteTable("customer_outfit_story_reports", {
  id: text("id").primaryKey(),
  storyId: text("story_id").notNull().references(() => customerOutfitStories.id),
  reporterHash: text("reporter_hash").notNull(),
  reason: text("reason").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("story_reports_story_actor_reason_idx").on(table.storyId, table.reporterHash, table.reason)]);
