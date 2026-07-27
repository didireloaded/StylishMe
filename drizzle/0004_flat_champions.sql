CREATE TABLE IF NOT EXISTS `activity_events` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_hash` text NOT NULL,
	`actor_kind` text NOT NULL,
	`event_type` text NOT NULL,
	`target_type` text,
	`target_id` text,
	`session_hash` text,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `activity_events_created_at_idx` ON `activity_events` (`created_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `activity_events_actor_hash_idx` ON `activity_events` (`actor_hash`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `customer_outfit_stories` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`owner_display_name` text DEFAULT '' NOT NULL,
	`caption` text DEFAULT '' NOT NULL,
	`town` text DEFAULT '' NOT NULL,
	`image_key` text NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`quality_issues_json` text DEFAULT '[]' NOT NULL,
	`idempotency_key` text NOT NULL,
	`published_at` text NOT NULL,
	`ring_expires_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `customer_stories_owner_idempotency_idx` ON `customer_outfit_stories` (`owner_email`,`idempotency_key`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `customer_stories_status_expiry_idx` ON `customer_outfit_stories` (`status`,`ring_expires_at`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `customer_outfit_story_likes` (
	`story_id` text NOT NULL,
	`actor_hash` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`story_id`) REFERENCES `customer_outfit_stories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `story_likes_story_actor_idx` ON `customer_outfit_story_likes` (`story_id`,`actor_hash`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `customer_outfit_story_products` (
	`story_id` text NOT NULL,
	`product_id` text NOT NULL,
	`order_id` text NOT NULL,
	`seller_name_snapshot` text NOT NULL,
	`product_name_snapshot` text NOT NULL,
	`product_image_snapshot` text NOT NULL,
	`product_price_snapshot` integer NOT NULL,
	PRIMARY KEY(`story_id`, `product_id`),
	FOREIGN KEY (`story_id`) REFERENCES `customer_outfit_stories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `customer_outfit_story_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`story_id` text NOT NULL,
	`reporter_hash` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`story_id`) REFERENCES `customer_outfit_stories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `story_reports_story_actor_reason_idx` ON `customer_outfit_story_reports` (`story_id`,`reporter_hash`,`reason`);
