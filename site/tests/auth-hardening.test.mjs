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

test("logout clears all account-private state", () => {
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
  assert.ok(source.indexOf('fetch("/api/auth/logout"') < source.indexOf("clearPrivateAccountState(window.localStorage"));
});

test("login gives explicit logout feedback and never offers guest access", async () => {
  assert.equal(typeof sessionReset.safeInternalReturnTo, "function");
  assert.equal(sessionReset.safeInternalReturnTo("/wishlist?from=look"), "/wishlist?from=look");
  assert.equal(sessionReset.safeInternalReturnTo("https://evil.example"), "/");
  assert.equal(sessionReset.safeInternalReturnTo("//evil.example"), "/");
  const [source, form] = await Promise.all([read("app/login/page.tsx"), read("app/AuthForm.tsx")]);
  assert.match(form, /You.ve been signed out/);
  assert.doesNotMatch(source + form, /Continue shopping as guest/);
  assert.doesNotMatch(source + form, /ChatGPT/i);
  assert.match(source, /AuthForm/);
});

test("the storefront is protected on the server before customer UI renders", async () => {
  const source = await read("app/page.tsx");
  assert.match(source, /redirect\(`\/login\?returnTo=/);
  assert.doesNotMatch(source, /SessionResetGate/);
});

test("StylishMe account signup requires a profile photo and secure password", async () => {
  const [form, signup, auth] = await Promise.all([
    read("app/AuthForm.tsx"), read("app/api/auth/signup/route.ts"), read("app/stylishme-auth.ts"),
  ]);
  assert.match(form, /Profile photo/);
  assert.match(form, /Google/);
  assert.match(form, /Apple/);
  assert.doesNotMatch(form, /ChatGPT/i);
  assert.match(signup, /avatar instanceof File/);
  assert.match(signup, /createPasswordHash/);
  assert.match(auth, /PBKDF2/);
  assert.match(auth, /HttpOnly/);
  assert.match(auth, /SameSite=Lax/);
});

test("private customer and seller URLs check the StylishMe server session", async () => {
  const [profile, orders, seller] = await Promise.all([
    read("app/profile/page.tsx"), read("app/orders/page.tsx"), read("app/seller/page.tsx"),
  ]);
  assert.match(profile, /requireStylishMeUser\("\/profile"\)/);
  assert.match(orders, /requireStylishMeUser\("\/orders"\)/);
  assert.match(seller, /requireStylishMeUser\("\/seller"\)/);
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
test("logout reports revocation failure without clearing the browser session", async () => {
  const route = await read("app/api/auth/logout/route.ts");
  assert.doesNotMatch(route, /destroySession\([^)]*\)\.catch/);
  assert.match(route, /status: 503/);
  assert.match(route, /Unable to sign out/);
});

test("private profile photos are never reused from the browser cache", async () => {
  const route = await read("app/api/auth/avatar/route.ts");
  assert.match(route, /private, no-store/);
  assert.doesNotMatch(route, /max-age/);
});

test("auth throttling is atomic, scoped, and cleans up stale counters", async () => {
  const [auth, login, signup] = await Promise.all([
    read("app/stylishme-auth.ts"), read("app/api/auth/login/route.ts"), read("app/api/auth/signup/route.ts"),
  ]);
  assert.match(auth, /ON CONFLICT\(attempt_key\) DO UPDATE/);
  assert.match(auth, /attempt_count = CASE/);
  assert.match(auth, /RETURNING attempt_count/);
  assert.match(auth, /DELETE FROM auth_attempts WHERE window_start/);
  assert.match(auth, /scope: "login" \| "signup"/);
  assert.match(login, /consumeAuthAttempt\(request, email, 10, "login"\)/);
  assert.match(signup, /consumeAuthAttempt\(request, email, 5, "signup"\)/);
  assert.match(login + signup, /content-length/);
  assert.match(login + signup, /TextEncoder/);
});

test("account reset migrations never erase shopping, seller, or try-on records", async () => {
  const [legacyReset, sessionReset] = await Promise.all([
    read("drizzle/0003_reset_accounts.sql"), read("drizzle/0006_clear_active_sessions.sql").catch(() => ""),
  ]);
  assert.doesNotMatch(legacyReset, /DELETE FROM `(customer_state|seller_state|try_on_usage)`/);
  assert.match(sessionReset, /DELETE FROM `auth_sessions`/);
  assert.doesNotMatch(sessionReset, /customer_state|seller_state|try_on_usage/);
});
test("new signed-in accounts never inherit demo wishlist or address data", async () => {
  const app = await read("app/StylishMeApp.tsx");
  assert.match(app, /useState<string\[\]>\(user \? \[\] : \["p2"/);
  assert.match(app, /useState<Address\[\]>\(user \? \[\] : defaultAddresses\)/);
  assert.match(app, /checkoutNeedsAddress/);
  assert.match(app, /Add a delivery address/);
});
