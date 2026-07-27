# StylishMe Marketplace Reliability Design

**Date:** 2026-07-28  
**Status:** Approved  
**Scope:** Customer app, seller app, shared marketplace services, and the admin controls required to operate them safely

## 1. Objective

StylishMe must become a dependable Namibian fashion marketplace rather than a polished prototype. The first program of work will make one complete journey reliable:

`Seller lists a fulfilable product -> customer finds the right variant -> customer checks out -> seller confirms and prepares each item -> customer tracks fulfilment -> earnings and payouts update -> either party can handle a return`

The customer promise is:

> Discover and shop Namibian fashion from trusted local designers, with products available for delivery or pickup near you.

The release succeeds when a customer can find a local outfit in their size, understand where and when it is available, pay without ambiguity, and receive or return it through visible marketplace workflows. It also succeeds when a seller can publish accurate variants, act on urgent orders, maintain stock, fulfil items, handle returns, and understand earnings without relying on WhatsApp or spreadsheets.

AI styling, visual search, virtual try-on, loyalty, open messaging, advanced analytics, and other expansion features remain secondary until the transaction journey is dependable.

## 2. Delivery Strategy

Use a vertical trust journey across the customer and seller apps. Replace prototype state incrementally while preserving useful visual and interaction work.

The work is divided into independently releasable slices:

1. Shared marketplace domain and normalized persistence
2. Catalogue, product confidence, variants, and inventory
3. Real routes, search, filters, guest state, and nearby availability
4. Seller-grouped cart and sandbox checkout
5. Seller confirmation, fulfilment, and customer tracking
6. Returns, earnings, payouts, and role protection
7. Resilience, accessibility, performance, and operational hardening

Every slice must leave both apps usable. A UI must not claim that an operation is real until the corresponding server-authoritative behavior exists.

## 3. Shared Marketplace Architecture

The customer app, seller app, and admin tools use one source of truth. JSON blobs and hard-coded operational examples may remain only as isolated demo fixtures while their domain is being migrated.

### 3.1 Bounded domains

- **Catalogue:** sellers, designers, categories, products, images, attributes, sizes, colours, variants, size guides, collections, approval, and made-to-order configuration.
- **Inventory:** available-to-sell quantities, reservations, stock locations, external sales, adjustments, reason codes, and immutable history.
- **Commerce:** guest and account carts, seller groupings, promotions, fulfilment selections, fees, totals, checkout attempts, and idempotency.
- **Orders:** customer orders, seller orders, order items, item confirmation, deadlines, status events, cancellation, delivery, and pickup.
- **Payments:** payment attempts, provider adapters, callbacks, reconciliation, refunds, and failure recovery.
- **Seller finance:** commission, processing fees, return adjustments, held earnings, available earnings, payout schedules, and ledger entries.
- **Returns:** customer requests, evidence, seller responses, platform decisions, responsibility, shipment, receipt, and refund status.
- **Identity:** customer profiles, guest-state merging, seller organizations, staff roles, sessions, ownership, and audit records.
- **Merchandising:** homepage sections, designer stories, drops, nearby placements, and collections without owning product truth.

Each domain exposes typed service functions and typed API envelopes. Views must not reproduce pricing, stock, permission, or state-transition rules.

### 3.2 Order hierarchy

A checkout creates one customer order and one seller order per seller:

```text
Customer order
|- Seller order: Omutima Studio
|  |- Items and item-level confirmation
|  |- Fulfilment choice and fees
|  `- Seller-specific timeline
`- Seller order: Desert Thread
   |- Items and item-level confirmation
   |- Fulfilment choice and fees
   `- Seller-specific timeline
```

Customer totals aggregate the seller orders. Fulfilment promises, confirmations, cancellations, and tracking remain seller-specific.

## 4. Data Model

Use normalized records with stable IDs, foreign keys, timestamps, explicit statuses, ownership indexes, and immutable event or ledger records where history matters.

Required entities include:

- users, customer profiles, addresses, saved sizes, and preferences;
- seller organizations, stores, locations, memberships, roles, and security events;
- designers, categories, products, media, product measurements, size guides, collections, and approval feedback;
- variants, inventory locations, inventory balances, reservations, and adjustments;
- carts, cart items, fulfilment selections, checkout attempts, and pricing snapshots;
- customer orders, seller orders, order items, fulfilment records, and order events;
- payment attempts, refunds, financial ledger entries, payouts, and payout items;
- return requests, return items, evidence, decisions, events, and shipping responsibility;
- wishlists, wishlist items, alerts, designer follows, and saved looks.

Order items retain product, variant, seller, price, policy, and fulfilment snapshots so historical orders remain understandable after a product changes or is archived.

Products with order history are never hard-deleted. They can be paused, archived, or removed from sale.

## 5. Customer Experience

### 5.1 Brand and homepage

The homepage leads with:

> Discover Namibian fashion near you.  
> Shop clothing, footwear and accessories from trusted local designers.

Search, selected town, primary categories, new products, nearby availability, designers, and complete looks appear early. Layouts alternate among an editorial campaign, product carousel, two-column grid, designer story, nearby pickup list, collection banner, and complete-look breakdown.

Primary catalogue navigation is:

`New | Women | Men | Shoes | Accessories | Designers`

Discovery treatments are:

`Near You | Made in Namibia | Drops | Sale`

The selected category or discovery filter has a strong active state.

### 5.2 Routes and navigation state

Customer destinations use real URLs:

```text
/
/shop
/search
/wishlist
/cart
/products/[slug]
/designers/[slug]
/looks/[slug]
/checkout
/orders/[id]
/returns/[id]
/profile
```

Search parameters encode query, category, filters, sort, and location where appropriate. Returning from a product restores the results, filters, pagination, and scroll position. Filter overlays do not create noisy history entries. Logout uses replacement navigation and clears private cached state so browser Back cannot reveal protected content.

Fake device status bars are removed. The PWA uses safe-area insets supplied by the device.

### 5.3 Search, filters, and no results

Search matches products, designers, collections, looks, and categories. It extracts known colour, category, occasion, town, designer, and price signals from a query without inventing catalogue results.

Quick filters are My size, Near me, Available today, Made in Namibia, Price, Colour, and Designer. The full panel adds category, town, pickup, delivery, material, occasion, ready-made, made-to-order, and sale.

The apply action displays the result count. No-result views explain that no exact match was found and offer similar products, a removable filter, broader fulfilment location, and an optional saved alert.

### 5.4 Nearby availability

“Near You” appears only when backed by a configured customer town and an inventory or production location. The section displays the selected town and a Change action.

Product cards may display pickup timing, suburb, distance, closing time, and size-specific availability. Distances are shown only when both customer and location coordinates are available; otherwise the app uses truthful town and suburb language.

### 5.5 Product confidence

Product pages prioritize the customer’s purchase questions before secondary storytelling:

- image gallery with front, back, and detail images;
- optional short video when genuine media exists;
- product name, verified seller, price, colours, and variant-level size availability;
- fit description, garment measurements, size guide, model height, and model size;
- material, care, ready-made or made-to-order status, and preparation time;
- pickup availability by location and selected variant;
- delivery estimate and fee range;
- return eligibility and key conditions;
- seller trust information and verified customer reviews.

Unavailable sizes are disabled. Required variants must be selected before Add to Cart. Fit recommendations are labelled as guidance and never guarantee fit. Purchase controls remain reachable while scrolling.

### 5.6 Wishlist and guest state

Guests can browse, search, save products and looks, and maintain a cart. Wishlist actions respond immediately and persist locally. Login is required only for checkout completion, cross-device sync, orders, alerts, and returns.

On login, guest and account wishlists are unioned. Cart lines with the same product, variant, and fulfilment context merge up to authoritative stock. Conflicts are explained rather than silently discarded. After login, the customer returns to the originating route.

### 5.7 Shop the Look

A look identifies every included product, seller, selected size, availability, and price. Customers can select variants, remove items, replace unavailable pieces with catalogue alternatives, save the whole look, and add selected items to the cart.

The price label states “Complete look” and updates when items change. The interface explains multiple sellers and separate fulfilment before cart addition.

### 5.8 Cart and checkout

Cart lines are grouped by seller. Each seller group displays products, variants, quantities, preparation time, available pickup or delivery methods, fees, policies, and whether made-to-order items are involved.

Checkout has three stages:

1. Delivery or pickup
2. Payment
3. Review and place order

The complete subtotal, discounts, seller-specific fees, total, fulfilment estimates, and return information remain visible. The local address form supports town, suburb, street, landmark, delivery instructions, phone number, and an optional map pin.

### 5.9 Confirmation, tracking, pickup, and returns

Confirmation shows the order number, seller groups, products, total, payment status, fulfilment choices, and next expected action. It truthfully explains when sellers still need to confirm availability.

Each seller order exposes a human-readable event timeline. Pickup details include location, hours, directions, collection deadline, support, and a single-use code or QR token verified by the seller.

From an eligible order item, a customer can choose a reason, add supporting evidence when relevant, choose an allowed resolution, submit the request, and follow its timeline.

## 6. Seller Experience

### 6.1 Operational navigation

Seller destinations use real routes:

```text
/
/orders
/orders/[id]
/products
/products/new
/products/[id]
/inventory
/returns
/returns/[id]
/earnings
/payouts
/store
/settings/team
```

Desktop uses a business-oriented sidebar and top bar. Mobile uses a compact drawer and task-focused cards, not customer-style discovery navigation.

### 6.2 Dashboard and attention queue

The first screen prioritizes actionable work:

- orders awaiting confirmation;
- deadlines due today or approaching;
- low or zero-stock variants;
- returns awaiting a response;
- products with precise approval feedback;
- failed or scheduled payouts.

Items sort by urgency and open the exact record and action. Analytics appear after operational work.

### 6.3 Seller orders and fulfilment

An order view displays image, product, variant, quantity, stock location, fulfilment method, preparation deadline, and relevant customer note. Sellers can confirm or report unavailability at item level. A partially unavailable seller order does not require rejecting its other items.

Ready-made statuses are:

`Needs confirmation -> Confirmed -> Preparing -> Ready for pickup / Waiting for courier -> Shipped -> Completed`

Made-to-order work may add:

`Materials confirmed -> Production started -> Fitting required -> Finishing -> Quality check -> Ready`

Every status explains the next action. Deadlines remain visible in lists and detail views. Failed server updates do not appear confirmed locally.

### 6.4 Product creation and approval

The initial product form captures images, name, category, price, sizes, colours, stock or capacity, and fulfilment type. Product-type-specific sections capture material, fit, care, model information, delivery, returns, search tags, and measurements. Accessories do not inherit irrelevant clothing requirements.

Drafts autosave locally and synchronize to the server when possible. The UI displays saved and unsynced states, warns before abandoning unsynced changes, and resumes incomplete drafts. Sellers can duplicate a product and bulk-generate variants from selected sizes and colours.

Approval feedback identifies the exact image or field, explains the correction, links to it, and shows submission time and expected review window. Preview uses the real customer product card and product page components at mobile and desktop widths.

### 6.5 Inventory and made-to-order capacity

Inventory is variant- and location-specific. Sellers can search a variant and perform Stock received, External sale, Damaged, Returned, Correction, or Transfer actions. Each adjustment records actor, time, reason, quantity, location, and optional note. Existing balances are never silently overwritten.

Made-to-order products use capacity, booking slots, lead time, current queue, materials state, and next available start date. They do not advertise fictional physical quantities.

### 6.6 Returns

Seller return views show the customer reason, item, variant, evidence, policy snapshot, order history, timeline, delivery-cost responsibility, and payout effect. Sellers can accept, request information, dispute, or escalate to platform support within policy and deadline constraints.

### 6.7 Earnings and payouts

Financial labels remain consistent:

- Sales: customer item value before deductions
- Earnings: sales after commission, processing fees, and adjustments
- Pending: earnings not yet eligible for payout
- Held: earnings blocked by a return, dispute, or security control
- Available: earnings eligible for the next payout
- Paid: completed payout value

Statements itemize product sales, commission, processing fees, refund adjustments, and net earnings. Payouts show the amount, scheduled date, included orders, exclusions, deductions, and hold reasons.

Changing payout details requires reauthentication, confirmation, a security notification, an audit record, and a temporary payout hold.

### 6.8 Roles and privacy

Seller organization roles are Owner, Product manager, Order manager, Inventory staff, and Finance manager. Permissions are checked server-side. Only authorized finance roles can access payouts or change payout details.

A seller sees only customer information needed to fulfil its seller order or handle its return. Other orders, wishlists, payment methods, and private style data are never exposed.

## 7. Transaction Reliability

### 7.1 Pricing and checkout

The server calculates product totals, discounts, fulfilment fees, taxes if configured, and the final total. The client displays calculations but does not authorize them.

Before payment, checkout revalidates price, availability, fulfilment, and policy snapshots in one transaction. Material differences return the customer to review with a precise explanation.

### 7.2 Inventory reservations

Checkout creates time-limited reservations for stocked variants. Reservation creation, payment transition, order creation, expiration, and release are transactional and idempotent. Made-to-order capacity uses time-limited slot reservations.

### 7.3 Payment states

Canonical payment states are:

`created | processing | pending | succeeded | failed | cancelled | requires_reconciliation | refunded | partially_refunded`

Place Order is disabled while a request is active. Every attempt uses an idempotency key. A failed or cancelled payment preserves the cart. An ambiguous callback enters reconciliation and shows a truthful delayed-confirmation state rather than false failure or success.

The first adapter is explicitly labelled sandbox. No screen implies that real money moved. A production provider is enabled only after merchant eligibility, credentials, signed webhook verification, and reconciliation have been tested.

### 7.4 Order events

Order status is derived from append-only events and current item states. Multi-seller orders expose independent seller timelines. Courier maps appear only when a configured courier supplies real location data.

### 7.5 Return states

Canonical return states are:

`submitted | information_required | seller_review | platform_review | approved | declined | item_in_transit | item_received | refund_pending | refunded | closed`

Return decisions create visible financial holds or adjustments. Seller earnings never change without a corresponding ledger entry.

## 8. Failure Recovery and Weak Connections

Every asynchronous surface defines loading, empty, success, partial, offline, and failure states with a specific cause and recovery action.

The apps provide:

- responsive image sources, strong compression, lazy loading, and placeholders;
- limited initial catalogue requests and cached public data;
- persistent guest cart and wishlist state;
- persistent product drafts and upload recovery;
- retries for idempotent operations;
- explicit unsynced indicators;
- safe inventory reservation expiry;
- preserved carts after payment failure;
- image fallbacks that do not misrepresent products.

Financial, inventory, order confirmation, payout, and return decisions are not optimistically finalized before server acknowledgement.

## 9. Security and Auditability

- All private operations validate authenticated user, organization membership, role, and record ownership.
- Protected customer routes redirect through login and return to the intended destination.
- Logout ends the server session, clears private client caches, and uses replacement navigation.
- Payment callbacks require signatures, timestamp checks, idempotency, and reconciliation.
- Inventory adjustments, order transitions, return decisions, approval actions, role changes, and payout changes create audit records.
- Seller support requests opened from a record include the relevant order, product, return, timeline, and actor context without exposing unrelated customer data.
- Destructive actions are separated visually, require confirmation and a reason where appropriate, and use archive or pause when historical records exist.

## 10. Accessibility and Performance

Use semantic landmarks, labelled dialogs, keyboard navigation, visible focus, sufficient contrast, reduced-motion support, touch targets suitable for mobile, and status announcements that do not rely only on colour.

Test representative low-end mobile widths and weak-network profiles. Operational seller tables become stacked mobile rows. Primary customer purchase and seller action controls remain reachable without horizontal scrolling.

## 11. Verification

Automated tests cover:

- variant stock, capacity, reservation expiry, and concurrent purchase conflicts;
- stock adjustment reason and history;
- product validation by category and draft recovery;
- guest wishlist and cart merging;
- route deep links, filter restoration, scroll restoration, and logout Back protection;
- nearby availability truthfulness;
- size selection and Add to Cart guards;
- seller-grouped carts, fulfilment fees, and server totals;
- duplicate checkout submission and all payment states;
- customer-order and seller-order creation;
- item-level confirmation and partial unavailability;
- order and return event timelines;
- return financial holds and refund transitions;
- sales, fee, earnings, balance, and payout calculations;
- seller role and customer privacy boundaries;
- loading, empty, offline, and failure recovery;
- keyboard, landmark, dialog, and status accessibility;
- PWA metadata, production builds, and service-worker behavior.

Each release requires fresh unit and integration tests, type checking, linting, a production build, and mobile and desktop browser walkthroughs. Payment and concurrency boundaries require API-level tests rather than UI-only assertions.

## 12. Explicitly Deferred Work

The following do not block the trust journey and are deferred:

- conversational AI assistants;
- advanced AI outfit generation and styling;
- visual product search;
- virtual try-on expansion;
- loyalty and rewards;
- open customer-seller chat;
- advanced seller benchmarks and customer segmentation;
- bulk catalogue imports;
- social discovery expansion;
- fake or unintegrated courier maps.

These features may be reconsidered only after core commerce metrics show reliable availability, checkout, fulfilment, payouts, and returns.

## 13. Acceptance Criteria

The design is implemented when:

1. Customer and seller apps use the same authoritative catalogue, variant, inventory, order, return, and finance records.
2. A guest can discover, filter, save, and cart products without registration, then merge state safely on login.
3. Product pages provide enough fit, material, availability, fulfilment, return, and seller evidence to support a purchase decision.
4. A multi-seller cart explains fees, timings, and separate fulfilment before checkout.
5. Sandbox checkout handles success, failure, cancellation, pending, duplicate submission, and delayed confirmation without losing the cart or creating duplicate orders.
6. Sellers can confirm items, report partial unavailability, update inventory with history, and meet visible deadlines from mobile or desktop.
7. Customers can track each seller order, collect with a verifiable code, and submit and follow eligible returns.
8. Sellers can distinguish sales, deductions, held earnings, available earnings, and paid payouts.
9. Permissions, privacy, logout, payout changes, and sensitive operations are enforced and audited server-side.
10. Automated and browser verification pass for the supported customer and seller journeys.
