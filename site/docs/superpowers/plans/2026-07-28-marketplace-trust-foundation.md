# Marketplace Trust Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first authoritative vertical commerce journey from a seller-managed product variant through sandbox checkout, seller confirmation, and customer order tracking.

**Architecture:** Add normalized marketplace records to the customer site database and expose them through focused domain services and API routes. The customer and seller applications consume the same catalogue, inventory, checkout, and order contracts; existing JSON state remains only as a migration fallback until a later release removes it.

**Tech Stack:** TypeScript 5.9, React 19, Next 16-compatible Vinext, Drizzle ORM 0.45, SQLite/D1, Node test runner, Testing Library, Cloudflare runtime.

## Global Constraints

- Payments and payouts remain explicitly labelled sandbox until a production provider and signed webhook integration are configured.
- Product prices, availability, fulfilment fees, reservations, and order totals are server-authoritative.
- Customer orders split into one seller order per seller.
- Financial, inventory, and order decisions are not finalized optimistically before server acknowledgement.
- Products with order history are archived or paused, never hard-deleted.
- Existing customer and seller experiences remain usable throughout the migration.
- No new runtime dependency is required for this release.
- Every task follows test-driven development and ends in a focused commit.

## Release Boundary

This plan delivers the first working trust slice:

1. normalized sellers, products, variants, inventory, reservations, orders, payments, and events;
2. a shared typed marketplace domain;
3. authoritative catalogue and availability APIs;
4. seller-grouped quote and sandbox checkout APIs;
5. customer checkout and tracking surfaces;
6. seller attention queue and item-level confirmation;
7. deep-link routes and browser-state preservation for the new journey.

Returns, earnings/payout ledgers, complete product authoring, advanced search semantics, and full role management receive separate implementation plans after this slice is verified.

## File Structure

- `site/db/schema.ts` — normalized marketplace tables shared by the customer-facing deployment.
- `site/app/marketplace/types.ts` — public domain types and status unions.
- `site/app/marketplace/catalogue.ts` — catalogue reads and public product mapping.
- `site/app/marketplace/inventory.ts` — availability, reservations, expiry, and release rules.
- `site/app/marketplace/commerce.ts` — quote creation, idempotent checkout, and seller-order splitting.
- `site/app/marketplace/orders.ts` — legal order transitions and event timelines.
- `site/app/marketplace/seed.ts` — one-time conversion of approved seller JSON fixtures into normalized rows.
- `site/app/api/marketplace/catalogue/route.ts` — authoritative public catalogue endpoint.
- `site/app/api/marketplace/quote/route.ts` — seller-grouped cart quote endpoint.
- `site/app/api/marketplace/checkout/route.ts` — sandbox checkout endpoint.
- `site/app/api/marketplace/orders/[id]/route.ts` — customer order detail endpoint.
- `site/app/api/marketplace/seller/orders/route.ts` — seller attention queue endpoint.
- `site/app/api/marketplace/seller/orders/[id]/confirm/route.ts` — item-level confirmation endpoint.
- `site/app/MarketplaceCheckout.tsx` — customer fulfilment, payment, and review flow.
- `site/app/MarketplaceOrder.tsx` — customer seller-order timeline.
- `seller-app/app/SellerOrderQueue.tsx` — actionable order queue.
- `seller-app/app/SellerOrderDetail.tsx` — item-level confirmation and deadlines.
- `site/tests/marketplace-*.test.mjs` and `seller-app/tests/marketplace-orders.test.mjs` — domain, API, and rendered behavior coverage.

---

### Task 1: Normalize the Marketplace Persistence Model

**Files:**
- Modify: `site/db/schema.ts`
- Create: generated migration under `site/drizzle/`
- Test: `site/tests/marketplace-schema.test.mjs`

**Interfaces:**
- Produces: tables `marketplaceSellers`, `marketplaceProducts`, `marketplaceVariants`, `inventoryBalances`, `inventoryReservations`, `customerOrders`, `sellerOrders`, `orderItems`, `paymentAttempts`, and `orderEvents`.
- Produces: status columns constrained by domain validation in Task 2.

- [ ] **Step 1: Write the failing schema test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import * as schema from "../db/schema.ts";

test("exports the normalized marketplace tables", () => {
  for (const name of [
    "marketplaceSellers", "marketplaceProducts", "marketplaceVariants",
    "inventoryBalances", "inventoryReservations", "customerOrders",
    "sellerOrders", "orderItems", "paymentAttempts", "orderEvents",
  ]) assert.ok(schema[name], `${name} must be exported`);
});
```

- [ ] **Step 2: Run the test and verify the missing exports**

Run: `node --import tsx --test tests/marketplace-schema.test.mjs`

Expected: FAIL because the named tables are not exported.

- [ ] **Step 3: Add normalized tables with explicit keys and indexes**

Use text IDs, integer minor-unit money, ISO timestamps, foreign keys, and indexes for seller, product, variant, active reservation expiry, customer order ownership, seller-order ownership, and event ordering. Include snapshot fields on `orderItems`: `productName`, `sellerName`, `variantLabel`, `unitPrice`, `returnPolicy`, and `imageUrl`.

Core columns:

```ts
export const marketplaceVariants = sqliteTable("marketplace_variants", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull().references(() => marketplaceProducts.id),
  sku: text("sku").notNull(),
  size: text("size").notNull(),
  colour: text("colour").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, table => [uniqueIndex("marketplace_variants_sku_idx").on(table.sku)]);
```

- [ ] **Step 4: Generate and inspect the migration**

Run: `npm run db:generate`

Expected: one new migration containing only additive marketplace tables and indexes; no drop of existing state tables.

- [ ] **Step 5: Run schema test, typecheck, and commit**

Run: `node --import tsx --test tests/marketplace-schema.test.mjs && npm run typecheck`

Expected: PASS.

Commit: `git add db/schema.ts drizzle tests/marketplace-schema.test.mjs && git commit -m "feat: add normalized marketplace schema"`

### Task 2: Define Shared Marketplace Types and State Transitions

**Files:**
- Create: `site/app/marketplace/types.ts`
- Create: `site/app/marketplace/orders.ts`
- Test: `site/tests/marketplace-orders-domain.test.mjs`

**Interfaces:**
- Produces: `PaymentStatus`, `SellerOrderStatus`, `OrderItemStatus`, `MarketplaceCartLine`, `SellerQuote`, `CheckoutQuote`, `OrderTimelineEvent`.
- Produces: `canTransitionSellerOrder(from, to): boolean` and `nextSellerOrderStatus(itemStatuses): SellerOrderStatus`.

- [ ] **Step 1: Write failing transition tests**

```js
test("seller orders cannot skip confirmation", () => {
  assert.equal(canTransitionSellerOrder("needs_confirmation", "ready_for_pickup"), false);
  assert.equal(canTransitionSellerOrder("needs_confirmation", "confirmed"), true);
});

test("mixed confirmation derives partially_confirmed", () => {
  assert.equal(nextSellerOrderStatus(["confirmed", "unavailable"]), "partially_confirmed");
});
```

- [ ] **Step 2: Run and verify missing module failure**

Run: `node --import tsx --test tests/marketplace-orders-domain.test.mjs`

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement exact status unions and transition maps**

```ts
export type PaymentStatus = "created" | "processing" | "pending" | "succeeded" | "failed" | "cancelled" | "requires_reconciliation";
export type OrderItemStatus = "needs_confirmation" | "confirmed" | "unavailable" | "preparing" | "ready" | "completed";
export type SellerOrderStatus = "needs_confirmation" | "partially_confirmed" | "confirmed" | "preparing" | "ready_for_pickup" | "waiting_for_courier" | "shipped" | "completed" | "cancelled";
```

Implement transitions from an exhaustive `Record<SellerOrderStatus, readonly SellerOrderStatus[]>` and derive aggregate status only from item states.

- [ ] **Step 4: Run domain tests and typecheck**

Run: `node --import tsx --test tests/marketplace-orders-domain.test.mjs && npm run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

Commit: `git add app/marketplace tests/marketplace-orders-domain.test.mjs && git commit -m "feat: define marketplace order states"`

### Task 3: Import Approved Seller Products into the Shared Catalogue

**Files:**
- Create: `site/app/marketplace/seed.ts`
- Create: `site/app/marketplace/catalogue.ts`
- Modify: `site/app/api/catalog/route.ts`
- Test: `site/tests/marketplace-catalogue.test.mjs`

**Interfaces:**
- Consumes: normalized tables from Task 1.
- Produces: `importApprovedSellerState(db, row): Promise<ImportSummary>`.
- Produces: `listPublicProducts(db, input): Promise<PublicProduct[]>`.

- [ ] **Step 1: Write failing importer and public catalogue tests**

Cover one approved seller with two colour/size variants, one unapproved seller, and one non-live product. Assert stable IDs, unique SKUs, fit/material data, location, and exclusion of unapproved/non-live products.

- [ ] **Step 2: Run and verify failure**

Run: `node --import tsx --test tests/marketplace-catalogue.test.mjs`

Expected: FAIL because importer and catalogue reader do not exist.

- [ ] **Step 3: Implement deterministic import mapping**

Generate IDs from seller token, product ID, size, and colour using a sanitized deterministic key. Use upserts so repeated imports do not duplicate inventory. Reject negative quantities and duplicate SKU collisions with an `ImportSummary.errors` entry.

```ts
export type ImportSummary = { sellers: number; products: number; variants: number; errors: string[] };
```

- [ ] **Step 4: Switch the legacy catalogue route to the shared reader with fallback**

Read normalized products first. If none exist, return the existing approved JSON projection and include `source: "legacy"`; otherwise include `source: "marketplace"`. Do not merge both sources and duplicate products.

- [ ] **Step 5: Run tests, typecheck, and commit**

Run: `node --import tsx --test tests/marketplace-catalogue.test.mjs && npm run typecheck`

Expected: PASS.

Commit: `git add app/marketplace app/api/catalog tests/marketplace-catalogue.test.mjs && git commit -m "feat: serve normalized marketplace catalogue"`

### Task 4: Implement Authoritative Availability and Reservations

**Files:**
- Create: `site/app/marketplace/inventory.ts`
- Test: `site/tests/marketplace-inventory.test.mjs`

**Interfaces:**
- Consumes: `marketplaceVariants`, `inventoryBalances`, `inventoryReservations`.
- Produces: `getAvailability(db, variantIds, now): Promise<Map<string, number>>`.
- Produces: `reserveInventory(db, input): Promise<ReservationResult>`.
- Produces: `releaseReservations(db, checkoutId, now): Promise<number>`.

- [ ] **Step 1: Write failing inventory tests**

Test that available-to-sell equals on-hand minus active reservations, expired reservations do not count, insufficient stock rejects the whole request, repeated idempotency keys return the original reservation, and releasing twice is harmless.

- [ ] **Step 2: Run and verify failure**

Run: `node --import tsx --test tests/marketplace-inventory.test.mjs`

Expected: FAIL because inventory functions do not exist.

- [ ] **Step 3: Implement transactional reservation rules**

```ts
export type ReservationRequest = {
  checkoutId: string;
  idempotencyKey: string;
  expiresAt: string;
  lines: Array<{ variantId: string; quantity: number }>;
};
export type ReservationResult =
  | { ok: true; reservationIds: string[] }
  | { ok: false; code: "invalid_quantity" | "unavailable"; variantId?: string };
```

Validate positive integer quantities, compute all availability before inserting, and write all reservation rows inside one database transaction.

- [ ] **Step 4: Run inventory tests and typecheck**

Run: `node --import tsx --test tests/marketplace-inventory.test.mjs && npm run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

Commit: `git add app/marketplace/inventory.ts tests/marketplace-inventory.test.mjs && git commit -m "feat: reserve marketplace inventory safely"`

### Task 5: Add Seller-Grouped Quotes and Sandbox Checkout

**Files:**
- Create: `site/app/marketplace/commerce.ts`
- Create: `site/app/api/marketplace/quote/route.ts`
- Create: `site/app/api/marketplace/checkout/route.ts`
- Test: `site/tests/marketplace-commerce.test.mjs`
- Test: `site/tests/marketplace-checkout-api.test.mjs`

**Interfaces:**
- Consumes: public catalogue and reservation functions from Tasks 3–4.
- Produces: `buildCheckoutQuote(db, cart, fulfilment): Promise<CheckoutQuote>`.
- Produces: `placeSandboxOrder(db, input): Promise<CheckoutResult>`.
- POST `/api/marketplace/quote` and POST `/api/marketplace/checkout`.

- [ ] **Step 1: Write failing quote tests**

Assert that two sellers create two groups, each group has its own fulfilment fee and preparation label, totals use integer Namibia-dollar minor units, and unavailable variants return line-specific errors.

- [ ] **Step 2: Write failing checkout tests**

Assert success creates one customer order, two seller orders, item snapshots, one payment attempt, and order events. Assert a repeated idempotency key returns the same order. Assert `failed`, `cancelled`, `pending`, and `requires_reconciliation` sandbox outcomes do not duplicate an order or silently empty the cart.

- [ ] **Step 3: Run and verify failures**

Run: `node --import tsx --test tests/marketplace-commerce.test.mjs tests/marketplace-checkout-api.test.mjs`

Expected: FAIL because quote and checkout services/routes are missing.

- [ ] **Step 4: Implement server-authoritative quote and checkout**

```ts
export type SandboxOutcome = "succeeded" | "failed" | "cancelled" | "pending" | "requires_reconciliation";
export type CheckoutResult =
  | { ok: true; orderId: string; paymentStatus: PaymentStatus }
  | { ok: false; code: "cart_changed" | "unavailable" | "invalid_fulfilment"; quote?: CheckoutQuote };
```

Ignore client-supplied prices and totals. Rebuild the quote, reserve inventory for 15 minutes, create payment/order records transactionally for successful or delayed outcomes, and return specific recovery codes.

- [ ] **Step 5: Implement API validation**

Limit cart lines to 100, require an idempotency key of 12–120 safe characters, reject non-integer quantities, return `409` for changed/unavailable carts, and set `cache-control: no-store`.

- [ ] **Step 6: Run tests, typecheck, and commit**

Run: `node --import tsx --test tests/marketplace-commerce.test.mjs tests/marketplace-checkout-api.test.mjs && npm run typecheck`

Expected: PASS.

Commit: `git add app/marketplace app/api/marketplace tests/marketplace-commerce.test.mjs tests/marketplace-checkout-api.test.mjs && git commit -m "feat: add sandbox marketplace checkout"`

### Task 6: Build the Customer Checkout and Tracking Journey

**Files:**
- Create: `site/app/MarketplaceCheckout.tsx`
- Create: `site/app/MarketplaceOrder.tsx`
- Create: `site/app/api/marketplace/orders/[id]/route.ts`
- Modify: `site/app/StylishMeApp.tsx`
- Modify: `site/app/globals.css`
- Test: `site/tests/marketplace-customer-view.test.mjs`

**Interfaces:**
- Consumes: quote and checkout routes from Task 5.
- Produces: customer views for seller-grouped cart quote, three-stage checkout, payment recovery, confirmation, and seller timelines.

- [ ] **Step 1: Write failing customer-view tests**

Render a two-seller quote and assert seller headings, preparation times, separate fees, full total, and “Sandbox payment” copy. Simulate Place Order twice and assert one request. Cover failed payment retaining cart, pending payment guidance, and an order containing two seller timelines.

- [ ] **Step 2: Run and verify failure**

Run: `node --import tsx --import ./tests/dom-setup.mjs --test tests/marketplace-customer-view.test.mjs`

Expected: FAIL because the components do not exist.

- [ ] **Step 3: Implement focused components**

`MarketplaceCheckout` accepts current cart lines, calls quote on entry and fulfilment changes, maintains `fulfilment | payment | review | processing | result` UI state, and disables Place Order while processing. It calls `onOrderPlaced(orderId)` only for `succeeded`, `pending`, or `requires_reconciliation` results and calls `onPreserveCart()` on failure/cancellation.

`MarketplaceOrder` renders customer order summary plus a separate timeline section for every seller order. It never renders a courier map.

- [ ] **Step 4: Integrate without deleting the legacy fallback**

Route the existing cart checkout action into `MarketplaceCheckout` when every cart line resolves to a normalized variant. Otherwise preserve the current demo checkout with an explicit “Preview checkout” label until catalogue migration covers the line.

- [ ] **Step 5: Add accessible loading and recovery states**

Use `aria-live="polite"` for quote/payment status, label all steps, focus the failure heading after a failed attempt, and provide Retry and Choose another method actions while preserving the cart.

- [ ] **Step 6: Run view tests, the existing suite, and commit**

Run: `npm test && npm run typecheck && npm run lint`

Expected: PASS.

Commit: `git add app/MarketplaceCheckout.tsx app/MarketplaceOrder.tsx app/StylishMeApp.tsx app/globals.css app/api/marketplace/orders tests/marketplace-customer-view.test.mjs && git commit -m "feat: add trusted customer checkout journey"`

### Task 7: Build the Seller Attention Queue and Item Confirmation

**Files:**
- Create: `site/app/api/marketplace/seller/orders/route.ts`
- Create: `site/app/api/marketplace/seller/orders/[id]/confirm/route.ts`
- Create: `seller-app/app/SellerOrderQueue.tsx`
- Create: `seller-app/app/SellerOrderDetail.tsx`
- Modify: `seller-app/app/SellerApp.tsx`
- Modify: `seller-app/app/globals.css`
- Test: `site/tests/marketplace-seller-orders-api.test.mjs`
- Test: `seller-app/tests/marketplace-orders.test.mjs`

**Interfaces:**
- Consumes: seller orders, items, transitions, and events from Tasks 1–2 and orders from Task 5.
- GET seller orders returns urgency-sorted `SellerOrderSummary[]`.
- POST confirm accepts `{ decisions: Array<{ orderItemId: string; decision: "confirm" | "unavailable" }> }`.

- [ ] **Step 1: Write failing seller API tests**

Assert seller ownership filtering, urgent-deadline ordering, rejection of another seller’s order, item-level mixed decisions, inventory release for unavailable items, and creation of customer-visible events.

- [ ] **Step 2: Write failing seller component tests**

Assert “Needs attention” is the first operational section, each item opens the exact order, product/size/colour/quantity/location/deadline are visible, and confirmation waits for server success before changing status.

- [ ] **Step 3: Run and verify failures**

Run: `node --import tsx --test tests/marketplace-seller-orders-api.test.mjs`

Run in `seller-app`: `node --import tsx --test tests/marketplace-orders.test.mjs`

Expected: FAIL because routes and components are missing.

- [ ] **Step 4: Implement seller API ownership and transitions**

Resolve seller identity from the existing invitation token during this release, map it to a normalized seller ID, verify seller-order ownership, validate every item belongs to that seller order, and apply all decisions transactionally. Return `409` when an item is no longer awaiting confirmation.

- [ ] **Step 5: Implement operational seller views**

Replace the hard-coded orders list with `SellerOrderQueue`. Display countdown/deadline copy from server timestamps, not client fixtures. `SellerOrderDetail` submits item decisions once, disables controls during the request, and displays exact retry guidance on failure.

- [ ] **Step 6: Run both app suites and commit**

Run in `site`: `npm test && npm run typecheck`

Run in `seller-app`: `npm test && npm run typecheck && npm run lint`

Expected: PASS.

Commit: `git add site/app/api/marketplace/seller site/tests/marketplace-seller-orders-api.test.mjs seller-app/app seller-app/tests/marketplace-orders.test.mjs && git commit -m "feat: add seller order confirmation workflow"`

### Task 8: Add Deep Links and Preserve Customer Navigation State

**Files:**
- Create: `site/app/cart/page.tsx`
- Create: `site/app/checkout/page.tsx`
- Create: `site/app/products/[slug]/page.tsx`
- Create: `site/app/orders/[id]/page.tsx`
- Modify: `site/app/AppEntry.tsx`
- Modify: `site/app/StylishMeApp.tsx`
- Test: `site/tests/marketplace-routing.test.mjs`

**Interfaces:**
- Consumes: customer components from Task 6.
- Produces: shareable product, cart, checkout, and order routes while the remaining prototype views continue to operate.

- [ ] **Step 1: Write failing route and state-restoration tests**

Assert route entry renders the expected screen, product back navigation preserves `query`, `category`, filters, and a stored scroll offset, and an unauthenticated order route redirects to login with the exact return URL.

- [ ] **Step 2: Run and verify failure**

Run: `node --import tsx --import ./tests/dom-setup.mjs --test tests/marketplace-routing.test.mjs`

Expected: FAIL because route modules are missing.

- [ ] **Step 3: Add thin route entry components**

Each route passes a typed initial destination into `AppEntry` or renders the focused marketplace component. Product links use `/products/${product.slug}`. Order routes require account state and use replacement navigation to `/login?returnTo=${encodeURIComponent(pathname)}`.

- [ ] **Step 4: Preserve search and scroll state**

Encode filter state in URL search parameters. Store only the last scroll offset per results URL in `sessionStorage`; restore it after results render. Do not store private order data in browser history state.

- [ ] **Step 5: Run routing tests and full verification**

Run: `npm test && npm run typecheck && npm run lint && npm run build`

Expected: all commands PASS.

- [ ] **Step 6: Commit**

Commit: `git add app tests/marketplace-routing.test.mjs && git commit -m "feat: add marketplace deep links"`

### Task 9: Verify the Vertical Trust Journey

**Files:**
- Modify: `site/docs/production-readiness-checklist.md`
- Test: all customer and seller suites

**Interfaces:**
- Consumes: Tasks 1–8.
- Produces: documented evidence that the first vertical slice is releasable in sandbox mode.

- [ ] **Step 1: Run clean automated verification**

Run in `site`:

```powershell
npm test
npm run typecheck
npm run lint
npm run build
```

Run in `seller-app`:

```powershell
npm test
npm run typecheck
npm run lint
npm run build
```

Expected: every command exits 0.

- [ ] **Step 2: Complete customer browser walkthrough**

Verify at mobile and desktop widths: normalized product opens, size/colour are required, cart groups two sellers, quote shows fees before payment, double-click creates one attempt, failure preserves cart, success creates one customer order, and each seller has its own timeline.

- [ ] **Step 3: Complete seller browser walkthrough**

Verify at mobile and desktop widths: the new order is first in Needs attention, exact deadline and variant are visible, one item can be confirmed while another is unavailable, failed confirmation remains unconfirmed, and successful decisions appear in the customer timeline.

- [ ] **Step 4: Update the readiness checklist with evidence**

Record commands, dates, sandbox labeling, remaining legacy fallback, and deferred production-provider work. Do not mark live payments or payouts ready.

- [ ] **Step 5: Commit verification evidence**

Commit: `git add docs/production-readiness-checklist.md && git commit -m "docs: verify marketplace trust foundation"`

## Follow-on Plans

After this plan passes verification, create separate detailed plans in this order:

1. Product confidence, nearby availability, semantic search, filters, and guest-state routing completion
2. Seller product drafts, bulk variants, inventory adjustments, made-to-order capacity, and approval workflow
3. Returns, disputes, refunds, seller earnings, holds, and payout ledgers
4. Seller organizations, staff permissions, payout security, privacy, and audit hardening
5. Performance, offline recovery, image pipelines, accessibility, and remaining UI-state coverage
