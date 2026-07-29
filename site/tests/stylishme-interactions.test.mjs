import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import StylishMeApp from "../app/StylishMeApp.tsx";
import OutfitStoryViewer from "../app/OutfitStoryViewer.tsx";

let persistedStates;

function installState(state = null) {
  persistedStates = [];
  globalThis.fetch = async (_input, init = {}) => {
    if (init.method === "POST") {
      persistedStates.push(JSON.parse(init.body));
      return { ok: true, json: async () => ({ success: true }) };
    }
    return { ok: true, json: async () => ({ state }) };
  };
}

async function renderApp(state = null) {
  installState(state);
  render(React.createElement(StylishMeApp, { user: null }));
  await screen.findByRole("navigation");
}

function openMainTab(name) {
  fireEvent.click(within(screen.getByRole("navigation")).getByRole("button", { name: new RegExp(`${name}$`) }));
}

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = "";
});

afterEach(() => {
  cleanup();
});

test("Shop filter sheet applies every catalogue filter and can reset them", async () => {
  await renderApp();
  openMainTab("Shop");
  fireEvent.click(screen.getByRole("button", { name: /^Filter/ }));

  const sheet = screen.getByRole("dialog", { name: "Shop filters" });
  fireEvent.click(within(sheet).getByRole("button", { name: "Accessories" }));
  fireEvent.click(within(sheet).getByRole("button", { name: "M" }));
  fireEvent.click(within(sheet).getByRole("button", { name: "Black" }));
  fireEvent.click(within(sheet).getByRole("button", { name: "Under N$800" }));
  fireEvent.click(within(sheet).getByRole("button", { name: "Desert Thread" }));
  fireEvent.click(within(sheet).getByRole("button", { name: "Swakopmund" }));
  fireEvent.click(within(sheet).getByRole("button", { name: "Store collection" }));
  fireEvent.click(within(sheet).getByRole("button", { name: "Show 1 piece" }));

  assert.ok(screen.getByText("Etosha Woven Belt"));
  assert.ok(screen.getByText("1 piece"));

  fireEvent.click(screen.getByRole("button", { name: /^Filter/ }));
  const reopenedSheet = screen.getByRole("dialog", { name: "Shop filters" });
  fireEvent.click(within(reopenedSheet).getByRole("button", { name: "Reset" }));
  fireEvent.click(within(reopenedSheet).getByRole("button", { name: "Show 41 pieces" }));
  assert.ok(screen.getByText("41 pieces"));
});

test("Wishlist quick-add persists a variant offered by the selected product", async () => {
  await renderApp({
    cart: [],
    wishlist: ["p41"],
    orders: [],
    savedOutfits: [],
    profile: { city: "Windhoek", size: "M", shoe: "39", fit: "Regular" },
  });

  await waitFor(() => assert.ok(screen.getByRole("button", { name: /Wishlist$/ })));
  openMainTab("Wishlist");
  fireEvent.click(screen.getByRole("button", { name: "Add Etosha Woven Belt to cart" }));

  await waitFor(() => {
    const withCart = persistedStates.findLast((state) => state.cart.length === 1);
    assert.ok(withCart);
    assert.equal(withCart.cart[0].size, "M");
    assert.equal(withCart.cart[0].color, "#e9d6bd");
  }, { timeout: 2_000 });
});

test("Outfit bulk-add requests missing Fit Passport sizes and caps merged stock", async () => {
  await renderApp();
  fireEvent.click(screen.getByRole("button", { name: "Explore the edit" }));
  fireEvent.click(screen.getByRole("button", { name: "Add All to Cart" }));

  let sheet = await screen.findByRole("dialog", { name: "Choose outfit sizes" });
  assert.equal(screen.queryByRole("dialog", { name: /outfit story/i }), null);
  fireEvent.click(within(sheet).getByRole("button", { name: "Select XS for Kalahari Street Sneaker" }));
  fireEvent.click(within(sheet).getByRole("button", { name: "Add selected items" }));
  await screen.findByText("Added 4 items to cart");

  fireEvent.click(screen.getByRole("button", { name: "Add All to Cart" }));
  sheet = await screen.findByRole("dialog", { name: "Choose outfit sizes" });
  fireEvent.click(within(sheet).getByRole("button", { name: "Select XS for Kalahari Street Sneaker" }));
  fireEvent.click(within(sheet).getByRole("button", { name: "Add selected items" }));
  await screen.findByText("Added 1 item · 3 at stock limit");

  fireEvent.click(screen.getByRole("button", { name: /Open cart, \d+ items/ }));
  for (const name of ["Oversized Coral Hoodie", "Midnight Cargo Trousers", "Swakop Crossbody Bag"]) {
    assert.equal(screen.getByRole("button", { name: `Increase ${name} quantity` }).disabled, true);
  }
  assert.equal(screen.getByLabelText("Kalahari Street Sneaker quantity").textContent, "2");
});

test("Cart quantity increase stops at the selected size stock", async () => {
  await renderApp({
    cart: [{ productId: "p2", size: "XS", color: "#f3a4b8", quantity: 2 }],
    wishlist: [],
    orders: [],
    savedOutfits: [],
    profile: { city: "Windhoek", size: "M", shoe: "39", fit: "Regular" },
  });

  await waitFor(() => assert.ok(screen.getByRole("button", { name: "Open cart, 2 items" })));
  fireEvent.click(screen.getByRole("button", { name: "Open cart, 2 items" }));
  const increase = screen.getByRole("button", { name: "Increase Kalahari Street Sneaker quantity" });
  fireEvent.click(increase);
  assert.equal(screen.getByLabelText("Kalahari Street Sneaker quantity").textContent, "3");
  assert.equal(increase.disabled, true);
});

test("Designer catalogue keeps the Shop tab active when opened from Shop", async () => {
  await renderApp();
  openMainTab("Shop");
  fireEvent.click(screen.getByRole("button", { name: "Open Oversized Coral Hoodie" }));
  fireEvent.click(screen.getByRole("button", { name: /^Omutima Studio/ }));

  const shopTab = within(screen.getByRole("navigation")).getByRole("button", { name: "Shop" });
  assert.equal(shopTab.getAttribute("aria-current"), "page");
});

test("Primary navigation is shop-first and the cart stays in the header", async () => {
  await renderApp();
  const navigation = within(screen.getByRole("navigation"));
  for (const name of ["Home", "Shop", "Stores", "Try On", "Wishlist", "Profile"]) {
    assert.ok(navigation.getByRole("button", { name }));
  }
  assert.equal(navigation.queryByRole("button", { name: /Cart/ }), null);
  assert.ok(screen.getByRole("button", { name: "Open cart, 0 items" }));

  fireEvent.click(navigation.getByRole("button", { name: "Try On" }));
  assert.ok(screen.getByRole("heading", { name: "Try On" }));
  assert.ok(screen.getByText(/See how a look could appear on you/));

  openMainTab("Shop");
  fireEvent.click(screen.getByRole("button", { name: "Open Oversized Coral Hoodie" }));
  assert.ok(screen.getByRole("button", { name: "Open cart, 0 items" }));
});

test("Home stays editorial while Shop owns practical catalogue discovery", async () => {
  await renderApp();
  const approvedOrder = [
    "Search products, stores and designers",
    "Outfit of the day",
    "New arrivals",
    "Shop the Look",
    "Made in Namibia",
    "Trending products",
    "Designer spotlight",
    "See it on you",
  ];
  const copy = document.body.textContent;
  let previousIndex = -1;
  for (const label of approvedOrder) {
    const index = copy.indexOf(label);
    assert.ok(index > previousIndex, `${label} should appear in the approved home order`);
    previousIndex = index;
  }
  assert.equal(screen.queryByRole("heading", { name: "Shop by category" }), null);
  assert.equal(screen.queryByRole("heading", { name: "Available Near You" }), null);
  assert.equal(screen.queryByRole("heading", { name: "Recommended for you" }), null);
  assert.equal(screen.queryByRole("heading", { name: "Recently viewed" }), null);

  fireEvent.click(screen.getByRole("button", { name: "Try an Outfit" }));
  assert.equal(within(screen.getByRole("navigation")).getByRole("button", { name: "Try On" }).getAttribute("aria-current"), "page");

  openMainTab("Shop");
  assert.ok(screen.getByRole("heading", { name: "Shop by category" }));
  assert.ok(screen.getByRole("heading", { name: "Explore sellers" }));
  assert.ok(screen.getByRole("button", { name: /^Designers/ }));
  assert.ok(screen.getByRole("button", { name: /^Brands & boutiques/ }));
  assert.ok(screen.getByRole("button", { name: /^Merch/ }));
  assert.ok(screen.getByRole("heading", { name: "Designer lookbooks" }));
  assert.ok(screen.getByRole("navigation", { name: "Shop shortcuts" }));
  assert.ok(screen.getByRole("button", { name: /^Near you/ }));
  assert.ok(screen.getByRole("button", { name: /^Recommended/ }));
  assert.ok(screen.getByRole("button", { name: /^Recently viewed/ }));
  assert.equal(screen.queryByRole("heading", { name: "Available near you" }), null);
  assert.equal(screen.queryByRole("heading", { name: "Recommended for you" }), null);
  assert.equal(screen.queryByRole("heading", { name: "Recently viewed" }), null);
});

test("story bulk-add pauses the story while the customer chooses a missing size", async () => {
  await renderApp();
  fireEvent.click(screen.getByRole("button", { name: "Today" }));
  assert.ok(screen.getByRole("dialog", { name: /outfit story/i }));
  fireEvent.click(screen.getByRole("button", { name: "Add All to Cart" }));

  assert.ok(await screen.findByRole("dialog", { name: "Choose outfit sizes" }));
  assert.equal(screen.queryByRole("dialog", { name: /outfit story/i }), null);
});

test("Explore sellers opens dedicated seller destinations instead of filtering Shop", async () => {
  await renderApp();
  openMainTab("Shop");

  fireEvent.click(screen.getByRole("button", { name: /^Designers/ }));
  assert.ok(screen.getByRole("heading", { name: "Namibian designers" }));
  assert.ok(screen.getByText("Original collections, atelier stories and made-to-order pieces."));
  assert.equal(screen.queryByText("41 pieces"), null);
  fireEvent.click(screen.getByRole("button", { name: /^Explore Omutima Studio/ }));
  assert.ok(screen.getByRole("heading", { name: "Omutima Studio" }));

  fireEvent.click(screen.getByRole("button", { name: "Go back" }));
  fireEvent.click(screen.getByRole("button", { name: "Go back" }));
  fireEvent.click(screen.getByRole("button", { name: /^Brands & boutiques/ }));
  assert.ok(screen.getByRole("heading", { name: "Brands & boutiques" }));
  assert.ok(screen.getByText("Curated stores, independent labels and fashion retailers."));

  fireEvent.click(screen.getByRole("button", { name: "Go back" }));
  fireEvent.click(screen.getByRole("button", { name: /^Merch/ }));
  assert.ok(screen.getByRole("heading", { name: "Merch drops" }));
  assert.ok(screen.getByText("Creator, artist and event collections in one place."));
});

test("Shop shortcuts stay compact and retain useful actions", async () => {
  await renderApp();
  openMainTab("Shop");

  const shortcuts = screen.getByRole("navigation", { name: "Shop shortcuts" });
  assert.equal(within(shortcuts).getAllByRole("button").length, 3);
  assert.equal(within(shortcuts).queryAllByRole("img").length, 0);

  fireEvent.click(within(shortcuts).getByRole("button", { name: /^Near you/ }));
  assert.match(document.querySelector(".result-line").textContent, /pieces · Windhoek/);
});

test("Profile Saved outfits shows an empty state instead of opening a curated look", async () => {
  await renderApp({
    cart: [],
    wishlist: [],
    orders: [],
    savedOutfits: [],
    profile: { city: "Windhoek", size: "M", shoe: "39", fit: "Regular" },
  });

  openMainTab("Profile");
  fireEvent.click(screen.getByRole("button", { name: /^Saved outfits/ }));
  assert.ok(screen.getByRole("heading", { name: "No saved outfits yet" }));
  assert.ok(screen.getByRole("button", { name: "Browse curated outfits" }));
});

test("product and curated-look entry points start try-on with real catalogue pieces", async () => {
  await renderApp();
  openMainTab("Shop");
  fireEvent.click(screen.getByRole("button", { name: "Open Oversized Coral Hoodie" }));
  fireEvent.click(screen.getByRole("button", { name: "Try On this piece" }));
  assert.equal(within(screen.getByRole("navigation")).getByRole("button", { name: "Try On" }).getAttribute("aria-current"), "page");

  openMainTab("Home");
  fireEvent.click(screen.getByRole("button", { name: "Explore the edit" }));
  fireEvent.click(screen.getByRole("button", { name: "Try On This Look" }));
  assert.ok(screen.getByRole("heading", { name: "Try On" }));
});

test("a curated look can replace one piece while keeping the rest", async () => {
  await renderApp();
  fireEvent.click(screen.getByRole("button", { name: "Explore the edit" }));

  fireEvent.click(screen.getByRole("button", { name: "Replace Kalahari Street Sneaker" }));
  assert.ok(await screen.findByText("Replaced Kalahari Street Sneaker with Kalahari Street Sneaker 2"));
  assert.ok(screen.getByRole("button", { name: "Open Kalahari Street Sneaker 2" }));
  assert.ok(screen.getByRole("button", { name: "Open Oversized Coral Hoodie" }));
});

test("wishlist and wardrobe keep saved pieces, looks and purchases connected", async () => {
  await renderApp({
    cart: [],
    wishlist: ["p1"],
    orders: [],
    savedOutfits: ["windhoek-soft-power"],
    profile: { city: "Windhoek", size: "M", shoe: "39", fit: "Regular" },
  });

  await waitFor(() => assert.ok(screen.getByRole("button", { name: /Wishlist$/ })));
  openMainTab("Wishlist");
  assert.ok(document.querySelector(".wishlist-grid"));
  assert.ok(document.querySelector(".wishlist-product-card"));
  assert.ok(screen.getByRole("heading", { name: "Saved looks" }));
  assert.ok(screen.getByRole("button", { name: "Open Soft Power in Windhoek" }));
  assert.ok(screen.getByRole("button", { name: "Try on Soft Power in Windhoek" }));

  openMainTab("Profile");
  assert.ok(screen.getByRole("button", { name: /^Style MeYour personal edit/ }));
  fireEvent.click(screen.getByRole("button", { name: /^My wardrobe/ }));
  assert.ok(screen.getByRole("heading", { name: "My Wardrobe" }));
  assert.ok(screen.getByText("Saved pieces"));
  assert.ok(screen.getByText("Previous purchases"));
});

test("customer outfit sharing has a clear header entry and seller path stays in Profile", async () => {
  const { default: StylishMeApp } = await import("../app/StylishMeApp.tsx");
  render(React.createElement(StylishMeApp, { user: { name: "Didi", email: "didi@example.com" } }));
  assert.ok(await screen.findByRole("button", { name: "Post an outfit" }));
  fireEvent.click(screen.getByRole("button", { name: "Profile" }));
  assert.ok(await screen.findByRole("link", { name: /Become a seller/ }));
  cleanup();
});

test("delivery orders track milestones while collection orders show pickup instructions", async () => {
  await renderApp({
    cart: [],
    wishlist: [],
    savedOutfits: [],
    profile: { city: "Windhoek", size: "M", shoe: "39", fit: "Regular" },
    orders: [
      { id: "SM-DELIVERY", date: "20 Jul 2026", status: "In transit", total: 899, fulfilment: "Standard delivery", items: [{ productId: "p1", size: "M", color: "#f3a4b8", quantity: 1 }] },
      { id: "SM-COLLECT", date: "21 Jul 2026", status: "Preparing for collection", total: 799, fulfilment: "Store collection", items: [{ productId: "p4", size: "One size", color: "#17171d", quantity: 1 }] },
    ],
  });

  openMainTab("Profile");
  fireEvent.click(screen.getByRole("button", { name: /^My orders/ }));
  fireEvent.click(screen.getByRole("button", { name: /SM-DELIVERY/ }));
  assert.ok(screen.getByRole("heading", { name: "Delivery tracking" }));
  assert.ok(screen.getByText("Collected by courier"));

  fireEvent.click(screen.getByRole("button", { name: "Go back" }));
  fireEvent.click(screen.getByRole("button", { name: /SM-COLLECT/ }));
  assert.ok(screen.getByRole("heading", { name: "Collection status" }));
  assert.ok(screen.getByText(/No courier tracking is used/));
  assert.ok(screen.getByText("Ready to collect"));
  assert.equal(screen.queryByText("Collected by courier"), null);
  assert.equal(screen.queryByText(/Track delivery/i), null);
});

test("An all-unavailable story offers View Similar and routes to the outfit", async () => {
  let viewedOutfit = null;
  render(React.createElement(OutfitStoryViewer, {
    stories: [{ id: "story-test", label: "Test", outfitId: "test-outfit", image: "/og.png", accent: "#ff8178" }],
    outfits: [{ id: "test-outfit", title: "Test Outfit", note: "Unavailable edit", curator: "StylishMe", location: "Windhoek, Namibia", image: "/og.png", productIds: ["sold-out"] }],
    products: [{ id: "sold-out", name: "Sold Out Piece", image: "/og.png", price: 900, available: false }],
    initialStoryId: "story-test",
    restoreFocusTo: null,
    savedOutfitIds: [],
    onSave: () => undefined,
    onAddAll: () => assert.fail("unavailable stories must not bulk-add"),
    onViewOutfit: (id) => { viewedOutfit = id; },
    onClose: () => undefined,
  }));

  fireEvent.click(screen.getByRole("button", { name: "View Similar" }));
  assert.equal(viewedOutfit, "test-outfit");
});

test("order status filters show only the matching orders", async () => {
  await renderApp();
  openMainTab("Profile");
  fireEvent.click(screen.getByRole("button", { name: /^My orders/ }));

  fireEvent.click(screen.getByRole("button", { name: "Delivered" }));
  assert.ok(screen.getByText("SM-2026-1017"));
  assert.ok(screen.getByText("SM-2026-0982"));
  assert.equal(screen.queryByText("SM-2026-1048"), null);
  assert.equal(screen.getByRole("button", { name: "Delivered" }).getAttribute("aria-pressed"), "true");

  fireEvent.click(screen.getByRole("button", { name: "Cancelled" }));
  assert.ok(screen.getByText("SM-2026-0931"));
  assert.equal(screen.queryByText("SM-2026-1017"), null);

  fireEvent.click(screen.getByRole("button", { name: "Active" }));
  assert.ok(screen.getByText("SM-2026-1048"));
  assert.equal(screen.queryByText("SM-2026-0931"), null);
});
test("product utility actions open real guidance and share the selected piece", async () => {
  let shared = null;
  Object.defineProperty(navigator, "share", { configurable: true, value: async (payload) => { shared = payload; } });
  await renderApp();
  openMainTab("Shop");
  fireEvent.click(screen.getByRole("button", { name: "Open Oversized Coral Hoodie" }));

  fireEvent.click(screen.getByRole("button", { name: "Size guide" }));
  assert.ok(screen.getByRole("dialog", { name: "Size guide" }));
  assert.ok(screen.getByText("Find your best starting size"));
  fireEvent.click(screen.getByRole("button", { name: "Close size guide" }));

  fireEvent.click(screen.getByRole("button", { name: "Share product" }));
  await waitFor(() => assert.ok(shared));
  assert.match(shared.url, /product=p1/);
});

test("designer following and support topics change the visible experience", async () => {
  await renderApp();
  openMainTab("Shop");
  fireEvent.click(screen.getByRole("button", { name: "Open Oversized Coral Hoodie" }));
  fireEvent.click(screen.getByRole("button", { name: /Omutima Studio/ }));
  fireEvent.click(screen.getByRole("button", { name: "Follow" }));
  assert.ok(screen.getByRole("button", { name: "Following" }));
  assert.equal(screen.getByRole("button", { name: "Following" }).getAttribute("aria-pressed"), "true");

  openMainTab("Profile");
  fireEvent.click(screen.getByRole("button", { name: /^Help & support/ }));
  fireEvent.click(screen.getByRole("button", { name: /^Delivery and collection/ }));
  assert.ok(screen.getByRole("heading", { name: "Delivery and collection" }));
  assert.ok(screen.getByText(/delivery options/i));
});

test("saved addresses can be added and edited", async () => {
  await renderApp();
  openMainTab("Profile");
  fireEvent.click(screen.getByRole("button", { name: /^Saved addresses/ }));
  fireEvent.click(screen.getByRole("button", { name: "Add address" }));

  const dialog = screen.getByRole("dialog", { name: "Add address" });
  fireEvent.change(within(dialog).getByLabelText("Address label"), { target: { value: "Office" } });
  fireEvent.change(within(dialog).getByLabelText("Street address"), { target: { value: "42 Fidel Castro Street" } });
  fireEvent.change(within(dialog).getByLabelText("Town or city"), { target: { value: "Windhoek" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Save address" }));
  assert.ok(screen.getByText("Office"));
  assert.ok(screen.getByText("42 Fidel Castro Street"));

  fireEvent.click(screen.getByRole("button", { name: "Edit Office" }));
  const editDialog = screen.getByRole("dialog", { name: "Edit address" });
  fireEvent.change(within(editDialog).getByLabelText("Street address"), { target: { value: "10 Robert Mugabe Avenue" } });
  fireEvent.click(within(editDialog).getByRole("button", { name: "Save address" }));
  assert.ok(screen.getByText("10 Robert Mugabe Avenue"));
});
