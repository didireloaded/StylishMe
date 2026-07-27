import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

test("production output contains the StylishMe Seller experience", async () => {
  const index = await readFile(new URL("../dist/server/index.js", import.meta.url), "utf8");
  const assetRoot = new URL("../dist/server/ssr/assets/", import.meta.url);
  const sellerAsset = (await readdir(assetRoot)).find((name) => name.startsWith("SellerApp-") && name.endsWith(".js"));
  assert.ok(sellerAsset);
  const app = await readFile(new URL(sellerAsset, assetRoot), "utf8");
  assert.match(index, /title: "StylishMe Seller"/);
  assert.match(app, /STYLISHME/);
  assert.match(app, /Good morning/);
  assert.doesNotMatch(app, /codex-preview|Building your site|react-loading-skeleton/i);
});

test("seller app declares durable catalogue and image storage", async () => {
  const [hosting, schema, stateRoute, imageRoute, catalogRoute] = await Promise.all([
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/seller-state/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/seller-images/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/catalog/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(hosting, /"d1": "DB"/);
  assert.match(hosting, /"r2": "MEDIA"/);
  assert.match(schema, /seller_state/);
  assert.match(stateRoute, /x-seller-invite/);
  assert.match(imageRoute, /MEDIA\.put/);
  assert.match(catalogRoute, /status === "Live"/);
});
