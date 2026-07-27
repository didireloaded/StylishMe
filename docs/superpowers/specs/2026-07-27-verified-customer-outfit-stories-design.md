# Verified Customer Outfit Stories

## Purpose

StylishMe will extend its existing outfit-story row with customer outfit photographs from verified buyers. The feature helps customers see how purchased pieces are worn while keeping the experience focused on shopping rather than becoming a general social network.

## Product boundaries

- Only a signed-in customer with a delivered or collected StylishMe order can publish.
- A story must tag at least one item from that customer’s eligible order history.
- The tagged seller is derived from the purchased product; customers cannot type an unrelated store tag.
- Stories support likes and sharing.
- Stories do not support comments, direct messages, follower relationships, public customer profiles or unrestricted user tagging.
- The customer may optionally display a first name. Email, phone, address and full account identity are never public.

## Customer experience

### Discovery

The existing story row remains in place. Editorial and designer stories retain their current appearance and behaviour. A verified customer story uses the same viewer, with a restrained verified-purchase marker and a clear tagged-store label.

Eligible customers see an “Add yours” story at the beginning of the row. Ineligible or signed-out customers can view published stories but do not see an enabled upload action.

### Publishing flow

1. The customer opens “Add yours.”
2. The backend returns delivered or collected order items owned by that customer.
3. The customer selects one or more eligible products.
4. The customer chooses one outfit photograph.
5. The customer may add a short caption and town.
6. The customer previews the story, tagged seller and tagged products.
7. The customer submits the story.
8. The server validates ownership, order status, product tags, file safety, image properties and content safety.
9. A passing story is published. A failing story remains unpublished and returns a specific, non-technical correction message.

The submit action is idempotent and disabled while processing so repeated taps do not create duplicate stories.

### Story viewer

A customer story displays:

- Outfit photograph
- Verified-purchase marker
- Optional first name
- Optional town
- Optional short caption
- Tagged store
- Tagged purchased products
- Like control and count
- Share action
- “Shop the pieces” action
- Report action
- Delete action for the owner

The viewer retains the existing timer, progress indicators, previous/next controls, focus management, keyboard escape behaviour and reduced-motion handling. Opening a product pauses or closes the story and navigates into the existing product journey.

### Story lifecycle

A published story remains in the main story ring for seven days. After seven days it leaves the ring but remains available on tagged product and store pages until the owner deletes it or moderation removes it.

Deleting a story removes it from public discovery and prevents its media from being returned publicly. A short retention window may preserve an internal deletion record for abuse investigation, but not the public photograph.

## Likes, shares and reports

- A signed-in account can like a story once.
- Pressing like again removes the like.
- Counts are calculated by the backend; the browser cannot submit a trusted total.
- Signed-out viewers may see likes but must sign in to change them.
- Share creates or copies a stable public story URL and uses the device share sheet when supported.
- A signed-in user may report a story using a controlled reason list.
- Repeated reports do not automatically punish the uploader. They create a moderation signal.
- Owners cannot report their own story and can delete it directly.

## Data model

### `customer_outfit_stories`

- `id`
- `owner_email` (private ownership field)
- `owner_display_name` (optional public first name only)
- `caption`
- `town`
- `image_key`
- `status` (`processing`, `published`, `changes_requested`, `hidden`, `deleted`)
- `quality_issues_json`
- `published_at`
- `ring_expires_at`
- `created_at`
- `updated_at`

### `customer_outfit_story_products`

- `story_id`
- `product_id`
- `order_id`
- `seller_name_snapshot`
- `product_name_snapshot`
- `product_image_snapshot`
- `product_price_snapshot`

The order and product snapshots protect the story from later catalogue edits.

### `customer_outfit_story_likes`

- `story_id`
- `actor_hash`
- `created_at`

A unique constraint on `(story_id, actor_hash)` prevents duplicate likes.

### `customer_outfit_story_reports`

- `id`
- `story_id`
- `reporter_hash`
- `reason`
- `created_at`

### Storage

Story images use the existing private media storage binding. Public image access goes through a controlled endpoint that returns media only for a publicly visible story. Original filenames and embedded metadata are not exposed.

## Backend responsibilities

The backend must:

- Authenticate publishing, liking, reporting and deletion actions.
- Verify the customer owns the referenced order.
- Verify the order status is delivered or collected.
- Verify every tagged product was part of that order.
- Enforce one active upload operation per idempotency key.
- Validate MIME type, decoded image format, file size and image dimensions.
- Re-encode the image before storage to remove embedded metadata and unsafe payloads.
- Run content-safety validation before publication.
- Rate-limit uploads, likes and reports.
- Return only public story fields to anonymous viewers.
- Never expose owner email, address, payment information or order details.

## Image quality and moderation

A publishable image must:

- Be JPEG, PNG or WebP after decoding.
- Stay within the configured upload-size limit.
- Meet a minimum usable resolution.
- Use a supported portrait or near-portrait aspect ratio.
- Pass content-safety checks.
- Avoid visible personal documents, payment information or unrelated prohibited content.

Automated checks produce either `published` or `changes_requested`. Ambiguous reports can move an already published story to `hidden` without deleting its evidence record.

## Analytics and privacy

The private developer dashboard may receive aggregated events for:

- Story published
- Story viewed
- Story liked or unliked
- Story shared
- Story reported
- Tagged product opened
- Tagged product added to cart

Analytics must not include the customer photograph, email, order identifier, address or caption text. Actor and session identifiers remain one-way hashed.

## Offline and failure behaviour

- Story browsing uses the current online catalogue behaviour and fails independently from the rest of Home.
- If stories cannot load, editorial discovery and shopping remain usable.
- Uploading requires a connection; the interface preserves selected products and caption locally when a temporary failure occurs, but does not persist the customer photograph after the upload view closes.
- If moderation or media processing is unavailable, the story remains unpublished and the customer can retry.
- A deleted, hidden or unavailable shared story opens a branded unavailable state with routes back to Home and Shop.

## Accessibility

- Upload controls have visible labels and correct file input semantics.
- Story photographs have owner-supplied or generated concise alternative text.
- Like, share, report and delete controls expose text labels and state.
- The viewer preserves focus trapping, close-button focus restoration, keyboard navigation and reduced-motion behaviour.
- Counts are not communicated using colour alone.

## Testing

Automated tests cover:

- Signed-out publishing rejection
- Ineligible-order rejection
- Cross-account order access rejection
- Delivered and collected order eligibility
- Product-tag ownership
- File type, size, decoding and dimension validation
- Metadata-free stored output
- Moderation rejection
- Duplicate-submit protection
- Public response privacy
- Like uniqueness and unlike behaviour
- Report rate limiting and controlled reasons
- Owner-only deletion
- Seven-day story-ring expiry
- Product and store archive placement
- Existing editorial story navigation regression
- Keyboard, focus and reduced-motion behaviour
- Independent failure of customer stories without breaking Home or Shop

## Launch approach

The feature launches behind a server-controlled switch. It should first be enabled for a small closed group of verified buyers. Publication volume, report rate, image rejection rate, tagged-product visits and resulting cart activity are reviewed before broader release.

## Explicitly deferred

- Comments
- Direct messages
- Public customer profiles
- Followers
- Customer story video
- Public popularity rankings
- Story replies
- Seller promotional messages to uploaders
- Automatic punishment based only on report count
