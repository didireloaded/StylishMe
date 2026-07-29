import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("seller settlement endpoint is role-scoped and returns ledger aggregates only", async () => {
  const [route, app] = await Promise.all([
    read("app/api/seller-settlements/route.ts"),
    read("app/SellerApp.tsx"),
  ]);
  assert.match(route, /getStylishMeUser/);
  assert.match(route, /requireAccountRole/);
  assert.match(route, /owner_email/);
  assert.match(route, /getSellerSettlementSummary/);
  assert.doesNotMatch(route, /customer_email|address_snapshot|payment.*details/i);
  assert.match(app, /\/api\/seller-settlements/);
  assert.match(app, /Available after returns/i);
});

test("payout batches require the private owner key and cannot be manually marked paid", async () => {
  const route = await read("app/api/payouts/route.ts");
  assert.match(route, /STYLISHME_ADMIN_API_KEY/);
  assert.match(route, /createHeldPayoutBatch/);
  assert.doesNotMatch(route, /recordPayoutConfirmation|providerReference/);
  assert.match(route, /verified regulated payout provider/i);
  assert.doesNotMatch(route, /bankAccount|cardNumber|cvv/);
});
