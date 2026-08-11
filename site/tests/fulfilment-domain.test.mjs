import assert from "node:assert/strict";
import test from "node:test";

import { assertFulfilmentTransition, fulfilmentTimeline, payoutEligibilityDate } from "../app/fulfilment-domain.ts";

test("delivery and collection follow different irreversible paths", () => {
  assert.equal(assertFulfilmentTransition("delivery", "new", "preparing").status, "preparing");
  assert.equal(assertFulfilmentTransition("collection", "preparing", "ready_to_collect").status, "ready_to_collect");
  assert.throws(() => assertFulfilmentTransition("collection", "preparing", "shipped", { provider: "local courier", trackingNumber: "123" }), /collection/i);
  assert.equal(assertFulfilmentTransition("delivery", "preparing", "shipped", { provider: "store delivery" }).trackingNumber, "");
  assert.throws(() => assertFulfilmentTransition("delivery", "preparing", "shipped"), /delivery service/i);
  assert.throws(() => assertFulfilmentTransition("delivery", "new", "delivered"), /cannot move/i);
});

test("delivery milestones are truthful and collection never exposes courier tracking", () => {
  const delivery = fulfilmentTimeline("delivery", "in_transit");
  const collection = fulfilmentTimeline("collection", "ready_to_collect");
  assert.deepEqual(delivery.map(step => step.status), ["new", "preparing", "shipped", "in_transit", "out_for_delivery", "delivered"]);
  assert.deepEqual(collection.map(step => step.status), ["new", "preparing", "ready_to_collect", "collected"]);
  assert.equal(collection.some(step => /courier|transit|delivery/i.test(step.label)), false);
});

test("payout eligibility starts after the completed return window", () => {
  assert.equal(payoutEligibilityDate(new Date("2026-07-29T10:00:00.000Z"), 14), "2026-08-12T10:00:00.000Z");
});
