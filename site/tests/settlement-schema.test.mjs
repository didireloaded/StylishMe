import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("settlement migration stores provider references without bank or card details", async () => {
  const [migration, schema] = await Promise.all([
    read("drizzle/0008_settlement_controls.sql"),
    read("db/schema.ts"),
  ]);
  assert.match(migration, /seller_payout_accounts/);
  assert.match(migration, /provider_account_reference/);
  assert.match(migration, /payout_eligible_at/);
  assert.doesNotMatch(migration, /card_number|cvv|bank_account_number/i);
  assert.match(schema, /sellerPayoutAccounts/);
});
