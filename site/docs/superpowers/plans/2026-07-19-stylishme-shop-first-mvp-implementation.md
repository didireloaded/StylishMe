# StylishMe Shop-First MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the current StylishMe PWA into a shopping-first experience with Home, Shop, Try On, Wishlist, and Profile navigation, a persistent cart shortcut, a commerce-connected AI try-on beta, and truthful failure behavior when AI is unavailable.

**Architecture:** Preserve the existing catalogue, outfit stories, stock-safe cart, D1 state, and editorial styling. Extract try-on rules into a pure TypeScript domain module, render the workflow in a focused component, and call OpenAI only through an authenticated server route. The first release processes one image edit synchronously and does not persist source photos; later releases add private object storage and durable background jobs.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.9, OpenAI JavaScript SDK, Drizzle/D1, Testing Library, Node test runner, Tailwind/CSS, ChatGPT Sites PWA.

## Global Constraints

- StylishMe remains an online clothing shop first and functions when AI is disabled or unavailable.
- Primary navigation is exactly Home, Shop, Try On, Wishlist, Profile.
- Cart remains available through a top-right icon with a quantity badge.
- AI recommendations and results link only to real products from `app/product-catalog.ts`.
- Use `OPENAI_IMAGE_MODEL=gpt-image-2` as the configurable default.
- With `gpt-image-2`, omit `input_fidelity`; the model applies high fidelity automatically.
- Use portrait output `1024x1536` and medium quality for the MVP.
- Never expose `OPENAI_API_KEY` to client code or logs.
- Never store source photos in the first release; forward them server-side and discard request bytes after the response.
- Never display fake percentages, fake fit guarantees, fake payments, or fake inventory.
- Tests must be written and observed failing before implementation code.

---

## File Structure

- `app/try-on-domain.ts` — pure consent, file, workflow, status, prompt, and API-response rules.
- `app/TryOnView.tsx` — mobile-first try-on flow and result commerce actions.
- `app/api/try-on/route.ts` — authenticated validation, moderation, and OpenAI image edit.
- `app/StylishMeApp.tsx` — navigation orchestration, home merchandising, persistent cart, and try-on entry points.
- `app/globals.css` — storefront hierarchy and try-on styling.
- `tests/try-on-domain.test.mjs` — pure rule coverage.
- `tests/try-on-view.test.mjs` — customer workflow coverage.
- `tests/stylishme-interactions.test.mjs` — navigation, cart, and integration behavior.
- `tests/rendered-html.test.mjs` — static contract checks.
- `package.json` / `package-lock.json` — OpenAI SDK and test command.
- `.env.example` — public documentation of required non-secret variables.

---

### Task 1: Try-On Domain Rules

**Files:**
- Create: `app/try-on-domain.ts`
- Create: `tests/try-on-domain.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `TRY_ON_DISCLAIMER`, `TRY_ON_CONSENT_VERSION`, `TRY_ON_MAX_BYTES`, `TryOnJobStatus`, `TryOnConsent`, `TryOnSettings`, `validateTryOnConsent(consent)`, `validateTryOnFile(meta)`, `progressMessage(status)`, `buildTryOnPrompt(settings)`, and `parseTryOnResponse(value)`.
- Consumes: no application state.

- [x] **Step 1: Write failing domain tests**

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTryOnPrompt,
  parseTryOnResponse,
  progressMessage,
  validateTryOnConsent,
  validateTryOnFile,
} from "../app/try-on-domain.ts";

test("requires every consent statement", () => {
  assert.equal(validateTryOnConsent({ ownsImage: true, understandsAi: true, acceptsPrivacy: false, confirmsAdult: true }).ok, false);
  assert.equal(validateTryOnConsent({ ownsImage: true, understandsAi: true, acceptsPrivacy: true, confirmsAdult: true }).ok, true);
});

test("accepts only supported image files within the limit", () => {
  assert.equal(validateTryOnFile({ name: "me.jpg", type: "image/jpeg", size: 2_000_000 }).ok, true);
  assert.match(validateTryOnFile({ name: "me.pdf", type: "application/pdf", size: 10 }).message, /JPG, PNG, or WebP/);
  assert.match(validateTryOnFile({ name: "me.png", type: "image/png", size: 15_000_000 }).message, /10 MB/);
});

test("builds a controlled identity-preserving prompt", () => {
  const prompt = buildTryOnPrompt({ transfer: "outfit-and-shoes", background: "preserve", styling: "natural" });
  assert.match(prompt, /Preserve the identity/);
  assert.match(prompt, /Do not reshape/);
  assert.match(prompt, /outfit and shoes/);
});

test("maps job states to meaningful messages", () => {
  assert.equal(progressMessage("validating"), "Checking your images");
  assert.equal(progressMessage("generating"), "Creating your preview");
});

test("parses only complete image responses", () => {
  assert.deepEqual(parseTryOnResponse({ imageBase64: "abc", mimeType: "image/png", model: "gpt-image-2" }), {
    imageBase64: "abc", mimeType: "image/png", model: "gpt-image-2",
  });
  assert.equal(parseTryOnResponse({ imageBase64: "" }), null);
});
```

- [x] **Step 2: Run the test and verify RED**

Run: `node --import tsx --test tests/try-on-domain.test.mjs`  
Expected: FAIL because `app/try-on-domain.ts` does not exist.

- [x] **Step 3: Implement the pure domain module**

```ts
export const TRY_ON_DISCLAIMER = "This is a visual style preview. It does not guarantee exact sizing, tailoring, material behaviour, or real-world fit.";
export const TRY_ON_CONSENT_VERSION = "2026-07-19";
export const TRY_ON_MAX_BYTES = 10 * 1024 * 1024;

export type TryOnJobStatus = "queued" | "validating" | "moderation_failed" | "preparing" | "generating" | "completed" | "failed" | "cancelled" | "deleted";
export type TryOnConsent = { ownsImage: boolean; understandsAi: boolean; acceptsPrivacy: boolean; confirmsAdult: boolean };
export type TryOnSettings = { transfer: "outfit-only" | "outfit-and-shoes" | "complete-look"; background: "preserve" | "studio"; styling: "natural" };

export function validateTryOnConsent(consent: TryOnConsent) {
  return Object.values(consent).every(Boolean)
    ? { ok: true as const, message: "" }
    : { ok: false as const, message: "Confirm every consent statement to continue." };
}

export function validateTryOnFile(file: Pick<File, "name" | "type" | "size">) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return { ok: false as const, message: "Choose a JPG, PNG, or WebP image." };
  if (!file.size || file.size > TRY_ON_MAX_BYTES) return { ok: false as const, message: "Choose an image smaller than 10 MB." };
  return { ok: true as const, message: "Photo ready" };
}

export function progressMessage(status: TryOnJobStatus) {
  return ({ validating: "Checking your images", preparing: "Preparing the outfit", generating: "Creating your preview", completed: "Finishing the details" } as Partial<Record<TryOnJobStatus, string>>)[status] ?? "Preparing your preview";
}

export function buildTryOnPrompt(settings: TryOnSettings) {
  const transfer = settings.transfer === "outfit-only" ? "outfit only" : settings.transfer === "outfit-and-shoes" ? "outfit and shoes" : "complete look";
  const background = settings.background === "studio" ? "Use a clean, understated studio background." : "Preserve the original background.";
  return `Create a photorealistic full-length fashion preview. Preserve the identity, face, skin tone, hairstyle, age appearance, body proportions, pose, and recognizable appearance of the person in the first image. Transfer the ${transfer} from the second image. Do not copy the reference person's identity, face, body, or pose. Do not reshape the user's body or change facial structure. ${background} Use natural styling and realistic lighting. Do not add unrelated text, logos, people, clothing, or accessories.`;
}

export function parseTryOnResponse(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const response = value as Record<string, unknown>;
  if (typeof response.imageBase64 !== "string" || !response.imageBase64 || typeof response.mimeType !== "string" || typeof response.model !== "string") return null;
  return { imageBase64: response.imageBase64, mimeType: response.mimeType, model: response.model };
}
```

- [x] **Step 4: Add the test to `npm test` and verify GREEN**

Run: `node --import tsx --test tests/try-on-domain.test.mjs`  
Expected: 5 tests pass.

- [x] **Step 5: Commit**

```powershell
git add app/try-on-domain.ts tests/try-on-domain.test.mjs package.json
git commit -m "Add secure try-on domain rules"
```

### Task 2: Shop-First Navigation and Persistent Cart

**Files:**
- Modify: `tests/rendered-html.test.mjs`
- Modify: `tests/stylishme-interactions.test.mjs`
- Modify: `app/StylishMeApp.tsx`

**Interfaces:**
- Consumes: existing `navigate`, `cartCount`, `wishlist`, and `profileViews` state.
- Produces: bottom tabs Home/Shop/Try On/Wishlist/Profile and a top cart button on main customer views.

- [x] **Step 1: Update static and rendered tests first**

Change the expected tab contract to:

```js
assert.deepEqual(mainTabs, [
  ["Home", "home", "home"],
  ["Shop", "shop", "shop"],
  ["Try On", "try-on", "sparkles"],
  ["Wishlist", "wishlist", "heart"],
  ["Profile", "profile", "profile"],
]);
assert.doesNotMatch(tabsSource[1], /"Cart", "cart"/);
assert.match(app, /aria-label={`Open cart, \${cartCount} items`}/);
```

Update interaction helpers that used `openMainTab("Cart")` or `openMainTab("Outfits")` to use the persistent `Open cart` control or the Shop the Look/home entry point.

- [x] **Step 2: Run the focused tests and verify RED**

Run: `node --import tsx --import ./tests/dom-setup.mjs --test tests/rendered-html.test.mjs tests/stylishme-interactions.test.mjs`  
Expected: FAIL showing the old Outfits and Cart tab contract.

- [x] **Step 3: Add `try-on` to `View`, update profile groups, and replace `mainTabs`**

```ts
const mainTabs: Array<[string, View, string]> = [
  ["Home", "home", "home"],
  ["Shop", "shop", "shop"],
  ["Try On", "try-on", "sparkles"],
  ["Wishlist", "wishlist", "heart"],
  ["Profile", "profile", "profile"],
];
```

Render a cart control in the shared brand/page header:

```tsx
<button className="circle-btn" onClick={() => navigate("cart")} aria-label={`Open cart, ${cartCount} items`}>
  <Icon name="bag" />
  {cartCount ? <i>{cartCount}</i> : null}
</button>
```

Do not show a duplicate cart button inside the cart, checkout, confirmation, or try-on result toolbar.

- [x] **Step 4: Run focused tests and verify GREEN**

Run: `node --import tsx --import ./tests/dom-setup.mjs --test tests/rendered-html.test.mjs tests/stylishme-interactions.test.mjs`  
Expected: all focused tests pass.

- [x] **Step 5: Commit**

```powershell
git add app/StylishMeApp.tsx tests/rendered-html.test.mjs tests/stylishme-interactions.test.mjs
git commit -m "Make StylishMe navigation shop first"
```

### Task 3: Product-First Home Merchandising

**Files:**
- Modify: `tests/rendered-html.test.mjs`
- Modify: `tests/stylishme-interactions.test.mjs`
- Modify: `app/StylishMeApp.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `products`, `OUTFITS`, `OUTFIT_STORIES`, `designerSummaries`, `openProduct`, `openDesigner`, `openOutfit`, `navigate`.
- Produces: labelled home sections in the approved order and a Try On promotional card that routes to `try-on`.

- [x] **Step 1: Write the failing home hierarchy test**

```js
test("home prioritises products and places try-on after designer discovery", async () => {
  await renderApp();
  const headings = screen.getAllByRole("heading").map((node) => node.textContent);
  assert.ok(headings.indexOf("New arrivals") < headings.indexOf("Shop the Look"));
  assert.ok(headings.indexOf("Designer spotlight") < headings.indexOf("See it on you"));
  fireEvent.click(screen.getByRole("button", { name: "Try an Outfit" }));
  assert.equal(within(screen.getByRole("navigation")).getByRole("button", { name: "Try On" }).getAttribute("aria-current"), "page");
});
```

- [x] **Step 2: Run the interaction test and verify RED**

Run: `node --import tsx --import ./tests/dom-setup.mjs --test tests/stylishme-interactions.test.mjs`  
Expected: FAIL because the approved sections and Try an Outfit action do not exist.

- [x] **Step 3: Recompose the home branch**

Retain the outfit story row, then render:

```tsx
<section className="section-block" aria-labelledby="new-arrivals-title">
  <div className="section-heading"><h2 id="new-arrivals-title">New arrivals</h2><button onClick={() => navigate("shop")}>View all</button></div>
  <div className="product-grid compact">{products.slice(0, 4).map((product) => <ProductCard key={product.id} product={product} open={() => openProduct(product.id, "home")} saved={wishlist.includes(product.id)} toggle={() => toggleWishlist(product.id)} />)}</div>
</section>
<section className="category-edit" aria-labelledby="shop-category-title">
  <div className="section-heading"><h2 id="shop-category-title">Shop by category</h2></div>
  <div className="category-grid">{["Women", "Men", "Shoes", "Accessories"].map((item) => <button key={item} onClick={() => { setCategory(item); navigate("shop"); }}>{item}</button>)}</div>
</section>
<section className="look-edit" aria-labelledby="shop-look-title">
  <div className="section-heading"><h2 id="shop-look-title">Shop the Look</h2><button onClick={() => openOutfit(OUTFITS[0].id)}>View looks</button></div>
  <button className="look-card" onClick={() => openOutfit(OUTFITS[0].id)}><img src={OUTFITS[0].image} alt="" /><div><small>{OUTFITS[0].location}</small><h2>{OUTFITS[0].title}</h2><p>{OUTFITS[0].note}</p></div></button>
</section>
<section className="location-edit" aria-labelledby="near-you-title">
  <div className="section-heading"><h2 id="near-you-title">Available Near You</h2></div>
  <div className="product-row">{products.filter((product) => product.location === profile.city).slice(0, 3).map((product) => <ProductCard key={product.id} product={product} open={() => openProduct(product.id, "home")} saved={wishlist.includes(product.id)} toggle={() => toggleWishlist(product.id)} />)}</div>
</section>
<section className="made-local-edit" aria-labelledby="made-local-title">
  <div><small>LOCAL CRAFT</small><h2 id="made-local-title">Made in Namibia</h2><p>Discover pieces designed and made across Namibia.</p><button onClick={() => { setShopFilters((current) => ({ ...current, location: "Windhoek" })); navigate("shop"); }}>Explore local fashion</button></div>
  <img src={products[4].image} alt="Namibian fashion edit" />
</section>
<section className="section-block" aria-labelledby="trending-title">
  <div className="section-heading"><h2 id="trending-title">Trending products</h2></div>
  <div className="product-row">{products.slice(4, 8).map((product) => <ProductCard key={product.id} product={product} open={() => openProduct(product.id, "home")} saved={wishlist.includes(product.id)} toggle={() => toggleWishlist(product.id)} />)}</div>
</section>
<section className="designer-edit" aria-labelledby="designer-spotlight-title">
  <div className="section-heading"><h2 id="designer-spotlight-title">Designer spotlight</h2></div>
  <button onClick={() => openDesigner("Omutima Studio", "home")}><img src={designerSummaries["Omutima Studio"].image} alt="" /><span><small>WINDHOEK</small><strong>Omutima Studio</strong><b>View catalogue</b></span></button>
</section>
<section className="try-on-promo" aria-labelledby="try-on-promo-title">
  <small>AI OUTFIT PREVIEW</small>
  <h2 id="try-on-promo-title">See it on you</h2>
  <p>Upload a full-length photo and preview selected outfits before choosing your size.</p>
  <button className="gradient-button" onClick={() => navigate("try-on")}>Try an Outfit</button>
</section>
<section className="section-block" aria-labelledby="recommended-title">
  <div className="section-heading"><h2 id="recommended-title">Recommended for you</h2></div>
  <div className="product-grid compact">{products.slice(8, 12).map((product) => <ProductCard key={product.id} product={product} open={() => openProduct(product.id, "home")} saved={wishlist.includes(product.id)} toggle={() => toggleWishlist(product.id)} />)}</div>
</section>
<section className="section-block" aria-labelledby="recent-title">
  <div className="section-heading"><h2 id="recent-title">Recently viewed</h2></div>
  <div className="product-row">{products.filter((product) => [selectedId, "p2", "p3"].includes(product.id)).map((product) => <ProductCard key={product.id} product={product} open={() => openProduct(product.id, "home")} saved={wishlist.includes(product.id)} toggle={() => toggleWishlist(product.id)} />)}</div>
</section>
```

Use actual catalogue subsets and current callbacks. No home control may be inert.

- [x] **Step 4: Add distinct responsive layouts**

Define `.category-edit`, `.look-edit`, `.location-edit`, `.made-local-edit`, `.designer-edit`, and `.try-on-promo` so sections alternate between grids, editorial image cards, and horizontal product rows. Preserve the 960px desktop content maximum and safe-area padding.

- [x] **Step 5: Run focused tests and verify GREEN**

Run: `node --import tsx --import ./tests/dom-setup.mjs --test tests/rendered-html.test.mjs tests/stylishme-interactions.test.mjs`  
Expected: all focused tests pass.

- [x] **Step 6: Commit**

```powershell
git add app/StylishMeApp.tsx app/globals.css tests/rendered-html.test.mjs tests/stylishme-interactions.test.mjs
git commit -m "Prioritize shopping on the StylishMe home"
```

### Task 4: Try-On Customer Workflow

**Files:**
- Create: `app/TryOnView.tsx`
- Create: `tests/try-on-view.test.mjs`
- Modify: `app/StylishMeApp.tsx`
- Modify: `app/globals.css`
- Modify: `package.json`

**Interfaces:**
- Consumes: `Product[]`, selected product/look IDs, `onAddProduct`, `onAddOutfit`, and `/api/try-on`.
- Produces: `TryOnView` with `onOpenProduct(productId)`, `onOpenCart()`, and one-result preview state.

- [x] **Step 1: Write failing consent and unavailable-service tests**

```js
test("try-on blocks photo selection until consent is complete", async () => {
  renderTryOn();
  fireEvent.click(screen.getByRole("button", { name: "Start Try-On" }));
  assert.equal(screen.getByRole("button", { name: "Continue to photo" }).disabled, true);
  for (const name of [/my image/, /AI-generated/, /privacy/, /18 or older/]) fireEvent.click(screen.getByRole("checkbox", { name }));
  assert.equal(screen.getByRole("button", { name: "Continue to photo" }).disabled, false);
});

test("try-on reports provider unavailability without blocking shopping", async () => {
  installTryOnFetch({ ok: false, status: 503, body: { error: { code: "TRY_ON_UNAVAILABLE", message: "Try-on is temporarily unavailable. Shopping is still open." } } });
  await reachReviewWithValidPhoto();
  fireEvent.click(screen.getByRole("button", { name: "Create Preview" }));
  assert.ok(await screen.findByText("Try-on is temporarily unavailable. Shopping is still open."));
  assert.ok(screen.getByRole("button", { name: "Continue shopping" }));
});
```

- [x] **Step 2: Run the view test and verify RED**

Run: `node --import tsx --import ./tests/dom-setup.mjs --test tests/try-on-view.test.mjs`  
Expected: FAIL because `TryOnView` does not exist.

- [x] **Step 3: Implement `TryOnView`**

Use explicit screens `intro`, `consent`, `photo`, `source`, `settings`, `review`, `generating`, and `result`. Store the selected `File` only in component state and clear it on reset/unmount.

The upload input must be:

```tsx
<input
  ref={fileInputRef}
  type="file"
  accept="image/jpeg,image/png,image/webp"
  capture="environment"
  onChange={handlePhoto}
/>
```

Submit with `FormData` containing `person`, `referenceUrl` or `reference`, `productIds`, `settings`, `consentVersion`, and `consentedAt`. While awaiting the server response, show `progressMessage(status)` without a percentage.

On success, render the result as:

```tsx
<section className="try-on-result" aria-labelledby="try-on-result-title">
  <small>AI-GENERATED OUTFIT PREVIEW</small>
  <h1 id="try-on-result-title">Your preview is ready</h1>
  <div className="try-on-comparison">
    <img src={sourcePreviewUrl} alt="Original upload" />
    <img src={`data:${result.mimeType};base64,${result.imageBase64}`} alt="AI-generated outfit preview" />
  </div>
  <p>{TRY_ON_DISCLAIMER}</p>
  <div className="try-on-products">
    {selectedProducts.map((product) => <button key={product.id} onClick={() => onOpenProduct(product.id)}><img src={product.image} alt="" /><span><strong>{product.name}</strong><small>{money(product.price)}</small></span></button>)}
  </div>
  <button onClick={onAddOutfit}>Add full look to cart</button>
  <button onClick={reset}>Try another outfit</button>
  <button onClick={deleteResult}>Delete preview</button>
</section>
```

Delete clears the base64 result and revokes all object URLs.

- [x] **Step 4: Route product, outfit, and home Try On actions into the component**

Render `TryOnView` from the `try-on` branch. Add “Try On” to product details and the selected outfit view. Pass only real catalogue product IDs.

- [x] **Step 5: Add responsive try-on styling**

Style consent rows, full-body guidance, product/source cards, settings, job state, comparison, result products, and error recovery. Keep primary actions large enough for touch and ensure selected states do not rely only on colour.

- [x] **Step 6: Run view and interaction tests and verify GREEN**

Run: `node --import tsx --import ./tests/dom-setup.mjs --test tests/try-on-view.test.mjs tests/stylishme-interactions.test.mjs`  
Expected: all focused tests pass.

- [x] **Step 7: Commit**

```powershell
git add app/TryOnView.tsx app/StylishMeApp.tsx app/globals.css tests/try-on-view.test.mjs tests/stylishme-interactions.test.mjs package.json
git commit -m "Add the StylishMe try-on customer journey"
```

### Task 5: Server-Side OpenAI Image Edit

**Files:**
- Create: `app/api/try-on/route.ts`
- Create: `tests/try-on-api.test.mjs`
- Create: `.env.example`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: authenticated user from `getChatGPTUser()`, multipart fields from `TryOnView`, `OPENAI_API_KEY`, and optional `OPENAI_IMAGE_MODEL`.
- Produces: `POST /api/try-on` returning `{ imageBase64, mimeType, model }` or `{ error: { code, message } }`.

- [x] **Step 1: Install the official SDK**

Run: `npm install openai`  
Expected: `openai` appears in dependencies and the lockfile updates.

- [x] **Step 2: Write failing route contract tests**

Test extracted exported helpers rather than a live API call:

```js
import { buildModerationInput, validateTryOnForm } from "../app/api/try-on/route.ts";

test("route rejects missing consent before provider calls", async () => {
  const data = new FormData();
  data.set("person", new File([new Uint8Array(50)], "me.png", { type: "image/png" }));
  assert.equal(validateTryOnForm(data).error.code, "CONSENT_REQUIRED");
});

test("moderation receives both image inputs", () => {
  const input = buildModerationInput("data:image/png;base64,one", "data:image/png;base64,two");
  assert.equal(input.filter((item) => item.type === "image_url").length, 2);
});
```

- [x] **Step 3: Run the route test and verify RED**

Run: `node --import tsx --test tests/try-on-api.test.mjs`  
Expected: FAIL because the route does not exist.

- [x] **Step 4: Implement validation and authentication**

`POST` must:

1. return `401 SIGN_IN_REQUIRED` when no authenticated user exists;
2. return `503 TRY_ON_UNAVAILABLE` when `OPENAI_API_KEY` is absent;
3. require current consent version and an ISO consent timestamp;
4. validate person/reference file type and size;
5. accept a remote reference only when it maps to a known catalogue product image;
6. rate-limit repeated requests per signed-in user in the current worker instance;
7. never log request bodies, image bytes, base64 output, or the API key.

- [x] **Step 5: Moderate inputs and call `images.edit`**

```ts
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const moderation = await client.moderations.create({
  model: "omni-moderation-latest",
  input: buildModerationInput(personDataUrl, referenceDataUrl),
});
if (moderation.results.some((result) => result.flagged)) {
  return errorResponse(422, "MODERATION_REJECTED", "We cannot create a preview from these images. Choose different photos and try again.");
}

const result = await client.images.edit({
  model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-2",
  image: [await toFile(personBytes, person.name, { type: person.type }), await toFile(referenceBytes, referenceName, { type: referenceType })],
  prompt: buildTryOnPrompt(settings),
  size: "1024x1536",
  quality: "medium",
  output_format: "jpeg",
  moderation: "auto",
});
```

Do not send `input_fidelity` for `gpt-image-2`. Return only the first base64 result, `image/jpeg`, and configured model. Convert provider, rate-limit, moderation, and malformed-response failures into calm typed errors.

- [x] **Step 6: Document non-secret configuration**

```dotenv
# Server-only OpenAI credential. Configure as a deployment secret.
OPENAI_API_KEY=
# Current image editing model. Defaults to gpt-image-2.
OPENAI_IMAGE_MODEL=gpt-image-2
```

- [x] **Step 7: Run route tests and verify GREEN**

Run: `node --import tsx --test tests/try-on-api.test.mjs`  
Expected: all route helper tests pass without calling OpenAI.

- [x] **Step 8: Commit**

```powershell
git add app/api/try-on/route.ts tests/try-on-api.test.mjs .env.example package.json package-lock.json
git commit -m "Connect try-on to server-side OpenAI editing"
```

### Task 6: Wishlist, Outfit, Profile, and Commerce Connections

**Files:**
- Modify: `tests/stylishme-interactions.test.mjs`
- Modify: `app/OutfitsView.tsx`
- Modify: `app/StylishMeApp.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: current wishlist, saved outfits, stock-safe cart functions, profile size, and Try On callbacks.
- Produces: complete looks in Wishlist, outfit item replacement, Try On from products/outfits, and Profile links to Style Me/Wardrobe without dead controls.

- [x] **Step 1: Write failing commerce-connection tests**

Cover:

```js
test("Wishlist is a main tab and includes saved looks", async () => {
  await renderApp({ cart: [], wishlist: ["p1"], orders: [], savedOutfits: ["weekend-windhoek"], profile: { city: "Windhoek", size: "M", shoe: "39", fit: "Regular" } });
  openMainTab("Wishlist");
  assert.ok(screen.getByRole("heading", { name: "Saved pieces" }));
  assert.ok(screen.getByRole("heading", { name: "Saved looks" }));
  assert.ok(screen.getByRole("button", { name: /Open Weekend in Windhoek/ }));
});

test("Shop the Look can replace one item without changing the rest", async () => {
  await renderApp();
  fireEvent.click(screen.getByRole("button", { name: /View looks/ }));
  const before = screen.getAllByRole("button", { name: /^Open .*$/ }).map((button) => button.getAttribute("aria-label"));
  fireEvent.click(screen.getAllByRole("button", { name: /^Replace / })[0]);
  const after = screen.getAllByRole("button", { name: /^Open .*$/ }).map((button) => button.getAttribute("aria-label"));
  assert.notEqual(after[0], before[0]);
  assert.deepEqual(after.slice(1), before.slice(1));
});

test("product Try On opens with the current product selected", async () => {
  await renderApp();
  openMainTab("Shop");
  fireEvent.click(screen.getByRole("button", { name: "Open Oversized Coral Hoodie" }));
  fireEvent.click(screen.getByRole("button", { name: "Try On Oversized Coral Hoodie" }));
  assert.equal(within(screen.getByRole("navigation")).getByRole("button", { name: "Try On" }).getAttribute("aria-current"), "page");
  assert.ok(screen.getByText("Oversized Coral Hoodie"));
});

test("try-on commerce action uses the stock-safe outfit cart path", async () => {
  await renderApp();
  fireEvent.click(screen.getByRole("button", { name: /View looks/ }));
  fireEvent.click(screen.getByRole("button", { name: "Add All to Cart" }));
  const sheet = await screen.findByRole("dialog", { name: "Choose outfit sizes" });
  for (const button of within(sheet).getAllByRole("button", { name: /^Select / }).filter((button) => !button.getAttribute("aria-pressed"))) fireEvent.click(button);
  fireEvent.click(within(sheet).getByRole("button", { name: "Add selected items" }));
  assert.ok(await screen.findByText(/Added [1-9]/));
});
```

- [x] **Step 2: Run the interaction tests and verify RED**

Run: `node --import tsx --import ./tests/dom-setup.mjs --test tests/stylishme-interactions.test.mjs`  
Expected: FAIL for each missing connection.

- [x] **Step 3: Extend `OutfitsView` with replacement and try-on callbacks**

Add:

```ts
onReplaceProduct: (outfitId: string, productId: string) => void;
onTryOn: (outfitId: string) => void;
```

Render a labelled Replace button per item and a “Try On This Look” action. In `StylishMeApp`, choose the first stocked product in the same category that is not already in the outfit and store replacements per outfit without mutating catalogue constants.

- [x] **Step 4: Unify saved products and looks in Wishlist**

Render two labelled groups: Saved pieces and Saved looks. Saved look actions open the outfit, try it on, add available pieces to cart, or remove it.

- [x] **Step 5: Add working Profile destinations**

Style Me opens Try On with the style-assistant intro selected. Wardrobe opens a clearly labelled foundation screen for saved pieces, looks, and past purchases. Do not present owned-item uploads, upload intelligence, packing, or calendar tools as complete.

- [x] **Step 6: Run interaction tests and verify GREEN**

Run: `node --import tsx --import ./tests/dom-setup.mjs --test tests/stylishme-interactions.test.mjs`  
Expected: all interaction tests pass.

- [x] **Step 7: Commit**

```powershell
git add app/OutfitsView.tsx app/StylishMeApp.tsx app/globals.css tests/stylishme-interactions.test.mjs
git commit -m "Connect StylishMe assistance back to shopping"
```

### Task 7: Full Verification and Release Documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/plans/2026-07-19-stylishme-shop-first-mvp-implementation.md`

**Interfaces:**
- Consumes: all implemented release behavior.
- Produces: verified build, setup notes, security limitations, and completed checklist.

- [x] **Step 1: Run the complete automated suite**

Run: `npm test`  
Expected: zero failures.

- [x] **Step 2: Run lint**

Run: `npm run lint`  
Expected: exit code 0 with no errors.

- [x] **Step 3: Run production build**

Run: `npm run build`  
Expected: exit code 0 and successful worker/client assets.

- [x] **Step 4: Run mobile and desktop browser verification**

Verify at 390x844 and 1280x900:

- no horizontal overflow;
- bottom navigation contains the five approved tabs;
- cart badge is reachable from Home, Shop, Wishlist, and Profile;
- Home section hierarchy matches the approved design;
- product and outfit Try On entry points preserve selection;
- consent cannot be bypassed;
- invalid photos show a useful error;
- configured generation reaches a commerce-linked result, or an unconfigured provider shows the truthful unavailable state;
- AI failure does not prevent adding a product to cart and entering checkout;
- keyboard focus is visible and dialogs are labelled.

- [x] **Step 5: Update README**

Document local setup, `.env.example`, deployment secret names, GPT Image organization verification, model configuration, privacy behavior, first-release non-persistence of source images, test commands, and intentionally deferred durable storage/background jobs.

- [x] **Step 6: Mark completed plan checkboxes and inspect the final diff**

Run: `git diff --check`  
Expected: no whitespace errors.

- [x] **Step 7: Commit release documentation**

```powershell
git add README.md docs/superpowers/plans/2026-07-19-stylishme-shop-first-mvp-implementation.md
git commit -m "Document the shop-first StylishMe MVP"
```

## Release Verification

- Automated suite: 51 of 51 tests passed.
- Static quality: lint and production build completed successfully.
- Responsive QA: verified at 390x844 and 1280x900 with no horizontal overflow.
- Commerce QA: completed sandbox checkout, order confirmation, and tracking; no real charge was attempted.
- Browser QA: all five approved tabs, cart access, product/outfit try-on entry points, consent validation, safe AI failure recovery, and zero browser console errors were verified.

## Plan Self-Review

- Spec coverage: navigation, home hierarchy, core commerce continuity, Shop the Look, try-on consent/safety, OpenAI editing, failure isolation, Wishlist, Profile, and verification each map to a task.
- Intentional release boundary: durable private object storage, queued background processing, persisted credit ledger, normalized production commerce tables, payment provider, returns, admin, and advanced wardrobe are separate follow-up plans; the current release does not falsely claim them.
- Placeholder scan: every code-changing step contains concrete code or an exact ordered behavior contract, with no unfinished markers.
- Type consistency: `TryOnSettings`, job status names, response fields, and route form fields are consistent across Tasks 1, 4, and 5.
- API verification: official OpenAI documentation confirms `gpt-image-2`, multiple image inputs to `images.edit`, portrait `1024x1536`, image moderation with `omni-moderation-latest`, and automatic high-fidelity input handling for GPT Image 2.

## Execution Choice

The owner explicitly requested autonomous continuation and will be unavailable for checkpoints. Use **Inline Execution** with `superpowers:executing-plans`, completing tasks in order and stopping only for a genuine external blocker that cannot be resolved safely within the approved scope.
