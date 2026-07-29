import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("maps a normalized seller product into the customer Shop product model", async () => {
  const { toCustomerProduct } = await import("../app/customer-catalogue.ts");
  const product = toCustomerProduct({
    id: "seller-1:linen-1",
    name: "Linen Set",
    description: "A relaxed linen set made in Windhoek.",
    category: "Clothing",
    price: 1250,
    images: ["/api/seller-images/linen.webp"],
    material: "Linen",
    fit: "Relaxed",
    delivery: ["Delivery", "Collection"],
    store: { name: "Omutima Studio", city: "Windhoek", type: "Designer" },
    variants: [
      { id: "v1", size: "M", colour: "Sand", quantity: 2 },
      { id: "v2", size: "M", colour: "Black", quantity: 1 },
      { id: "v3", size: "L", colour: "Sand", quantity: 4 },
    ],
  });

  assert.ok(product);
  assert.equal(product.id, "seller-1:linen-1");
  assert.equal(product.designer, "Omutima Studio");
  assert.deepEqual(product.sizes, ["M", "L"]);
  assert.deepEqual(product.stock, [3, 4]);
  assert.equal(product.pickup, true);
});

test("customer Shop loads and merges published seller products without replacing launch inventory", async () => {
  const [app, stateRoute] = await Promise.all([
    read("app/StylishMeApp.tsx"),
    read("app/api/state/route.ts"),
  ]);

  assert.match(app, /fetch\("\/api\/catalog"/);
  assert.match(app, /toCustomerProduct/);
  assert.match(app, /setCatalogueProducts/);
  assert.match(app, /seededProducts/);
  assert.match(stateRoute, /catalogue-safe product identities/);
  assert.doesNotMatch(stateRoute, /\^p\\d\{1,4\}\$/);
});
