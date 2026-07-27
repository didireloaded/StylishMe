import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = async (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8").catch(() => "");

test("seller app feels like StylishMe and covers the complete seller journey", async () => {
  const [app, css] = await Promise.all([
    read("app/SellerApp.tsx"),
    read("app/globals.css"),
  ]);

  for (const label of [
    "Good morning",
    "Add a new piece",
    "Your collection",
    "Orders",
    "Store",
    "Share your store",
    "Submit for review",
    "Welcome to StylishMe Seller",
    "Set up your store",
  ]) {
    assert.match(app, new RegExp(label));
  }
  assert.doesNotMatch(app, /SaaS|operating system|database|API key|webhook/i);
  assert.match(css, /--coral:/);
  assert.match(css, /\.seller-bottom-nav/);
  assert.match(css, /\.editorial-hero/);
});

test("product readiness requires customer-facing details and real stock", async () => {
  const domain = await import("../app/seller-domain.ts").catch(() => null);
  assert.ok(domain, "seller domain should exist");

  const incomplete = {
    name: "",
    description: "",
    category: "",
    price: 0,
    images: [],
    colours: [],
    variants: [],
  };
  assert.deepEqual(domain.productReadiness(incomplete), {
    ready: false,
    missing: ["name", "description", "category", "price", "image", "colour", "stock"],
  });

  const complete = {
    name: "Ondelela Evening Dress",
    description: "A fluid ceremony dress made in Windhoek.",
    category: "Women",
    price: 2450,
    images: ["dress.jpg"],
    colours: ["Coral"],
    variants: [{ size: "M", colour: "Coral", quantity: 3 }],
  };
  assert.deepEqual(domain.productReadiness(complete), { ready: true, missing: [] });
  assert.equal(domain.totalStock(complete.variants), 3);
});

test("seller share links point customers to the matching StylishMe destination", async () => {
  const domain = await import("../app/seller-domain.ts").catch(() => null);
  assert.ok(domain, "seller domain should exist");
  assert.equal(
    domain.storeShareUrl("Omutima Studio"),
    "https://stylishme-namibia.didireloaded.chatgpt.site/?store=omutima-studio",
  );
  assert.equal(
    domain.productShareUrl("Omutima Studio", "Ondelela Evening Dress"),
    "https://stylishme-namibia.didireloaded.chatgpt.site/?store=omutima-studio&product=ondelela-evening-dress",
  );
});
