# StylishMe production service activation

The production code is fail-closed: a provider-backed feature is hidden or returns a clear unavailable response until every required value is configured. Never add provider secrets to this file, source control, chat, or client-side environment variables.

## Ready in the application

- Normalized seller catalogue, variant inventory, stable product/store slugs, and public deep-link routes.
- Atomic stock reservation, multi-seller order allocation, reservation expiry, and scheduled cleanup.
- DPO hosted checkout adapter, server-side payment verification, idempotent callbacks, bounded refunds, and automatic refund when a paid callback arrives after stock expiry.
- Seller/platform double-entry settlement ledger. Payouts stay held; there is no manual “mark paid” escape hatch.
- Seller delivery/collection fulfilment, customer milestone tracking, and real DHL tracking adapter. Collection orders never display courier tracking.
- Email ownership verification, password recovery, delayed/cancellable account deletion, provider revocation, and private-media deletion.
- Google authorization-code + PKCE login and Apple form-post login, verified locally with provider JWKS. Social identities are keyed by provider subject and never silently linked to legacy email addresses.
- Fifteen-minute scheduled maintenance for expired stock holds and due account deletions, plus catalogue-read stock cleanup as a fallback.

## External activation required

### DPO Pay

- Complete DPO merchant onboarding for Namibia and obtain the live company token and service type.
- Configure the live hosted-checkout, return, and callback URLs for the production domain.
- Run one low-value real payment, duplicate-callback test, decline test, and full/partial refund test before accepting customers.

### Transactional email

- Verify the production sending domain with the email provider.
- Configure the provider API key and a verified From address.
- Test signup verification, expired/resend verification, password recovery, and account-deletion confirmation in major mail providers.

### Google sign-in

- Create a Web OAuth client for the production domain.
- Register the exact production callback URL.
- Configure the client ID and secret, then verify sign-in, cancellation, collision handling, provider linking, and logout.

### Apple sign-in

- Create an Apple Services ID and associate the production domain and callback URL.
- Configure the Team ID, Key ID, private signing key, and Services ID.
- Verify first sign-in, returning sign-in, provider revocation, and deletion of an Apple-only account.

### DHL tracking

- Obtain a production DHL tracking subscription key; demo keys are deliberately rejected.
- Confirm the seller enters the exact carrier and tracking number.
- Test accepted, in-transit, exception, delivered, and unknown-shipment responses. Do not add a live map unless the carrier provides truthful location data.

### Seller payouts

- Select a regulated payout provider that supports the required Namibia marketplace flow.
- Complete marketplace/merchant agreements and confirm Bank of Namibia requirements with qualified counsel.
- Implement and verify provider-signed payout confirmation before moving ledger entries from held to paid.
- Reconcile each provider batch against the immutable seller ledger; never store seller bank credentials in analytics.

## Release checks

- Confirm the host provisions the `*/15 * * * *` scheduled Worker trigger.
- Confirm payment, OAuth, email, and courier configuration endpoints report unavailable before credentials and available only after complete configuration.
- Keep card data, full addresses, private photos, try-on images, provider credentials, and raw identity tokens out of logs and analytics.
- Rotate any credential that has ever appeared in chat, logs, screenshots, or source control before production use.
