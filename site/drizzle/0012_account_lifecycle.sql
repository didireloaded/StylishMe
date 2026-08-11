ALTER TABLE `account_deletion_requests` ADD COLUMN `cancelled_at` text;

CREATE TABLE `seller_store_closure_requests` (
  `id` text PRIMARY KEY NOT NULL,
  `seller_id` text NOT NULL,
  `account_email` text NOT NULL,
  `status` text DEFAULT 'pending' NOT NULL,
  `previous_product_statuses_json` text DEFAULT '{}' NOT NULL,
  `requested_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `scheduled_for` text NOT NULL,
  `cancelled_at` text,
  `completed_at` text,
  FOREIGN KEY (`seller_id`) REFERENCES `seller_state`(`invite_token`) ON UPDATE no action ON DELETE restrict,
  FOREIGN KEY (`account_email`) REFERENCES `auth_accounts`(`email`) ON UPDATE no action ON DELETE restrict,
  UNIQUE (`seller_id`, `status`)
);

CREATE INDEX `seller_store_closure_status_schedule_idx`
  ON `seller_store_closure_requests` (`status`, `scheduled_for`);

CREATE INDEX `seller_store_closure_account_idx`
  ON `seller_store_closure_requests` (`account_email`, `requested_at`);
