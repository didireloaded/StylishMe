import { sql } from "drizzle-orm";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const sellerState = sqliteTable("seller_state", {
  inviteToken: text("invite_token").primaryKey(),
  storeName: text("store_name").notNull(),
  stateJson: text("state_json").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
