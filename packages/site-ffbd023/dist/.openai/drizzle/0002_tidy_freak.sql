CREATE TABLE `try_on_usage` (
	`key` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`window_start` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE `seller_state` ADD `owner_email` text;--> statement-breakpoint
ALTER TABLE `seller_state` ADD `approved` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `seller_state_owner_email_unique` ON `seller_state` (`owner_email`);