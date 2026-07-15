# StylishMe Base44 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create, verify, and deploy StylishMe as a polished, mobile-first Base44 customer fashion marketplace for Namibia.

**Architecture:** Base44 supplies the hosted application, authentication, data entities, persistence, and deployment. Implementation uses the Base44 connector to create the app from the user's verbatim brief, applies the user's later value-proposition and naming refinements through Base44 edits, inspects the generated schema and seed data, and verifies the deployed customer journey in a browser.

**Tech Stack:** Base44 hosted application platform, Base44 authentication and entities, Base44 connector tools, responsive mobile web UI, in-app browser acceptance testing.

## Global Constraints

- The product name is `StylishMe`, stored as one app-level brand value.
- The release is customer-facing only; no designer portal, administrator portal, social feed, livestreaming, customer messaging, rentals, or second-hand marketplace.
- The primary navigation has exactly five tabs: Home, Shop, Wishlist, Cart, and Profile.
- The primary experience stays near 16 screens; filters, sorting, size guidance, variant selection, delivery, payment, promotion entry, sharing, and confirmations use sheets or dialogs.
- Currency is Namibian dollars and displayed in forms such as `N$899`, `N$1,299`, and `N$2,450`.
- The deployed output is a mobile-first responsive Base44 web application, not a native Expo binary.
- Base44-native authentication and data are used for this release; Supabase and live external providers are deferred.
- Payment is a clearly labelled sandbox flow and never claims that real funds were charged.
- Seed at least 40 products, 8 stores or designers, 8 collections, 4 orders, 10 notifications, and 3 Namibian addresses.
- Every visible action must update state, open a working control, or navigate to a complete destination.
- The design uses deep navy and charcoal, restrained readable glass, warm-white text, editorial serif headings, modern sans-serif controls, coral-pink-orange actions, and subtle teal/orange ambience.
- Product pages use restrained colour-adaptive ambience without compromising contrast.
- Loading, empty, error, confirmation, low-stock, price-change, delivery-unavailable, and connectivity states are required.
- Responsive phone layouts, accessible contrast, usable touch targets, visible selected states, qualified fit guidance, and reduced-motion/data-light behavior are required.

## Resource Structure

The implementation creates no local application source tree because Base44 owns the generated source and hosting. The resources and boundaries are:

- Read: `docs/superpowers/specs/2026-07-15-stylishme-base44-customer-app-design.md` — approved product and acceptance specification.
- Read: user message beginning `[@base44] Create a new Base44 app and deploy it.` — verbatim creation prompt required by the Base44 connector.
- Read: `C:/Users/PC/.codex/attachments/761607fb-4af7-4d30-81d3-1e7d8e94c126/pasted-text.txt` — verbatim value-proposition and signature-feature refinement.
- External create target: one new Base44 application owned by the authenticated user.
- External entities: User, Address, FitPassport, Store, Category, Collection, Product, ProductVariant, ProductImage, CuratedLook, CuratedLookItem, WishlistItem, CartItem, RecentlyViewedItem, SizeRequest, Order, OrderItem, OrderStatusEvent, and Notification, or clearly equivalent Base44-generated names.
- External deployment: the Base44-hosted public URL returned by creation or publishing.

Interfaces shared by all tasks:

```ts
type StylishMeBuildContext = {
  appId: string;
  appName: "StylishMe";
  editorUrl: string;
  publicUrl: string;
};

type AcceptanceResult = {
  name: string;
  passed: boolean;
  evidence: string;
};

declare function queryEntity(
  entityName: string,
  query: Record<string, unknown>,
  limit: number,
): Promise<Array<Record<string, unknown>>>;
```

---

### Task 1: Create the Base44 Application

**Resources:**
- Read: `docs/superpowers/specs/2026-07-15-stylishme-base44-customer-app-design.md`
- External create: Base44 application

**Interfaces:**
- Consumes: the user's verbatim message beginning `[@base44] Create a new Base44 app and deploy it.` and ending `compete with it.`
- Produces: `StylishMeBuildContext` with the actual Base44 app ID, editor URL, and public URL returned by the platform

- [ ] **Step 1: Load the Base44 operating instructions**

Read the complete `base44:base44-cli` skill before invoking a Base44 tool. Follow its authentication, app creation, editing, inspection, and deployment rules exactly.

- [ ] **Step 2: Create the app from the user's verbatim request**

Call the Base44 creation connector with the user's full original Base44 request, unchanged and without added interpretation:

```ts
const created = await mcp__codex_apps__base44_create_base44_app({
  appPrompt: verbatimOriginalBase44UserMessage,
});
```

Expected: success response identifying one newly created app and providing its app ID plus an editor or app URL. Do not create a second app if the response is slow; wait for completion and retain the returned identifier.

- [ ] **Step 3: Confirm ownership and capture canonical identifiers**

List the authenticated user's apps and locate the newly created record by ID:

```ts
const apps = await mcp__codex_apps__base44_list_user_apps({ limit: 100 });
const app = apps.find((candidate) => candidate.id === created.appId);
if (!app) throw new Error("The newly created Base44 app is not present in the authenticated account.");
```

Expected: exactly one matching application. Capture its actual app ID, name, editor URL, and public URL as `StylishMeBuildContext` for later tasks.

- [ ] **Step 4: Verify the first deployment is reachable**

Open the returned public app URL in the in-app browser.

Expected: an HTTP-successful Base44 application loads without a platform error page. Record a failed acceptance result if only an editor page is available; Task 5 will publish and recheck after all edits.

---

### Task 2: Apply the Approved Name and Signature Features

**Resources:**
- Read: `C:/Users/PC/.codex/attachments/761607fb-4af7-4d30-81d3-1e7d8e94c126/pasted-text.txt`
- External modify: Base44 app from Task 1

**Interfaces:**
- Consumes: `StylishMeBuildContext.appId`
- Produces: a Base44 revision named StylishMe with the user's Fit Passport, local discovery, availability, complete-look, made-to-order, adaptive-page, designer-story, delivery-transparency, and data-light requirements

- [ ] **Step 1: Apply the user's naming message verbatim**

Call the edit connector using the exact naming message from the user:

```ts
await mcp__codex_apps__base44_edit_base44_app({
  appId: build.appId,
  editPrompt: "looks right. yes proceed. the name of the is StylishMe..",
});
```

Expected: the app brand and application name are StylishMe. No page retains the temporary NamiStyle name.

- [ ] **Step 2: Apply the added value-proposition brief verbatim**

Read the attachment as one string and send that exact content to the edit connector:

```ts
await mcp__codex_apps__base44_edit_base44_app({
  appId: build.appId,
  editPrompt: addedValuePropositionAttachmentText,
});
```

Expected: the revision preserves the five-tab customer scope while incorporating Fit Passport, Available Near You, Shop the Look, Request My Size, made-to-order presentation, adaptive product ambience, designer stories, product standards, data-light mode, and pre-checkout delivery transparency.

- [ ] **Step 3: Reconfirm the app identity**

```ts
const apps = await mcp__codex_apps__base44_list_user_apps({
  name: "StylishMe",
  limit: 10,
});
if (!apps.some((candidate) => candidate.id === build.appId)) {
  throw new Error("The created app was not renamed to StylishMe.");
}
```

Expected: the created app appears under StylishMe and retains the same app ID.

---

### Task 3: Verify Data Model and Seed Coverage

**Resources:**
- External inspect: Base44 schemas and entity records for `StylishMeBuildContext.appId`

**Interfaces:**
- Consumes: `StylishMeBuildContext.appId`
- Produces: schema and record-count acceptance results for commerce, discovery, fit, and orders

- [ ] **Step 1: Retrieve every generated entity schema**

```ts
const schemas = await mcp__codex_apps__base44_list_entity_schemas({
  appId: build.appId,
});
```

Expected: schemas or clear equivalents exist for products and variants, stores/designers, categories/collections, wishlists, carts, addresses, Fit Passport data, curated looks, size requests or alerts, orders and items, tracking events, and notifications.

- [ ] **Step 2: Check product and variant fields**

Inspect the actual Product and ProductVariant schema names returned in Step 1.

Expected product coverage: name, slug or identifier, description, store/designer relationship, category, current price, optional prior price, currency, images, materials, care, fit, condition, return eligibility, delivery/collection information, made-to-order information, Made in Namibia status, badges, and adaptive theme values.

Expected variant coverage: product relationship, colour, size, available quantity, active or sold-out state, optional price override, and variant identity.

- [ ] **Step 3: Check customer and order fields**

Expected customer coverage: profile, addresses, measurements, preferred sizes/fit, data-light preference, wishlist, cart, recently viewed state, and notifications.

Expected order coverage: order number, user, item snapshots, quantities, sizes, colours, subtotal, delivery fee, discount, grand total, delivery or collection method, address snapshot, sandbox payment method, status, estimate, and tracking history.

- [ ] **Step 4: Query and count seed data**

Use the exact entity names discovered in Step 1:

```ts
const products = await queryEntity(actualProductEntityName, {}, 500);
const stores = await queryEntity(actualStoreEntityName, {}, 500);
const collections = await queryEntity(actualCollectionEntityName, {}, 500);
const orders = await queryEntity(actualOrderEntityName, {}, 500);
const notifications = await queryEntity(actualNotificationEntityName, {}, 500);
const addresses = await queryEntity(actualAddressEntityName, {}, 500);

assert(products.length >= 40);
assert(stores.length >= 8);
assert(collections.length >= 8);
assert(orders.length >= 4);
assert(notifications.length >= 10);
assert(addresses.length >= 3);
```

Each `queryEntity` maps directly to `mcp__codex_apps__base44_query_entities` with `appId: build.appId`, `query: {}`, and the supplied limit.

Expected: every assertion passes and products include clothing, footwear, bags, accessories, traditional fashion, local designer pieces, complete looks, varied sizes/colours, made-to-order entries, and Namibian-dollar prices.

- [ ] **Step 5: Correct missing schema or seed coverage**

For each failed check, send the exact relevant requirement from the user's original request or added attachment to `mcp__codex_apps__base44_edit_base44_app`, then repeat Steps 1–4.

Expected: all schema and count checks pass before browser testing begins. Do not report success based solely on visually rendered sample cards.

---

### Task 4: Run Mobile Customer-Journey Acceptance Tests

**Resources:**
- External test target: `StylishMeBuildContext.publicUrl`
- Browser: in-app browser at a phone-sized viewport

**Interfaces:**
- Consumes: deployed StylishMe revision and seeded entities from Tasks 1–3
- Produces: one `AcceptanceResult` per journey below, with concrete observed evidence

- [ ] **Step 1: Load browser-control instructions and open a fresh session**

Read the complete `browser:control-in-app-browser` skill. Open the public URL in a fresh browser tab and use a representative phone-sized viewport.

Expected: StylishMe loads with no Base44 error overlay, missing-resource failure, or desktop-only layout.

- [ ] **Step 2: Verify entry and five-tab navigation**

Test Splash, Onboarding, Continue as Guest, Sign In, and Create Account. Then activate Home, Shop, Wishlist, Cart, and Profile individually.

Expected: each destination is complete, selected-tab state is visible, back navigation works, and there is no Outfits, seller, admin, social, or messaging tab.

- [ ] **Step 3: Verify Home and discovery destinations**

Open at least one item or destination from New In, Available Near You, Made in Namibia, Shop the Look, Trending Shoes, Designer of the Week, Made to Order, Under N$1,000, and Recently Viewed.

Expected: each visible control opens a corresponding product, filtered listing, designer profile, or curated look. Delivery and pickup language references realistic Namibian locations.

- [ ] **Step 4: Verify Shop, Search, Filter, and Sort**

Inspect recent searches, suggested searches, and trending searches. Search for `White sneakers`, open results, apply a size filter, apply a location or delivery filter, and sort Price Low to High. Clear filters, clear recent-search history, and search for a nonsense phrase.

Expected: suggestions open relevant results, results match the query, filtering changes the grid, sorting orders visible prices correctly, clearing restores products, search history clears, and the nonsense query produces a designed empty state with recovery action.

- [ ] **Step 5: Verify product confidence features**

Open a clothing or footwear product. Swipe its image gallery, change colour, choose a size, inspect quantity-aware stock, open the size guide, inspect Fit Passport guidance, inspect delivery fee and estimate, open the designer profile and its story/collections, and inspect returns/material/fit information.

Expected: adaptive ambience changes subtly with the variant, selected states are clear, size is required where applicable, fit advice is qualified, delivery is visible before checkout, and Made in Namibia or made-to-order information appears only when applicable.

- [ ] **Step 6: Verify unavailable-size actions and complete looks**

Select a sold-out variant and activate Notify Me or Request This Size. Open a Shop the Look set and add either one item or the available full look to Cart.

Expected: the size request persists or confirms meaningfully; complete-look actions add actual variants and update the cart badge and total.

- [ ] **Step 7: Verify Wishlist and Cart persistence**

Save a product, open Wishlist, move it to Cart, change quantity, change one available variant, move an item back to Wishlist, remove another item, and reload the app.

Expected: counts, variants, availability, fees, discount, and total recalculate correctly; the retained state is restored after reload under the current session.

- [ ] **Step 8: Verify end-to-end sandbox checkout**

From a non-empty Cart, choose delivery or collection, select or add an address, select a sandbox payment option, review the order, and place it.

Expected: the app clearly states that payment is simulated, creates exactly one order, shows an order number and estimate, clears or converts the purchased cart, and offers View Order and Continue Shopping.

- [ ] **Step 9: Verify orders, profile, and secondary routes**

Inspect the Active, Delivered, and Cancelled order tabs. Open the created order from My Orders and inspect its item snapshots, address, cost summary, tracking timeline, support action, eligible cancellation, and delivered-order return action. Open Fit Passport, Saved Addresses, Notifications, Help and Support, Settings, and data-light mode from Profile. Mark a notification as read, edit a profile value, and verify sign-out is available.

Expected: order tabs classify records correctly; order data matches checkout; tracking stages are ordered; eligible cancellation and return actions confirm before changing state; profile and notification edits persist; secondary routes are complete; data-light mode reduces nonessential imagery or motion without breaking shopping.

- [ ] **Step 10: Verify state design, responsiveness, and accessibility**

Exercise empty Wishlist/Cart, invalid form input, missing size, low stock, and one connectivity or retry state. Inspect representative small and large phone widths.

Expected: no horizontal clipping, hidden primary actions, colour-only state, illegible glass copy, or dead control. Loading, empty, error, confirmation, and recovery states are explicit.

- [ ] **Step 11: Correct and retest every failure**

For each failed `AcceptanceResult`, send the exact matching sentence or bullet from the user's supplied brief to the Base44 edit connector, wait for the edit to complete, and rerun the smallest failed journey plus its adjacent happy path.

Expected: every acceptance result is passing or is reported as a precise Base44 platform limitation; failures are never silently waived.

---

### Task 5: Confirm Deployment and Hand Off StylishMe

**Resources:**
- External inspect: Base44 app list and public URL
- External test: fresh anonymous browser load

**Interfaces:**
- Consumes: passing acceptance results and `StylishMeBuildContext`
- Produces: verified live StylishMe URL, editor URL, completed-feature summary, and honest limitations report

- [ ] **Step 1: Confirm the final Base44 revision is published**

Follow the Base44 skill's publishing instruction if the creation/edit workflow leaves the latest revision in draft. Keep the same app ID and do not duplicate the application.

Expected: Base44 reports the latest StylishMe revision as live or published.

- [ ] **Step 2: Verify a fresh public load**

Open `build.publicUrl` without relying on the editor session.

Expected: the StylishMe splash or Home entry experience loads publicly, assets render, and the application is not an unpublished preview or editor-only page.

- [ ] **Step 3: Reconfirm account ownership and name**

```ts
const apps = await mcp__codex_apps__base44_list_user_apps({
  name: "StylishMe",
  limit: 10,
});
assert(apps.some((candidate) => candidate.id === build.appId));
```

Expected: the live app is listed under StylishMe in the authenticated Base44 account.

- [ ] **Step 4: Deliver the handoff**

Provide the user with:

- The verified live URL
- The Base44 editor URL
- The Base44 app ID
- A concise list of completed customer features
- Confirmation that sandbox checkout does not charge real money
- Any exact Base44 limitation that remained after correction attempts

Expected: the user can open the deployed app immediately and knows what is live, what is simulated, and how to continue editing it.
