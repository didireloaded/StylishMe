import assert from "node:assert/strict";
import test from "node:test";

const catalog = await import("../app/outfit-catalog.ts");

test("ships several complete curated outfits and matching stories", () => {
  assert.ok(catalog.OUTFITS.length >= 4);
  assert.equal(catalog.OUTFIT_STORIES.length, catalog.OUTFITS.length);
  for (const outfit of catalog.OUTFITS) {
    assert.ok(outfit.productIds.length >= 3);
    assert.ok(outfit.title.length > 3);
    assert.match(outfit.location, /Namibia|Windhoek|Swakopmund|Ongwediva/);
  }
});

test("calculates totals and unavailable products from the live catalogue maps", () => {
  const outfit = { productIds: ["p1", "p2", "p3"] };
  assert.equal(catalog.getOutfitTotal(outfit, { p1: 899, p2: 1299, p3: 2450 }), 4648);
  assert.deepEqual(
    catalog.getUnavailableProductIds(outfit, { p1: true, p2: false, p3: true }),
    ["p2"],
  );
});
