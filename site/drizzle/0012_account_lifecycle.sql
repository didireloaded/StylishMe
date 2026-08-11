ALTER TABLE `account_deletion_requests` ADD COLUMN `cancelled_at` text;

ALTER TABLE `auth_action_tokens` RENAME TO `auth_action_tokens_legacy`;

CREATE TABLE `auth_action_tokens` (
  `id` text PRIMARY KEY NOT NULL,
  `account_email` text NOT NULL,
  `token_hash` text NOT NULL,
  `action` text NOT NULL CHECK (`action` IN ('verify_email', 'reset_password', 'confirm_deletion', 'confirm_store_closure')),
  `expires_at` text NOT NULL,
  `used_at` text,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`account_email`) REFERENCES `auth_accounts`(`email`) ON UPDATE no action ON DELETE cascade,
  UNIQUE (`token_hash`)
);

INSERT INTO `auth_action_tokens` (`id`, `account_email`, `token_hash`, `action`, `expires_at`, `used_at`, `created_at`)
SELECT `id`, `account_email`, `token_hash`, `action`, `expires_at`, `used_at`, `created_at` FROM `auth_action_tokens_legacy`;

DROP TABLE `auth_action_tokens_legacy`;

CREATE INDEX `auth_action_tokens_expiry_idx` ON `auth_action_tokens` (`action`, `expires_at`);

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
