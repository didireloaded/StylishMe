import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const readyProduct = (overrides = {}) => ({
  id: "linen-set-1",
  name: "Desert Linen Set",
  description: "A breathable two-piece linen set made for warm Namibian afternoons.",
  category: "Clothing",
  collection: "Desert Light",
  material: "Linen blend",
  fit: "Relaxed",
  returns: "Returns accepted within seven days.",
  images: ["/api/seller-images/example.webp"],
  colours: ["Sand"],
  delivery: ["Delivery", "Collection"],
  variants: [{ size: "M", colour: "Sand", quantity: 4 }],
  price: 1250,
  status: "Live",
  ...overrides,
});

test("normalizes only validated live seller products into integer-priced catalogue records", async () => {
  const { normalizeSellerCatalogue } = await import("../app/catalogue-domain.ts");
  const state = {
    store: { name: "Omutima Studio", type: "Designer", city: "Windhoek", story: "Made in Namibia." },
    products: [
      readyProduct(),
      readyProduct({ id: "draft-1", name: "Unfinished Piece", status: "Draft" }),
      readyProduct({ id: "invalid-1", name: "No stock", variants: [{ size: "S", colour: "Sand", quantity: 0 }] }),
    ],
  };

  const result = normalizeSellerCatalogue(state, "seller-123");
  assert.equal(result.products.length, 1);
  assert.equal(result.products[0].priceCents, 125000);
  assert.equal(result.products[0].storeSlug, "omutima-studio");
  assert.equal(result.products[0].status, "published");
  assert.deepEqual(result.variants.map((variant) => [variant.size, variant.colour, variant.availableQuantity]), [["M", "Sand", 4]]);
});

test("duplicate product names receive deterministic collision-safe slugs", async () => {
  const { normalizeSellerCatalogue } = await import("../app/catalogue-domain.ts");
  const state = {
    store: { name: "Coastline Atelier", type: "Designer", city: "Swakopmund", story: "Coastal tailoring." },
    products: [
      readyProduct({ id: "first-id", name: "Linen Shirt" }),
      readyProduct({ id: "second-id", name: "Linen Shirt" }),
    ],
  };

  const first = normalizeSellerCatalogue(state, "seller-456");
  const second = normalizeSellerCatalogue({ ...state, products: [...state.products].reverse() }, "seller-456");
  assert.equal(new Set(first.products.map((product) => product.productSlug)).size, 2);
  assert.deepEqual(
    first.products.map(({ id, productSlug }) => ({ id, productSlug })).sort((a, b) => a.id.localeCompare(b.id)),
    second.products.map(({ id, productSlug }) => ({ id, productSlug })).sort((a, b) => a.id.localeCompare(b.id)),
  );
});

test("seller saves synchronize the normalized catalogue and public reads no longer parse seller JSON", async () => {
  const [sellerRoute, catalogueRoute, storage] = await Promise.all([
    read("app/api/seller-state/route.ts"),
    read("app/api/catalog/route.ts"),
    read("app/catalogue-storage.ts"),
  ]);

  assert.match(sellerRoute, /syncSellerCatalogue/);
  assert.match(catalogueRoute, /catalogProducts/);
  assert.match(catalogueRoute, /inventoryVariants/);
  assert.match(catalogueRoute, /catalogProducts\.status/);
  assert.doesNotMatch(catalogueRoute, /JSON\.parse\(row\.stateJson\)/);
  assert.match(storage, /env\.DB\.batch/);
});
