import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("admin feed requires its server secret and returns redacted business data only", async () => {
  const feed = await read("app/api/admin-feed/route.ts");

  assert.match(feed, /STYLISHME_ADMIN_API_KEY/);
  assert.match(feed, /authorization/);
  assert.match(feed, /Personal contact details/);
  assert.match(feed, /ordersToPrepare/);
  assert.match(feed, /lowStockProducts/);
  assert.doesNotMatch(feed, /ownerEmail:/);
  assert.doesNotMatch(feed, /email:\s*row/);
  assert.doesNotMatch(feed, /phone:\s*/);
  assert.doesNotMatch(feed, /address:\s*/);
});

test("activity monitoring hashes identities, rate limits events and never returns actor hashes", async () => {
  const [activity, feed] = await Promise.all([
    read("app/activity.ts"),
    read("app/api/admin-feed/route.ts"),
  ]);

  assert.match(activity, /SHA-256/);
  assert.match(activity, /value >= 120/);
  assert.match(activity, /ACTIVITY_HASH_SALT/);
  const response = feed.slice(feed.indexOf("activity: events.map"));
  assert.doesNotMatch(response, /actorHash/);
});

test("signed-in customers start with real empty orders instead of seeded preview orders", async () => {
  const customerApp = await read("app/StylishMeApp.tsx");
  assert.match(customerApp, /useState<Order\[]>\(user \? \[\] : defaultOrders\)/);
  assert.match(customerApp, /demoMode \? "stylishme-demo-customer-state"/);
});

test("admin feed reports aggregate customer-story health without private story content", async () => {
  const feed = await read("app/api/admin-feed/route.ts");
  assert.match(feed, /customerStories:/);
  assert.match(feed, /customer_story_published/);
  assert.match(feed, /customer_story_reported/);
  const response = feed.slice(feed.indexOf("return Response.json"));
  assert.doesNotMatch(response, /caption:/);
  assert.doesNotMatch(response, /imageUrl:/);
  assert.doesNotMatch(response, /orderId:/);
});

test("owner feed exposes business aggregates and seller-attributed orders without personal customer data", async () => {
  const feed = await read("app/api/admin-feed/route.ts");
  assert.match(feed, /customerSegments:/);
  assert.match(feed, /revenueSummary:/);
  assert.match(feed, /sellerNames/);
  assert.match(feed, /purchasingCustomers/);
  assert.match(feed, /repeatPurchasers/);
  const response = feed.slice(feed.indexOf("return Response.json"));
  assert.doesNotMatch(response, /customerEmail/);
  assert.doesNotMatch(response, /fullAddress/);
  assert.doesNotMatch(response, /paymentDetails/);
});
