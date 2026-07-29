# StylishMe Production Commerce Services Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace StylishMe's remaining simulated commerce, fulfilment, account-recovery, seller-catalogue and sharing behavior with secure production-capable services, while keeping external money movement and identity providers disabled until verified credentials and merchant approvals are configured.

**Architecture:** D1 becomes the authoritative catalogue, inventory, order, seller-order, payment, refund, settlement, shipment and account-token store. Customer, seller and admin clients consume role-scoped APIs; DPO Pay, DHL tracking, Resend, Google and Apple are isolated behind small server-only adapters with signed callbacks and explicit configuration checks. Existing editorial UI remains intact and switches from seeded data to normalized API records without exposing private customer information.

**Tech Stack:** Vinext/Next.js, React 19, TypeScript, Cloudflare Workers, D1, R2, Web Crypto, DPO Pay hosted checkout, DHL Unified Tracking API, Resend email API, Google OpenID Connect and Sign in with Apple.

## Global Constraints

- Preserve the established StylishMe customer, seller and private-admin visual identity.
- Never collect or store raw card data; payment entry occurs only on DPO Pay's hosted checkout.
- All price, stock, seller allocation, commission, refund and payout values are calculated on the server in integer NAD cents.
- Payment callbacks, refund requests and courier updates are idempotent and signature-verified.
- Inventory reservations expire automatically and cannot oversell a variant.
- The owner dashboard receives aggregates and operational identifiers only, never payment credentials, full addresses, private photos or try-on images.
- Customer deletion anonymizes the account while retaining legally required order, refund and settlement records.
- Google and Apple accounts use provider subject identifiers, not email addresses, as external identity keys.
- DPO settlement and seller payouts remain unavailable until StylishMe has a signed marketplace agreement or the regulatory approval required by the Bank of Namibia.
- No provider button or live-money action appears enabled when its server configuration is incomplete.

---

### Task 1: Normalized commerce schema

**Files:**
- Create: `site/drizzle/0007_production_commerce.sql`
- Modify: `site/db/schema.ts`
- Create: `site/tests/commerce-schema.test.mjs`
- Modify: `site/package.json`

**Interfaces:**
- Produces tables for `catalog_products`, `inventory_variants`, `inventory_reservations`, `commerce_orders`, `commerce_order_items`, `seller_orders`, `payment_attempts`, `refunds`, `ledger_entries`, `payout_batches`, `shipments`, `shipment_events`, `auth_identities`, `auth_action_tokens`, and `account_deletion_requests`.

- [ ] Write schema tests that assert integer-money columns, unique idempotency keys, inventory checks, seller/order foreign keys, immutable ledger linkage and token-expiry indexes.
- [ ] Run `node --test tests/commerce-schema.test.mjs` and confirm it fails because migration 0007 and typed tables do not exist.
- [ ] Add the migration and matching Drizzle schema exports.
- [ ] Add the new test to the main `npm test` command.
- [ ] Run the focused schema test and full type check.
- [ ] Commit the verified schema.

### Task 2: Seller catalogue normalization and deep links

**Files:**
- Create: `site/app/catalogue-domain.ts`
- Create: `site/app/catalogue-storage.ts`
- Modify: `site/app/api/seller-state/route.ts`
- Modify: `site/app/api/catalog/route.ts`
- Create: `site/app/stores/[storeSlug]/page.tsx`
- Create: `site/app/stores/[storeSlug]/products/[productSlug]/page.tsx`
- Modify: `site/app/unified-domain.ts`
- Modify: `site/app/AppEntry.tsx`
- Modify: `site/app/StorefrontView.tsx`
- Modify: `site/app/StylishMeApp.tsx`
- Create: `site/tests/catalogue-integration.test.mjs`
- Create: `site/tests/deep-links.test.mjs`

**Interfaces:**
- Produces `normalizeSellerCatalogue(state, sellerId)`, `catalogueProductUrl(storeSlug, productSlug)`, and public API records with stable store/product slugs and variant identifiers.

- [ ] Write failing tests proving a seller's validated live products enter the public catalogue, drafts never do, duplicate slugs are resolved deterministically, and shared URLs use `/stores/:storeSlug/products/:productSlug`.
- [ ] Run the focused tests and confirm failures caused by the missing normalized catalogue and routes.
- [ ] Implement transactional catalogue synchronization after seller-state validation.
- [ ] Update public catalogue reads and customer discovery to combine seeded launch inventory with normalized live seller records.
- [ ] Add server-rendered store and product deep-link routes with safe not-found behavior and Back restoration.
- [ ] Run focused tests, interaction tests, type check and lint.
- [ ] Commit the verified catalogue and routing release.

### Task 3: Atomic stock reservations and authoritative orders

**Files:**
- Create: `site/app/inventory-reservations.ts`
- Create: `site/app/commerce-orders.ts`
- Modify: `site/app/api/orders/route.ts`
- Create: `site/app/api/orders/[orderId]/route.ts`
- Modify: `site/app/StylishMeApp.tsx`
- Create: `site/tests/inventory-reservations.test.mjs`
- Create: `site/tests/commerce-orders.test.mjs`

**Interfaces:**
- Produces `reserveOrderInventory`, `releaseExpiredReservations`, `confirmReservation`, and customer-safe order projections.

- [ ] Write failing tests for concurrent reservation rejection, idempotent order creation, reservation expiry, exact seller allocation and integer server pricing.
- [ ] Run the focused tests and verify the missing implementation failures.
- [ ] Implement conditional D1 reservations with unique checkout idempotency keys and expiry timestamps.
- [ ] Create normalized customer and seller order records only from a valid reservation.
- [ ] Return safe order summaries and remove `orders_json` as an order authority while retaining migration compatibility.
- [ ] Update checkout processing, retry and sold-out feedback without changing its visual direction.
- [ ] Run focused tests, full customer tests, type check and lint.
- [ ] Commit the verified reservation/order release.

### Task 4: DPO Pay checkout, callbacks and refunds

**Files:**
- Create: `site/app/payments/payment-provider.ts`
- Create: `site/app/payments/dpo-pay.ts`
- Create: `site/app/api/payments/session/route.ts`
- Create: `site/app/api/payments/dpo/callback/route.ts`
- Create: `site/app/api/orders/[orderId]/refunds/route.ts`
- Modify: `site/app/StylishMeApp.tsx`
- Modify: `site/.env.example`
- Create: `site/tests/dpo-pay.test.mjs`
- Create: `site/tests/payment-callback.test.mjs`
- Create: `site/tests/refunds.test.mjs`

**Interfaces:**
- Produces `PaymentProvider.createCheckout`, `verifyPayment`, `refundPayment`, signed callback handling and idempotent payment state transitions.

- [ ] Write failing tests for XML escaping, no card-data handling, callback verification, amount/currency matching, replay rejection, failed-payment stock release and refund limits.
- [ ] Run the focused tests and verify failures are caused by missing provider code.
- [ ] Implement DPO token creation and hosted redirect using server-only company/service credentials.
- [ ] Verify every callback with DPO before marking an order paid and confirming inventory.
- [ ] Implement owner-authorized full/partial refunds and immutable refund ledger entries.
- [ ] Show live payment only when all DPO variables are configured; otherwise retain an explicit non-payable preview state.
- [ ] Run focused tests, full tests, type check and lint.
- [ ] Commit the verified payment/refund release.

### Task 5: Multi-seller settlement and payout controls

**Files:**
- Create: `site/app/settlements.ts`
- Create: `site/app/api/seller-payouts/route.ts`
- Create: `site/app/api/admin/payout-batches/route.ts`
- Modify: `site/app/SellerApp.tsx`
- Modify: `site/app/api/admin-feed/route.ts`
- Modify: `admin/app/AdminDashboard.tsx`
- Create: `site/tests/settlements.test.mjs`
- Modify: `admin/tests/admin-dashboard.test.mjs`

**Interfaces:**
- Produces balanced per-order ledger entries, configurable commission snapshots, refundable seller balances, payout batches and provider-neutral payout export records.

- [ ] Write failing tests proving ledger entries balance to zero, commission is snapshotted, refunds reduce payable balances, duplicate payouts are rejected and unapproved sellers cannot be paid.
- [ ] Run the focused tests and verify the expected missing behavior.
- [ ] Implement the settlement ledger and payout-batch lifecycle.
- [ ] Add real seller earnings and order-linked payout records without exposing customer PII.
- [ ] Keep provider execution locked behind `MARKETPLACE_PAYOUTS_ENABLED=true` and an approved provider adapter.
- [ ] Run customer/admin tests, type checks and lint.
- [ ] Commit the verified settlement-control release.

### Task 6: Seller fulfilment and real tracking

**Files:**
- Create: `site/app/fulfilment.ts`
- Create: `site/app/shipping/shipping-provider.ts`
- Create: `site/app/shipping/dhl-tracking.ts`
- Create: `site/app/api/seller-orders/route.ts`
- Create: `site/app/api/seller-orders/[orderId]/status/route.ts`
- Create: `site/app/api/shipments/[shipmentId]/route.ts`
- Create: `site/app/api/shipments/dhl/webhook/route.ts`
- Modify: `site/app/SellerApp.tsx`
- Modify: `site/app/StylishMeApp.tsx`
- Modify: `site/.env.example`
- Create: `site/tests/fulfilment.test.mjs`
- Create: `site/tests/dhl-tracking.test.mjs`

**Interfaces:**
- Produces validated delivery and collection state machines, seller-scoped fulfilment records, shipment events and customer-safe tracking summaries.

- [ ] Write failing tests for seller ownership, legal status transitions, collection orders without courier tracking, webhook authentication, duplicate event handling and customer-safe projections.
- [ ] Run focused tests and verify the missing implementation failures.
- [ ] Implement seller order queues and fulfilment actions against normalized seller orders.
- [ ] Implement DHL tracking lookup/push adapter and a manual tracking-number path for contracted Namibian couriers without public APIs.
- [ ] Replace fabricated timelines with stored shipment or collection events.
- [ ] Run focused tests, interaction tests, type check and lint.
- [ ] Commit the verified fulfilment release.

### Task 7: Email verification, password recovery and account deletion

**Files:**
- Create: `site/app/email/resend.ts`
- Create: `site/app/auth-action-tokens.ts`
- Modify: `site/app/api/auth/signup/route.ts`
- Modify: `site/app/api/auth/login/route.ts`
- Create: `site/app/api/auth/verify-email/route.ts`
- Create: `site/app/api/auth/resend-verification/route.ts`
- Create: `site/app/api/auth/forgot-password/route.ts`
- Create: `site/app/api/auth/reset-password/route.ts`
- Create: `site/app/api/account/delete/route.ts`
- Create: `site/app/verify-email/page.tsx`
- Create: `site/app/forgot-password/page.tsx`
- Create: `site/app/reset-password/page.tsx`
- Modify: `site/app/AuthForm.tsx`
- Modify: `site/app/StylishMeApp.tsx`
- Modify: `site/.env.example`
- Create: `site/tests/auth-recovery.test.mjs`
- Create: `site/tests/account-deletion.test.mjs`

**Interfaces:**
- Produces single-use hashed action tokens, verified-email enforcement, password-reset rotation and privacy-preserving deletion/anonymization.

- [ ] Write failing tests for token hashing, expiry, one-time use, non-enumerating responses, session revocation, password rotation and retained/anonymized commerce records.
- [ ] Run focused tests and verify missing behavior failures.
- [ ] Implement Resend delivery with verified-domain configuration and idempotency keys.
- [ ] Require email verification before checkout, story upload and seller publishing while still allowing account access to resend verification.
- [ ] Implement forgot/reset password and authenticated deletion confirmation.
- [ ] Run focused tests, full auth tests, type check and lint.
- [ ] Commit the verified account-lifecycle release.

### Task 8: Google and Apple authentication

**Files:**
- Create: `site/app/oauth/oauth-state.ts`
- Create: `site/app/oauth/google.ts`
- Create: `site/app/oauth/apple.ts`
- Create: `site/app/api/auth/google/start/route.ts`
- Create: `site/app/api/auth/google/callback/route.ts`
- Create: `site/app/api/auth/apple/start/route.ts`
- Create: `site/app/api/auth/apple/callback/route.ts`
- Modify: `site/app/AuthForm.tsx`
- Modify: `site/.env.example`
- Create: `site/tests/oauth-state.test.mjs`
- Create: `site/tests/google-auth.test.mjs`
- Create: `site/tests/apple-auth.test.mjs`

**Interfaces:**
- Produces PKCE/state/nonce-protected authorization flows, provider-subject identity links and verified-profile account creation.

- [ ] Write failing tests for signed state, PKCE, nonce, exact redirect allowlists, issuer/audience/expiry verification and provider-subject account linking.
- [ ] Run focused tests and verify missing behavior failures.
- [ ] Implement Google authorization-code flow and server-side ID-token verification.
- [ ] Implement Apple authorization-code flow, ES256 client-secret generation and Apple key verification.
- [ ] Enable each button only when that provider's complete server configuration exists.
- [ ] Run focused tests, auth tests, type check and lint.
- [ ] Commit the verified external-identity release.

### Task 9: Activation, migration, end-to-end verification and deployment

**Files:**
- Modify: `site/.openai/hosting.json` only if an additional logical binding is required.
- Modify: `admin/.env.example` only for non-secret connection names consumed by the admin app.
- Create: `docs/production-service-activation.md`

**Interfaces:**
- Consumes verified DPO, Resend, Google, Apple and DHL credentials plus marketplace payout approval; produces live provider health checks and a deployable Sites archive.

- [ ] Document exact callback URLs, required provider-console settings, secret names, rotation procedure and rollback switches.
- [ ] Add provider health checks that expose configuration state without revealing secrets.
- [ ] Run all customer, seller and admin tests, TypeScript, lint and production builds.
- [ ] Inspect migration 0007 and package the exact tested source with the official Sites helper.
- [ ] Publish the unified customer/seller app publicly and the owner dashboard privately.
- [ ] Smoke-test sign-up verification, password reset, deep links, seller catalogue, reservation expiry, DPO sandbox callback, refund sandbox, fulfilment and tracking with provider sandbox accounts.
- [ ] Enable production money movement only after DPO merchant approval and the required Namibian marketplace regulatory/provider agreement are recorded.

## External activation requirements

- DPO Pay Namibia merchant/company token and service type with callback and refund API access.
- Written confirmation from DPO and the relevant Namibian regulatory/payment partner covering collection and settlement on behalf of multiple sellers.
- Resend account, verified StylishMe-owned sending domain, API key and From address.
- Google Cloud web OAuth client with the production origin and callback URL authorized.
- Apple Developer membership, primary App ID, Services ID, Team ID, Key ID and Sign in with Apple private key.
- DHL developer application/API key or a contracted local courier's tracking specification and credentials.
- A StylishMe-owned custom domain for stable OAuth callbacks, verified email sending and customer-facing branding.
