# StylishMe Arena Dark System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a complete dark Arena-inspired StylishMe interface across customer, seller, entry, authentication, demo, and supporting screens without breaking existing behavior.

**Architecture:** Introduce a dedicated final design-system stylesheet loaded after the legacy styles, then make small semantic class and structure changes only where the Arena layout cannot be expressed safely through existing markup. Existing state, API calls, navigation, and handlers remain the behavioral source of truth.

**Tech Stack:** React, TypeScript, vinext/Next-compatible App Router, CSS, Node test runner, ESLint.

**Spec:** `docs/superpowers/specs/2026-08-30-stylishme-arena-dark-system-design.md`

## Global Constraints

- Preserve every existing customer, seller, authentication, payment, fulfilment, upload, and account interaction.
- Use `#000000`, `#1c1c1e`, `#2c2c2e`, `#3a3a3c`, `#ffffff`, `#8e8e93`, and `#f5b800` as the core palette.
- Use Inter/system sans; remove serif editorial presentation from redesigned surfaces.
- Support 320px through wide desktop without page-level horizontal overflow.
- Publish only after tests, typecheck, lint, build, and visual checks pass.

---

### Task 1: Shared Arena System

**Files:**
- Create: `site/app/arena.css`
- Modify: `site/app/layout.tsx`
- Test: `site/tests/rendered-html.test.mjs`

**Interfaces:**
- Consumes: Existing class names from customer, seller, entry, auth, demo, storefront, and account components.
- Produces: Global Arena tokens and shared panel, button, field, navigation, spacing, and responsive rules.

- [ ] Add a failing rendered-structure assertion for the Arena shell marker.
- [ ] Run `node --test tests/rendered-html.test.mjs` from `site` and confirm failure.
- [ ] Create `arena.css`, import it last in `layout.tsx`, and add shared tokens and primitives.
- [ ] Re-run the rendered test and commit the passing shared-system change.

### Task 2: Customer Screens

**Files:**
- Modify: `site/app/StylishMeApp.tsx`
- Modify: `site/app/arena.css`
- Test: `site/tests/stylishme-interactions.test.mjs`
- Test: `site/tests/rendered-html.test.mjs`

**Interfaces:**
- Consumes: Existing `navigate`, product, wishlist, cart, profile, checkout, story, outfit, and try-on state handlers.
- Produces: Arena home, shop/search, product, cart, profile, checkout, and supporting customer views.

- [ ] Add assertions for the dark home shell, four-item floating navigation, product detail sheet, and working action labels.
- [ ] Run the focused tests and confirm the new assertions fail.
- [ ] Adjust only necessary markup and apply the Arena customer layout rules.
- [ ] Re-run focused customer tests and commit the passing customer rebuild.

### Task 3: Seller Screens

**Files:**
- Modify: `site/app/SellerApp.tsx`
- Modify: `site/app/arena.css`
- Test: `site/tests/demo-experience.test.mjs`
- Test: `site/tests/seller-variant-cart.test.mjs`

**Interfaces:**
- Consumes: Existing `go`, `save`, `submit`, `adjustStock`, `advanceOrder`, upload, clipboard, and filter handlers.
- Produces: Arena seller overview, navigation, product grid, forms, orders, inventory, payouts, and secondary seller screens.

- [ ] Add or update assertions for active seller navigation and core action availability.
- [ ] Apply shared Arena seller tokens and responsive work-surface layouts.
- [ ] Verify product publish, stock, order, and navigation tests still pass.
- [ ] Commit the passing seller rebuild.

### Task 4: Entry, Auth, Demo, And Storefront

**Files:**
- Modify: `site/app/AppEntry.tsx`
- Modify: `site/app/DemoExperience.tsx`
- Modify: `site/app/arena.css`
- Test: `site/tests/demo-experience.test.mjs`
- Test: `site/tests/auth-actions.test.mjs`
- Test: `site/tests/unified-app.test.mjs`

**Interfaces:**
- Consumes: Existing role selection, auth form, demo stage, and storefront navigation behavior.
- Produces: Arena onboarding, role choice, authentication, demo tour, and public storefront presentation.

- [ ] Restyle the entry and authentication flows around dark image-led screens and raised panels.
- [ ] Restyle demo choice, tour, and control bar without changing their stage transitions.
- [ ] Verify entry, demo, auth, and unified-app tests.
- [ ] Commit the passing supporting-surface rebuild.

### Task 5: Full Verification And Publish

**Files:**
- Modify only files required by verification findings.

**Interfaces:**
- Consumes: Completed Arena rebuild.
- Produces: Verified production commit, saved Sites version, and successful deployment.

- [ ] Run all relevant Node tests, TypeScript, ESLint, `git diff --check`, and production build.
- [ ] Start the local server and inspect customer and seller mobile/desktop screenshots for clipping, overlap, blank media, and inconsistent styling.
- [ ] Fix verified issues and repeat checks until clean.
- [ ] Commit and push the exact verified source to GitHub and the Sites repository.
- [ ] Package, save, deploy, poll to success, and verify the public URL serves the new Arena assets.
