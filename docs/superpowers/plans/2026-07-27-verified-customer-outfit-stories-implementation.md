# Verified Customer Outfit Stories Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add verified-buyer outfit stories to the existing story ring with safe photo uploads, purchased-product tagging, likes, sharing, reporting and owner deletion.

**Architecture:** Add focused D1 story, tag, like and report tables plus controlled R2 media access. A story service owns eligibility, sanitisation and public/private response shaping; route handlers expose narrow actions; customer story components integrate with the existing viewer without changing editorial story behaviour.

**Tech Stack:** Vinext/Next route handlers, React 19, TypeScript, Drizzle ORM, Cloudflare D1, Cloudflare R2, Sharp, existing ChatGPT-hosted identity and Node test runner.

## Global Constraints

- Only signed-in customers with delivered or collected orders may publish.
- Product and store tags must be derived from owned eligible order items.
- No comments, direct messages, followers or public customer profiles.
- Never expose email, address, payment information, order identifiers or original image metadata.
- One photograph per story; JPEG, PNG and WebP only; maximum 8 MB.
- Main-ring visibility lasts seven days; archived public placement remains until deletion or moderation removal.
- Likes are one per signed-in account and backend-authoritative.
- Existing editorial story timing, focus, keyboard and reduced-motion behaviour must not regress.

---

### Task 1: Story domain and eligibility rules

**Files:**
- Create: `app/customer-story-domain.ts`
- Create: `tests/customer-story-domain.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces `eligibleStoryItems(orders)`, `cleanStoryText(value, max)`, `isRingActive(story, now)`, `toggleLikeState(liked, count)` and shared public story types.

- [ ] **Step 1: Write failing domain tests**

```ts
assert.deepEqual(eligibleStoryItems([{ id: "o1", status: "Delivered", items: [{ productId: "p3" }] }]), [{ orderId: "o1", productId: "p3" }]);
assert.deepEqual(eligibleStoryItems([{ id: "o2", status: "In transit", items: [{ productId: "p1" }] }]), []);
assert.equal(isRingActive({ status: "published", ringExpiresAt: future }, now), true);
assert.deepEqual(toggleLikeState(false, 2), { liked: true, count: 3 });
```

- [ ] **Step 2: Run `node --import tsx --test tests/customer-story-domain.test.mjs` and verify missing-module failure**
- [ ] **Step 3: Implement pure, defensive domain helpers with delivered/collected status allowlists and count floors**
- [ ] **Step 4: Add the new test file to the project test script and run it to PASS**
- [ ] **Step 5: Commit `Add verified outfit story domain rules`**

### Task 2: Durable story schema and migrations

**Files:**
- Modify: `db/schema.ts`
- Create: generated `drizzle/0004_*.sql`
- Create: `app/customer-story-storage.ts`
- Test: `tests/customer-story-api.test.mjs`

**Interfaces:**
- Produces tables `customerOutfitStories`, `customerOutfitStoryProducts`, `customerOutfitStoryLikes`, `customerOutfitStoryReports`.
- Produces `ensureCustomerStoryTables()` for safe upgrades of existing D1 databases.

- [ ] **Step 1: Write a failing schema contract test asserting private ownership fields never appear in public response mapping**
- [ ] **Step 2: Add the four tables with foreign keys, status checks where supported, timestamps and a unique `(story_id, actor_hash)` like index**
- [ ] **Step 3: Generate the migration with `npm run db:generate` and inspect that it creates only the four new tables and indexes**
- [ ] **Step 4: Implement idempotent runtime table initialisation following the existing activity-table upgrade pattern**
- [ ] **Step 5: Run domain/API contract tests to PASS**
- [ ] **Step 6: Commit `Add customer outfit story storage`**

### Task 3: Verified upload and publication API

**Files:**
- Create: `app/api/customer-stories/route.ts`
- Create: `app/api/customer-stories/media/[id]/route.ts`
- Create: `app/customer-story-image.ts`
- Modify: `app/activity.ts`
- Test: `tests/customer-story-api.test.mjs`

**Interfaces:**
- `GET /api/customer-stories` returns `{ stories, eligibleItems, canPublish }` with no private fields.
- `POST /api/customer-stories` accepts multipart `image`, repeated `productId`, optional `caption`, `town`, `displayName`, and `idempotencyKey`.
- `GET /api/customer-stories/media/:id` returns re-encoded media only for visible stories or the authenticated owner.

- [ ] **Step 1: Write failing tests for signed-out rejection, ineligible orders, cross-account tags, MIME/signature mismatch, oversized image and redacted public output**
- [ ] **Step 2: Implement `inspectAndReencodeStoryImage(bytes, mime)` with Sharp: decode, rotate, strip metadata, require at least 720×960, constrain portrait ratio from 0.55 to 1.0, resize maximum edge to 1800 and emit WebP**
- [ ] **Step 3: Implement ownership by loading the authenticated customer’s stored orders, accepting only `Delivered` and `Collected`, and intersecting submitted product IDs with eligible order lines**
- [ ] **Step 4: Snapshot product name, seller, image and price from the real catalogue map; never trust submitted seller or price values**
- [ ] **Step 5: Store media under `customer-stories/{storyId}.webp`, store the published record and a seven-day `ringExpiresAt`, and return the public shape**
- [ ] **Step 6: Add `customer_story_published` and `customer_story_viewed` privacy-safe activity types without caption, image or order metadata**
- [ ] **Step 7: Run API tests and full typecheck to PASS**
- [ ] **Step 8: Commit `Add verified customer story publishing`**

### Task 4: Likes, reports and deletion APIs

**Files:**
- Create: `app/api/customer-stories/[id]/like/route.ts`
- Create: `app/api/customer-stories/[id]/report/route.ts`
- Create: `app/api/customer-stories/[id]/route.ts`
- Modify: `app/customer-story-storage.ts`
- Test: `tests/customer-story-actions.test.mjs`

**Interfaces:**
- `POST /api/customer-stories/:id/like` toggles the current actor and returns `{ liked, likeCount }`.
- `POST /api/customer-stories/:id/report` accepts only `inappropriate`, `misleading`, `privacy`, `spam`, `other`.
- `DELETE /api/customer-stories/:id` is owner-only and removes public media access.

- [ ] **Step 1: Write failing tests for unique likes, unlike, signed-out rejection, controlled report reasons, self-report rejection, report rate limit, cross-account delete rejection and owner deletion**
- [ ] **Step 2: Implement hashed actor identifiers using the existing activity salt pattern without returning hashes**
- [ ] **Step 3: Implement transactional like toggle and backend count query**
- [ ] **Step 4: Implement report validation with one report per actor/story/reason and a per-hour actor limit**
- [ ] **Step 5: Implement soft deletion plus R2 object removal, preserving only the non-public audit record**
- [ ] **Step 6: Record aggregated like, unlike, share intent and report events without personal content**
- [ ] **Step 7: Run action and privacy tests to PASS**
- [ ] **Step 8: Commit `Add customer story reactions and safety actions`**

### Task 5: Upload experience and integrated story ring

**Files:**
- Create: `app/CustomerStoryComposer.tsx`
- Create: `app/CustomerStoryViewer.tsx`
- Create: `app/customer-story.css` or append the focused section to `app/globals.css`
- Modify: `app/StylishMeApp.tsx`
- Test: `tests/customer-story-view.test.mjs`

**Interfaces:**
- `CustomerStoryComposer` consumes `eligibleItems`, `products`, `onPublished`, `onClose`.
- `CustomerStoryViewer` consumes one public story and handlers for like, share, report, delete and product navigation.

- [ ] **Step 1: Write failing rendering tests for “Add yours” eligibility, verified badge, tagged store, shoppable products, like state, owner delete and absence of comments**
- [ ] **Step 2: Load `/api/customer-stories` independently after Home mounts; keep editorial stories usable on failure**
- [ ] **Step 3: Add “Add yours” before editorial stories only when `canPublish` is true; signed-out users see customer stories but no enabled uploader**
- [ ] **Step 4: Build the four-stage composer: purchased pieces, photo, optional details, preview/publish; preserve text and product selection after a recoverable error**
- [ ] **Step 5: Build the customer viewer using the existing modal focus, Escape, progress and reduced-motion conventions; provide verified purchase, store tag, product tray, like, share, report and owner delete**
- [ ] **Step 6: Use `navigator.share` when available and clipboard fallback with a stable `?story={id}` link**
- [ ] **Step 7: Add branded loading, empty, rejected-image, offline and unavailable-story states**
- [ ] **Step 8: Run component and existing story regression tests to PASS**
- [ ] **Step 9: Commit `Integrate verified buyer stories into Home`**

### Task 6: Product/store placement and privacy-safe analytics

**Files:**
- Modify: `app/StylishMeApp.tsx`
- Modify: `app/StorefrontView.tsx`
- Modify: `app/api/admin-feed/route.ts`
- Modify: `admin/app/AdminDashboard.tsx` in the sibling admin project only if the feed additions require display changes
- Test: `tests/customer-story-placements.test.mjs`
- Test: `tests/admin-privacy.test.mjs`

**Interfaces:**
- Product and store views consume filtered story summaries from the same public endpoint.
- Admin feed exposes aggregate counts only: published, views, likes, shares, reports and tagged-product opens.

- [ ] **Step 1: Write failing tests for archived story placement after ring expiry and admin exclusion of image, caption, owner email and order ID**
- [ ] **Step 2: Add a compact “Worn by StylishMe customers” strip to tagged product and seller pages using current card rhythm**
- [ ] **Step 3: Filter ring stories by `ringExpiresAt` while product/store placement accepts all visible published stories**
- [ ] **Step 4: Add aggregate customer-story metrics and recent event labels to the private developer feed**
- [ ] **Step 5: Run placement, admin privacy and full suites to PASS**
- [ ] **Step 6: Commit `Connect customer stories to commerce analytics`**

### Task 7: Release verification and production deployment

**Files:**
- Modify only defects found by verification
- Include generated D1 migration in the deployment archive

**Interfaces:**
- Produces a tested public StylishMe version and, if changed, a matching private admin version.

- [ ] **Step 1: Run `npm test`, `npm run typecheck`, `npm run lint` and `npm run build` in `site`**
- [ ] **Step 2: Run admin tests and build if the private dashboard changed**
- [ ] **Step 3: Verify source privacy by searching public story mappings for `ownerEmail`, `ordersJson`, `caption` in analytics and R2 storage keys returned to clients**
- [ ] **Step 4: Commit any verification fixes, push the exact tested source and package the build with migrations**
- [ ] **Step 5: Save and deploy a new public Sites version; deploy the admin version privately if changed**
- [ ] **Step 6: Poll both deployments to terminal success and report the live URLs plus any deliberately deferred moderation operations**
