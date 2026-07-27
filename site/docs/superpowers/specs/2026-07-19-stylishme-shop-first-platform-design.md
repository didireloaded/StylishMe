# StylishMe Namibia Shop-First Platform Design

**Date:** 2026-07-19  
**Status:** Approved for autonomous execution  
**Approval basis:** The owner instructed Codex to recommend the safest workable choices and proceed without waiting for additional approvals.

## 1. Product Direction

StylishMe Namibia is first and foremost a complete online clothing shop. Its differentiators are Namibian designer discovery, complete shoppable outfits, and an optional AI-assisted try-on experience that improves purchase confidence.

The platform must remain fully usable when AI services are unavailable. A customer must always be able to browse, search, select stocked variants, add items to the cart, checkout, and track an order without using AI.

The product hierarchy is:

1. Reliable commerce
2. Fashion and designer discovery
3. Shop the Look
4. AI try-on beta
5. Style recommendations
6. Digital wardrobe

All intelligent recommendations must resolve to real catalogue products. The app must never invent a purchasable item, price, stock count, designer, or delivery promise.

## 2. Delivery Strategy

Use a progressive production rebuild. Preserve the existing PWA, editorial visual direction, catalogue interactions, outfit stories, stock-safe cart behavior, and local-first fallback. Replace or isolate prototype-only state behind typed services rather than rewriting the entire user interface at once.

Delivery is split into independently testable releases:

1. **Shop-first storefront and try-on foundation:** navigation, homepage hierarchy, persistent cart access, Wishlist, complete Try On journey, and commerce-connected results.
2. **Secure commerce backend:** normalized catalogue, inventory, carts, checkout, orders, payments, delivery/pickup, returns, authentication, and authorization.
3. **Production AI try-on:** private file storage, consent records, moderation, background generation jobs, configurable OpenAI model, credits, deletion, and retention.
4. **Wardrobe, admin, and operational depth:** wardrobe mixing, designer/admin tools, merchandising, support, auditing, analytics, and scheduled cleanup.

Each release must leave the storefront operational. External integrations must degrade with a truthful unavailable state and must not be represented as complete without valid configuration.

## 3. Customer Navigation

The five primary destinations are:

1. **Home** — campaigns, products, categories, outfits, designers, and recommendations
2. **Shop** — catalogue, search, filters, sorting, and designer/category browsing
3. **Try On** — protected AI outfit preview and external-reference matching
4. **Wishlist** — saved products and complete looks
5. **Profile** — orders, addresses, sizes, payments, preferences, wardrobe, Style Me, privacy, and settings

The cart is removed from bottom navigation and remains visible in the top-right header throughout all shopping and discovery views. The badge shows total cart quantity.

## 4. Home Experience

The home screen opens with clothing and follows this priority:

1. Search
2. Primary editorial campaign
3. New arrivals
4. Shop by category
5. Shop the Look
6. Available Near You
7. Made in Namibia
8. Trending products
9. Designer spotlight
10. AI try-on promotional card
11. Recommended products
12. Recently viewed

Layouts should alternate between an editorial hero, product grids, story tiles, category chips, designer cards, and compact carousels. The page must not become a stack of visually identical horizontal rails.

The existing outfit story row remains. Stories contain outfits only and support saving a look, opening the full outfit, and adding stocked pieces to the cart.

## 5. Core Shopping Journey

The primary journey is:

`Home -> Browse/Search -> Product -> Select size and colour -> Cart -> Delivery/pickup -> Payment -> Confirmation -> Tracking`

Rules:

- Product price, stock, and totals are server-authoritative in production.
- A cart line is identified by product, size, and colour.
- Quantity cannot exceed stock.
- Checkout revalidates every line before payment creation.
- Duplicate checkout submissions are idempotent.
- Order states are explicit and auditable.
- Failed or unavailable integrations keep the cart intact and show a recovery action.

## 6. Shop the Look

An outfit contains multiple catalogue products and optional editorial metadata. Customers can:

- select a stocked size for each item;
- remove an item;
- replace one item while retaining the rest of the look;
- save the complete look;
- try on the look;
- add all available selected pieces to the cart;
- open and shop each product individually;
- see unavailable items and the recalculated total.

Replacement candidates must match the same broad category and remain within the requested price direction when one is selected.

## 7. AI Try-On Beta

### 7.1 Entry points

- Try On tab
- Product details
- Shop the Look
- Saved looks
- Style Me inside Profile/Try On
- External reference upload

### 7.2 Flow

1. Explain the preview and display the fit disclaimer.
2. Require consent and image-rights confirmation.
3. Accept camera, gallery, or saved-photo input.
4. Validate file type, size, dimensions, and full-body guidance before submission.
5. Choose a StylishMe product/look or upload a reference.
6. Review clothing transfer using MVP options: Outfit only, Outfit and shoes, or Complete look.
7. Select portrait settings and background behavior.
8. Confirm credit cost and remaining balance.
9. Moderate person image, reference image, and any text instruction.
10. Upload privately and create a server-side job.
11. Process the generation without exposing provider credentials.
12. Show meaningful job states, never a fabricated percentage.
13. Display an AI-generated label, before/after comparison, linked products, prices, stock, sizes, delivery estimate, and outfit total.
14. Allow saving, adding items to cart, regenerating, remixing, reporting, sharing privately, and deleting.
15. Collect private quality feedback about identity and garment accuracy.

### 7.3 Disclaimer

Use this meaning consistently: “This is a visual style preview. It does not guarantee exact sizing, tailoring, material behaviour, or real-world fit.”

### 7.4 Consent and safety

The continue action remains disabled until the user confirms that the image is theirs or they have permission to use it, understands it is AI-generated, accepts the privacy terms, and satisfies the approved age policy.

Reject unsupported formats, oversized files, multiple people, cropped full-body images, prohibited content, or unestablished consent with a specific human-readable reason. Never silently accept a poor input.

### 7.5 Jobs and progress

Canonical statuses:

- `queued`
- `validating`
- `moderation_failed`
- `preparing`
- `generating`
- `completed`
- `failed`
- `cancelled`
- `deleted`

Progress messages may include “Checking your images,” “Preparing the outfit,” “Creating your preview,” “Preserving your features,” and “Finishing the details.” Users may leave the screen and receive an in-app notification when complete.

### 7.6 Credits

Credits can be free monthly, premium, promotional, purchased, refunded, or administratively adjusted. A credit is reserved only after a generation request is accepted and finalized as charged only when provider processing begins. Internal failures return the reserved credit. Moderation rejection does not consume a credit.

### 7.7 Privacy and retention

Originals and results use private storage and short-lived signed URLs. Store user ID, consent version and timestamp, source/reference paths, job settings, status, provider/model, credit events, created/completed/expiry timestamps, and deletion state.

Customers can delete one result, its source image, all try-on history, or disable automatic source saving. Expired files and corresponding accessible records are removed by a scheduled cleanup process.

## 8. Style Me and Wardrobe

For the MVP, Style Me is a secondary experience inside Try On and Profile. It accepts occasion, location, date/time, budget, colours, formality, clothing category, and owned-item constraints. Initial recommendations are deterministic and use only available catalogue products. The interface and result schema permit a future AI stylist without changing the shopping UI.

Wardrobe begins as a Profile destination. Customers can add an owned item with image, category, colour, brand, and size; archive/delete it; save combinations; and mix owned items with catalogue items. Calendar, packing, gap detection, and advanced wardrobe intelligence remain Phase 2.

## 9. Sizing Profile

Onboarding and Profile capture usual clothing size, shoe size, height range, and preferred fit. Product pages may show a best-match suggestion and fit note, clearly identified as guidance rather than a guarantee. Phase 2 adds product/brand history, confidence scores, and buyer fit feedback.

## 10. Designer Experience

Each designer page includes brand story, designer introduction, location, collection/lookup imagery, current products, pickup/delivery options, reviews, social/contact links, follow/save actions, and similar designers. All calls to action return to purchasable products or collections.

## 11. Backend Architecture

The current deployment uses a Next-compatible TypeScript PWA on Cloudflare/ChatGPT Sites with D1-compatible persistence. Keep the domain layer provider-neutral so a future Supabase migration does not require rewriting customer views.

Boundaries:

- `catalogue` owns products, variants, prices, images, designers, collections, and outfits.
- `inventory` owns available-to-sell counts and reservations.
- `commerce` owns carts, promotions, checkout, payments, orders, delivery, pickup, returns, and refunds.
- `identity` owns profiles, addresses, preferences, and roles.
- `try-on` owns consent, inputs, jobs, results, credits, reports, and retention.
- `merchandising` owns homepage section ordering and promotions.

Server routes validate typed requests, authorize record ownership, apply rate limits, and return typed success/error envelopes. Secrets never reach client code.

## 12. Data Model

Production persistence needs normalized records for profiles, style preferences, sizes, addresses, designers/follows, categories, products, variants, images, inventory, collections, outfits/items, wishlists/items, saved looks/items, carts/items, orders/items, payments, delivery methods, pickup locations, reviews, notifications, wardrobe items/outfits, try-on jobs/inputs/results, AI credit ledger, consent records, reports, promotions/codes, and admin audit logs.

Use stable IDs, timestamps, foreign keys, status constraints, and indexes for user ownership, catalogue lookup, inventory lookup, order history, and active try-on jobs. Private rows must never be retrievable by another customer.

## 13. Payment and Fulfilment

Use a provider adapter with idempotent payment-intent creation, signed webhook verification, status reconciliation, and a disabled/unconfigured state. Do not hard-code a provider into checkout components. The initial provider is selected only after confirming merchant availability for Namibia; until configured, the deployed preview must call the checkout mode a sandbox and must never imply a real charge occurred.

Delivery supports nationwide delivery and configured pickup locations. Estimates and fees come from server-configured methods. Order tracking uses explicit events rather than a fabricated courier map.

## 14. Admin and Operations

Role-protected admin tools cover catalogue, variants, inventory, designers, collections, outfit builder, homepage merchandising, promotions, pickup locations, orders, returns, reviews, support, reports, try-on jobs, credits, usage/cost metrics, and audit events.

Admin mutations require server authorization and audit actor, action, entity, timestamp, and relevant before/after metadata. Customer-facing state must not trust a client-supplied admin role.

## 15. Resilience and Accessibility

- No dead buttons or placeholder routes.
- Every asynchronous action has loading, success, empty, and failure states.
- AI unavailability never blocks shopping.
- Local fallback may preserve non-sensitive browsing/cart state when remote persistence is unavailable.
- Use semantic controls, keyboard navigation, visible focus states, labelled dialogs, reduced-motion support, and sufficient contrast.
- Avoid fake percentages, fake payments, fake order fulfilment, and fabricated product inventory.

## 16. Visual Direction

Retain premium editorial photography, clear typography, generous spacing, and restrained motion. The current dark fashion-led reference may remain for this iteration, but content hierarchy must read as a shop rather than an AI tool. Avoid SaaS dashboards, dense cards, neon gradients, emoji, excessive glass effects, and repeated identical carousels.

## 17. Verification

Automated coverage must include:

- primary navigation and persistent cart access;
- homepage priority and commerce calls to action;
- product variant and stock rules;
- wishlist and saved looks;
- Shop the Look sizing and bulk-cart behavior;
- try-on consent, file validation, credit policy, status mapping, and AI-unavailable fallback;
- checkout idempotency and price/stock revalidation at service boundaries;
- authorization of private records;
- PWA metadata and offline shell;
- rendered accessibility landmarks and dialog labels.

Each implementation release requires fresh tests, lint, production build, and mobile/desktop browser verification before deployment.

## 18. Deferred Phase 2 Features

- Four-result advanced try-on and high-resolution output
- Fit/formality/modesty and colour editing controls
- AI “What Should I Wear?” generation
- Smart size confidence and brand learning
- Steal This Look image understanding
- Wardrobe calendar, packing, and closet-gap tools
- Private outfit voting
- Designer payouts and advanced sales analytics

These are intentionally deferred until commerce and the single-result try-on beta are reliable.
