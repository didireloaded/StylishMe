# StylishMe

StylishMe is a mobile-first Namibian fashion discovery and shopping PWA. The first release keeps commerce central while adding a private digital outfit preview that can be started from a product, saved piece, or complete curated look.

## Release experience

- Shop-first Home with outfit stories, new arrivals, categories, nearby pieces, Namibian designers, editorial looks, recommendations, and recently viewed products.
- Product discovery, filters, designer catalogues, wishlist, stock-safe cart, sandbox checkout, orders, and tracking.
- Shop the Look with saved outfits, individual item replacement, full-look cart actions, and try-on entry points.
- My Wardrobe foundation for saved pieces, saved looks, and previous purchases.
- AI try-on with explicit consent, full-length photo guidance, catalogue or uploaded references, portrait generation, failure recovery, and commerce-linked results.
- Installable PWA without a phone-frame mockup.

## Local setup

Requirements: Node.js 22.13 or newer.

```bash
npm ci
copy .env.example .env.local
npm run dev
```

Set `OPENAI_API_KEY` only in `.env.local` for local work or in the hosting platform's secret manager for deployment. Never prefix it with `NEXT_PUBLIC_` and never commit a real key.

`OPENAI_IMAGE_MODEL` is optional and defaults to `gpt-image-2`. Access to GPT Image models may require organization verification on the OpenAI platform. The try-on route also uses `omni-moderation-latest` for both source images.

## Privacy and safety

- Try-on requires a signed-in customer and a current consent timestamp.
- Person and reference images must be JPG, PNG, or WebP and no larger than 10 MB each.
- Catalogue image URLs are accepted only when they match the submitted StylishMe product IDs.
- Both inputs are moderated before generation.
- Source photos and generated previews are processed in memory for the request and are not written to D1, local storage, logs, or object storage in this release.
- Responses use `no-store`, and the UI labels every result as AI-generated with a fit disclaimer.
- Provider, moderation, or configuration failures do not block normal shopping, cart, or checkout actions.

Deleting a preview clears the browser-held result. Because this release intentionally has no preview gallery or object storage, deleted and completed previews cannot be recovered later.

## Verification

```bash
npm test
npm run lint
npm run build
```

The automated suite covers catalogue integrity, stock limits, outfit commerce, stories, filters, PWA behavior, navigation, wardrobe connections, try-on consent and uploads, protected API validation, moderation gates, and provider failure isolation.

## Deployment configuration

The ChatGPT Sites project is declared in `.openai/hosting.json`. Configure these deployment secrets before publishing:

- `OPENAI_API_KEY` — required for AI try-on.
- `OPENAI_IMAGE_MODEL` — optional; defaults to `gpt-image-2`.

The deployed site supplies Sign in with ChatGPT identity headers. Public shopping remains available to guests; AI generation requires a signed-in user. D1 stores customer cart, wishlist, orders, profile, and saved-outfit state, but never try-on image bytes.

## Deliberately deferred

This release does not claim production payments, seller administration, a normalized stock ledger, returns automation, persistent try-on galleries, background generation jobs, a durable credit ledger, customer-owned clothing uploads, virtual sizing guarantees, or live courier maps. Checkout is visibly labelled as a sandbox. Those capabilities need separate operational and security work before real transactions are enabled.

The current feature-by-feature release status is maintained in [docs/production-readiness-checklist.md](docs/production-readiness-checklist.md). Stock image provenance is recorded in [docs/stock-image-sources.md](docs/stock-image-sources.md).
