import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

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

test("public visitors can browse the marketplace before login", async () => {
  const [page, appEntry, app] = await Promise.all([
    read("app/page.tsx"),
    read("app/AppEntry.tsx"),
    read("app/StylishMeApp.tsx"),
  ]);

  assert.doesNotMatch(page, /redirect\(`\/login/);
  assert.match(page, /user \? \{ name: user\.displayName, email: user\.email, avatarUrl: user\.avatarUrl \} : null/);
  assert.match(appEntry, /user: User \| null/);
  assert.match(appEntry, /useState<AccountRole \| null>\(\(\) => user \? null : "customer"\)/);
  assert.match(app, /stylishme-state:\$\{user\?\.email \?\? "signed-out"\}/);
  assert.match(app, /if \(!user\) return;/);
  assert.match(app, /loginFor\(`\/\?view=product&product=\$\{product\.id\}`\)/);
});

test("guest browsing remains visible while shopping actions require login", async () => {
  const { default: StylishMeApp } = await import("../app/StylishMeApp.tsx");
  const app = await read("app/StylishMeApp.tsx");
  localStorage.clear();
  globalThis.fetch = async (url) => ({
    ok: String(url).includes("/api/catalog") || String(url).includes("/api/customer-stories") || String(url).includes("/api/discovery"),
    status: String(url).includes("/api/state") ? 401 : 200,
    json: async () => String(url).includes("/api/catalog") ? { products: [] } : String(url).includes("/api/customer-stories") ? { stories: [], eligibleItems: [] } : {},
  });

  render(React.createElement(StylishMeApp, { user: null }));
  assert.ok(await screen.findByRole("heading", { name: "STYLISHME" }));
  const navigation = within(screen.getByRole("navigation"));
  fireEvent.click(navigation.getByRole("button", { name: "Profile" }));
  assert.ok(within(screen.getByRole("banner")).getByText("Profile"));
  assert.ok(screen.getByRole("button", { name: "Sign in to StylishMe" }));
  fireEvent.click(navigation.getByRole("button", { name: "Cart" }));
  assert.ok(within(screen.getByRole("banner")).getByText("My Cart"));
  assert.match(app, /window\.location\.href = `\/login\?returnTo=\$\{encodeURIComponent\(returnTo\)\}`/);
  assert.match(app, /if \(loginFor\(window\.location\.pathname \+ window\.location\.search\)\) return;/);
  assert.match(app, /if \(loginFor\(`\/\?view=product&product=\$\{product\.id\}`\)\) return;/);
  cleanup();
});

test("keeps store links inside the unified app and scoped to one storefront", async () => {
  const [domain, storefront] = await Promise.all([
    import("../app/unified-domain.ts"),
    read("app/StorefrontView.tsx"),
  ]);

  assert.equal(
    domain.storeShareUrl("Omutima Studio", "https://stylishme-namibia.didireloaded.chatgpt.site"),
    "https://stylishme-namibia.didireloaded.chatgpt.site/stores/omutima-studio",
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
  assert.ok(screen.getByText("Nothing urgent right now"));
  assert.ok(screen.queryByText("N$12,640") === null);
  assert.ok(screen.getAllByRole("button", { name: "Add product" }).length >= 1);
  cleanup();
});

test("seller workspace exposes phase-one operations without invented finance data", async () => {
  const seller = await read("app/SellerApp.tsx");
  for (const area of ["Overview", "Orders", "Products", "Inventory", "Payouts", "Collections", "Customers", "Reviews & Questions", "Analytics", "Notifications", "Settings"]) {
    assert.match(seller, new RegExp(area));
  }
  assert.match(seller, /seller-sidebar/);
  assert.match(seller, /Stock by variant/);
  assert.match(seller, /verified customer payments/);
  assert.match(seller, /\/api\/seller-settlements/);
  assert.match(seller, /Every adjustment needs a reason/);
  assert.doesNotMatch(seller, /seller-bottom-nav/);
  assert.doesNotMatch(seller, /editorial-hero/);
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
    assert.match(route, /getStylishMeUser/);
    assert.match(route, /sellerState\.ownerEmail/);
    assert.doesNotMatch(route, /x-seller-invite/);
  }
  assert.match(catalogue, /catalogProducts\.status/);
  assert.match(sellerState, /approved: state\.store\.approved/);
  assert.match(catalogue, /store: \{/);
  assert.doesNotMatch(catalogue, /phone:/);
  assert.doesNotMatch(catalogue, /email:/);
});
