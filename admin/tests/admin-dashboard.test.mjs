import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("admin dashboard monitors the marketplace without exposing private customer data", async () => {
  const [dashboard, proxy, layout] = await Promise.all([
    read("app/AdminDashboard.tsx"),
    read("app/api/dashboard/route.ts"),
    read("app/layout.tsx"),
  ]);

  for (const area of ["Overview", "Customers", "Sellers", "Orders", "Products", "Collections", "Revenue", "Payouts", "Promotions", "Reports", "Traffic & Discovery", "Reviews", "Support", "Notifications", "Staff", "Settings"]) {
    assert.match(dashboard, new RegExp(area));
  }
  for (const group of ["MARKETPLACE", "BUSINESS", "EXPERIENCE", "MANAGEMENT"]) {
    assert.match(dashboard, new RegExp(group));
  }
  assert.match(dashboard, /Search sellers, products or orders/i);
  assert.match(dashboard, /All locations/i);
  assert.match(dashboard, /Last 30 days/i);
  assert.match(dashboard, /Open navigation/i);
  assert.match(dashboard, /sidebar-backdrop/i);
  assert.doesNotMatch(dashboard, /mobile-nav/);
  assert.match(dashboard, /Recorded order value/i);
  assert.match(dashboard, /Download report/i);
  assert.match(dashboard, /Payment provider not connected/i);
  assert.match(dashboard, /Patterns, not private profiles/i);
  assert.match(dashboard, /platform revenue/i);
  assert.match(dashboard, /Automatic quality validation/i);
  assert.doesNotMatch(dashboard, /Awaiting approval/i);
  assert.doesNotMatch(dashboard, /Gross paid sales/i);
  assert.match(proxy, /STYLISHME_ADMIN_API_KEY/);
  assert.match(proxy, /getChatGPTUser/);
  assert.match(layout, /index: false/);
});

test("admin overview exposes connected operational dimensions without inventing commerce data", async () => {
  const [dashboard, feed] = await Promise.all([
    read("app/AdminDashboard.tsx"),
    read("../site/app/api/admin-feed/route.ts"),
  ]);

  for (const signal of ["topProducts", "activityByCity", "customerStories"]) {
    assert.match(feed, new RegExp(signal));
    assert.match(dashboard, new RegExp(signal));
  }
  assert.match(dashboard, /Payment provider not connected/i);
  assert.match(dashboard, /No manual listing approval queue/i);
});

test("admin feed is secret-protected and returns only redacted operational fields", async () => {
  const feed = await read("../site/app/api/admin-feed/route.ts");

  assert.match(feed, /authorization/);
  assert.match(feed, /STYLISHME_ADMIN_API_KEY/);
  assert.match(feed, /cache-control/);
  assert.match(feed, /Personal contact details/);
  assert.doesNotMatch(feed, /ownerEmail:/);
  assert.doesNotMatch(feed, /profileJson:/);
  assert.doesNotMatch(feed, /cartJson:/);
  assert.doesNotMatch(feed, /wishlistJson:/);
});

test("activity records use one-way identifiers and the admin response omits them", async () => {
  const [activity, feed] = await Promise.all([
    read("../site/app/activity.ts"),
    read("../site/app/api/admin-feed/route.ts"),
  ]);

  assert.match(activity, /SHA-256/);
  assert.match(activity, /actorHash/);
  assert.match(activity, /value >= 120/);
  const responseMapping = feed.slice(feed.indexOf("activity: events.map"));
  assert.doesNotMatch(responseMapping, /actorHash/);
});
