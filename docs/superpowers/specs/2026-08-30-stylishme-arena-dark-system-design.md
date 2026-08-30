# StylishMe Arena Dark System Design

## Goal

Rebuild every StylishMe surface around one dark, image-first fashion system inspired by the supplied Arena references while preserving the marketplace's existing customer, seller, authentication, fulfilment, payment, and account behavior.

## Visual System

- Use `#000000` for the outer desktop canvas, `#1c1c1e` for primary app surfaces, `#2c2c2e` for raised panels, and `#3a3a3c` for interactive hover or selected surfaces.
- Use white as the primary foreground, `#8e8e93` as secondary text, and `#f5b800` as the only dominant accent. Coral remains available only for destructive or urgent states.
- Use Inter/system sans throughout. Headlines are bold and compact; the previous serif editorial treatment is removed.
- Customer screens remain phone-first at a maximum width of 430px and center on the black canvas at larger widths.
- Seller screens use the same tokens and controls in a wider, work-focused layout with a compact side rail on desktop and a drawer on mobile.
- Raised panels use 16-24px radii. Product imagery uses 16px radii. Navigation uses a 28px floating capsule.
- Motion is limited to short screen entrance, hover, press, drawer, and toast transitions.

## Customer Experience

- Home uses a compact brand header, welcome and stats panel, category tabs, an image-first two-column product grid, floating product actions, outfit stories, Outfit of the Day, Shop the Look, local collections, and designer discovery.
- Shop and search use the same two-column product language with dark filter controls and clear zero-result states.
- Product detail uses a full-width image, floating back/save/share controls, a dark overlapping information sheet, circular colour and size selectors, product metadata, fit guidance, delivery, reviews, and a persistent purchase action.
- Cart uses image-led rows, circular quantity controls, a raised summary panel, and a high-contrast checkout button.
- Profile uses an avatar, gold ring, stats, grouped dark menu panels, order previews, and the existing account controls.
- Checkout, orders, tracking, wardrobe, wishlist, addresses, notifications, support, settings, try-on, stories, outfits, storefronts, and designer pages inherit the same primitives.
- Every existing button retains its current handler and state behavior. No visual control may be added without a working action.

## Seller Experience

- The seller overview remains operational rather than marketing-led: compact navigation, one primary action, focused metrics, priority work, and storefront status.
- Products, product editing, orders, inventory, payouts, collections, customers, reviews, analytics, settings, and store profile share the dark panel and gold action language.
- Existing forms, upload handling, stock adjustment requirements, fulfilment transitions, publishing checks, and clipboard actions remain unchanged.
- Empty and demo states explain the absence of real data without presenting disabled navigation as functionality.

## Entry, Authentication, And Demo

- Onboarding and role selection use full-bleed fashion imagery with a dark gradient, bold condensed copy, progress indicators, and one clear action.
- Login, signup, recovery, profile completion, and account forms use dark raised panels with visible labels, accessible focus rings, and clear success/error states.
- Demo role choice and tours use the same image-first composition, then open the real customer or seller experience inside a compact demo control bar.

## Responsive And Accessibility Requirements

- Support 320px through wide desktop without horizontal page overflow.
- Keep tap targets at least 40px and primary actions at least 48px high.
- Preserve visible focus states, semantic labels, disabled states, and readable contrast.
- Fixed navigation and action bars must respect safe-area insets and never cover the last interactive content.
- Product grids stay two columns on customer mobile and adapt to available seller width.

## Verification

- Keep existing behavior tests passing and add rendered-structure assertions for the shared Arena shell.
- Run interaction tests, TypeScript, ESLint, production build, and whitespace checks.
- Visually inspect customer home, shop, product, cart, and profile plus seller overview, products, and add-product flow at mobile and desktop widths.
- Publish only the exact verified commit and verify the public assets and live page after deployment.
