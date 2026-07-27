# StylishMe Full-Viewport PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the verified StylishMe shopping experience into a borderless, full-viewport, installable PWA without weakening live price, stock, checkout, or customer-state safety.

**Architecture:** Preserve the current React/vinext application and Sites backend. Replace the decorative device shell with a responsive app shell, add standards-based manifest and metadata, register a narrowly scoped service worker, and cache only static/offline assets while leaving commerce APIs network-only.

**Tech Stack:** React 19, Next-compatible metadata, vinext/Vite, TypeScript, CSS, Web App Manifest, Service Worker API, Node test runner, Testing Library/JSDOM, Sharp for deterministic icon generation, ChatGPT Sites hosting.

## Global Constraints

- The root app is borderless and occupies the real viewport in browser and standalone modes.
- Remove the fake status bar, 430px device frame, device border, rounded device corners, and device shadow.
- Use `100dvh` with a `100vh` fallback and `viewport-fit=cover` safe-area handling.
- Preserve Home, Shop, Outfits, Cart, Profile and all existing shopping journeys.
- Preserve stable product identities, Namibian-dollar formatting, stock caps, valid variants, modal accessibility, and story behavior.
- Cache static assets and the branded offline document only; never cache or queue `/api/` requests, checkout mutations, prices, stock, customer state, or orders.
- Do not add a permanent custom install banner.
- Native App Store/Google Play packages, push notifications, background checkout, and offline order queues remain out of scope.

---

### Task 1: Preserve and Commit the Completed Commerce Review Fixes

**Files:**
- Verify: `app/StylishMeApp.tsx`
- Verify: `app/cart-commerce.ts`
- Verify: `app/shop-filter.ts`
- Verify: `app/OutfitStoryViewer.tsx`
- Verify: `app/api/state/route.ts`
- Verify: `app/outfit-catalog.ts`
- Verify: `app/globals.css`
- Verify: `tests/stylishme-interactions.test.mjs`
- Verify: `tests/rendered-html.test.mjs`
- Verify: `tests/shop-filter.test.mjs`
- Verify: `package.json`
- Verify: `package-lock.json`

**Interfaces:**
- Consumes: the uncommitted TDD work already present in the feature worktree.
- Produces: a clean commit containing stateful seven-part Shop filters, explicit outfit size selection, stock-aware cart merging, valid wishlist variants, and mounted interaction coverage.

- [ ] **Step 1: Inspect the complete pending diff and confirm scope**

Run:

```powershell
git diff --stat
git diff -- app/StylishMeApp.tsx app/cart-commerce.ts app/shop-filter.ts app/OutfitStoryViewer.tsx app/api/state/route.ts app/outfit-catalog.ts app/globals.css package.json tests
```

Expected: only the final-review fixes and their tests/dependencies are present; the PWA shell is not implemented yet.

- [ ] **Step 2: Run the mounted interaction regression suite**

Run:

```powershell
node --import tsx --import ./tests/dom-setup.mjs --test tests/stylishme-interactions.test.mjs
```

Expected: 4 tests pass, covering all Shop filters/reset, p41 wishlist variant validity, outfit size selection plus repeat-add stock caps, and manual Cart quantity caps.

- [ ] **Step 3: Run the entire existing quality gate**

Run:

```powershell
npm test
npm run lint
$env:WRANGLER_LOG_PATH='.wrangler/wrangler.log'; .\node_modules\.bin\vinext.cmd build
git diff --check
```

Expected: all tests pass, ESLint exits 0, the production build exits 0, and `git diff --check` prints nothing.

- [ ] **Step 4: Commit the recovered review fixes**

```powershell
git add app/OutfitStoryViewer.tsx app/StylishMeApp.tsx app/api/state/route.ts app/globals.css app/outfit-catalog.ts app/shop-filter.ts app/cart-commerce.ts tests/dom-setup.mjs tests/stylishme-interactions.test.mjs tests/rendered-html.test.mjs tests/shop-filter.test.mjs package.json package-lock.json
git commit -m "Harden StylishMe shopping interactions"
```

Expected: a commit is created and `git status --short` is clean.

---

### Task 2: Add Manifest, Branded Icons and Mobile Metadata

**Files:**
- Create: `scripts/generate-pwa-icons.mjs`
- Create: `public/manifest.webmanifest`
- Create: `public/icons/stylishme-192.png` by generation script
- Create: `public/icons/stylishme-512.png` by generation script
- Create: `public/icons/stylishme-maskable-512.png` by generation script
- Modify: `app/layout.tsx`
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `tests/pwa-metadata.test.mjs`

**Interfaces:**
- Consumes: the existing brand palette (`#0b1218`, `#ff7c73`, `#df70b7`) and Next-compatible `Metadata`/`Viewport` exports.
- Produces: `/manifest.webmanifest`, PNG install icons, `viewport-fit=cover`, standalone metadata, and an `npm run icons:pwa` regeneration command.

- [ ] **Step 1: Write the failing metadata test**

Create `tests/pwa-metadata.test.mjs` with assertions that read the actual manifest and layout:

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("manifest exposes installable StylishMe standalone metadata", async () => {
  const manifest = JSON.parse(await readFile(new URL("public/manifest.webmanifest", root), "utf8"));
  assert.equal(manifest.name, "StylishMe Namibia");
  assert.equal(manifest.short_name, "StylishMe");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.scope, "/");
  assert.equal(manifest.theme_color, "#0b1218");
  assert.ok(manifest.icons.some(icon => icon.sizes === "192x192"));
  assert.ok(manifest.icons.some(icon => icon.sizes === "512x512" && icon.purpose === "maskable"));
});

test("layout advertises the manifest, Apple mode and covered viewport", async () => {
  const source = await readFile(new URL("app/layout.tsx", root), "utf8");
  assert.match(source, /manifest:\s*["']\/manifest\.webmanifest["']/);
  assert.match(source, /appleWebApp/);
  assert.match(source, /viewportFit:\s*["']cover["']/);
});
```

- [ ] **Step 2: Run the metadata test to verify RED**

Run:

```powershell
node --test tests/pwa-metadata.test.mjs
```

Expected: FAIL because `public/manifest.webmanifest` does not exist.

- [ ] **Step 3: Add deterministic icon generation**

Add `sharp` as a direct development dependency and create `scripts/generate-pwa-icons.mjs` using this exact visual source:

```js
import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const output = new URL("../public/icons/", import.meta.url);
await mkdir(output, { recursive: true });

function iconSvg(size, inset = 0) {
  const pad = Math.round(size * inset);
  const inner = size - pad * 2;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#df70b7"/><stop offset="1" stop-color="#ff7c73"/></linearGradient></defs>
    <rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="#0b1218"/>
    <circle cx="${size * 0.73}" cy="${size * 0.22}" r="${size * 0.24}" fill="url(#g)" opacity=".42"/>
    <rect x="${pad}" y="${pad}" width="${inner}" height="${inner}" rx="${Math.round(inner * 0.2)}" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="${Math.max(2, size * 0.008)}"/>
    <text x="50%" y="56%" text-anchor="middle" fill="#f7f2ef" font-family="Georgia,serif" font-size="${size * 0.43}" letter-spacing="-${size * 0.03}">S</text>
    <circle cx="${size * 0.67}" cy="${size * 0.7}" r="${size * 0.035}" fill="#ff7c73"/>
  </svg>`);
}

await sharp(iconSvg(192)).png().toFile(new URL("stylishme-192.png", output));
await sharp(iconSvg(512)).png().toFile(new URL("stylishme-512.png", output));
await sharp(iconSvg(512, 0.1)).png().toFile(new URL("stylishme-maskable-512.png", output));
```

Add the script:

```json
"icons:pwa": "node scripts/generate-pwa-icons.mjs"
```

Run:

```powershell
npm install --save-dev sharp@0.34.5
npm run icons:pwa
```

Expected: all three PNG files exist with their declared pixel sizes.

- [ ] **Step 4: Add the manifest and layout metadata**

Create `public/manifest.webmanifest` with name `StylishMe Namibia`, short name `StylishMe`, start/scope `/`, standalone display, portrait-primary orientation, brand background/theme colours, and the generated icon declarations. Update `app/layout.tsx` to export:

```ts
import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b1218",
};
```

Extend generated metadata with:

```ts
applicationName: "StylishMe",
manifest: "/manifest.webmanifest",
appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "StylishMe" },
icons: {
  icon: [{ url: "/icons/stylishme-192.png", sizes: "192x192", type: "image/png" }],
  apple: [{ url: "/icons/stylishme-192.png", sizes: "192x192", type: "image/png" }],
},
```

- [ ] **Step 5: Run tests and commit**

Run:

```powershell
node --test tests/pwa-metadata.test.mjs
npm test
npm run lint
git diff --check
```

Expected: metadata tests and all existing tests pass; lint and diff checks are clean.

Commit:

```powershell
git add app/layout.tsx public/manifest.webmanifest public/icons scripts/generate-pwa-icons.mjs tests/pwa-metadata.test.mjs package.json package-lock.json
git commit -m "Add installable StylishMe PWA metadata"
```

---

### Task 3: Replace the Phone Mockup with the Full-Viewport App Shell

**Files:**
- Modify: `app/StylishMeApp.tsx`
- Modify: `app/globals.css`
- Modify: `tests/rendered-html.test.mjs`
- Modify: `tests/stylishme-interactions.test.mjs`

**Interfaces:**
- Consumes: the existing `site-stage`, content, bottom navigation, sheets, sticky action, and story viewer structure.
- Produces: `.app-shell`, a fake-status-bar-free DOM, `100dvh` sizing, safe-area layout, full-screen stories, and responsive internal content widths.

- [ ] **Step 1: Write failing shell assertions**

Add behavior assertions to `tests/rendered-html.test.mjs`:

```js
test("renders a borderless app shell without a fake device status bar", async () => {
  const source = await readFile(new URL("../app/StylishMeApp.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.doesNotMatch(source, /className="phone-shell"/);
  assert.doesNotMatch(source, /className="status-bar"/);
  assert.match(source, /className="app-shell"/);
  assert.match(css, /min-height:\s*100dvh/);
  assert.match(css, /env\(safe-area-inset-top\)/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
});
```

- [ ] **Step 2: Run the test to verify RED**

Run:

```powershell
node --import tsx --import ./tests/dom-setup.mjs --test tests/rendered-html.test.mjs
```

Expected: FAIL because `phone-shell` and `status-bar` still render.

- [ ] **Step 3: Replace the rendered shell**

In `app/StylishMeApp.tsx`, replace the outer mockup with:

```tsx
<main className={`site-stage ${dataLight ? "data-light" : ""}`}>
  <div
    className="app-shell"
    inert={activeStoryId !== null}
    aria-hidden={activeStoryId ? true : undefined}
  >
    <div className="screen-content">{content}</div>
    {!['product', 'checkout', 'confirmation'].includes(view) && (
      <nav className="bottom-nav">
        {mainTabs.map(([label, target, icon]) => {
          const active = isMainTabActive(target);
          return (
            <button
              key={target}
              onClick={() => {
                if (target === 'outfits') setSavedOutfitMode(false);
                navigate(target);
              }}
              className={active ? 'active' : ''}
              aria-current={active ? 'page' : undefined}
            >
              <i><Icon name={icon} />{target === 'cart' && cartCount ? <b>{cartCount}</b> : null}</i>
              <span>{label}</span>
            </button>
          );
        })}
      </nav>
    )}
  </div>
  {activeStoryId && <OutfitStoryViewer key={activeStoryId} stories={OUTFIT_STORIES} outfits={OUTFITS} products={storyProducts} initialStoryId={activeStoryId} restoreFocusTo={storyTriggerRef.current} savedOutfitIds={savedOutfits} onSave={toggleSavedOutfit} onAddAll={addOutfitToCart} onViewOutfit={openOutfit} onClose={() => setActiveStoryId(null)} />}
</main>
```

Keep the existing filter sheet, outfit-size sheet, and live-region toast as siblings after the story viewer; their behavior and props remain unchanged.

Delete the fake time/network status-bar element entirely.

- [ ] **Step 4: Implement full-viewport and safe-area CSS**

Replace the device-frame rules with these layout invariants:

```css
html,
body {
  min-height: 100%;
  min-height: 100dvh;
}

body {
  overscroll-behavior-y: none;
}

.site-stage,
.app-shell {
  min-height: 100vh;
  min-height: 100dvh;
}

.site-stage {
  padding: 0;
  background: var(--canvas);
}

.app-shell {
  position: relative;
  width: 100%;
  overflow: clip;
  isolation: isolate;
  color: var(--ink);
  background: radial-gradient(circle at 12% 0%, rgba(51, 96, 120, 0.24), transparent 23rem), linear-gradient(170deg, #111a21 0%, #0b1319 48%, #0b1117 100%);
}

.screen-content {
  width: min(100%, 960px);
  min-height: 100dvh;
  margin: 0 auto;
  padding: max(10px, env(safe-area-inset-top)) 15px calc(98px + env(safe-area-inset-bottom));
}
```

Make `.story-viewer` use `inset: 0`, `width: 100%`, `border: 0`, `border-radius: 0`, `box-shadow: none`, and `transform: none` at every viewport. Remove the desktop rule that lifts fixed navigation/sticky actions by 26px. Keep bottom navigation and sticky actions centered with a readable maximum width but without any outer device frame.

- [ ] **Step 5: Run mounted and shell tests**

Run:

```powershell
node --import tsx --import ./tests/dom-setup.mjs --test tests/rendered-html.test.mjs tests/stylishme-interactions.test.mjs
npm test
npm run lint
git diff --check
```

Expected: shell assertions pass, mounted interactions remain green, and no quality check fails.

- [ ] **Step 6: Commit the full-viewport shell**

```powershell
git add app/StylishMeApp.tsx app/globals.css tests/rendered-html.test.mjs tests/stylishme-interactions.test.mjs
git commit -m "Remove StylishMe phone mockup shell"
```

---

### Task 4: Add a Commerce-Safe Offline Service Worker

**Files:**
- Create: `app/PwaRegistration.tsx`
- Modify: `app/layout.tsx`
- Create: `public/sw.js`
- Create: `public/offline.html`
- Create: `tests/pwa-service-worker.test.mjs`

**Interfaces:**
- Consumes: browser `navigator.serviceWorker`, same-origin fetch requests, manifest/icons from Task 2.
- Produces: one service-worker registration, offline navigation fallback, versioned static caching, and explicit network-only treatment for `/api/` and all non-GET requests.

- [ ] **Step 1: Write the failing worker-policy tests**

Create `tests/pwa-service-worker.test.mjs` that evaluates the production worker and asserts its request boundaries:

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");

function loadWorker({ fetchImpl = fetch, matchImpl = async () => undefined } = {}) {
  const listeners = {};
  const context = {
    URL,
    Request,
    Response,
    fetch: fetchImpl,
    caches: {
      open: async () => ({ addAll: async () => undefined, put: async () => undefined }),
      keys: async () => [],
      delete: async () => true,
      match: matchImpl,
    },
    self: {
      location: { origin: "https://stylishme.test" },
      addEventListener(type, callback) { listeners[type] = callback; },
      skipWaiting() {},
      clients: { claim() {} },
    },
  };
  vm.runInNewContext(source, context, { filename: "public/sw.js" });
  return listeners.fetch;
}

test("does not intercept commerce API requests", async () => {
  const fetchHandler = loadWorker();
  let responded = false;
  fetchHandler({
    request: new Request("https://stylishme.test/api/state"),
    respondWith() { responded = true; },
  });
  assert.equal(responded, false);
});

test("does not intercept non-GET mutations", async () => {
  const fetchHandler = loadWorker();
  let responded = false;
  fetchHandler({
    request: new Request("https://stylishme.test/checkout", { method: "POST" }),
    respondWith() { responded = true; },
  });
  assert.equal(responded, false);
});

test("falls back to the branded offline document for failed navigation", async () => {
  const offline = new Response("offline", { status: 200 });
  const fetchHandler = loadWorker({
    fetchImpl: async () => { throw new Error("offline"); },
    matchImpl: async key => key === "/offline.html" ? offline : undefined,
  });
  let responsePromise;
  fetchHandler({
    request: { url: "https://stylishme.test/shop", method: "GET", mode: "navigate" },
    respondWith(value) { responsePromise = value; },
  });
  assert.equal(await responsePromise, offline);
});
```

- [ ] **Step 2: Run worker tests to verify RED**

Run:

```powershell
node --test tests/pwa-service-worker.test.mjs
```

Expected: FAIL because `public/sw.js` does not exist.

- [ ] **Step 3: Implement the service worker**

Create `public/sw.js` with these exact boundaries:

```js
const CACHE_NAME = "stylishme-static-v1";
const OFFLINE_URL = "/offline.html";
const CORE_ASSETS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/stylishme-192.png",
  "/icons/stylishme-512.png",
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (!response || !response.ok) return response;
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      return response;
    })),
  );
});
```

Create a self-contained `public/offline.html` using the StylishMe dark palette and the message: “You’re offline. Live prices, stock and checkout need a connection. Reconnect and try again.” Include a Retry button that calls `location.reload()`.

- [ ] **Step 4: Register the worker from the client**

Create `app/PwaRegistration.tsx`:

```tsx
"use client";

import { useEffect } from "react";

export function PwaRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const register = () => navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);
  return null;
}
```

Render `<PwaRegistration />` inside `app/layout.tsx` after `{children}`.

Extend the `test` script in `package.json` so the authoritative command includes `tests/pwa-metadata.test.mjs` and `tests/pwa-service-worker.test.mjs` after the five existing test files.

- [ ] **Step 5: Run worker, metadata and full tests**

Run:

```powershell
node --test tests/pwa-service-worker.test.mjs tests/pwa-metadata.test.mjs
npm test
npm run lint
$env:WRANGLER_LOG_PATH='.wrangler/wrangler.log'; .\node_modules\.bin\vinext.cmd build
git diff --check
```

Expected: worker-policy tests pass, all existing tests pass, ESLint exits 0, and the production build completes.

- [ ] **Step 6: Commit offline support**

```powershell
git add app/PwaRegistration.tsx app/layout.tsx public/sw.js public/offline.html tests/pwa-service-worker.test.mjs
git commit -m "Add safe offline shell for StylishMe PWA"
```

---

### Task 5: Final Verification, Integration and Private Production Deployment

**Files:**
- Modify only if verification reveals a specific defect.

**Interfaces:**
- Consumes: the complete verified feature branch and `.openai/hosting.json` project identity.
- Produces: an integrated, privately deployed StylishMe PWA version at the existing production URL.

- [ ] **Step 1: Run the complete release gate fresh**

Run:

```powershell
npm test
node --test tests/pwa-metadata.test.mjs tests/pwa-service-worker.test.mjs
npm run lint
$env:WRANGLER_LOG_PATH='.wrangler/wrangler.log'; .\node_modules\.bin\vinext.cmd build
git diff --check
git status --short
```

Expected: every test passes, lint/build exit 0, diff check is silent, and the worktree is clean.

- [ ] **Step 2: Request a whole-branch code review**

Review from base `2bc31f9` to the new HEAD against both the outfit-stories design and `docs/superpowers/specs/2026-07-19-stylishme-pwa-shell-design.md`. Fix every Critical or Important finding with a failing regression test, rerun Step 1, and request re-review until both requirements and regression-safety verdicts pass.

- [ ] **Step 3: Use the development-branch finishing workflow**

Offer the required four integration choices. For local merge, merge `codex/outfit-stories` into `main`, rerun Step 1 in the main checkout, then remove the owned `.worktrees/outfit-stories` worktree and delete the merged feature branch.

- [ ] **Step 4: Push, package and deploy the exact verified main commit**

Obtain a fresh ChatGPT Sites source credential, push the exact `git rev-parse HEAD` to the Sites `main` branch, package the successful `dist` output with the Sites packaging helper, save a new site version for that SHA, and deploy it with the existing private owner-only access policy.

- [ ] **Step 5: Verify production in phone and desktop viewports**

Using the in-app browser, verify:

1. No phone frame, fake status bar, rounded device border, or device shadow at either viewport.
2. Home, Shop, Outfits, Cart, and Profile remain usable with safe fixed navigation.
3. Stories are edge-to-edge and one Story → size selection → Cart journey succeeds.
4. `/manifest.webmanifest`, `/sw.js`, install icons, and worker registration load in production.
5. The offline document is available and does not expose stale commerce values.
6. Desktop layout remains borderless and responsive rather than a centered phone mockup.

- [ ] **Step 6: Report the production URL and verified limitations**

Report the existing StylishMe URL, deployment status, commit SHA, test/build evidence, and that this deliverable is an installable PWA rather than an App Store/Google Play native package.
