UPDATE `auth_accounts` SET `email_verified_at` = `created_at` WHERE `email_verified_at` IS NULL;
