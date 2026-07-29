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
  emailVerifiedAt: text("email_verified_at"),
  deletedAt: text("deleted_at"),
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

export const catalogProducts = sqliteTable("catalog_products", {
  id: text("id").primaryKey(),
  sellerId: text("seller_id").notNull().references(() => sellerState.inviteToken, { onDelete: "restrict" }),
  storeSlug: text("store_slug").notNull(),
  productSlug: text("product_slug").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  category: text("category").notNull(),
  currency: text("currency").notNull().default("NAD"),
  priceCents: integer("price_cents").notNull(),
  status: text("status").notNull().default("draft"),
  imageUrl: text("image_url").notNull(),
  metadataJson: text("metadata_json").notNull().default("{}"),
  publishedAt: text("published_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("catalog_products_store_product_idx").on(table.storeSlug, table.productSlug),
  index("catalog_products_seller_status_idx").on(table.sellerId, table.status),
]);

export const inventoryVariants = sqliteTable("inventory_variants", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull().references(() => catalogProducts.id, { onDelete: "restrict" }),
  size: text("size").notNull(),
  colour: text("colour").notNull(),
  sku: text("sku"),
  availableQuantity: integer("available_quantity").notNull().default(0),
  reservedQuantity: integer("reserved_quantity").notNull().default(0),
  version: integer("version").notNull().default(0),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("inventory_variants_product_option_idx").on(table.productId, table.size, table.colour),
  uniqueIndex("inventory_variants_sku_idx").on(table.sku),
]);

export const commerceOrders = sqliteTable("commerce_orders", {
  id: text("id").primaryKey(),
  customerEmail: text("customer_email").references(() => authAccounts.email, { onDelete: "set null" }),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  currency: text("currency").notNull().default("NAD"),
  subtotalCents: integer("subtotal_cents").notNull(),
  deliveryCents: integer("delivery_cents").notNull(),
  totalCents: integer("total_cents").notNull(),
  status: text("status").notNull().default("pending_payment"),
  paymentStatus: text("payment_status").notNull().default("unpaid"),
  fulfilmentMethod: text("fulfilment_method").notNull(),
  addressSnapshotJson: text("address_snapshot_json"),
  collectionPointId: text("collection_point_id"),
  reservationExpiresAt: text("reservation_expires_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("commerce_orders_customer_created_idx").on(table.customerEmail, table.createdAt),
  index("commerce_orders_status_idx").on(table.status, table.createdAt),
]);

export const sellerOrders = sqliteTable("seller_orders", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => commerceOrders.id, { onDelete: "restrict" }),
  sellerId: text("seller_id").notNull().references(() => sellerState.inviteToken, { onDelete: "restrict" }),
  subtotalCents: integer("subtotal_cents").notNull(),
  commissionCents: integer("commission_cents").notNull(),
  sellerNetCents: integer("seller_net_cents").notNull(),
  status: text("status").notNull().default("awaiting_payment"),
  payoutEligibleAt: text("payout_eligible_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("seller_orders_order_seller_idx").on(table.orderId, table.sellerId),
  index("seller_orders_seller_status_idx").on(table.sellerId, table.status),
]);

export const commerceOrderItems = sqliteTable("commerce_order_items", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => commerceOrders.id, { onDelete: "restrict" }),
  sellerOrderId: text("seller_order_id").notNull().references(() => sellerOrders.id, { onDelete: "restrict" }),
  sellerId: text("seller_id").notNull().references(() => sellerState.inviteToken, { onDelete: "restrict" }),
  productId: text("product_id").notNull().references(() => catalogProducts.id, { onDelete: "restrict" }),
  variantId: text("variant_id").notNull().references(() => inventoryVariants.id, { onDelete: "restrict" }),
  productNameSnapshot: text("product_name_snapshot").notNull(),
  sellerNameSnapshot: text("seller_name_snapshot").notNull(),
  variantSnapshotJson: text("variant_snapshot_json").notNull().default("{}"),
  unitPriceCents: integer("unit_price_cents").notNull(),
  quantity: integer("quantity").notNull(),
  lineTotalCents: integer("line_total_cents").notNull(),
});

export const inventoryReservations = sqliteTable("inventory_reservations", {
  id: text("id").primaryKey(),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  orderId: text("order_id").notNull().references(() => commerceOrders.id, { onDelete: "restrict" }),
  variantId: text("variant_id").notNull().references(() => inventoryVariants.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull(),
  status: text("status").notNull().default("active"),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("inventory_reservations_expires_at_idx").on(table.status, table.expiresAt),
  index("inventory_reservations_order_idx").on(table.orderId),
]);

export const paymentAttempts = sqliteTable("payment_attempts", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => commerceOrders.id, { onDelete: "restrict" }),
  provider: text("provider").notNull(),
  providerReference: text("provider_reference"),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull().default("NAD"),
  status: text("status").notNull().default("created"),
  verifiedAt: text("verified_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("payment_attempts_order_idx").on(table.orderId, table.createdAt)]);

export const refunds = sqliteTable("refunds", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => commerceOrders.id, { onDelete: "restrict" }),
  paymentAttemptId: text("payment_attempt_id").notNull().references(() => paymentAttempts.id, { onDelete: "restrict" }),
  sellerOrderId: text("seller_order_id").references(() => sellerOrders.id, { onDelete: "restrict" }),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  providerReference: text("provider_reference"),
  amountCents: integer("amount_cents").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("requested"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const payoutBatches = sqliteTable("payout_batches", {
  id: text("id").primaryKey(),
  sellerId: text("seller_id").notNull().references(() => sellerState.inviteToken, { onDelete: "restrict" }),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull().default("NAD"),
  status: text("status").notNull().default("held"),
  providerReference: text("provider_reference"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  releasedAt: text("released_at"),
}, (table) => [index("payout_batches_seller_status_idx").on(table.sellerId, table.status)]);

export const sellerPayoutAccounts = sqliteTable("seller_payout_accounts", {
  id: text("id").primaryKey(),
  sellerId: text("seller_id").notNull().references(() => sellerState.inviteToken, { onDelete: "restrict" }),
  provider: text("provider").notNull(),
  providerAccountReference: text("provider_account_reference").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("seller_payout_accounts_seller_provider_idx").on(table.sellerId, table.provider),
  uniqueIndex("seller_payout_accounts_provider_reference_idx").on(table.provider, table.providerAccountReference),
  index("seller_payout_accounts_status_idx").on(table.provider, table.status),
]);

export const ledgerEntries = sqliteTable("ledger_entries", {
  id: text("id").primaryKey(),
  sellerOrderId: text("seller_order_id").notNull().references(() => sellerOrders.id, { onDelete: "restrict" }),
  payoutBatchId: text("payout_batch_id").references(() => payoutBatches.id, { onDelete: "restrict" }),
  entryType: text("entry_type").notNull(),
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull().default("NAD"),
  sourceType: text("source_type").notNull(),
  sourceId: text("source_id").notNull(),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("ledger_entries_source_idx").on(table.sourceType, table.sourceId, table.entryType),
  index("ledger_entries_seller_order_idx").on(table.sellerOrderId, table.createdAt),
]);

export const shipments = sqliteTable("shipments", {
  id: text("id").primaryKey(),
  sellerOrderId: text("seller_order_id").notNull().references(() => sellerOrders.id, { onDelete: "restrict" }),
  provider: text("provider").notNull(),
  trackingNumber: text("tracking_number"),
  trackingUrl: text("tracking_url"),
  status: text("status").notNull().default("preparing"),
  estimatedDeliveryAt: text("estimated_delivery_at"),
  lastSyncedAt: text("last_synced_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("shipments_provider_tracking_idx").on(table.provider, table.trackingNumber),
  uniqueIndex("shipments_seller_order_unique_idx").on(table.sellerOrderId),
]);

export const shipmentEvents = sqliteTable("shipment_events", {
  id: text("id").primaryKey(),
  shipmentId: text("shipment_id").notNull().references(() => shipments.id, { onDelete: "restrict" }),
  providerEventId: text("provider_event_id"),
  status: text("status").notNull(),
  description: text("description").notNull(),
  location: text("location"),
  occurredAt: text("occurred_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("shipment_events_provider_event_idx").on(table.shipmentId, table.providerEventId),
  index("shipment_events_timeline_idx").on(table.shipmentId, table.occurredAt),
]);

export const authIdentities = sqliteTable("auth_identities", {
  id: text("id").primaryKey(),
  accountEmail: text("account_email").notNull().references(() => authAccounts.email, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  providerSubject: text("provider_subject").notNull(),
  providerEmail: text("provider_email"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  lastUsedAt: text("last_used_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("auth_identities_provider_subject_idx").on(table.provider, table.providerSubject),
  index("auth_identities_account_idx").on(table.accountEmail),
]);

export const authActionTokens = sqliteTable("auth_action_tokens", {
  id: text("id").primaryKey(),
  accountEmail: text("account_email").notNull().references(() => authAccounts.email, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  action: text("action").notNull(),
  expiresAt: text("expires_at").notNull(),
  usedAt: text("used_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("auth_action_tokens_expiry_idx").on(table.action, table.expiresAt)]);

export const accountDeletionRequests = sqliteTable("account_deletion_requests", {
  id: text("id").primaryKey(),
  accountEmail: text("account_email").notNull().references(() => authAccounts.email, { onDelete: "restrict" }),
  status: text("status").notNull().default("pending"),
  requestedAt: text("requested_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  scheduledFor: text("scheduled_for").notNull(),
  completedAt: text("completed_at"),
}, (table) => [
  uniqueIndex("account_deletion_requests_account_status_idx").on(table.accountEmail, table.status),
  index("account_deletion_requests_schedule_idx").on(table.status, table.scheduledFor),
]);
