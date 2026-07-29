# StylishMe release hardening and publish

## Global constraints

- Preserve the established customer, seller, and admin visual design.
- Keep checkout explicitly labelled as sandbox; do not claim real payments, reservations, fulfilment, or payouts.
- Seller listings may publish automatically only after deterministic completeness, stock, image, price, and safety validation; do not add routine manual approval.
- Never expose private customer data, payment data, full addresses, profile/try-on photos, secrets, or raw identities in analytics.
- Use server-derived identity, prices, order totals, and purchase eligibility.
- Keep the admin deployment private and owner-only; keep the customer deployment public.
- Test before committing and deploy the exact tested source.

## Task 1: Authoritative sandbox order creation

Remove client-owned order history writes from the general state API. Add an authenticated order-creation API that validates the cart against the catalogue and stock, calculates prices and totals on the server, writes canonical order history, clears the server cart, records the event, and returns the new order. Update checkout to await that API with processing/error feedback and keep a deliberately isolated local path only for public demo mode. Add regression tests first.

## Task 2: Authentication and migration hardening

Make avatar responses non-cacheable, make logout fail safely if session revocation fails, add atomic bounded rate limiting with independent IP and identity keys plus stale-row cleanup, cap auth request/password sizes, and ensure no migration deletes customer, seller, or try-on data. Add a later migration that clears only active sessions to honour the requested account reset. Add regression tests first.

## Task 3: Admin release hardening

Enforce an explicit owner allowlist in addition to authenticated identity, preserve the hosting owner-only policy, neutralize spreadsheet formula injection in CSV exports, reduce browser-delivered event detail to what the UI uses, and document the shared deployment variables without secrets. Add regression tests first.

## Task 4: Release verification and deployment

Run all customer and admin tests, type checks, lint, and production builds. Commit the exact source, create deployable site and admin source commits, package using the official Sites helper, publish the customer app publicly and the admin app privately, poll both deployments, and verify the live URLs.
