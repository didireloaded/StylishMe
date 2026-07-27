CREATE TABLE `customer_state` (
	`email` text PRIMARY KEY NOT NULL,
	`cart_json` text DEFAULT '[]' NOT NULL,
	`wishlist_json` text DEFAULT '[]' NOT NULL,
	`orders_json` text DEFAULT '[]' NOT NULL,
	`profile_json` text DEFAULT '{}' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
