import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("store and product sharing use stable path-based deep links", async () => {
  const domain = await import("../app/unified-domain.ts");
  const origin = "https://stylishme-namibia.didireloaded.chatgpt.site";

  assert.equal(domain.storeShareUrl("Omutima Studio", origin), `${origin}/stores/omutima-studio`);
  assert.equal(domain.productShareUrl("Omutima Studio", "Coral Wrap Dress", origin), `${origin}/stores/omutima-studio/products/coral-wrap-dress`);
  assert.equal(domain.catalogueProductUrl("Coastline Atelier", "Linen Shirt"), "/stores/coastline-atelier/products/linen-shirt");
});

test("deep-link pages protect the session and render one scoped storefront", async () => {
  const [storePage, productPage, storefront] = await Promise.all([
    read("app/stores/[storeSlug]/page.tsx"),
    read("app/stores/[storeSlug]/products/[productSlug]/page.tsx"),
    read("app/StorefrontView.tsx"),
  ]);

  for (const page of [storePage, productPage]) {
    assert.match(page, /getStylishMeUser/);
    assert.match(page, /redirect\(/);
    assert.match(page, /StorefrontView/);
  }
  assert.match(productPage, /productSlug/);
  assert.match(storefront, /linkedProduct/);
  assert.match(storefront, /history\.replaceState|location\.assign/);
});
