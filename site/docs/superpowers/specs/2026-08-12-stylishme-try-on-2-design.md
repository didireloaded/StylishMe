# StylishMe Try On 2.0 Design

**Date:** 12 August 2026

**Status:** Approved for implementation planning

**Product boundary:** Improve Try On and its supporting backend without activating payments, redesigning StylishMe, adding a public social feed, or exposing provider/AI terminology to customers.

## 1. Outcome

Try On 2.0 will turn the currently working visual preview into a dependable, private and shoppable StylishMe feature. Customers will receive useful photo preparation, truthful progress, specific recovery actions and a polished result connected only to current catalogue products. The backend will remain authoritative for authentication, consent, product eligibility, reference images, usage limits, job state and operational outcomes.

The feature does not promise exact physical fit. It helps customers explore how a catalogue look may appear while clearly stating that colour, texture, drape and fit can differ in person.

## 2. Non-negotiable principles

- Preserve the established StylishMe visual identity and app shell.
- Keep provider and AI language out of customer-facing screens.
- Use only authoritative StylishMe catalogue products and variants.
- Never trust client-supplied prices, stock, product descriptions or image URLs.
- Never persist the customer's original photo or generated preview in D1, permanent object storage, logs or analytics.
- Never cache Try On API requests or results in the PWA service worker.
- Keep shopping available when preview generation is paused.
- Avoid fake progress percentages, fit guarantees and invented product availability.
- Require a verified customer session and current consent.

## 3. Customer journey

The journey has five stages:

1. Choose the look.
2. Prepare a suitable photo.
3. Confirm privacy and limitations.
4. Create the preview with truthful progress.
5. Compare, save, share and shop the result.

Entry points include product pages, complete looks, Style Me results, saved outfits and the wardrobe. Selected product identities remain attached throughout the request and result.

## 4. Look preparation

The screen begins with a compact summary of every selected piece, including product image, product name, store or designer, selected colour and current availability. Customers can open, replace or remove an item when the remaining outfit stays valid.

Before accepting a preview request, the app checks garment compatibility. A look may contain one base garment per body region, optional compatible layers, one pair of shoes and accessories. Conflicting combinations such as two base dresses or two pairs of shoes require the customer to choose one. Two jackets are allowed only when one is explicitly treated as an outer layer.

The backend repeats this validation against current catalogue records. Browser validation exists only for immediate feedback.

## 5. Photo preparation

Before upload, the customer sees concise guidance:

- Use a photograph containing one adult.
- Face the camera in clear, even lighting.
- Keep the face and relevant body area visible.
- Keep arms relaxed when possible.
- Use a full-body photograph for shoes and complete looks.
- Use a waist-up photograph only for upper-body garments.
- Avoid oversized outerwear that hides the body area being styled.

Supported files are JPG, PNG and WebP up to 10 MB. The client validates type and size before upload. The server independently validates content type, size, dimensions, orientation and image structure.

The preflight outcome is one of:

- Ready for the requested look.
- Ready only for a narrower clothing-only preview.
- Needs a clearer, brighter or less cropped photograph.
- Unsupported or unsafe.

The app may offer the narrower preview only when it is honest. It never silently removes shoes or other requested pieces.

## 6. Consent and privacy

Immediately before submission, the customer confirms:

- They have permission to use the photograph.
- The person shown is an adult.
- The photograph will be processed temporarily and privately for the preview.
- The result is a visual preview and not an exact fit guarantee.

Consent is versioned. A customer confirms it again when the version changes. It may remain valid for the same photograph during one short active session.

Customer copy states: "Your uploaded photo is processed for this preview and is not added to your profile, stories or public wardrobe."

The original photo and generated result remain in transient request/browser memory. They are excluded from analytics, logs, D1 and persistent object storage. A customer may deliberately download the generated result to their device. Logging out or leaving the active flow removes any unsaved browser-memory result.

## 7. Submission and progress

The primary action reflects the blocking requirement: Add a photo, Resolve outfit, Confirm privacy or Create preview. It disables immediately after submission.

Progress maps only to server states:

- Checking your photo.
- Preparing the outfit.
- Creating your preview.
- Finishing the details.

There is no fake percentage. The UI provides elapsed-time guidance after a reasonable delay and supports reduced motion. A customer may cancel before provider submission. After provider submission, cancellation hides the result but may still consume the allowance because external processing may already have occurred.

## 8. Result experience

The generated preview is the visual focus. Actions include:

- Original/Preview segmented comparison.
- Save to device.
- Native share, with download fallback.
- Try another look.
- Replace one product while keeping the rest.
- Open each attached product.
- Select an available variant and add to cart.
- Delete the transient preview.

The original photograph is never shared. Shared content includes only the generated result, a short StylishMe caption and a stable look or product link.

The backend rechecks product publication, variant existence and stock before cart insertion. A sold-out result remains viewable, but the affected product is marked unavailable and offers View similar or Replace this piece.

The result disclaimer is: "This preview helps you explore the look. Colours, drape, texture and fit may differ in person."

## 9. Server pipeline

Every request follows this order:

1. Authenticate a verified, active customer.
2. Enforce request-size and abuse limits.
3. Validate and hash the idempotency key.
4. Validate current consent.
5. Validate the uploaded image.
6. Load products and variants from the authoritative catalogue.
7. Validate compatibility and reference eligibility.
8. Atomically reserve a preview allowance.
9. Run image safety checks.
10. Fetch and validate approved catalogue references.
11. Submit one controlled provider request.
12. Validate the provider response.
13. Atomically finalize the job and allowance.
14. Record privacy-safe operational facts.
15. Return the result with no-store headers.

The pipeline stops at the first failed stage. It does not spend a provider request on a known-invalid input.

## 10. Job state model

Dedicated job states are:

- `created`
- `validating`
- `moderating`
- `preparing_references`
- `generating`
- `completed`
- `validation_failed`
- `moderation_failed`
- `reference_failed`
- `provider_retryable`
- `provider_final`
- `timed_out`
- `cancelled`
- `expired`

Transitions are validated on the server and claimed atomically. Completed and final-failure jobs cannot return to generation. One customer may have only one active job at a time.

Each submission has a cryptographically random idempotency key. The database stores only its hash. A repeated request returns the existing state rather than creating a second billable operation. A retry is permitted only for a controlled retryable state and at most once.

## 11. Database model

Create dedicated normalized tables:

### `try_on_jobs`

Stores job ID, hashed customer identity, hashed idempotency key, state, consent version, quality tier, selected product/variant identifiers, attempt count, controlled failure category, provider request identifier when safe, timestamps and expiry. It contains no image, image path, raw prompt, email address or measurements.

### `try_on_allowance_events`

Stores atomic allowance reservations, consumption, releases and expiry. Events link to a job and hashed customer identity. A reservation is consumed only after provider submission and released when failure occurs beforehand.

### `try_on_operational_metrics`

Stores aggregate-safe operational facts: state outcome, controlled failure category, duration band, quality tier and conversion event. It contains no customer photograph, result, prompt, full email or personal measurements.

Indexes support customer/day limits, active-job checks, state/expiry cleanup and aggregate operations. Scheduled cleanup removes stale job metadata and expired allowance reservations.

## 12. Catalogue and reference security

The browser submits product and variant identifiers. The server verifies product publication, seller eligibility, selected variant, requested colour, quality-validation state and reference ownership.

Reference fetching permits only approved HTTPS catalogue storage and explicit approved image domains. It rejects localhost, private and link-local IP ranges, metadata endpoints, arbitrary redirects, non-image responses and oversized payloads. Short timeouts and response-size limits apply. Downloaded bytes are revalidated instead of trusting headers.

Reference packages describe garment type, colour, material, body region and layer role. Instructions explicitly prevent copying a reference model's identity, face, body or pose.

## 13. Provider boundary

Provider integration remains behind neutral interfaces:

- `checkImageSafety()`
- `createStylePreview()`
- `classifyGenerationFailure()`

Only this adapter reads server secrets or provider/model settings. It applies timeouts, captures safe provider request identifiers, validates image output and classifies errors. It does not log photographs, generated images, prompts or API keys.

Customer-facing language never names the provider, model or AI. Internal failure categories are:

- `invalid_input`
- `consent_invalid`
- `account_ineligible`
- `usage_limit`
- `photo_unsuitable`
- `safety_rejected`
- `catalogue_invalid`
- `reference_unavailable`
- `provider_auth`
- `provider_quota`
- `provider_rate_limit`
- `provider_access`
- `provider_timeout`
- `provider_content_rejected`
- `provider_invalid_response`
- `internal_error`

## 14. Limits, retries and budget controls

Initial limits are configurable rather than hard-coded product promises. The launch defaults are three provider-submitted previews per verified customer per rolling day, one active job per customer, a stricter IP abuse limit and a global daily ceiling. Owner configuration may adjust these values.

The server reserves allowance atomically before provider submission. Failures before submission release the allowance. Ambiguous provider timeouts remain pending for reconciliation instead of triggering an immediate second charge.

One automatic retry is allowed only for an explicitly temporary provider rate limit, timeout or reference-network failure. Safety, validation, authorization, quota, budget and access failures are never automatically retried.

An emergency pause switch stops new generation while preserving browsing, saved looks and cart actions.

## 15. Recovery contract

Every controlled failure maps to one useful customer action:

- Unsuitable photo: choose a clearer or appropriately framed photo.
- Safety rejection: choose a clear, fully clothed photograph containing one adult.
- Catalogue conflict: replace or remove the named piece.
- Reference unavailable: replace the affected product.
- Temporary pressure: retry shortly; the attempt is not counted when no provider submission occurred.
- Daily allowance: state when more previews become available.
- Timeout: reconnect to the existing job or retry only when marked safe.
- Configuration or global budget pause: continue shopping or save the look.

Raw exception messages, stack traces and provider responses never reach the customer.

## 16. Accessibility and weak networks

The flow supports keyboard navigation, visible focus, form labels, minimum touch targets, reduced motion, status live regions, error-focus management and accessible segmented comparison. Meaning never depends on colour alone.

Selections, consent and the local photo remain intact across a recoverable pre-submission network failure. After provider submission, reconnecting queries the existing job by idempotency state rather than starting another request. If generation is still active, the page resumes truthful progress and receives the result when it completes. Because the backend never stores the generated image, a completed result cannot be re-delivered after the customer closes or reloads the result page; the app explains this limitation and restores the selected catalogue look without claiming that the preview can be recovered. The service worker excludes every Try On API request and response.

## 17. Owner operations and privacy

The private owner experience may show availability, pause state, attempt counts, success rate, controlled failure categories, duration bands, provider rate-limit events, estimated usage band and aggregate preview-to-product/cart conversion.

It must never expose original photos, generated previews, prompts, full emails, measurements or customer-level browsing histories.

## 18. Testing

Automated and production-safe verification covers:

- Authentication, verification, role and session expiry.
- Consent completeness and versioning.
- File format, size, dimensions and framing guidance.
- Garment compatibility and authoritative catalogue validation.
- Arbitrary/private-network reference rejection.
- Duplicate and concurrent submission safety.
- Atomic allowance reservation, consumption, release and expiry.
- Per-customer, IP and global limits.
- Emergency pause.
- Moderation rejection.
- Provider authentication, quota, rate, access, timeout, content and malformed-response failures.
- Successful generation and response validation.
- One controlled retry with no duplicate charge.
- Result no-store headers and service-worker exclusion.
- Live stock revalidation before cart insertion.
- Logout, navigation and reconnection during generation.
- Absence of private images, prompts and emails in database, logs and analytics.
- Accessibility and reduced-motion states.

Production verification uses controlled test accounts and approved non-private fixtures. It does not inspect or export customer photos.

## 19. Delivery scope

### Included

- Photo preparation and preflight guidance.
- Garment compatibility validation.
- Server-authoritative jobs and state transitions.
- Hashed idempotency and atomic allowances.
- One active job per customer.
- Reference security and authoritative catalogue use.
- Privacy-safe provider failure classification and operational metrics.
- One controlled retry.
- Global pause and configurable usage ceiling.
- Improved progress, comparison and result actions.
- Local save, native share, replace item and stock-safe add to cart.
- Accessibility, weak-network recovery and PWA cache exclusions.
- Tests, deployment and production verification.

### Excluded

- Payment activation.
- Measurement-based fit guarantees.
- Persistent cloud galleries.
- Public try-on posts.
- Multiple generated poses.
- Background-removal tools.
- Subscription plans.
- Unlimited retries.
- Customer-facing provider or AI terminology.

## 20. Acceptance criteria

Try On 2.0 is accepted when a suitable photo and valid current catalogue look reliably produce a preview; unsuitable requests stop before paid generation when possible; duplicate requests create one job; every failure offers a specific recovery action; compare, save, share, replace and cart actions work; product availability remains authoritative; provider and global limits work atomically; no personal image enters permanent storage, logs or analytics; shopping remains available during a pause; and the established StylishMe UI remains intact.
