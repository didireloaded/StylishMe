import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("routes first-time accounts into isolated customer or seller experiences", async () => {
  const entry = await read("app/AppEntry.tsx");

  assert.match(entry, /How will you use StylishMe\?/);
  assert.match(entry, /Shop fashion/);
  assert.match(entry, /Sell on StylishMe/);
  assert.match(entry, /<StylishMeApp/);
  assert.match(entry, /<SellerApp/);
  assert.match(entry, /stylishme-account-role/);
});

test("keeps store links inside the unified app and scoped to one storefront", async () => {
  const [domain, storefront] = await Promise.all([
    import("../app/unified-domain.ts"),
    read("app/StorefrontView.tsx"),
  ]);

  assert.equal(
    domain.storeShareUrl("Omutima Studio", "https://stylishme-namibia.didireloaded.chatgpt.site"),
    "https://stylishme-namibia.didireloaded.chatgpt.site/?store=omutima-studio",
  );
  assert.equal(domain.matchesStoreSlug("Omutima Studio", "omutima-studio"), true);
  assert.match(storefront, /Only pieces from/);
  assert.match(storefront, /Explore StylishMe/);
  assert.doesNotMatch(storefront, /stylishme-seller-namibia/);
});

test("seller collection and order filters return only matching records", async () => {
  const domain = await import("../app/unified-domain.ts");
  const products = [
    { status: "Live", variants: [{ quantity: 5 }] },
    { status: "Changes requested", variants: [{ quantity: 2 }] },
    { status: "Changes requested", variants: [{ quantity: 0 }] },
  ];
  assert.equal(domain.filterSellerProducts(products, "Live").length, 1);
  assert.equal(domain.filterSellerProducts(products, "Needs details")[0].status, "Changes requested");
  assert.equal(domain.filterSellerProducts(products, "Needs attention")[0].status, "Changes requested");

  const orders = [{ status: "To prepare" }, { status: "Ready" }, { status: "Completed" }];
  assert.deepEqual(domain.filterSellerOrders(orders, "Ready"), [{ status: "Ready" }]);
});

test("store collection asks for a collection point instead of a delivery address", async () => {
  const domain = await import("../app/unified-domain.ts");
  assert.equal(domain.checkoutDestinationHeading("Store collection"), "Choose a collection store");
  assert.equal(domain.checkoutDestinationHeading("Standard delivery"), "Delivery address");
});

test("anonymous customer and role state stays on the current device instead of a shared guest account", async () => {
  const [accountRoute, stateRoute] = await Promise.all([
    read("app/api/account/route.ts"),
    read("app/api/state/route.ts"),
  ]);

  for (const route of [accountRoute, stateRoute]) {
    assert.match(route, /return user\?\.email \?\? null/);
    assert.doesNotMatch(route, /guest@stylishme\.local/);
    assert.match(route, /persistence: "device"/);
  }
});

test("seller home remains useful and safe while a new store has no products yet", async () => {
  const { default: SellerApp } = await import("../app/SellerApp.tsx");
  localStorage.clear();
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({
      state: {
        store: { name: "New Studio", type: "Designer", owner: "Nela", city: "Windhoek", story: "", approved: false },
        products: [],
      },
    }),
  });

  render(React.createElement(SellerApp));
  assert.ok(await screen.findByRole("heading", { name: "Good morning, Nela." }));
  assert.ok(screen.getByText("Sales unavailable"));
  assert.ok(screen.queryByText("N$12,640") === null);
  assert.ok(screen.getAllByRole("button", { name: "Add product" }).length >= 1);
  cleanup();
});

test("seller workspace exposes phase-one operations without invented finance data", async () => {
  const seller = await read("app/SellerApp.tsx");
  for (const area of ["Overview", "Orders", "Products", "Inventory", "Payouts", "Store Profile", "Notifications", "Settings"]) {
    assert.match(seller, new RegExp(area));
  }
  assert.match(seller, /Stock by variant/);
  assert.match(seller, /Payment provider is not connected/);
  assert.match(seller, /Every adjustment needs a reason/);
  assert.doesNotMatch(seller, /N\$12,640/);
  assert.doesNotMatch(seller, /1,482/);
});

test("seller APIs use authenticated ownership and approval-gated public catalogue data", async () => {
  const [sellerState, sellerImages, catalogue] = await Promise.all([
    read("app/api/seller-state/route.ts"),
    read("app/api/seller-images/route.ts"),
    read("app/api/catalog/route.ts"),
  ]);

  for (const route of [sellerState, sellerImages]) {
    assert.match(route, /getChatGPTUser/);
    assert.match(route, /sellerState\.ownerEmail/);
    assert.doesNotMatch(route, /x-seller-invite/);
  }
  assert.match(catalogue, /sellerState\.approved/);
  assert.match(catalogue, /publicStore/);
  assert.doesNotMatch(catalogue, /phone:/);
  assert.doesNotMatch(catalogue, /email:/);
});
