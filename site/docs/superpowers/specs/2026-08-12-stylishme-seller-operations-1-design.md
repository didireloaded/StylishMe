# StylishMe Seller Operations 1.0 Design

**Date:** 12 August 2026

**Status:** Approved for implementation planning

**Product boundary:** Strengthen the existing seller workspace for individual designers, boutiques, brands and merchandise sellers. Preserve the established StylishMe identity. Do not activate payments or payouts, invent analytics, add a fake courier map, create open customer messaging, or turn the experience into a generic SaaS dashboard.

## 1. Outcome

Seller Operations 1.0 gives a seller a dependable path from creating a store to publishing accurate products, maintaining stock and fulfilling customer orders. It prioritizes daily operational work over decorative metrics and ensures that the seller workspace and customer catalogue use the same authoritative marketplace records.

The first release is optimized for a store managed by one owner. Ownership and authorization boundaries must permit later staff roles without requiring a catalogue, order or inventory redesign, but staff management is not included in this delivery.

## 2. Experience principles

- Make the next required action immediately understandable.
- Preserve StylishMe's editorial typography, warm neutral palette, photography and restrained motion.
- Use plain fashion-business language instead of technical or accounting terminology.
- Design mobile-first while providing a comfortable desktop workspace.
- Display only real marketplace records and truthful availability states.
- Do not display fictional revenue, earnings, conversion, payout or courier information.
- Keep customer and seller workspaces separate through real routes, sessions and server authorization.
- Keep customer information limited to what the seller needs to fulfil its own order.
- Autosave safe unfinished work and communicate its exact persistence state.
- Require deterministic validation before automatic publication.
- Record inventory and order mutations as auditable server-side events.

## 3. Information architecture

The primary mobile navigation is:

1. Home
2. Orders
3. Products
4. Inventory
5. More

More contains Collections, Store profile, Performance, Notifications, Settings, Switch to shopping and Log out.

Desktop uses equivalent destinations in a compact sidebar. Major destinations use real URLs under a seller namespace. The initial route set is:

- `/seller`
- `/seller/setup`
- `/seller/orders`
- `/seller/orders/:sellerOrderId`
- `/seller/products`
- `/seller/products/new`
- `/seller/products/:productId/edit`
- `/seller/inventory`
- `/seller/collections`
- `/seller/store`
- `/seller/performance`
- `/seller/notifications`
- `/seller/settings`

Browser Back restores the prior seller list, filter and scroll state. It closes a sheet or dialog before leaving its parent screen. After logout, route replacement and renewed session checks prevent Back from revealing private seller content.

## 4. Seller home

The home screen answers: "What should I do next?"

Its content order is:

1. Store status and greeting.
2. Needs attention.
3. Quick actions.
4. Today's operational summary.
5. Top-performing or low-stock products when supported by real events.
6. Recent store activity.
7. Public-store sharing.

Needs attention may include orders waiting for confirmation, approaching preparation deadlines, uncollected pickup orders, low-stock variants, incomplete products, unsynchronized drafts, failed image uploads and incomplete store setup. Every item opens the exact affected record and intended action.

Quick actions are Add product, Confirm orders, Update stock, View public store and Share store. The interface does not show a generic unlabeled plus button as the primary action.

Until real payment events exist, sales and earnings remain explicitly unavailable. Operational counts such as published products, available variants and orders requiring action may be shown from authoritative records.

## 5. Seller onboarding and store readiness

A new seller can explore the workspace before completing setup. Public store activation requires:

- seller identity;
- store or brand name and seller type;
- logo and cover image;
- location;
- delivery areas or a valid pickup location;
- preparation times;
- return information;
- at least one publishable product; and
- successful public-store preview.

Setup saves after every server-confirmed step. A seller can resume on another authenticated device. The readiness screen separates Required before publishing, Recommended for customer confidence, Completed and Needs attention.

Sellers may create private drafts before store activation. No product becomes publicly visible while its seller or store is ineligible.

## 6. Product lifecycle

The product editor contains five steps:

1. Product basics.
2. Images.
3. Options and stock.
4. Delivery, fit and returns.
5. Preview and publish.

Fields adapt to product type. Shoes use shoe-size options. Accessories do not inherit clothing-fit requirements. Ready-made products use sellable stock. Made-to-order products use capacity, production time and queue controls.

Product states are:

- `draft`
- `published`
- `scheduled`
- `paused`
- `out_of_stock`
- `needs_attention`
- `archived`

State transitions are server-validated. Archived products remain available to historical order snapshots but not to public discovery. Paused and out-of-stock products cannot be purchased. Scheduled publication uses a server time and revalidates eligibility at publication time.

Sellers may preview, edit, duplicate, pause, resume, schedule and archive their own products. Destructive changes require confirmation. Duplicate creates a private draft with new product, variant and SKU identities.

## 7. Draft persistence and synchronization

The editor autosaves locally after meaningful changes and synchronizes to the backend when connected. The visible state is one of:

- Saving.
- Saved.
- Saved on this device.
- Waiting for connection.
- Could not save.

Server drafts are versioned. An update supplies the version last read. If another device changed the draft, the backend rejects the stale write and the UI offers a field-aware review instead of silently overwriting newer data.

Leaving with an unsynchronized local draft triggers a warning. Logout clears seller-private local drafts from shared browser storage unless the draft has been safely synchronized. Private seller API responses and drafts are excluded from persistent PWA caches.

## 8. Deterministic automatic publication

A product publishes automatically only when all required checks pass:

- authenticated seller ownership and eligible store;
- valid name, description, category and product type;
- positive NAD price;
- required product-type details;
- valid, owned product images;
- image type, dimensions, size, structure, safety and minimum quality;
- at least one sellable variant or valid made-to-order capacity;
- internally consistent sizes, colours and variants;
- configured delivery or collection;
- valid preparation time; and
- return information.

Publication checks run on the server inside the authoritative mutation. Client checks exist only for immediate guidance. Failed checks return field-specific, plain-language issues. The interface never claims a product is public until the server confirms the published state.

There is no routine manual approval queue. A product that passes deterministic completeness, stock, image and safety requirements publishes automatically. Suspended sellers, prohibited goods, repeated unsafe submissions and security incidents may be blocked through platform safety controls outside the normal publishing journey.

The customer catalogue reads the same published product and variant records. There is no independently maintained seller catalogue copy.

## 9. Product images

Sellers can upload multiple JPG, PNG or WebP images within configured size and dimension limits. They can choose the primary image, reorder, remove, replace, retry a failed upload, inspect customer-card and product-page crops and add alternative text.

The server validates file signatures, decoded structure, dimensions, size, ownership and safety. Storage keys are generated by the server and scoped to the seller and product draft. The browser cannot publish arbitrary external image URLs.

Practical guidance may identify darkness, blur, severe cropping, an unsupported file or a missing recommended view. Guidance never silently edits the listing and never invents materials, colours or product details.

Deleting an unpublished image removes its active reference and schedules safe storage cleanup. Images referenced by published products or historical order snapshots are handled according to retention requirements rather than immediately destroyed.

## 10. Variants and inventory

Selecting sizes and colours generates valid combinations for seller review. Each variant contains:

- immutable variant ID;
- seller-managed unique SKU;
- size;
- colour;
- available quantity;
- reserved quantity;
- low-stock threshold;
- selling status; and
- optional stock location.

The server prevents duplicate combinations and duplicate active SKUs within a seller. Removing a variant referenced by an active cart, reservation or order is rejected or converted to a non-sellable historical state.

Inventory balances are derived from validated mutations. Adjustment reasons are Stock received, External sale, Damaged, Returned, Correction and Transfer. Each event records actor, time, product, variant, location, reason, quantity delta, prior balance, resulting balance and optional note.

The seller cannot reduce available stock below active reservations. Concurrent order reservations and seller adjustments use atomic conditional writes. Repeated requests use idempotency keys where duplicate application would corrupt stock.

Made-to-order inventory uses weekly capacity, current commitments, next available completion date, maximum active commitments and pause state. It is not presented as ordinary on-hand stock.

## 11. Seller orders

A customer checkout may create several seller orders. A seller receives only the seller order and items belonging to its store.

Order filters are Needs action, Confirmed, Preparing, Ready for pickup, With delivery, Completed, Cancelled and Returns. The default is Needs action.

An order detail shows order number, items, images, variant, quantity, stock location, fulfilment method, preparation deadline, relevant customer instructions, allowed actions and an event timeline. It exposes only the minimum customer name, contact and fulfilment details necessary for the seller's part of the order.

The seller can confirm every available item, confirm available items while reporting specific unavailable items, or request platform support. One unavailable item does not automatically reject the remaining items. Confirmation and item unavailability are server-authoritative, idempotent and inventory-safe.

Order states are derived from item and fulfilment events. The frontend cannot assign arbitrary statuses. Every accepted transition records actor, timestamp and relevant reason.

## 12. Preparation and fulfilment

Ready-made preparation may include Verify item and variant, Quality check, Package, Attach order label and Mark ready. Made-to-order preparation may include Materials confirmed, Production started, Fitting required when applicable, Finishing, Quality check and Ready.

Deadlines are calculated from the product and fulfilment snapshot captured at checkout. Later product edits do not rewrite an existing customer's promise.

### Store collection

The collection journey is Confirm items, Prepare, Mark ready, Notify customer, Verify a single-use collection code and Confirm collection. Code verification is server-side, rate-limited and audited. A used or expired code cannot be accepted again.

Collection orders never display courier tracking.

### Delivery

Until a real courier adapter is configured, the delivery journey is Confirm items, Prepare, Mark ready for delivery handoff, record a verified fulfilment reference when available and mark handed over. The customer sees only real recorded events.

There is no DHL integration, simulated courier movement or fake live map. A live map may be reconsidered only when an approved courier supplies authenticated location events.

## 13. Collections and public storefront

Sellers may group their own published products into collections with a title, cover image, story, product ordering and optional release date. A collection never bypasses product publication or stock rules.

The Store profile controls public name, logo, cover, story, seller type, location, delivery areas, pickup options, production approach, returns, custom-order availability and approved social links. Preview renders the same customer-facing components and authoritative data used by the public storefront.

Share actions produce stable, seller-specific store and product deep links. Opening a store deep link initially shows only that store's public catalogue. The visitor can deliberately exit to the wider StylishMe marketplace.

Store states are Open, Temporarily unavailable, Paused and On holiday. Temporary states define dates and whether ready-made stock remains sellable. They cannot silently break existing fulfilment commitments.

## 14. Notifications and activity

Seller notifications prioritize new orders, approaching deadlines, overdue pickup, low or unavailable stock, publication success or failure, image upload failure, returns and account security events.

Each notification deep-links to the exact seller-owned record. Event keys deduplicate repeated notifications. Read state and delivery attempts are stored independently.

The in-app notification centre is authoritative. Email or push delivery is enabled only when its external service, consent and delivery tracking are genuinely configured. Essential operational notifications cannot be disabled without an explicit product and policy decision.

Recent activity uses privacy-safe seller events. It does not expose customer activity from other stores, private wishlists, payment data, try-on content or unrelated browsing history.

## 15. Performance boundaries

Seller Operations 1.0 may show operational counts derived from real catalogue, inventory and order events. Revenue, earnings, conversion, payout, fee and return-rate metrics appear only after their source events and definitions are production-ready.

Every displayed metric states its period and source definition. Empty or unavailable data is described honestly. Placeholder numbers and generated business claims are prohibited.

Advanced seller insights, natural-language analysis and product recommendations are excluded from this delivery. They may later summarize real seller data but must link claims to the underlying records and never publish or mutate records automatically.

## 16. Authentication, authorization and privacy

Every seller route requires an authenticated, active seller session. Every API operation repeats role, store ownership and resource ownership checks on the server.

A seller never receives another seller's products, images, inventory, orders, notifications or store configuration. It also never receives customer payment credentials, customer activity with other sellers, unrelated wishlists, private style information, personal measurements, private photographs or Try On content.

Sensitive mutations use schema validation, rate limits, idempotency where required and audit events. Error responses contain stable public error codes and useful recovery messages without stack traces, SQL details, secrets or another tenant's identifiers.

Ordinary Log out ends the current-device session, clears seller-private client caches and uses route replacement to `/seller/login?reason=logged-out`. Log out of all devices remains a separate security action.

## 17. Error and offline contract

Every network action has idle, processing, success, recoverable-error and final-error states. Buttons disable while a non-repeatable action is processing.

Product drafts may be edited offline and remain clearly labelled local until synchronized. Order confirmations, order transitions, collection-code verification, stock adjustments, publication and store-status changes require server acknowledgement and are never finalized optimistically.

When a seller session expires, safe product draft work remains recoverable after reauthentication. The app does not preserve order/customer payloads in an offline cache. A stale or conflicting mutation returns the latest safe record and a specific next action.

## 18. Accessibility and responsive behaviour

The seller workspace supports keyboard navigation, visible focus, form labels, error summaries, error-focus management, minimum touch targets, status live regions, reduced motion and meaning that does not depend on colour alone.

Mobile prioritizes order confirmation, stock updates, marking items ready, product upload and operational alerts. Tables convert to labelled stacked rows at narrow widths without losing actions or requiring horizontal scrolling. Primary actions remain reachable above safe-area navigation.

## 19. Operational data boundaries

The implementation uses normalized authoritative records for sellers, stores, products, images, variants, inventory events, reservations, collections, seller orders, order items, fulfilment events, notifications and audit events.

Existing JSON seller state may be read temporarily only through an explicit migration boundary. New operational mutations must not deepen dependence on a monolithic state blob. Migration preserves stable public slugs and historical order references.

Product, price, policy, variant, seller and fulfilment snapshots remain attached to historical order items so later catalogue edits do not rewrite prior purchases.

## 20. Store closure and customer-account deletion

Closing a seller store and deleting a StylishMe identity are separate actions.

### Close my store

An authenticated seller may choose Close my store from seller account settings. This removes the seller role and seller workspace while preserving the shared login and customer account.

Before closure, the server checks for active or unfulfilled seller orders, open returns, reserved inventory, pending refunds, unresolved fulfilment obligations and financial records that require resolution. A blocking obligation returns a precise reason and an exact route to the affected record. The client cannot bypass this check.

When closure is allowed, the seller must recently reauthenticate, review the deletion summary and enter the store name as confirmation. The server then atomically prevents new purchases, archives public products and collections, removes seller access, revokes seller-scoped sessions, queues eligible private drafts and unpublished images for deletion and records an audit event. Legally or operationally required order, return, settlement and security records remain under restricted retention.

The closed store and product deep links show a neutral unavailable state and never redirect to another seller. The user is redirected with route replacement to the customer experience and sees: "Your store has been closed. You can continue using StylishMe as a customer."

Store closure enters a seven-day recovery period. The store remains unavailable and the former seller cannot access ordinary seller operations. A restoration request during this period requires reauthentication and may be refused for a security, compliance or conflicting marketplace reason. After the period expires, a cleanup job permanently removes eligible seller-private data.

### Delete my StylishMe account

An authenticated customer may choose Delete my StylishMe account from customer account settings. Deletion is blocked while the identity owns an active seller store, has active orders, uncollected purchases, open returns or disputes, pending refunds or another unresolved obligation. A seller must close the store first.

Deletion requires recent reauthentication, a clear retention summary and explicit typed confirmation. It queues deletion of eligible profile information, profile image, saved addresses, wishlist, wardrobe, saved outfits, notification preferences, optional community posts and reactions, private drafts, device tokens and other customer-private state. Try On images are already transient and must not exist in persistent storage.

Completed-order, refund, fraud-prevention, consent, audit and security records required for legitimate retention are minimized and detached from the live profile through an anonymized customer reference where possible. The deletion operation never removes records needed to preserve another party's order, return or financial history.

Account deletion revokes every session, clears private client and PWA caches and redirects with route replacement to `/login?reason=account-deleted`. Browser Back cannot reveal a private route. A confirmation email is sent only when a transactional email service is genuinely configured.

Account deletion also uses a seven-day recovery period. The identity is inaccessible during that period. A sign-in attempt opens only the deletion-cancellation journey. Cancellation requires reauthentication. After expiry, eligible customer-private data is permanently removed and the login cannot be restored.

Both deletion workflows are idempotent, server-authoritative, rate-limited and audited. Repeated submissions cannot produce partial role, store or identity state.

## 21. Testing and verification

Automated and production-safe verification covers:

- seller session, role and tenant isolation;
- unauthorized direct-route and API access;
- resumable store setup;
- draft autosave, offline state, version conflict and recovery;
- product-type-specific validation;
- deterministic automatic publication and failure explanations;
- image signature, size, dimension, ownership and safety validation;
- variant generation, SKU uniqueness and historical variant protection;
- concurrent inventory adjustments and order reservations;
- inventory idempotency and audit history;
- partial order confirmation and unavailable items;
- allowed order transitions and repeated request safety;
- preparation deadlines from immutable checkout snapshots;
- single-use pickup-code verification;
- truthful delivery states with no fake tracking;
- stable store and product deep links;
- notification deduplication and exact deep links;
- logout, session expiry and private-cache clearing;
- store-closure blockers, reauthentication, role removal and customer redirect;
- closed store and product deep-link behaviour;
- store-closure recovery and final cleanup;
- customer-deletion blockers, anonymization, global session revocation and private-cache clearing;
- account-deletion recovery, cancellation and final cleanup;
- repeated and concurrent deletion-request idempotency;
- weak-network and narrow-mobile behaviour; and
- keyboard, focus, screen-reader status and reduced-motion behaviour.

Production verification uses controlled seller and customer accounts and non-private fixtures. It does not inspect genuine customer payment or private image data.

## 22. Delivery sequence

Implementation proceeds in six independently verifiable stages:

1. Seller routes, session, ownership and data boundaries.
2. Resumable onboarding and store readiness.
3. Product drafts, image handling, variants and automatic publication.
4. Inventory events, reservations and low-stock behaviour.
5. Order confirmation, preparation, pickup and delivery states.
6. Notifications, operational home, accessibility, migration completion and production verification.

Each stage must preserve the current customer experience and shared marketplace integrity. A later stage does not justify fake behaviour in an earlier release.

## 23. Included scope

- Mobile-first seller workspace with real routes.
- Operational seller home.
- Resumable store onboarding and readiness.
- Autosaved, versioned product drafts.
- Product-type-aware editor.
- Secure multi-image management.
- Deterministic automatic publication.
- Variant generation and SKU controls.
- Event-based inventory and reservation integrity.
- Seller-specific orders and partial confirmation.
- Preparation workflows and deadlines.
- Secure store collection codes.
- Truthful delivery handoff states.
- Collections, store profile and stable deep links.
- Operational notifications and activity.
- Server-side tenant isolation, auditability and privacy.
- Safe seller-store closure with customer-account preservation.
- Safe full-account deletion, recovery periods and retained-record minimization.
- Accessibility, weak-network behaviour, tests and production verification.

## 24. Excluded scope

- Real payment activation, refunds and settlement.
- Seller bank verification and payouts.
- Generated revenue, earnings or conversion figures.
- Live courier maps and DHL integration.
- Open customer-to-seller chat.
- Advanced staff invitations and permissions UI.
- Customer segmentation and cross-store customer profiles.
- Generic chatbot or ungrounded business advice.
- Automatic content generation that publishes without seller review.
- Manual routine listing approval.
- Public social feed changes.
- Customer-app visual redesign.

## 25. Acceptance criteria

Seller Operations 1.0 is accepted when an authenticated eligible seller can resume store setup, create and recover a product draft, securely upload images, build valid variants, automatically publish only after deterministic checks, see the same published record in the customer catalogue, adjust inventory with a reason and immutable history, receive and partially confirm only its own order items, complete truthful pickup or delivery preparation, share stable store and product links, and receive exact operational notifications.

It is also accepted only when concurrent and duplicate mutations cannot corrupt stock or order state; another seller's resources remain inaccessible; private customer and Try On data never enter the seller workspace; inactive payment and courier capabilities remain clearly unavailable; private seller data does not remain visible after logout; and the established StylishMe customer experience does not regress.

Store closure is accepted only when unresolved obligations block it precisely; successful closure removes seller access without deleting the customer account; public seller links become unavailable; retained records remain protected; and recovery and final cleanup obey the seven-day lifecycle. Full-account deletion is accepted only when active seller or commerce obligations block it; successful submission revokes all sessions and private caches; retained records are minimized and anonymized where possible; recovery cancellation is isolated from the normal app; and final cleanup cannot be applied twice.
