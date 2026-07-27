# StylishMe Full-Viewport PWA Design

**Date:** 2026-07-19
**Status:** Approved
**Product:** StylishMe Namibia

## Objective

Turn the current StylishMe mobile-first website into an installable Progressive Web App while removing the decorative phone mockup. The same shopping experience must fill the real device viewport, respect mobile safe areas, and remain usable in ordinary desktop browsers without resembling a phone placed inside a webpage.

## Chosen Approach

Use one full-viewport responsive PWA shell for browser and installed modes.

- Remove the rounded 430px phone frame, desktop stage padding, border, shadow, and fake `9:41 / 5G` status bar.
- Let the application canvas occupy the full browser or standalone-app viewport.
- Preserve readable internal content widths where useful, but do not reintroduce an outer device frame.
- Keep the existing five-tab mobile navigation and all current shopping journeys.

This is preferred over a fixed mobile-width canvas or a design that becomes fullscreen only after installation because both alternatives retain the visual feeling of a mockup in normal browsers.

## Application Shell

The root shell will use `100dvh` with a `100vh` fallback and the existing dark editorial background. The primary content area will grow to the available width and height. Header, content, sheets, story viewer, sticky actions, and bottom navigation will use CSS safe-area insets so controls are not hidden by notches, the Dynamic Island, home indicators, or Android system bars.

The fake status bar will be removed from the rendered component. Real device status-bar appearance will be controlled through PWA metadata and theme colours.

On larger screens, grids may gain columns and sections may use a readable internal maximum width. The root app itself must remain borderless and full-viewport; it must not have rounded device corners or a device shadow.

## PWA Installability

The app will provide:

- A web app manifest with `name`, `short_name`, StylishMe colours, `display: standalone`, portrait-first orientation, start URL, scope, and app icons.
- Standard 192px and 512px icons plus maskable icon declarations derived from the approved StylishMe visual identity.
- Apple mobile-web-app metadata and an Apple touch icon.
- Viewport metadata suitable for `viewport-fit=cover`.
- A small client-side service-worker registration component.
- A versioned service worker for the application shell and static assets.

Installation must work without adding an intrusive permanent banner. Browser-native installation remains available; a future contextual install prompt can be added separately.

## Offline and Commerce Safety

The service worker may cache the application shell, fonts, icons, and static imagery. It must not treat prices, stock, customer state, checkout requests, or order mutations as authoritative offline data.

- Navigation requests may fall back to a branded offline page when the network is unavailable.
- State API reads use the network and may fall back only to an explicit unavailable response, not stale commerce data.
- State-changing API calls are always network-only and are never queued silently.
- Checkout and order confirmation remain unavailable without a live connection.

This preserves the backend as the source of truth for price and stock.

## Existing Behavior to Preserve

The PWA conversion must not change:

- Home discovery and Outfit of the Day.
- Outfit-only shoppable stories.
- Designer catalogues and Shop filtering.
- Curated Outfits, Saved Outfits, Wishlist, Cart, Checkout, and Orders.
- The exact bottom tabs: Home, Shop, Outfits, Cart, Profile.
- Namibian-dollar formatting and stable product identities.
- Story modal focus management, accessibility, stock caps, and valid product-variant handling.

## Accessibility and Touch

- Interactive targets remain at least 44px where space permits.
- Focus outlines, keyboard navigation, Escape handling, and modal focus trapping remain intact.
- Fixed navigation and sticky actions must not cover scrollable content.
- Standalone mode must honor reduced motion and safe-area insets.
- The offline page must clearly explain that live prices, stock, and checkout require reconnection.

## Testing and Acceptance Criteria

Automated verification will cover:

- No rendered fake status bar or device-frame class.
- Manifest metadata, icon declarations, and standalone mode.
- Service-worker registration and commerce-safe request strategy.
- Existing mounted shopping interaction tests.
- Full test suite, ESLint, production build, and `git diff --check`.

Browser verification will cover:

1. Phone viewport: edge-to-edge shell, safe bottom navigation, scrollable content, and fullscreen stories.
2. Tablet/desktop viewport: borderless responsive layout with no phone mockup.
3. Manifest and service-worker registration in production.
4. Installability/standalone metadata.
5. Offline navigation fallback without presenting stale prices, stock, or checkout as current.
6. One complete Story to Cart journey after deployment.

## Out of Scope

- Native App Store or Google Play packages.
- Push notifications.
- Background checkout or offline order queues.
- A custom install-prompt campaign.
- Replacing the existing Sites backend or commerce state model.
