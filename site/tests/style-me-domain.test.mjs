import assert from "node:assert/strict";
import test from "node:test";

import { createCatalogueLook } from "../app/style-me-domain.ts";

const item = (id, category, price, extra = {}) => ({ id, category, price, stock: [2], location: "Windhoek", madeLocal: true, colors: ["#17171d"], name: id, designer: "Local", ...extra });

test("Style Me selects only available catalogue products within a finite budget", () => {
  const catalogue = [item("dress", "Women", 700), item("shoe", "Shoes", 500), item("bag", "Bags", 250), item("sold", "Accessories", 100, { stock: [0] }), item("too-much", "Women", 3000)];
  const result = createCatalogueLook(catalogue, { occasion: "Dinner", location: "Windhoek", budget: "N$1,500", colours: ["Black"], style: "Modern", timing: "Tonight", ownedItems: "" });
  assert.deepEqual(result.map(product => product.id), ["dress", "shoe", "bag"]);
  assert.ok(result.reduce((sum, product) => sum + product.price, 0) <= 1500);
  assert.ok(result.every(product => catalogue.includes(product)));
});

test("Style Me never invents a fallback item when the catalogue cannot satisfy the brief", () => {
  const result = createCatalogueLook([item("sold", "Women", 600, { stock: [0] })], { occasion: "Dinner", location: "Windhoek", budget: "N$1,500", colours: [], style: "Modern", timing: "Tonight", ownedItems: "" });
  assert.deepEqual(result, []);
});
