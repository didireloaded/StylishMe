CREATE TABLE `seller_state` (
	`invite_token` text PRIMARY KEY NOT NULL,
	`store_name` text NOT NULL,
	`state_json` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
