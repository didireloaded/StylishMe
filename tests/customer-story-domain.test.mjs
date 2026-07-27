import assert from "node:assert/strict";
import test from "node:test";

import {
  cleanStoryText,
  eligibleStoryItems,
  isRingActive,
  toggleLikeState,
} from "../app/customer-story-domain.ts";

test("only delivered and collected purchases are eligible for outfit stories", () => {
  const orders = [
    { id: "o1", status: "Delivered", items: [{ productId: "p3" }] },
    { id: "o2", status: "Collected", items: [{ productId: "p4" }] },
    { id: "o3", status: "In transit", items: [{ productId: "p1" }] },
  ];
  assert.deepEqual(eligibleStoryItems(orders), [
    { orderId: "o1", productId: "p3" },
    { orderId: "o2", productId: "p4" },
  ]);
});

test("story text is trimmed, bounded and free of control characters", () => {
  assert.equal(cleanStoryText("  Weekend\u0000 look  ", 12), "Weekend look");
});

test("only published unexpired stories remain in the main ring", () => {
  const now = new Date("2026-07-27T12:00:00Z");
  assert.equal(isRingActive({ status: "published", ringExpiresAt: "2026-07-28T12:00:00Z" }, now), true);
  assert.equal(isRingActive({ status: "published", ringExpiresAt: "2026-07-26T12:00:00Z" }, now), false);
  assert.equal(isRingActive({ status: "hidden", ringExpiresAt: "2026-07-28T12:00:00Z" }, now), false);
});

test("like toggles never produce a negative count", () => {
  assert.deepEqual(toggleLikeState(false, 2), { liked: true, count: 3 });
  assert.deepEqual(toggleLikeState(true, 0), { liked: false, count: 0 });
});
