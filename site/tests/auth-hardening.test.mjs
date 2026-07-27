import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import * as sessionReset from "../app/session-reset.ts";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

function memoryStorage(entries) {
  const values = new Map(Object.entries(entries));
  return {
    get length() { return values.size; },
    key(index) { return [...values.keys()][index] ?? null; },
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, value); },
    removeItem(key) { values.delete(key); },
  };
}

test("logout clears account-private state while preserving guest shopping state", () => {
  assert.equal(typeof sessionReset.clearPrivateAccountState, "function");
  const storage = memoryStorage({
    "stylishme-state:person@example.com": "private",
    "stylishme-account-role:person@example.com": "seller",
    "stylishme-seller-draft:person@example.com": "private",
    "stylishme-state:guest": "guest cart",
    "stylishme-town": "Windhoek",
    "unrelated": "keep",
  });
  sessionReset.clearPrivateAccountState(storage, "person@example.com");
  assert.equal(storage.getItem("stylishme-state:person@example.com"), null);
  assert.equal(storage.getItem("stylishme-account-role:person@example.com"), null);
  assert.equal(storage.getItem("stylishme-seller-draft:person@example.com"), null);
  assert.equal(storage.getItem("stylishme-state:guest"), "guest cart");
  assert.equal(storage.getItem("stylishme-town"), "Windhoek");
  assert.equal(storage.getItem("unrelated"), "keep");
});

test("logout uses replacement navigation, progress, and private cache clearing", async () => {
  const source = await read("app/LogoutButton.tsx");
  assert.match(source, /Signing out/);
  assert.match(source, /clearPrivateAccountState/);
  assert.match(source, /caches\.keys/);
  assert.match(source, /window\.location\.replace/);
  assert.match(source, /\/login\?reason=logged-out/);
});

test("login gives explicit logout feedback, guest browsing, and a safe return path", async () => {
  assert.equal(typeof sessionReset.safeInternalReturnTo, "function");
  assert.equal(sessionReset.safeInternalReturnTo("/wishlist?from=look"), "/wishlist?from=look");
  assert.equal(sessionReset.safeInternalReturnTo("https://evil.example"), "/");
  assert.equal(sessionReset.safeInternalReturnTo("//evil.example"), "/");
  const source = await read("app/login/page.tsx");
  assert.match(source, /You.ve been signed out/);
  assert.match(source, /Continue shopping as guest/);
  assert.match(source, /chatGPTSignInPath\(returnTo\)/);
});

test("private customer and seller URLs check the server session", async () => {
  const [profile, orders, seller] = await Promise.all([
    read("app/profile/page.tsx"), read("app/orders/page.tsx"), read("app/seller/page.tsx"),
  ]);
  assert.match(profile, /requireChatGPTUser\("\/profile"\)/);
  assert.match(orders, /requireChatGPTUser\("\/orders"\)/);
  assert.match(seller, /requireChatGPTUser\("\/seller"\)/);
  assert.match(seller, /accountRole/);
});

test("authenticated state requests surface expiry and replace the private screen", async () => {
  const [route, app] = await Promise.all([read("app/api/state/route.ts"), read("app/StylishMeApp.tsx")]);
  assert.match(route, /searchParams\.get\("account"\) === "1"/);
  assert.match(route, /status: 401/);
  assert.match(app, /reason=expired/);
  assert.match(app, /window\.location\.replace/);
});

test("guest wishlist and cart merge without overwriting account shopping state", async () => {
  const guestState = await import("../app/guest-state.ts");
  const merged = guestState.mergeGuestShoppingState(
    { cart: [{ productId: "p1", size: "M", color: "pink", quantity: 1 }], wishlist: ["p1", "p2"] },
    { cart: [{ productId: "p1", size: "M", color: "pink", quantity: 2 }, { productId: "p3", size: "S", color: "black", quantity: 1 }], wishlist: ["p2", "p3"] },
  );
  assert.deepEqual(merged.wishlist, ["p1", "p2", "p3"]);
  assert.deepEqual(merged.cart, [
    { productId: "p1", size: "M", color: "pink", quantity: 3 },
    { productId: "p3", size: "S", color: "black", quantity: 1 },
  ]);
});

test("seller data APIs enforce the seller role on the backend", async () => {
  const route = await read("app/api/seller-state/route.ts");
  assert.match(route, /requireAccountRole\(user\.email, "seller"\)/);
  assert.match(route, /status: 403/);
});
