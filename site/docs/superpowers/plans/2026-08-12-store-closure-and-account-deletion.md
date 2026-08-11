# Store Closure and Account Deletion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a seller safely close only their store and return to the customer workspace, while letting an eligible customer delete their entire StylishMe identity through a seven-day recoverable deletion lifecycle.

**Architecture:** Extend the existing D1-backed deletion domain instead of creating a second identity system. A focused store-closure service owns eligibility, lifecycle and seller-role removal; the existing account-deletion service gains commerce blockers, seven-day scheduling, explicit lifecycle state and safe anonymization. Route handlers authenticate and reauthenticate, domain services own state transitions, and small client controls render the two distinct settings journeys.

**Tech Stack:** TypeScript 5.9, React 19, Vinext/Next-compatible route handlers, Cloudflare D1 and R2, Drizzle schema/migrations, Node test runner with `tsx`, Testing Library.

## Global Constraints

- Preserve the established StylishMe customer and seller visual identity.
- "Close my store" keeps the shared login and customer account.
- "Delete my StylishMe account" is blocked while an active seller store or unresolved commerce obligation exists.
- Both destructive actions require recent password verification or a verified email confirmation flow for OAuth-only identities.
- Use a seven-day recovery period for store closure and full-account deletion.
- Public closed-store and product links render a neutral unavailable state and never redirect to another seller.
- Retain and minimize only order, return, settlement, consent, fraud-prevention, audit and security records required for legitimate operation.
- Revoke all sessions for full-account deletion; do not expose private cached data after either workflow.
- Every mutation is server-authoritative, idempotent, rate-limited where authentication is attempted and returned with `cache-control: no-store`.
- Do not activate payments, payouts, refunds, DHL or live courier tracking.

---

## File Structure

- `app/account-lifecycle.ts`: shared lifecycle constants, blocker types and normalized public results.
- `app/store-closure.ts`: store-closure eligibility, scheduling, cancellation, final cleanup and seller-role transition.
- `app/account-deletion.ts`: existing full-account scheduling and cleanup extended with seven-day lifecycle and blocker enforcement.
- `app/api/seller/store-closure/route.ts`: authenticated store-closure status, request and cancellation API.
- `app/api/seller/store-closure/confirm/route.ts`: verified-email confirmation callback for OAuth-only sellers.
- `app/api/account/deletion/route.ts`: full-account blocker and seven-day lifecycle API.
- `app/api/account/deletion/confirm/route.ts`: full-account confirmation redirect into the isolated pending-deletion screen.
- `app/api/account-deletion/process/route.ts`: scheduled cleanup for both lifecycle types.
- `app/StoreClosureControl.tsx`: seller-settings closure control.
- `app/AccountDeletionControl.tsx`: customer full-account deletion control and updated seven-day copy.
- `app/SellerApp.tsx`: mounts the store-closure control and handles successful customer-workspace transition.
- `app/StylishMeApp.tsx`: keeps full-account deletion in customer settings.
- `app/login/page.tsx` and `app/AuthForm.tsx`: pending-deletion cancellation-only entry state.
- `db/schema.ts` and `drizzle/0012_account_lifecycle.sql`: normalized store-closure requests and lifecycle metadata.
- `tests/store-closure.test.mjs`: domain lifecycle and blocker tests.
- `tests/store-closure-api.test.mjs`: API authorization, reauthentication and response-contract tests.
- `tests/account-deletion.test.mjs`: seven-day schedule, blockers, anonymization and cleanup tests.
- `tests/account-lifecycle-ui.test.mjs`: distinct destructive controls, pending states and redirects.

---

### Task 1: Add lifecycle schema and shared contracts

**Files:**
- Create: `app/account-lifecycle.ts`
- Create: `drizzle/0012_account_lifecycle.sql`
- Modify: `db/schema.ts`
- Modify: `tests/commerce-schema.test.mjs`
- Test: `tests/account-lifecycle-schema.test.mjs`

**Interfaces:**
- Produces: `ACCOUNT_RECOVERY_DAYS`, `AccountLifecycleBlocker`, `LifecycleEligibility`, `publicBlockerMessage()`.
- Produces D1 table `seller_store_closure_requests(id, seller_id, account_email, status, previous_product_statuses_json, requested_at, scheduled_for, cancelled_at, completed_at)` with unique pending request per seller and status/schedule indexes.
- Extends `account_deletion_requests` with `cancelled_at` while retaining existing rows.

- [ ] **Step 1: Write the failing schema and contract tests**

```js
test("account lifecycle uses one seven-day recovery constant", async () => {
  const domain = await import("../app/account-lifecycle.ts");
  assert.equal(domain.ACCOUNT_RECOVERY_DAYS, 7);
  assert.equal(domain.publicBlockerMessage({ code: "active_seller_store", count: 1, route: "/seller/settings" }).route, "/seller/settings");
});

test("schema defines recoverable seller closure requests", () => {
  const migration = read("../drizzle/0012_account_lifecycle.sql");
  assert.match(migration, /CREATE TABLE `seller_store_closure_requests`/);
  assert.match(migration, /scheduled_for/);
  assert.match(migration, /cancelled_at/);
  assert.match(migration, /previous_product_statuses_json/);
});
```

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `node --import tsx --test tests/account-lifecycle-schema.test.mjs tests/commerce-schema.test.mjs`

Expected: FAIL because the lifecycle module and migration do not exist.

- [ ] **Step 3: Implement the shared types and migration**

```ts
export const ACCOUNT_RECOVERY_DAYS = 7;

export type AccountLifecycleBlocker = {
  code: "active_seller_store" | "active_order" | "open_return" | "pending_refund" | "reserved_stock" | "uncollected_order";
  count: number;
  route: string;
};

export type LifecycleEligibility = { allowed: true; blockers: [] } | { allowed: false; blockers: AccountLifecycleBlocker[] };

export function publicBlockerMessage(blocker: AccountLifecycleBlocker) {
  const messages = {
    active_seller_store: "Close your seller store before deleting your StylishMe account.",
    active_order: "Complete your active orders before continuing.",
    open_return: "Resolve your open returns before continuing.",
    pending_refund: "Wait for pending refunds to finish before continuing.",
    reserved_stock: "Resolve active stock reservations before closing your store.",
    uncollected_order: "Complete outstanding collections before continuing.",
  } as const;
  return { ...blocker, message: messages[blocker.code] };
}
```

Add the matching Drizzle model, migration indexes and nullable `cancelled_at` column.

- [ ] **Step 4: Run focused tests**

Run: `node --import tsx --test tests/account-lifecycle-schema.test.mjs tests/commerce-schema.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add app/account-lifecycle.ts db/schema.ts drizzle/0012_account_lifecycle.sql tests/account-lifecycle-schema.test.mjs tests/commerce-schema.test.mjs
git commit -m "Add account lifecycle storage"
```

### Task 2: Build store-closure eligibility and lifecycle domain

**Files:**
- Create: `app/store-closure.ts`
- Test: `tests/store-closure.test.mjs`

**Interfaces:**
- Consumes: `ACCOUNT_RECOVERY_DAYS`, `LifecycleEligibility` from `app/account-lifecycle.ts`.
- Produces: `checkStoreClosureEligibility(db, email)`, `scheduleStoreClosure(db, email, confirmation, now)`, `pendingStoreClosure(db, email)`, `cancelStoreClosure(db, email, now)`, `processDueStoreClosures(db, media, now)`.

- [ ] **Step 1: Write failing domain tests**

Cover these exact cases:

```js
test("store closure reports exact active-order and reservation blockers", async () => {
  const result = await checkStoreClosureEligibility(db, "seller@example.com");
  assert.deepEqual(result.blockers.map(item => item.code), ["active_order", "reserved_stock"]);
});

test("eligible store closure schedules seven days and immediately makes the store unavailable", async () => {
  const result = await scheduleStoreClosure(db, "seller@example.com", "Omutima", new Date("2026-08-12T08:00:00Z"));
  assert.equal(result.scheduledFor, "2026-08-19T08:00:00.000Z");
  assert.equal(db.database.prepare("SELECT approved FROM seller_state").get().approved, 0);
  assert.equal(db.database.prepare("SELECT status FROM catalog_products").get().status, "archived");
});

test("store closure changes the shared profile role to customer", async () => {
  await scheduleStoreClosure(db, "seller@example.com", "Omutima", now);
  const profile = JSON.parse(db.database.prepare("SELECT profile_json FROM customer_state").get().profile_json);
  assert.equal(profile.accountRole, "customer");
});
```

Also test wrong store-name confirmation, no owned store, duplicate request idempotency, cancellation restoration within seven days, due cleanup, media failure retryability and preservation of seller-order history.

- [ ] **Step 2: Run tests and verify failure**

Run: `node --import tsx --test tests/store-closure.test.mjs`

Expected: FAIL because `app/store-closure.ts` does not exist.

- [ ] **Step 3: Implement eligibility queries**

Use seller-owned `seller_orders`, `inventory_reservations`, `refunds` and fulfilment records. Treat only terminal order states `completed` and `cancelled` as resolved. Return deduplicated blocker objects with exact seller routes.

- [ ] **Step 4: Implement atomic scheduling and role transition**

Use one `db.batch()` to create or refresh the pending request, set `seller_state.approved = 0`, archive current public products and update `customer_state.profile_json.accountRole` to `customer`. Verify the entered store name before the batch. Return `{ scheduledFor, storeName }` only after success.

- [ ] **Step 5: Implement cancellation and due cleanup**

Cancellation restores the role to seller and republishes only products recorded as published before closure. Store the previous product-status map in the closure request metadata rather than publishing every archived product. Final cleanup deletes eligible seller drafts and unpublished media, clears private seller state and leaves seller/order identifiers retained but detached from the account.

- [ ] **Step 6: Run tests**

Run: `node --import tsx --test tests/store-closure.test.mjs`

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add app/store-closure.ts tests/store-closure.test.mjs
git commit -m "Add safe seller store closure"
```

### Task 3: Expose authenticated store-closure APIs

**Files:**
- Create: `app/api/seller/store-closure/route.ts`
- Create: `app/api/seller/store-closure/confirm/route.ts`
- Modify: `app/auth-actions.ts`
- Test: `tests/store-closure-api.test.mjs`

**Interfaces:**
- Consumes store-closure domain functions from Task 2.
- Produces `GET`, `POST`, `DELETE` route handlers with `no-store` responses.
- Produces email action `seller_store_closure` using hashed, expiring, single-use action tokens.

- [ ] **Step 1: Write failing API source and behavior tests**

Assert unauthenticated `401`, customer-role `403`, blocker `409` with `{ blockers }`, wrong password `401`, successful password flow `200`, OAuth-only confirmation requirement, cancellation `200`, safe confirmation redirect and `cache-control: no-store` on every response.

- [ ] **Step 2: Run tests and verify failure**

Run: `node --import tsx --test tests/store-closure-api.test.mjs`

Expected: FAIL because the routes do not exist.

- [ ] **Step 3: Implement GET and POST**

GET returns `{ pending, scheduledFor, storeName, passwordEnabled, eligibility }`. POST validates the session, seller role, JSON size, store-name confirmation and recent password. OAuth-only identities receive a single-use verified email confirmation when transactional email is configured. Apply `consumeAuthAttempt(request, email, 3, "recovery")` before credential verification.

- [ ] **Step 4: Implement DELETE and confirmation callback**

DELETE cancels only the caller's pending closure. The confirmation callback consumes the token exactly once, schedules closure and redirects with `303` to `/?role=customer&store=closed`; failures redirect to `/seller/settings?closure=invalid`.

- [ ] **Step 5: Run tests**

Run: `node --import tsx --test tests/store-closure-api.test.mjs tests/auth-actions.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add app/api/seller/store-closure app/auth-actions.ts tests/store-closure-api.test.mjs
git commit -m "Add seller store closure API"
```

### Task 4: Harden full-account deletion eligibility and seven-day lifecycle

**Files:**
- Modify: `app/account-deletion.ts`
- Modify: `app/api/account/deletion/route.ts`
- Modify: `app/api/account/deletion/confirm/route.ts`
- Modify: `app/api/account-deletion/process/route.ts`
- Modify: `tests/account-deletion.test.mjs`
- Modify: `tests/auth-recovery-api.test.mjs`

**Interfaces:**
- Produces: `checkAccountDeletionEligibility(db, email)` and seven-day `scheduleAccountDeletion()`.
- Extends process endpoint to call `processDueStoreClosures()` before `processDueAccountDeletions()` and return `{ stores, accounts }`.

- [ ] **Step 1: Add failing account-deletion tests**

Add exact assertions for seven-day scheduling, active seller blocker, active customer-order blocker, pending refund blocker, safe eligibility, global session revocation when scheduled, anonymized commerce history at cleanup, cancellation timestamp and duplicate request idempotency.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `node --import tsx --test tests/account-deletion.test.mjs tests/auth-recovery-api.test.mjs`

Expected: FAIL because deletion still uses 30 days and does not enforce blockers.

- [ ] **Step 3: Implement blocker checks and seven-day scheduling**

Call `checkAccountDeletionEligibility()` before scheduling in both password and email-confirmation paths. Return `409` with public blocker messages. Replace the hard-coded 30-day interval with `ACCOUNT_RECOVERY_DAYS`. Set `auth_accounts.deleted_at` to the scheduled timestamp and delete all `auth_sessions` only after the deletion request is successfully stored.

- [ ] **Step 4: Make cancellation reactivate the identity safely**

Cancellation clears `auth_accounts.deleted_at`, records `cancelled_at`, leaves retained records untouched and requires reauthentication through the isolated cancellation journey before creating a new session.

- [ ] **Step 5: Update due processing**

Keep media deletion retryable. Delete eligible customer-private records, provider credentials, identities and sessions. Null `commerce_orders.customer_email`; do not delete seller-order, order-item, refund, ledger or audit history. Full-account cleanup must refuse to process an identity that regained an active store or unresolved obligation after scheduling.

- [ ] **Step 6: Run focused tests**

Run: `node --import tsx --test tests/account-deletion.test.mjs tests/auth-recovery-api.test.mjs tests/auth-actions.test.mjs`

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add app/account-deletion.ts app/api/account/deletion app/api/account-deletion/process/route.ts tests/account-deletion.test.mjs tests/auth-recovery-api.test.mjs
git commit -m "Harden full account deletion"
```

### Task 5: Add the seller closure control and customer transition

**Files:**
- Create: `app/StoreClosureControl.tsx`
- Modify: `app/SellerApp.tsx`
- Modify: `app/seller.css`
- Test: `tests/account-lifecycle-ui.test.mjs`

**Interfaces:**
- Consumes `/api/seller/store-closure`.
- Produces `StoreClosureControl({ storeName, onClosed })` where `onClosed()` clears seller state and switches the workspace to customer without a full-page Back history entry.

- [ ] **Step 1: Write failing component tests**

Test that the seller settings copy says "Close my store", requires the exact store name and password when enabled, renders blockers as links, disables submission while busy, renders the seven-day pending state, supports cancellation and calls `onClosed` only after confirmed closure.

- [ ] **Step 2: Run and verify failure**

Run: `node --import tsx --import ./tests/dom-setup.mjs --test tests/account-lifecycle-ui.test.mjs`

Expected: FAIL because `StoreClosureControl` does not exist.

- [ ] **Step 3: Implement the control**

Use a disclosure followed by a confirmation form. Parse JSON safely even when an upstream response is plain text. Show field-specific or blocker messages in a status region. Never optimistically hide the store.

- [ ] **Step 4: Wire the seller settings transition**

Mount the control in the existing seller Settings view. On success remove `stylishme-entry-role`, store `customer` as the active role, clear seller query/local draft keys, and call `window.location.replace("/?role=customer&reason=store-closed")`.

- [ ] **Step 5: Run component and seller regression tests**

Run: `node --import tsx --import ./tests/dom-setup.mjs --test tests/account-lifecycle-ui.test.mjs tests/fulfilment-api.test.mjs tests/unified-app.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add app/StoreClosureControl.tsx app/SellerApp.tsx app/seller.css tests/account-lifecycle-ui.test.mjs
git commit -m "Add seller store closure settings"
```

### Task 6: Update customer deletion UI and isolated recovery entry

**Files:**
- Modify: `app/AccountDeletionControl.tsx`
- Modify: `app/AuthForm.tsx`
- Modify: `app/login/page.tsx`
- Modify: `app/globals.css`
- Modify: `tests/account-lifecycle-ui.test.mjs`
- Modify: `tests/auth-recovery-api.test.mjs`

**Interfaces:**
- Consumes `/api/account/deletion` eligibility and pending state.
- Produces `/login?reason=account-deleted` and `/login?reason=deletion-pending` cancellation-only rendering.

- [ ] **Step 1: Add failing UI tests**

Assert the customer action says "Delete my StylishMe account", explains that seller stores must close first, requires typed `DELETE` plus password/email confirmation, uses seven-day copy, shows blocker links and renders only Keep my account when deletion is pending.

- [ ] **Step 2: Run and verify failure**

Run: `node --import tsx --import ./tests/dom-setup.mjs --test tests/account-lifecycle-ui.test.mjs tests/auth-recovery-api.test.mjs`

Expected: FAIL against the existing 30-day control.

- [ ] **Step 3: Implement the customer control**

Require typed `DELETE`, disable the button until it matches, handle password and OAuth-only flows, render exact blockers and use defensive response parsing. After scheduling, clear all StylishMe private local keys and call `window.location.replace("/login?reason=account-deleted")`.

- [ ] **Step 4: Implement isolated cancellation entry**

When login detects a pending deletion, do not create a normal session. Render account email, scheduled deletion date, reauthentication fields and Keep my account. Successful cancellation creates a fresh session and routes to customer Home. No customer, seller or admin UI is rendered beforehand.

- [ ] **Step 5: Run UI and auth tests**

Run: `node --import tsx --import ./tests/dom-setup.mjs --test tests/account-lifecycle-ui.test.mjs tests/auth-recovery-api.test.mjs tests/auth-hardening.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add app/AccountDeletionControl.tsx app/AuthForm.tsx app/login/page.tsx app/globals.css tests/account-lifecycle-ui.test.mjs tests/auth-recovery-api.test.mjs
git commit -m "Add recoverable customer account deletion"
```

### Task 7: Integrate maintenance, deep links and private-cache guarantees

**Files:**
- Modify: `app/api/account-deletion/process/route.ts`
- Modify: `app/stores/[storeSlug]/page.tsx`
- Modify: `app/stores/[storeSlug]/products/[productSlug]/page.tsx`
- Modify: `public/sw.js`
- Modify: `tests/deep-links.test.mjs`
- Modify: `tests/pwa-service-worker.test.mjs`
- Modify: `tests/maintenance-scheduling.test.mjs`

**Interfaces:**
- Consumes both due-processing services.
- Produces neutral `410`-style unavailable UI for closed store resources while retaining a successful HTML response suitable for the PWA shell.

- [ ] **Step 1: Add failing integration tests**

Assert closed stores and products do not render catalogue details, the process route runs store cleanup before account cleanup, private lifecycle APIs are explicitly network-only and no deletion response enters Cache Storage.

- [ ] **Step 2: Run and verify failure**

Run: `node --import tsx --test tests/deep-links.test.mjs tests/pwa-service-worker.test.mjs tests/maintenance-scheduling.test.mjs`

Expected: FAIL because store-closure cleanup and closed-link states are absent.

- [ ] **Step 3: Implement maintenance and deep-link behavior**

Process due store closures first, then accounts, with independent counts and failures. Public store loaders require `seller_state.approved = 1` and published product status. Closed resources render "This store is no longer available" with a deliberate Back to StylishMe action and no seller substitution.

- [ ] **Step 4: Exclude lifecycle endpoints from PWA caching**

Add `/api/account/deletion`, `/api/seller/store-closure`, authentication responses and their confirmation routes to the service worker's network-only/private exclusion matcher.

- [ ] **Step 5: Run integration tests**

Run: `node --import tsx --test tests/deep-links.test.mjs tests/pwa-service-worker.test.mjs tests/maintenance-scheduling.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add app/api/account-deletion/process/route.ts app/stores public/sw.js tests/deep-links.test.mjs tests/pwa-service-worker.test.mjs tests/maintenance-scheduling.test.mjs
git commit -m "Integrate account lifecycle cleanup"
```

### Task 8: Full verification and deployment readiness

**Files:**
- Modify only files required by failures attributable to this feature.

**Interfaces:**
- Consumes all earlier tasks.
- Produces a clean, tested and deployable account-lifecycle slice.

- [ ] **Step 1: Run the complete automated suite**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 2: Run static verification**

Run: `npm run typecheck`

Expected: exit 0.

Run: `npm run lint`

Expected: exit 0 with no new warnings.

- [ ] **Step 3: Build the production bundle**

Run: `npm run build`

Expected: exit 0 and all account/store lifecycle routes compile.

- [ ] **Step 4: Inspect the final diff and migration order**

Run: `git diff --check HEAD~7..HEAD`

Expected: no whitespace errors. Verify migration `0012_account_lifecycle.sql` follows the current highest migration and contains no destructive drop of retained commerce history.

- [ ] **Step 5: Perform production-safe smoke tests after deployment**

Use controlled accounts to verify: blocked seller closure, eligible closure and customer redirect, closed deep link, closure cancellation, blocked full deletion, full deletion scheduling, global logout and pending-deletion cancellation. Do not use genuine customer accounts or force cleanup before the seven-day date.

- [ ] **Step 6: Commit verification-only fixes if any**

```powershell
git status --short
# Stage only the specific source or test files changed to correct a verified failure.
git commit -m "Verify account lifecycle workflows"
```
