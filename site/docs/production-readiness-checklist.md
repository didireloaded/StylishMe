# StylishMe production-readiness checklist

Updated: 23 July 2026

Status key:

- **Working** — implemented and covered by the automated release checks.
- **Safe preview** — intentionally simulated or seeded, clearly labelled, and safe to publish for testing.
- **Launch dependency** — requires a real provider, operating process, or legal decision before accepting real transactions.

## Entry, onboarding and accounts

- **Working** — branded welcome screen and three-benefit onboarding.
- **Working** — clear sign-in screen with a guest path.
- **Working** — customer and seller roles open separate experiences.
- **Working** — guest shopping state stays on that browser.
- **Working** — signed-in customer state is isolated by authenticated email in D1.
- **Working** — seller tools require an authenticated account.
- **Launch dependency** — native email/password, Google and Apple sign-in require an external identity provider. The current Sites-native secure sign-in remains the supported account path.
- **Launch dependency** — add account deletion, export and a formal data-retention process before a commercial launch.

## Customer discovery and shopping

- **Working** — editorial Home, outfit stories, new arrivals, Made in Namibia, trending products and designer spotlight.
- **Working** — Shop categories, search, sorting and filters for size, colour, price, designer, location and delivery.
- **Working** — dedicated Stores directory and seller-scoped share links.
- **Working** — designer/store profiles and catalogue pages.
- **Working** — product details, gallery, Fit Passport guidance, size guide, wishlist, sharing and Complete the Look.
- **Working** — wishlist grid, saved outfits, wardrobe summary and recently purchased pieces.
- **Working** — cart quantities are capped at the selected size’s seeded stock.
- **Working** — delivery and store-collection journeys use the correct wording and status views.
- **Safe preview** — reviews, ratings, “near you,” stock, delivery dates and notifications use curated demonstration data.

## Style Me and digital outfit preview

- **Working** — Style Me accepts occasion, location, timing, budget, colours, style and owned-item notes.
- **Working** — generated recommendations stay within the chosen budget; the fallback selects the lowest-priced valid piece.
- **Working** — customers can open, save and add the styled pieces to the cart.
- **Working** — private preview requires sign-in before a personal photo is uploaded.
- **Working** — all four consent statements are validated in the browser and again on the server.
- **Working** — JPG, PNG and WebP uploads are limited to 10 MB.
- **Working** — one customer image can be combined with up to four verified catalogue garment references, or one external outfit reference.
- **Working** — the image service uses `gpt-image-2`, portrait output, high quality, multiple garment inputs and identity-preserving instructions.
- **Working** — input moderation, five-previews-per-hour throttling, request IDs, no-store responses and generic provider errors are enabled.
- **Working** — source photos and generated results are held only for the current request/session; the app does not write them to D1 or R2.
- **Working** — customer-facing copy uses “digital preview” language and never presents the result as an exact fit guarantee.
- **Safe preview** — generation remains a foreground request. The customer must keep the screen open and can cancel it.
- **Launch dependency** — add measured quality evaluation across varied skin tones, body types, garments, poses and lighting before making an accuracy claim.
- **Launch dependency** — add durable background jobs only if the product later promises leave-and-return generation.

## Seller experience

- **Working** — seller onboarding, store profile editing and product submission.
- **Working** — seller product images are authenticated, size/type/signature checked and stored under an internal random seller identifier.
- **Working** — store owner email and phone are not exposed through the public catalogue.
- **Working** — sellers cannot approve their own store or mark products live through customer-facing requests.
- **Working** — public catalogue reads only administrator-approved seller rows and live products.
- **Working** — seller store/product share links remain scoped to one store and can open the linked product.
- **Safe preview** — seller sales, visits, saved-piece analytics and order lists are demonstration data.
- **Launch dependency** — create an administrator review interface and operating process for seller approval, product moderation, edits and suspensions.
- **Launch dependency** — connect seller analytics and orders to the real commerce ledger.

## Checkout, orders and fulfilment

- **Safe preview** — checkout is explicitly labelled as a sandbox and never makes a real charge.
- **Safe preview** — order confirmation, order history and tracking timelines demonstrate the intended flow.
- **Working** — store collection does not show courier tracking.
- **Working** — delivery orders show milestone tracking without claiming a live map.
- **Launch dependency** — add a Namibia-supported payment provider, server-created payment intents, signed webhooks, refunds and reconciliation.
- **Launch dependency** — move prices, promotions, stock reservations, order totals and order creation to a transactional server-side commerce ledger.
- **Launch dependency** — add real fulfilment events from stores/couriers. Add live maps only if a courier provides reliable, consented location data.
- **Launch dependency** — define returns, cancellations, fraud review, tax, invoicing and customer-support operations.

## Backend, privacy and security

- **Working** — D1 stores isolated customer state and authenticated seller state.
- **Working** — R2 stores authenticated seller catalogue images; personal preview photos are not stored.
- **Working** — seller access no longer accepts shareable invitation tokens.
- **Working** — API payload and collection limits prevent unbounded customer/seller writes.
- **Working** — service worker excludes APIs, caps runtime cache entries and only removes StylishMe-owned caches.
- **Working** — production responses add CSP, anti-framing, MIME-sniffing, referrer, permissions and HTTPS security headers.
- **Working** — secrets remain server-side and are not committed to source control.
- **Launch dependency** — establish D1 backup/restore drills, alerting, error monitoring, audit logs and incident response.
- **Launch dependency** — publish approved privacy, terms, seller terms, returns and acceptable-use policies.
- **Launch dependency** — commission an independent security and privacy review before processing real payments.

## Release verification

- **Working** — TypeScript strict check.
- **Working** — ESLint.
- **Working** — 75 automated domain, API, interaction, security, PWA and routing tests.
- **Working** — production build.
- **Working** — 41 unique catalogue stock images plus separate editorial images.
- **Working** — D1 migration adds authenticated seller ownership, approval gating and preview throttling.

## Publishing decision

The current build is appropriate to publish as a polished public **shopping and seller preview**. It is not yet appropriate to accept real money or promise real-time stock/courier accuracy. Those capabilities remain visibly disabled or simulated until the launch dependencies above are completed.
