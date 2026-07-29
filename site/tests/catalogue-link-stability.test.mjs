import assert from "node:assert/strict";
import test from "node:test";

const readyProduct = (name) => ({
  id: "stable-id",
  name,
  description: "A carefully made Namibian jacket with enough detail for publication.",
  category: "Clothing",
  collection: "Desert Light",
  material: "Cotton",
  fit: "Regular",
  returns: "Returns accepted within seven days.",
  images: ["/api/seller-images/example.webp"],
  colours: ["Black"],
  delivery: ["Delivery"],
  variants: [{ size: "M", colour: "Black", quantity: 3 }],
  price: 990,
  status: "Live",
});

test("an existing product keeps its shared URL when a seller edits its name", async () => {
  const { normalizeSellerCatalogue } = await import("../app/catalogue-domain.ts");
  const store = { name: "Desert Thread", type: "Designer", city: "Windhoek", story: "Namibian streetwear." };
  const original = normalizeSellerCatalogue({ store, products: [readyProduct("Original Jacket")] }, "seller-stable");
  const existingSlugs = new Map([[original.products[0].id, original.products[0].productSlug]]);
  const renamed = normalizeSellerCatalogue(
    { store, products: [readyProduct("Renamed Jacket")] },
    "seller-stable",
    original.storeSlug,
    existingSlugs,
  );

  assert.equal(renamed.products[0].productSlug, original.products[0].productSlug);
});
