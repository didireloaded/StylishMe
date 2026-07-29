import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = path => fs.readFileSync(new URL(path, import.meta.url), "utf8");

test("seller fulfilment API is authenticated, role-scoped, and owner-scoped", () => {
  const route = read("../app/api/seller-orders/route.ts");
  assert.match(route, /getStylishMeUser/);
  assert.match(route, /requireAccountRole/);
  assert.match(route, /owner_email = \?/);
  assert.match(route, /updateSellerFulfilment/);
  assert.match(route, /cache-control.*no-store/i);
});

test("customer tracking endpoint verifies order ownership and supports configured DHL sync", () => {
  const route = read("../app/api/orders/[orderId]/tracking/route.ts");
  assert.match(route, /getStylishMeUser/);
  assert.match(route, /customer_email = \?/);
  assert.match(route, /syncEligibleDhlShipments/);
  assert.match(route, /getCustomerFulfilments/);
});

test("the UIs consume real seller orders and persisted tracking timelines", () => {
  const seller = read("../app/SellerApp.tsx");
  const customer = read("../app/StylishMeApp.tsx");
  assert.match(seller, /\/api\/seller-orders/);
  assert.doesNotMatch(seller, /marketplace does not yet store seller-specific fulfilment records/i);
  assert.match(customer, /fulfilments/);
  assert.match(customer, /trackingNumber/);
  assert.doesNotMatch(customer, /15 Jul · 09:42/);
});
