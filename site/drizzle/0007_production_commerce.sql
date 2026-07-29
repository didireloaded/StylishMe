ALTER TABLE `auth_accounts` ADD COLUMN `email_verified_at` text;
--> statement-breakpoint
ALTER TABLE `auth_accounts` ADD COLUMN `deleted_at` text;
--> statement-breakpoint
CREATE TABLE `catalog_products` (
	`id` text PRIMARY KEY NOT NULL,
	`seller_id` text NOT NULL,
	`store_slug` text NOT NULL,
	`product_slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL DEFAULT '',
	`category` text NOT NULL,
	`currency` text NOT NULL DEFAULT 'NAD' CHECK (`currency` = 'NAD'),
	`price_cents` integer NOT NULL CHECK (`price_cents` >= 0),
	`status` text NOT NULL DEFAULT 'draft' CHECK (`status` IN ('draft', 'published', 'changes_requested', 'archived')),
	`image_url` text NOT NULL,
	`metadata_json` text NOT NULL DEFAULT '{}',
	`published_at` text,
	`created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`seller_id`) REFERENCES `seller_state`(`invite_token`) ON UPDATE no action ON DELETE restrict,
	UNIQUE (`store_slug`, `product_slug`)
);
--> statement-breakpoint
CREATE INDEX `catalog_products_seller_status_idx` ON `catalog_products` (`seller_id`, `status`);
--> statement-breakpoint
CREATE INDEX `catalog_products_store_slug_idx` ON `catalog_products` (`store_slug`);
--> statement-breakpoint
CREATE TABLE `inventory_variants` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`size` text NOT NULL,
	`colour` text NOT NULL,
	`sku` text,
	`available_quantity` integer NOT NULL DEFAULT 0 CHECK (`available_quantity` >= 0),
	`reserved_quantity` integer NOT NULL DEFAULT 0 CHECK (`reserved_quantity` >= 0) CHECK (`reserved_quantity` <= `available_quantity`),
	`version` integer NOT NULL DEFAULT 0,
	`updated_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`product_id`) REFERENCES `catalog_products`(`id`) ON UPDATE no action ON DELETE restrict,
	UNIQUE (`product_id`, `size`, `colour`),
	UNIQUE (`sku`)
);
--> statement-breakpoint
CREATE INDEX `inventory_variants_product_idx` ON `inventory_variants` (`product_id`);
--> statement-breakpoint
CREATE TABLE `commerce_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_email` text,
	`idempotency_key` text NOT NULL,
	`currency` text NOT NULL DEFAULT 'NAD' CHECK (`currency` = 'NAD'),
	`subtotal_cents` integer NOT NULL CHECK (`subtotal_cents` >= 0),
	`delivery_cents` integer NOT NULL CHECK (`delivery_cents` >= 0),
	`total_cents` integer NOT NULL CHECK (`total_cents` >= 0),
	`status` text NOT NULL DEFAULT 'pending_payment',
	`payment_status` text NOT NULL DEFAULT 'unpaid',
	`fulfilment_method` text NOT NULL CHECK (`fulfilment_method` IN ('delivery', 'collection')),
	`address_snapshot_json` text,
	`collection_point_id` text,
	`reservation_expires_at` text,
	`created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`customer_email`) REFERENCES `auth_accounts`(`email`) ON UPDATE no action ON DELETE set null,
	UNIQUE (`idempotency_key`)
);
--> statement-breakpoint
CREATE INDEX `commerce_orders_customer_created_idx` ON `commerce_orders` (`customer_email`, `created_at`);
--> statement-breakpoint
CREATE INDEX `commerce_orders_status_idx` ON `commerce_orders` (`status`, `created_at`);
--> statement-breakpoint
CREATE TABLE `seller_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`seller_id` text NOT NULL,
	`subtotal_cents` integer NOT NULL CHECK (`subtotal_cents` >= 0),
	`commission_cents` integer NOT NULL CHECK (`commission_cents` >= 0),
	`seller_net_cents` integer NOT NULL CHECK (`seller_net_cents` >= 0),
	`status` text NOT NULL DEFAULT 'awaiting_payment',
	`created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`order_id`) REFERENCES `commerce_orders`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`seller_id`) REFERENCES `seller_state`(`invite_token`) ON UPDATE no action ON DELETE restrict,
	UNIQUE (`order_id`, `seller_id`)
);
--> statement-breakpoint
CREATE INDEX `seller_orders_seller_status_idx` ON `seller_orders` (`seller_id`, `status`);
--> statement-breakpoint
CREATE TABLE `commerce_order_items` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`seller_order_id` text NOT NULL,
	`seller_id` text NOT NULL,
	`product_id` text NOT NULL,
	`variant_id` text NOT NULL,
	`product_name_snapshot` text NOT NULL,
	`seller_name_snapshot` text NOT NULL,
	`variant_snapshot_json` text NOT NULL DEFAULT '{}',
	`unit_price_cents` integer NOT NULL CHECK (`unit_price_cents` >= 0),
	`quantity` integer NOT NULL CHECK (`quantity` > 0),
	`line_total_cents` integer NOT NULL CHECK (`line_total_cents` >= 0),
	FOREIGN KEY (`order_id`) REFERENCES `commerce_orders`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`seller_order_id`) REFERENCES `seller_orders`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`seller_id`) REFERENCES `seller_state`(`invite_token`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`product_id`) REFERENCES `catalog_products`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`variant_id`) REFERENCES `inventory_variants`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `commerce_order_items_order_idx` ON `commerce_order_items` (`order_id`);
--> statement-breakpoint
CREATE INDEX `commerce_order_items_seller_order_idx` ON `commerce_order_items` (`seller_order_id`);
--> statement-breakpoint
CREATE TABLE `inventory_reservations` (
	`id` text PRIMARY KEY NOT NULL,
	`idempotency_key` text NOT NULL,
	`order_id` text NOT NULL,
	`variant_id` text NOT NULL,
	`quantity` integer NOT NULL CHECK (`quantity` > 0),
	`status` text NOT NULL DEFAULT 'active' CHECK (`status` IN ('active', 'confirmed', 'released', 'expired')),
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`order_id`) REFERENCES `commerce_orders`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`variant_id`) REFERENCES `inventory_variants`(`id`) ON UPDATE no action ON DELETE restrict,
	UNIQUE (`idempotency_key`)
);
--> statement-breakpoint
CREATE INDEX `inventory_reservations_expires_at_idx` ON `inventory_reservations` (`status`, `expires_at`);
--> statement-breakpoint
CREATE INDEX `inventory_reservations_order_idx` ON `inventory_reservations` (`order_id`);
--> statement-breakpoint
CREATE TABLE `payment_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`provider` text NOT NULL,
	`provider_reference` text,
	`idempotency_key` text NOT NULL,
	`amount_cents` integer NOT NULL CHECK (`amount_cents` >= 0),
	`currency` text NOT NULL DEFAULT 'NAD' CHECK (`currency` = 'NAD'),
	`status` text NOT NULL DEFAULT 'created',
	`verified_at` text,
	`created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`order_id`) REFERENCES `commerce_orders`(`id`) ON UPDATE no action ON DELETE restrict,
	UNIQUE (`idempotency_key`),
	UNIQUE (`provider`, `provider_reference`)
);
--> statement-breakpoint
CREATE INDEX `payment_attempts_order_idx` ON `payment_attempts` (`order_id`, `created_at`);
--> statement-breakpoint
CREATE TABLE `refunds` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`payment_attempt_id` text NOT NULL,
	`seller_order_id` text,
	`idempotency_key` text NOT NULL,
	`provider_reference` text,
	`amount_cents` integer NOT NULL CHECK (`amount_cents` > 0),
	`reason` text NOT NULL,
	`status` text NOT NULL DEFAULT 'requested',
	`created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`order_id`) REFERENCES `commerce_orders`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`payment_attempt_id`) REFERENCES `payment_attempts`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`seller_order_id`) REFERENCES `seller_orders`(`id`) ON UPDATE no action ON DELETE restrict,
	UNIQUE (`idempotency_key`)
);
--> statement-breakpoint
CREATE INDEX `refunds_order_idx` ON `refunds` (`order_id`, `created_at`);
--> statement-breakpoint
CREATE TABLE `payout_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`seller_id` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`amount_cents` integer NOT NULL CHECK (`amount_cents` >= 0),
	`currency` text NOT NULL DEFAULT 'NAD' CHECK (`currency` = 'NAD'),
	`status` text NOT NULL DEFAULT 'held',
	`provider_reference` text,
	`created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`released_at` text,
	FOREIGN KEY (`seller_id`) REFERENCES `seller_state`(`invite_token`) ON UPDATE no action ON DELETE restrict,
	UNIQUE (`idempotency_key`)
);
--> statement-breakpoint
CREATE INDEX `payout_batches_seller_status_idx` ON `payout_batches` (`seller_id`, `status`);
--> statement-breakpoint
CREATE TABLE `ledger_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`seller_order_id` text NOT NULL,
	`payout_batch_id` text,
	`entry_type` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`currency` text NOT NULL DEFAULT 'NAD' CHECK (`currency` = 'NAD'),
	`source_type` text NOT NULL,
	`source_id` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`seller_order_id`) REFERENCES `seller_orders`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`payout_batch_id`) REFERENCES `payout_batches`(`id`) ON UPDATE no action ON DELETE restrict,
	UNIQUE (`idempotency_key`),
	UNIQUE (`source_type`, `source_id`, `entry_type`)
);
--> statement-breakpoint
CREATE INDEX `ledger_entries_seller_order_idx` ON `ledger_entries` (`seller_order_id`, `created_at`);
--> statement-breakpoint
CREATE TABLE `shipments` (
	`id` text PRIMARY KEY NOT NULL,
	`seller_order_id` text NOT NULL,
	`provider` text NOT NULL,
	`tracking_number` text,
	`tracking_url` text,
	`status` text NOT NULL DEFAULT 'preparing',
	`estimated_delivery_at` text,
	`last_synced_at` text,
	`created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`seller_order_id`) REFERENCES `seller_orders`(`id`) ON UPDATE no action ON DELETE restrict,
	UNIQUE (`provider`, `tracking_number`)
);
--> statement-breakpoint
CREATE INDEX `shipments_seller_order_idx` ON `shipments` (`seller_order_id`);
--> statement-breakpoint
CREATE TABLE `shipment_events` (
	`id` text PRIMARY KEY NOT NULL,
	`shipment_id` text NOT NULL,
	`provider_event_id` text,
	`status` text NOT NULL,
	`description` text NOT NULL,
	`location` text,
	`occurred_at` text NOT NULL,
	`created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON UPDATE no action ON DELETE restrict,
	UNIQUE (`shipment_id`, `provider_event_id`)
);
--> statement-breakpoint
CREATE INDEX `shipment_events_timeline_idx` ON `shipment_events` (`shipment_id`, `occurred_at`);
--> statement-breakpoint
CREATE TABLE `auth_identities` (
	`id` text PRIMARY KEY NOT NULL,
	`account_email` text NOT NULL,
	`provider` text NOT NULL,
	`provider_subject` text NOT NULL,
	`provider_email` text,
	`created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`last_used_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`account_email`) REFERENCES `auth_accounts`(`email`) ON UPDATE no action ON DELETE cascade,
	UNIQUE (`provider`, `provider_subject`)
);
--> statement-breakpoint
CREATE INDEX `auth_identities_account_idx` ON `auth_identities` (`account_email`);
--> statement-breakpoint
CREATE TABLE `auth_action_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`account_email` text NOT NULL,
	`token_hash` text NOT NULL,
	`action` text NOT NULL CHECK (`action` IN ('verify_email', 'reset_password', 'confirm_deletion')),
	`expires_at` text NOT NULL,
	`used_at` text,
	`created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`account_email`) REFERENCES `auth_accounts`(`email`) ON UPDATE no action ON DELETE cascade,
	UNIQUE (`token_hash`)
);
--> statement-breakpoint
CREATE INDEX `auth_action_tokens_expiry_idx` ON `auth_action_tokens` (`action`, `expires_at`);
--> statement-breakpoint
CREATE TABLE `account_deletion_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`account_email` text NOT NULL,
	`status` text NOT NULL DEFAULT 'pending' CHECK (`status` IN ('pending', 'cancelled', 'processing', 'completed')),
	`requested_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`scheduled_for` text NOT NULL,
	`completed_at` text,
	FOREIGN KEY (`account_email`) REFERENCES `auth_accounts`(`email`) ON UPDATE no action ON DELETE restrict,
	UNIQUE (`account_email`, `status`)
);
--> statement-breakpoint
CREATE INDEX `account_deletion_requests_schedule_idx` ON `account_deletion_requests` (`status`, `scheduled_for`);
