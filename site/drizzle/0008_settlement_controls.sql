ALTER TABLE `seller_orders` ADD COLUMN `payout_eligible_at` text;
--> statement-breakpoint
CREATE INDEX `seller_orders_payout_eligibility_idx` ON `seller_orders` (`seller_id`, `payout_eligible_at`);
--> statement-breakpoint
CREATE TABLE `seller_payout_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`seller_id` text NOT NULL,
	`provider` text NOT NULL,
	`provider_account_reference` text NOT NULL,
	`status` text NOT NULL DEFAULT 'pending' CHECK (`status` IN ('pending', 'verified', 'suspended')),
	`created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`seller_id`) REFERENCES `seller_state`(`invite_token`) ON UPDATE no action ON DELETE restrict,
	UNIQUE (`seller_id`, `provider`),
	UNIQUE (`provider`, `provider_account_reference`)
);
--> statement-breakpoint
CREATE INDEX `seller_payout_accounts_status_idx` ON `seller_payout_accounts` (`provider`, `status`);
