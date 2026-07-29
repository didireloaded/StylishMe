import assert from "node:assert/strict";
import test from "node:test";

import { buildOrderPlan } from "../app/commerce-orders.ts";

const lines = [
  { productId: "p1", variantId: "v1", sellerId: "seller-a", sellerName: "Omutima Studio", productName: "Coral Hoodie", size: "M", colour: "Coral", quantity: 2, unitPriceCents: 89900 },
  { productId: "p2", variantId: "v2", sellerId: "seller-b", sellerName: "Desert Thread", productName: "Sneaker", size: "42", colour: "White", quantity: 1, unitPriceCents: 129900 },
  { productId: "p3", variantId: "v3", sellerId: "seller-a", sellerName: "Omutima Studio", productName: "Bag", size: "One size", colour: "Black", quantity: 1, unitPriceCents: 79900 },
];

test("builds integer-priced parent and exact per-seller order allocations", () => {
  const plan = buildOrderPlan(lines, "Standard delivery", "order-1");
  assert.equal(plan.subtotalCents, 389600);
  assert.equal(plan.deliveryCents, 6500);
  assert.equal(plan.totalCents, 396100);
  assert.equal(plan.sellerOrders.length, 2);
  assert.deepEqual(plan.sellerOrders.map(({ sellerId, subtotalCents }) => ({ sellerId, subtotalCents })), [
    { sellerId: "seller-a", subtotalCents: 259700 },
    { sellerId: "seller-b", subtotalCents: 129900 },
  ]);
  assert.equal(plan.sellerOrders.reduce((sum, order) => sum + order.subtotalCents, 0), plan.subtotalCents);
  assert.equal(plan.items.every((item) => Number.isInteger(item.lineTotalCents)), true);
});

test("collection has no delivery charge and commission never changes the customer total", () => {
  const plan = buildOrderPlan(lines.slice(0, 1), "Store collection", "order-2");
  assert.equal(plan.deliveryCents, 0);
  assert.equal(plan.totalCents, plan.subtotalCents);
  assert.equal(plan.sellerOrders[0].sellerNetCents + plan.sellerOrders[0].commissionCents, plan.sellerOrders[0].subtotalCents);
});
