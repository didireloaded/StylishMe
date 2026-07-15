# StylishMe Base44 Customer App Design

## Purpose

StylishMe is a premium, customer-facing fashion marketplace for Namibia. It gives shoppers one trusted place to discover local fashion, see clear prices and real variant availability, choose the right fit, understand delivery before checkout, and track an order.

The first release is intentionally limited to the customer experience. Designer and administrator portals, a separate Supabase platform, live payment providers, social feeds, messaging, livestreaming, rentals, and second-hand marketplace functionality are deferred.

The app name `StylishMe` must be represented as a single app-level brand value so it can be changed later without editing individual pages.

## Product Positioning

Primary value proposition:

> Find fashion that fits you, from Namibian stores and designers, with real stock, clear prices and reliable delivery.

The experience is organized around four signatures:

1. Local discovery: make boutiques, independent brands, traditional fashion, and Namibian designers easy to find.
2. Fit confidence: combine variant-level sizing, a Fit Passport, and clearly qualified size recommendations.
3. Real availability: expose sizes, colours, quantities, pickup options, delivery areas, fees, and estimates early.
4. Fashion presentation: use editorial photography, adaptive product ambience, designer storytelling, and curated complete looks.

## Platform and Release Architecture

Base44 will provide the deployable application, authentication, hosted data entities, persistence, and public mobile-first web experience. The output is a responsive web app optimized for phone-sized browsers; it is not a native Expo binary.

The application will use Base44-native data and authentication for the first release. External Supabase infrastructure is not part of this deployment. The data boundaries should remain clear enough that a future backend migration is possible.

Guest users may browse products and stores. Authentication is required before an order is placed or account data is synchronized. Checkout uses an explicitly labelled sandbox payment flow. The application must never imply that real funds were charged.

## Navigation and Screen Model

The bottom navigation contains exactly five tabs:

- Home
- Shop
- Wishlist
- Cart
- Profile

Search opens from Home and Shop. Orders, addresses, Fit Passport, notifications, support, settings, and sign-out remain under Profile. Filters, sorting, size guidance, variant selection, quantity changes, delivery method, payment method, promotion entry, sharing, and destructive confirmations use sheets or dialogs rather than new primary routes.

The primary screens are:

1. Splash
2. Onboarding
3. Sign In
4. Create Account
5. Home
6. Shop
7. Search
8. Product Details
9. Store or Designer Profile
10. Wishlist
11. Cart
12. Checkout
13. Order Confirmation
14. My Orders
15. Order Details and Tracking
16. Profile

Secondary routes include Saved Addresses, Notifications, Help and Support, and Settings. Fit Passport appears within Profile and as contextual guidance on Product Details rather than as a sixth navigation destination.

## Core Customer Journey

The default journey is:

1. Discover a product from Home, Shop, Search, a designer profile, or a curated look.
2. Open Product Details and review images, store identity, price, availability, fit, delivery, collection, and return information.
3. Select an available colour and size. Clothing and shoes require size selection before cart addition.
4. Add the exact product variant to Cart or buy it immediately.
5. Review quantities, item availability, delivery estimate, fees, discount, and total.
6. Choose delivery or collection, select an address, select a sandbox payment method, and review the order.
7. Place the order, receive an order number and estimate, then open tracking.

Every visible action must update state, open a functional control, or navigate to a complete destination.

## Home and Discovery

Home behaves like a premium fashion editorial rather than a generic commerce dashboard. Its primary sections are:

- New In
- Available Near You
- Made in Namibia
- Shop the Look
- Trending Shoes
- Designer of the Week
- Made to Order
- Under N$1,000
- Recently Viewed

Home also exposes search, notifications, and the cart badge. Campaigns use large product or fashion photography, short editorial copy, and restrained calls to action. Discovery shortcuts represent collections, designers, and categories; they are not social stories and contain no upload action.

Shop provides category chips, a search entry, sorting and filtering sheets, and a two-column product grid. Initial categories include Women, Men, Kids, Clothing, Shoes, Bags, Accessories, Designer, Traditional Wear, and Sale. Search covers products, stores, brands, and designers, with recent and suggested queries.

Filtering supports category, size, colour, price, brand or designer, location, delivery availability, condition, and sale status. Sorting supports Recommended, Newest, Price Low to High, Price High to Low, Most Popular, and Highest Rated.

## Product and Designer Experiences

Product Details includes:

- Image gallery and image position
- Product name, store or designer, current price, and prior price when applicable
- Rating and review count
- Colour and size variants with quantity-aware availability
- Materials, description, care, fit, and condition
- Stock information, including low-stock and sold-out states
- Delivery destination, estimate, estimated fee, and collection availability before checkout
- Return eligibility and policy summary
- Wishlist, share, Add to Cart, and Buy Now actions
- Related products, Shop the Look, and Recently Viewed

When a colour variant changes, the page smoothly adopts a restrained ambience derived from that variant while retaining the standard dark background, warm-white text, and readable glass surfaces. A safe default theme is used when colour information is absent.

Sold-out variants provide useful next actions: Notify Me, Request This Size, and Ask About Made to Order when supported. Made-to-order products display production time, measurement availability, and fabric or option information without pretending to have ready stock.

Designer profiles include identity, verification, location, rating, story, inspiration or making process, collections, products, delivery areas, pickup details, and Made in Namibia status. Story content stays short and visual.

## Fit Passport

Customers can save height, chest or bust, waist, hips, shoe size, normal clothing size, and preferred fit. Product pages may show a suggested size based on these saved values and the product's fit data.

Recommendations are guidance only. The interface must state that the suggestion is not a guarantee and keep the product's size guide and measurements available.

## Wishlist, Cart, and Checkout

Wishlist supports saving, removing, moving individual items to Cart, and moving all currently available items. Unavailable products remain identifiable and cannot silently enter checkout.

Cart stores exact variants and supports quantity changes, variant changes, removal, move to Wishlist, promotion entry, and clear cost breakdowns. Display totals are derived from persisted product and variant data. If price or availability has changed, the customer receives an explicit message and must review the change.

Checkout is one step-based screen covering:

1. Delivery or store collection
2. Address
3. Sandbox payment method
4. Final review

Supported presentation options include standard delivery, express delivery where available, store collection, card placeholder, EFT placeholder, mobile payment placeholder, and cash on delivery where supported. No full card data is captured or displayed.

Successful sandbox checkout creates a persisted order, order items, a cost snapshot, delivery details, and initial status history. Confirmation displays the order number, delivery estimate, address summary, View Order, and Continue Shopping.

## Orders and Tracking

My Orders separates Active, Delivered, and Cancelled orders. Order Details shows products, quantities, variants, payment summary, delivery address, support, eligible cancellation, and eligible return request actions.

Tracking uses the following ordered stages:

- Order confirmed
- Store preparing order
- Collected by courier
- In transit
- Out for delivery
- Delivered

The first release uses a status timeline and does not include a live courier map.

## Data Model

The Base44 app should define focused entities for:

- User profile and preferences
- Address
- Fit Passport
- Store or Designer
- Category
- Collection
- Product
- Product Variant
- Product Image
- Curated Look and Look Item
- Wishlist Item
- Cart Item
- Size Request or Stock Alert
- Order
- Order Item
- Order Status Event
- Notification

Products store Namibian-dollar prices, brand or designer identity, location, delivery and collection metadata, materials, fit, return eligibility, made-to-order details, badges, and adaptive theme values. Variants store colour, size, SKU-like identity, price override where needed, and available quantity.

The app is seeded with at least 40 products, 8 fictional Namibian stores or designers, 8 collections, 4 representative customer orders, 10 notifications, and 3 Namibian addresses. Products span clothing, footwear, bags, accessories, traditional fashion, designer pieces, and made-to-order items with useful size and colour variants. It must not use counterfeit or confusingly similar luxury brands.

## Visual System

The visual language combines a modern fashion magazine with a premium store:

- Deep navy-black primary background and charcoal secondary surfaces
- Restrained glass panels with stronger opacity behind prices, copy, and controls
- Thin translucent borders and soft shadows
- Warm coral, pink, orange, and lilac accents
- Muted teal and orange ambient light
- Warm-white primary text and soft-grey secondary text
- Editorial serif headings with modern sans-serif navigation and body copy
- Large photography, rounded corners, measured spacing, and minimal iconography
- Coral-pink-orange gradient primary actions

The design avoids neon cyberpunk effects, glowing borders, excessive transparency, generic SaaS cards, oversized gradients, and ornamental animation. Motion is subtle and respects reduced-motion preferences.

## Accessibility, Responsiveness, and Data-Light Mode

The app supports small and large Android and iPhone browser sizes, safe viewport padding, flexible grids, readable dynamic text, visible focus and selection states, useful screen-reader labels, and touch targets of practical mobile size. Status is never communicated only by colour.

Data-light mode reduces large image loading, automatic transitions, and nonessential motion. It prioritizes compressed primary images and defers secondary gallery images. Wishlist, Cart, and recently viewed information remain available from persisted app data whenever the platform session permits. The app must display a clear offline or connectivity state instead of silently failing.

## Error and State Design

Every core route includes appropriate loading, empty, and failure states. The application explicitly handles:

- Empty search results
- Empty Wishlist and Cart
- Invalid sign-in or form input
- Missing size selection
- Low stock and insufficient stock
- Price changes
- Unavailable delivery or collection
- Checkout failure
- Missing product or order
- Connectivity problems
- Destructive confirmations

Messages explain what happened and give a useful recovery action. Toasts confirm reversible actions such as saving a product or adding a variant to Cart.

## Verification and Acceptance

Before deployment is treated as complete, verification must cover:

- Splash, onboarding, authentication, and guest browsing
- Five-tab navigation and back navigation
- Home sections and destination links
- Search, suggested queries, filtering, sorting, and empty results
- Correct Product Details routes and adaptive variant ambience
- Size and colour selection with quantity-aware stock
- Fit Passport editing and qualified recommendations
- Wishlist add, remove, and move-to-cart behavior
- Cart variant changes, quantities, fees, discounts, and totals
- Delivery and collection choices
- End-to-end sandbox checkout and order creation
- Confirmation, My Orders, Order Details, and tracking timeline
- Size requests and made-to-order inquiries
- Recently viewed behavior
- Notification and profile actions
- Data-light preference
- Responsive phone layouts and readable contrast
- Complete loading, empty, error, and confirmation states
- Absence of seller/admin portals, social features, live payments, and unfinished placeholder destinations

The public result must be a deployed Base44 app with a working URL and a coherent discovery-to-delivery demo journey.
