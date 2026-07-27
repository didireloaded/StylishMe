# StylishMe Outfit Stories Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add shoppable outfit stories, a curated Outfits tab, catalogue-style designer pages, and a calmer editorial home while moving Wishlist into Profile.

**Architecture:** Keep the existing vinext/React customer app and D1 state route. Add a typed outfit catalogue plus two focused client components for the story viewer and outfit detail experience, then let `StylishMeApp` coordinate navigation, cart, wishlist, saved outfits, and persistence. Store saved outfit IDs inside the existing `profile_json` D1 payload to avoid an unnecessary schema migration.

**Tech Stack:** React 19, TypeScript, vinext, Next-compatible app routes, Drizzle ORM, Cloudflare D1, CSS, Node test runner, ChatGPT Sites hosting.

## Global Constraints

- Bottom navigation must be exactly Home, Shop, Outfits, Cart, Profile.
- Wishlist remains functional and moves into Profile.
- Stories contain curated outfits only and are published by approved designers, stores, or StylishMe.
- Customer story uploads are not included.
- Stories must support Save Outfit, Add All to Cart, View Outfit, progress, previous/next and close.
- Home must show one Outfit of the Day hero and compact Trending and Designers sections.
- Designer pages use Namibian identities, Namibian locations, N$ pricing and complete catalogues.
- Existing cart, wishlist, orders, Fit Passport and sandbox checkout behavior must remain intact.
- Real payment processing is not changed.
- Preserve the current dark navy, coral, pink and lilac premium visual language.

## File Structure

- Create `app/outfit-catalog.ts`: outfit and story types, curated data, totals and availability helpers.
- Create `app/OutfitStoryViewer.tsx`: full-screen timed story experience and commerce actions.
- Create `app/OutfitsView.tsx`: curated outfit selector, item tray, save and add-all controls.
- Modify `app/StylishMeApp.tsx`: app-level state, home hierarchy, new navigation, designer selection and component integration.
- Modify `app/api/state/route.ts`: saved-outfit persistence within `profile_json`.
- Modify `app/globals.css`: story viewer, calm home hero, designer row and outfit screen styling.
- Create `tests/outfit-commerce.test.mjs`: executable catalogue and helper tests.
- Modify `tests/rendered-html.test.mjs`: integration assertions for navigation and screen wiring.

---

### Task 1: Typed Outfit Catalogue and Commerce Helpers

**Files:**
- Create: `app/outfit-catalog.ts`
- Create: `tests/outfit-commerce.test.mjs`

**Interfaces:**
- Produces: `Outfit`, `OutfitStory`, `OUTFITS`, `OUTFIT_STORIES`, `getOutfitTotal(outfit, priceById)`, and `getUnavailableProductIds(outfit, stockById)`.
- Consumes: stable product IDs already defined in `app/StylishMeApp.tsx` (`p1` through `p40`).

- [ ] **Step 1: Write failing catalogue tests**

Create `tests/outfit-commerce.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";

const catalog = await import("../app/outfit-catalog.ts");

test("ships several complete curated outfits and matching stories", () => {
  assert.ok(catalog.OUTFITS.length >= 4);
  assert.equal(catalog.OUTFIT_STORIES.length, catalog.OUTFITS.length);
  for (const outfit of catalog.OUTFITS) {
    assert.ok(outfit.productIds.length >= 3);
    assert.ok(outfit.title.length > 3);
    assert.match(outfit.location, /Namibia|Windhoek|Swakopmund|Ongwediva/);
  }
});

test("calculates totals and unavailable products from the live catalogue maps", () => {
  const outfit = { productIds: ["p1", "p2", "p3"] };
  assert.equal(catalog.getOutfitTotal(outfit, { p1: 899, p2: 1299, p3: 2450 }), 4648);
  assert.deepEqual(
    catalog.getUnavailableProductIds(outfit, { p1: true, p2: false, p3: true }),
    ["p2"],
  );
});
```

- [ ] **Step 2: Run the tests and verify the missing module failure**

Run:

```powershell
node --experimental-strip-types --test tests/outfit-commerce.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `app/outfit-catalog.ts`.

- [ ] **Step 3: Implement the outfit catalogue**

Create `app/outfit-catalog.ts` with this public shape and at least four records:

```ts
export type Outfit = {
  id: string;
  title: string;
  note: string;
  curator: string;
  location: string;
  image: string;
  productIds: string[];
};

export type OutfitStory = {
  id: string;
  label: string;
  outfitId: string;
  image: string;
  accent: string;
};

export const OUTFITS: Outfit[] = [
  {
    id: "windhoek-soft-power",
    title: "Soft Power in Windhoek",
    note: "Coral fleece, utility tailoring and a clean street sneaker.",
    curator: "Omutima Studio",
    location: "Windhoek, Namibia",
    image: "/og.png",
    productIds: ["p1", "p7", "p2", "p4"],
  },
  {
    id: "coastline-weekend",
    title: "Coastline Weekend",
    note: "Relaxed linen and structured accessories for the Atlantic coast.",
    curator: "Coastline Atelier",
    location: "Swakopmund, Namibia",
    image: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=84",
    productIds: ["p12", "p9", "p4", "p2"],
  },
  {
    id: "ceremony-modern",
    title: "Modern Ceremony",
    note: "A refined Namibian occasion edit with confident colour.",
    curator: "Selma K Couture",
    location: "Ongwediva, Namibia",
    image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=1200&q=84",
    productIds: ["p3", "p11", "p9"],
  },
  {
    id: "desert-after-dark",
    title: "Desert After Dark",
    note: "Sharp monochrome layers softened with a warm accessory.",
    curator: "Street Veld",
    location: "Windhoek, Namibia",
    image: "https://images.unsplash.com/photo-1617137968427-85924c800a22?auto=format&fit=crop&w=1200&q=84",
    productIds: ["p10", "p7", "p2", "p9"],
  },
];

export const OUTFIT_STORIES: OutfitStory[] = OUTFITS.map((outfit, index) => ({
  id: `story-${outfit.id}`,
  label: index === 0 ? "Today" : outfit.title.split(" ").slice(0, 2).join(" "),
  outfitId: outfit.id,
  image: outfit.image,
  accent: ["#ff8178", "#7eb8c8", "#c683c9", "#d1a273"][index],
}));

export function getOutfitTotal(
  outfit: Pick<Outfit, "productIds">,
  priceById: Record<string, number>,
) {
  return outfit.productIds.reduce((total, id) => total + (priceById[id] ?? 0), 0);
}

export function getUnavailableProductIds(
  outfit: Pick<Outfit, "productIds">,
  stockById: Record<string, boolean>,
) {
  return outfit.productIds.filter((id) => !stockById[id]);
}
```

- [ ] **Step 4: Run the helper tests**

Run:

```powershell
node --experimental-strip-types --test tests/outfit-commerce.test.mjs
```

Expected: 2 tests pass, 0 fail.

- [ ] **Step 5: Commit**

```powershell
git add app/outfit-catalog.ts tests/outfit-commerce.test.mjs
git commit -m "Add curated outfit commerce catalogue"
```

---

### Task 2: Persist Saved Outfits with Existing Customer State

**Files:**
- Modify: `app/api/state/route.ts`
- Modify: `app/StylishMeApp.tsx`
- Modify: `tests/rendered-html.test.mjs`

**Interfaces:**
- Consumes: `savedOutfits: string[]` from the client state payload.
- Produces: GET state containing `savedOutfits`; POST stores it inside the existing `profile_json` object.

- [ ] **Step 1: Add failing persistence assertions**

Add to the D1 test in `tests/rendered-html.test.mjs`:

```js
assert.match(route, /savedOutfits/);
assert.match(route, /profileJson:\s*JSON\.stringify\(\{ \.\.\.profile, savedOutfits \}\)/);
```

- [ ] **Step 2: Run the integration test and confirm failure**

Run:

```powershell
node --test tests/rendered-html.test.mjs
```

Expected: FAIL because `savedOutfits` is absent from the state route.

- [ ] **Step 3: Extend the state route without changing the D1 schema**

In `GET`, parse profile once and expose the nested saved IDs:

```ts
const profile = safeJson(row.profileJson, {}) as Record<string, unknown>;
return Response.json({ state: {
  cart: safeJson(row.cartJson, []),
  wishlist: safeJson(row.wishlistJson, []),
  orders: safeJson(row.ordersJson, []),
  profile,
  savedOutfits: Array.isArray(profile.savedOutfits) ? profile.savedOutfits : [],
}});
```

In `POST`, normalize and store the list:

```ts
const savedOutfits = Array.isArray(body.savedOutfits)
  ? body.savedOutfits.filter((id): id is string => typeof id === "string")
  : [];

const values = {
  email,
  cartJson: JSON.stringify(cart),
  wishlistJson: JSON.stringify(wishlist),
  ordersJson: JSON.stringify(orders),
  profileJson: JSON.stringify({ ...profile, savedOutfits }),
  updatedAt: new Date().toISOString(),
};
```

- [ ] **Step 4: Wire saved outfit state into the client**

Add:

```ts
const [savedOutfits, setSavedOutfits] = useState<string[]>([]);
```

During load:

```ts
setSavedOutfits(state.savedOutfits ?? state.profile?.savedOutfits ?? []);
```

Include it in the persisted state and effect dependencies:

```ts
const state = { cart, wishlist, orders, profile, savedOutfits };
```

Add a stable toggle:

```ts
const toggleSavedOutfit = (id: string) => {
  setSavedOutfits((current) => current.includes(id)
    ? current.filter((item) => item !== id)
    : [...current, id]);
  setToast(savedOutfits.includes(id) ? "Removed from saved outfits" : "Outfit saved");
};
```

- [ ] **Step 5: Run tests and lint**

Run:

```powershell
node --test tests/rendered-html.test.mjs tests/outfit-commerce.test.mjs
.\node_modules\.bin\eslint.cmd . --ignore-pattern dist --ignore-pattern .next
```

Expected: all tests pass and ESLint exits 0.

- [ ] **Step 6: Commit**

```powershell
git add app/api/state/route.ts app/StylishMeApp.tsx tests/rendered-html.test.mjs
git commit -m "Persist saved StylishMe outfits"
```

---

### Task 3: Shoppable Outfit Story Viewer and Calm Home

**Files:**
- Create: `app/OutfitStoryViewer.tsx`
- Modify: `app/StylishMeApp.tsx`
- Modify: `app/globals.css`
- Modify: `tests/rendered-html.test.mjs`

**Interfaces:**
- Consumes: `stories`, `outfits`, `products`, `initialStoryId`, `savedOutfitIds`, `onSave`, `onAddAll`, `onViewOutfit`, and `onClose`.
- Produces: full-screen story UI with deterministic navigation and commerce callbacks.

- [ ] **Step 1: Add failing home and story assertions**

Add an integration test:

```js
test("wires outfit-only stories into a calm editorial home", async () => {
  const [app, viewer, css] = await Promise.all([
    read("app/StylishMeApp.tsx"),
    read("app/OutfitStoryViewer.tsx"),
    read("app/globals.css"),
  ]);
  assert.match(app, /OUTFIT_STORIES\.map/);
  assert.match(app, /OUTFIT OF THE DAY/);
  assert.doesNotMatch(app, /\["New In", "Near You", "Designers", "Shoes", "Made Local", "Drops"\]/);
  assert.match(viewer, /Save Outfit/);
  assert.match(viewer, /Add All to Cart/);
  assert.match(viewer, /View Outfit/);
  assert.match(css, /\.story-viewer/);
});
```

- [ ] **Step 2: Run the test and confirm missing viewer failure**

Run:

```powershell
node --test tests/rendered-html.test.mjs
```

Expected: FAIL because `OutfitStoryViewer.tsx` and the new copy are absent.

- [ ] **Step 3: Create the story viewer component**

Implement `app/OutfitStoryViewer.tsx` as a client component. Use this prop contract:

```ts
type StoryProduct = {
  id: string;
  name: string;
  image: string;
  price: number;
  available: boolean;
};

type Props = {
  stories: OutfitStory[];
  outfits: Outfit[];
  products: StoryProduct[];
  initialStoryId: string;
  savedOutfitIds: string[];
  onSave: (outfitId: string) => void;
  onAddAll: (outfitId: string) => void;
  onViewOutfit: (outfitId: string) => void;
  onClose: () => void;
};
```

Use `useEffect` with a 5-second timer to advance stories, clear it on unmount, and disable automatic progression when `document.hidden` or `prefers-reduced-motion: reduce` is true. Render segmented progress buttons, left/right hit areas, a close button, product thumbnails, total, Save Outfit, Add All to Cart and View Outfit.

- [ ] **Step 4: Replace the generic story row and simplify Home**

In `StylishMeApp` import `OUTFITS`, `OUTFIT_STORIES`, `getOutfitTotal` and `OutfitStoryViewer`. Add `activeStoryId: string | null`.

Replace the current six generic circles with:

```tsx
<section className="story-row outfit-story-row" aria-label="Outfit stories">
  {OUTFIT_STORIES.map((story) => (
    <button key={story.id} onClick={() => setActiveStoryId(story.id)}>
      <span style={{ backgroundImage: `url(${story.image})`, borderColor: story.accent }} />
      <small>{story.label}</small>
    </button>
  ))}
</section>
```

Make the hero a single Outfit of the Day block:

```tsx
<section className="hero-card ootd-hero">
  <img src={OUTFITS[0].image} alt={OUTFITS[0].title} />
  <div>
    <small>OUTFIT OF THE DAY</small>
    <h2>{OUTFITS[0].title}</h2>
    <p>{OUTFITS[0].note}</p>
    <strong>{money(getOutfitTotal(OUTFITS[0], priceById))}</strong>
    <button onClick={() => openOutfit(OUTFITS[0].id)} className="soft-button">Shop the Look</button>
  </div>
</section>
```

Keep one compact Trending product row and one designer row. Remove the duplicate `look-card` and repeated `Made in Namibia` grid from Home.

- [ ] **Step 5: Add story commerce coordination**

Add `addOutfitToCart(outfitId)` that resolves the outfit’s products, excludes items whose total stock is zero, chooses the Fit Passport size when valid or the first stocked size, and merges lines into the cart. Show `Added 4 items to cart` or `Added 3 items · 1 unavailable`.

Render `OutfitStoryViewer` after the phone shell when `activeStoryId` is non-null. `onViewOutfit` must set the selected outfit, close the story, and navigate to `outfits`.

- [ ] **Step 6: Style the calmer home and viewer**

Add CSS for `.outfit-story-row`, `.ootd-hero`, `.story-viewer`, `.story-progress`, `.story-hit-area`, `.story-product-tray`, `.story-actions`, and safe-area padding. The viewer must cover the phone shell on desktop and the viewport on mobile. Use one dark gradient overlay, one coral primary action and one glass secondary action.

- [ ] **Step 7: Run tests and production build**

Run:

```powershell
node --experimental-strip-types --test tests/outfit-commerce.test.mjs
node --test tests/rendered-html.test.mjs
$env:WRANGLER_LOG_PATH='.wrangler/wrangler.log'; .\node_modules\.bin\vinext.cmd build
```

Expected: all tests pass and vinext reports `Build complete`.

- [ ] **Step 8: Commit**

```powershell
git add app/OutfitStoryViewer.tsx app/StylishMeApp.tsx app/globals.css tests/rendered-html.test.mjs
git commit -m "Add shoppable outfit stories"
```

---

### Task 4: Outfits Tab, Revised Navigation and Profile Destinations

**Files:**
- Create: `app/OutfitsView.tsx`
- Modify: `app/StylishMeApp.tsx`
- Modify: `app/globals.css`
- Modify: `tests/rendered-html.test.mjs`

**Interfaces:**
- Consumes: selected outfit ID, outfit catalogue, product summaries, saved IDs and save/add/open callbacks.
- Produces: curated outfit selector and exact five-tab navigation.

- [ ] **Step 1: Replace the existing navigation assertions with failing new expectations**

Use:

```js
assert.match(app, /"Home", "home", "home"/);
assert.match(app, /"Shop", "shop", "shop"/);
assert.match(app, /"Outfits", "outfits", "sparkles"/);
assert.match(app, /"Cart", "cart", "bag"/);
assert.match(app, /"Profile", "profile", "profile"/);
assert.doesNotMatch(app, /"Wishlist", "wishlist", "heart"/);
assert.match(app, /\["Wishlist", "wishlist"\]/);
assert.match(app, /\["Saved outfits", "outfits"\]/i);
```

- [ ] **Step 2: Run the integration test and confirm failure**

Run `node --test tests/rendered-html.test.mjs`.

Expected: FAIL because Wishlist is still in the bottom tabs and Outfits is absent.

- [ ] **Step 3: Build `OutfitsView`**

Create a client component that renders the selected outfit image, title, curator, note, combined total, horizontal outfit selector, item tray and three actions: Save Outfit, Add All to Cart and individual product open. Use these props:

```ts
type Props = {
  outfits: Outfit[];
  selectedId: string;
  products: OutfitProduct[];
  savedOutfitIds: string[];
  onSelect: (id: string) => void;
  onSave: (id: string) => void;
  onAddAll: (id: string) => void;
  onOpenProduct: (id: string) => void;
};
```

Show unavailable items with an `Unavailable` label without removing them from the look.

- [ ] **Step 4: Wire the Outfits view and exact navigation**

Add `"outfits"` to `View`, a `selectedOutfitId` state initialized to `OUTFITS[0].id`, and an `openOutfit(id)` helper.

Replace `mainTabs` with:

```ts
const mainTabs: Array<[string, View, string]> = [
  ["Home", "home", "home"],
  ["Shop", "shop", "shop"],
  ["Outfits", "outfits", "sparkles"],
  ["Cart", "cart", "bag"],
  ["Profile", "profile", "profile"],
];
```

Add a `sparkles` case to `Icon`. Render `OutfitsView` for the new view. Add Wishlist and Saved outfits rows to the Profile menu, both with visible counts. The Wishlist row continues to open the existing Wishlist screen; Saved outfits opens Outfits filtered or initially selected to the first saved look.

- [ ] **Step 5: Style the outfit view**

Add CSS for `.outfit-view`, `.outfit-stage`, `.outfit-selector`, `.outfit-items`, `.outfit-item`, `.outfit-total`, and `.outfit-actions`. Keep the primary action fixed only when it does not cover item content.

- [ ] **Step 6: Run tests and lint**

Run:

```powershell
node --experimental-strip-types --test tests/outfit-commerce.test.mjs
node --test tests/rendered-html.test.mjs
.\node_modules\.bin\eslint.cmd . --ignore-pattern dist --ignore-pattern .next
```

Expected: all tests pass and ESLint exits 0.

- [ ] **Step 7: Commit**

```powershell
git add app/OutfitsView.tsx app/StylishMeApp.tsx app/globals.css tests/rendered-html.test.mjs
git commit -m "Add curated Outfits tab"
```

---

### Task 5: Dynamic Designer Catalogues and Shop Refinement

**Files:**
- Modify: `app/StylishMeApp.tsx`
- Modify: `app/globals.css`
- Modify: `tests/rendered-html.test.mjs`

**Interfaces:**
- Consumes: the existing `products` catalogue.
- Produces: `openDesigner(name)` and a designer catalogue derived from matching products.

- [ ] **Step 1: Add failing catalogue and shop assertions**

Add:

```js
assert.match(app, /const openDesigner = \(name: string\)/);
assert.match(app, /products\.filter\(\(product\) => product\.designer === selectedDesigner\)/);
assert.match(app, /"Accessories"/);
assert.match(app, /"Designer"/);
assert.match(app, /"Sale"/);
```

- [ ] **Step 2: Run the integration test and confirm failure**

Run `node --test tests/rendered-html.test.mjs`.

Expected: FAIL because the designer screen is still hard-coded and Shop lacks the full category set.

- [ ] **Step 3: Make designer catalogues dynamic**

Add:

```ts
const [selectedDesigner, setSelectedDesigner] = useState("Omutima Studio");
const designerProducts = products.filter((product) => product.designer === selectedDesigner);
const openDesigner = (name: string) => {
  setSelectedDesigner(name);
  navigate("designer");
};
```

Create a designer summary map with Namibian location, rating, followers, delivery and story for each seeded designer. Update product designer links, home designer cards and story identities to call `openDesigner`. Render the complete `designerProducts` grid beneath the designer profile.

- [ ] **Step 4: Refine Shop categories and filtering**

Use category tabs:

```ts
["All", "Women", "Men", "Clothing", "Shoes", "Accessories", "Bags", "Designer", "Traditional", "Sale"]
```

Update filtering so `Sale` selects `oldPrice`, `Designer` selects products from the seeded designer list, and other categories continue to match `product.category`. Keep filters and sort in bottom-sheet controls.

- [ ] **Step 5: Add compact designer cards to Home**

Render circular or portrait designer cards below Trending with name and Namibian location. Limit the home row to four designers and use `View all` to open Shop with the Designer category selected.

- [ ] **Step 6: Run the test suite and build**

Run:

```powershell
node --experimental-strip-types --test tests/outfit-commerce.test.mjs
node --test tests/rendered-html.test.mjs
.\node_modules\.bin\eslint.cmd . --ignore-pattern dist --ignore-pattern .next
$env:WRANGLER_LOG_PATH='.wrangler/wrangler.log'; .\node_modules\.bin\vinext.cmd build
```

Expected: all tests pass, lint exits 0, and vinext reports `Build complete`.

- [ ] **Step 7: Commit**

```powershell
git add app/StylishMeApp.tsx app/globals.css tests/rendered-html.test.mjs
git commit -m "Add dynamic designer catalogues"
```

---

### Task 6: End-to-End Verification and Private Production Deployment

**Files:**
- Modify only if verification reveals a specific defect.

**Interfaces:**
- Consumes: complete app source and existing `.openai/hosting.json` project ID.
- Produces: a saved and privately deployed ChatGPT Sites version.

- [ ] **Step 1: Run all automated verification fresh**

Run:

```powershell
node --experimental-strip-types --test tests/outfit-commerce.test.mjs
node --test tests/rendered-html.test.mjs
.\node_modules\.bin\eslint.cmd . --ignore-pattern dist --ignore-pattern .next
$env:WRANGLER_LOG_PATH='.wrangler/wrangler.log'; .\node_modules\.bin\vinext.cmd build
git diff --check
git status --short
```

Expected: every test passes, lint and build exit 0, `git diff --check` is empty, and only intended uncommitted changes remain.

- [ ] **Step 2: Verify primary interactions in the deployed browser preview**

Check these exact journeys:

1. Home → outfit story → Save Outfit → Profile → Saved outfits.
2. Home → outfit story → Add All to Cart → Cart.
3. Home → designer → complete catalogue → product detail.
4. Shop → Sale category → product detail → wishlist → Profile → Wishlist.
5. Outfits → select another outfit → Add All to Cart → checkout.

Expected: navigation, counts, totals, unavailable labels and confirmations remain consistent.

- [ ] **Step 3: Commit any verification fixes and re-run Step 1**

If a defect is found, write or strengthen the relevant test first, implement the smallest correction, run Step 1 again, and commit with a message naming the corrected behavior.

- [ ] **Step 4: Push the exact verified commit to the Sites source repository**

Use the existing ChatGPT Sites source credential with per-command Git authentication. Confirm that the pushed SHA equals `git rev-parse HEAD`.

- [ ] **Step 5: Package, save and deploy the exact commit**

Run the Sites packaging helper against the successful `dist` build, save a new site version with the exact HEAD SHA, and deploy it with private owner-only access.

- [ ] **Step 6: Poll deployment and verify production**

Wait until the Sites deployment reports `succeeded`, then open the production URL and repeat the five-tab check plus one Story → Cart journey.

- [ ] **Step 7: Stop local preview and report the production URL**

Stop the retained development server, close agent-opened reference tabs, and report the live StylishMe URL with the verification summary and sandbox-payment limitation.
