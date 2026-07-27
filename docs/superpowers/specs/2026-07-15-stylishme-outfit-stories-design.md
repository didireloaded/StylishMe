# StylishMe Outfit Stories and Catalogue Design

**Date:** 15 July 2026  
**Status:** Approved design, pending written-spec review

## Objective

Make the StylishMe home screen calmer while strengthening outfit discovery. Preserve the circular story row, but limit it to shoppable outfit stories. Bring the strongest catalogue, shop, and outfit ideas from the Moda Flow reference into StylishMe without copying its branding or overcrowded home layout.

## Product Direction

StylishMe will use a focused editorial home: brand header, outfit stories, one Outfit of the Day hero, a compact trending edit, and a designer discovery row. Longer discovery lists remain in Shop and designer catalogues.

The five bottom tabs will be:

1. Home
2. Shop
3. Outfits
4. Cart
5. Profile

Wishlist will no longer be a bottom tab. It will remain fully functional and move into Profile.

## Home Screen

The home screen will contain, in order:

1. StylishMe header with Search and Notifications.
2. A horizontally scrolling row of outfit-only story circles.
3. One large Outfit of the Day hero with a single image, short title, total outfit price, and one **Shop the Look** action.
4. A compact **Trending Now** product row.
5. A compact **Designers** row that opens individual catalogues.

The existing stacked hero, shop-the-look card, repeated product grids, and additional home sections will be consolidated so the first screen has one clear focal point.

## Outfit Stories

### Publishing

Stories are curated commerce content published by approved designers, stores, or the StylishMe team. Customer story uploads are outside this version.

### Viewer

Selecting a story opens a full-screen story viewer with:

- segmented progress indicators;
- designer or collection name;
- automatic progression with tap-left and tap-right navigation;
- close control;
- outfit title and total price;
- visible product count;
- product tags or a compact item tray;
- **Save Outfit** action;
- **Add All to Cart** action;
- **View Outfit** action leading to the Outfits screen.

Saving an outfit adds it to Saved Outfits inside Profile. Adding all items to the cart uses available default sizes where a saved Fit Passport recommendation exists. If a required size or colour is missing, StylishMe opens a compact selection sheet before completing the cart action.

Unavailable items remain visible but are excluded from Add All to Cart with a clear unavailable label. The customer can still save the full outfit.

## Outfits Tab

The Outfits tab is a curated shopping experience, not a complex outfit-creation tool.

It will show:

- an editorial outfit image;
- outfit name and styling note;
- designer or curator;
- item thumbnails;
- individual item price and availability;
- combined total;
- Save Outfit;
- Add All to Cart;
- links to each product detail page.

Customers can switch between several prepared outfits. Saved Outfits appears in Profile alongside Wishlist.

## Shop

Shop retains the existing dark premium visual language and gains the clearer catalogue hierarchy from the reference:

- page title, search, cart and filter controls;
- horizontally scrollable category tabs;
- item count and sorting;
- two-column product grid;
- wishlist heart on every product;
- badges for new, sale, limited drop, made locally, and made to order;
- bottom-sheet filters for category, size, colour, price, designer, location and delivery.

Shop remains the primary place for broad product browsing. Home does not duplicate the full catalogue.

## Designer Catalogues

Every designer card, story identity, or product designer link opens a dedicated catalogue with:

- cover image and profile mark;
- designer name, location and verified state;
- product count, rating and delivery coverage;
- Follow action;
- short brand story;
- collection or category chips when useful;
- complete designer product grid.

The catalogue uses Namibian designers, Namibian locations, N$ pricing, and the existing StylishMe visual system.

## Profile and Wishlist

Profile will include clear rows for:

- My Orders;
- Wishlist;
- Saved Outfits;
- Saved Addresses;
- Fit Passport;
- Notifications;
- Help and Support;
- Settings.

The existing Wishlist screen remains available from Profile. Wishlist product saving continues to work from product cards, stories, outfit views, and product details.

## State and Data Flow

The existing D1-backed customer state remains the source for cart, wishlist, orders and profile preferences. The state model will add a saved-outfit identifier list. Local storage remains a development fallback only.

Product, designer, outfit and story content can remain seeded catalogue data in this version. All customer actions use stable item identifiers so the UI can later connect to a protected catalogue service without changing the screen contracts.

## Interaction and Accessibility

- Story controls have accessible labels and support keyboard activation.
- Automatic story progression pauses when the page loses focus and respects reduced-motion preferences.
- Add All to Cart reports how many items were added or unavailable.
- Every saved action provides immediate visual confirmation.
- Fixed bottom actions preserve safe-area spacing on mobile.
- Text and controls maintain readable contrast against the dark interface.

## Error and Empty States

- A story with no available products offers Save Outfit and View Similar instead of Add All to Cart.
- A partially unavailable outfit shows the unavailable items before cart confirmation.
- Empty Wishlist and Saved Outfits screens lead back to Shop or outfit stories.
- Failed persistence keeps the interaction locally and retries through the existing state fallback.

## Verification

Implementation will be checked with:

- automated assertions for the five-tab navigation and Wishlist placement;
- automated assertions for outfit-story, Saved Outfits and Add All to Cart behavior;
- production build and lint;
- browser verification of Home → Story → Save Outfit;
- browser verification of Story → Add All to Cart → Cart;
- browser verification of Designer → Catalogue → Product;
- browser verification of Profile → Wishlist and Saved Outfits;
- a final production visual check at the deployed URL.

## Out of Scope

- customer-uploaded stories;
- public comments, followers or social feeds;
- live shopping;
- automatic outfit generation;
- virtual try-on;
- complex drag-and-drop outfit creation;
- real payment processing changes.
