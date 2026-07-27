import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("contains the complete StylishMe shopping journey", async () => {
  const [app, productCatalog] = await Promise.all([
    read("app/StylishMeApp.tsx"),
    read("app/product-catalog.ts"),
  ]);

  assert.match(app, /Array\.from\(\{ length: 41 \}/);
  const tabsSource = app.match(/const mainTabs:[^=]+=\s*\[([\s\S]*?)\n\s*\];/);
  assert.ok(tabsSource, "mainTabs should be declared as an array");
  const mainTabs = Array.from(
    tabsSource[1].matchAll(/\["([^"]+)", "([^"]+)", "([^"]+)"\]/g),
    (match) => match.slice(1),
  );
  assert.deepEqual(mainTabs, [
    ["Home", "home", "home"],
    ["Shop", "shop", "shop"],
    ["Stores", "stores", "shop"],
    ["Try On", "try-on", "sparkles"],
    ["Wishlist", "wishlist", "heart"],
    ["Profile", "profile", "profile"],
  ]);
  assert.doesNotMatch(tabsSource[1], /"Cart", "cart"/);
  assert.match(app, /aria-label=\{`Open cart, \$\{cartCount\} items`\}/);
  assert.match(app, /\["Saved outfits", "outfits"\]/i);
  assert.match(app, /Add to cart ·/);
  assert.match(app, /Place sandbox order/);
  assert.match(app, /Order tracking/);
  assert.match(app, /Fit Passport/);
  assert.match(productCatalog, /Made in Namibia/);
});

test("customer-facing styling previews use neutral digital language", async () => {
  const [app, tryOn] = await Promise.all([
    read("app/StylishMeApp.tsx"),
    read("app/TryOnView.tsx"),
  ]);

  for (const source of [app, tryOn]) {
    assert.doesNotMatch(source, /AI OUTFIT PREVIEW|AI-generated|AI preview/i);
  }
  assert.match(tryOn, /DIGITAL OUTFIT PREVIEW/);
  assert.match(tryOn, /digitally created/);
});

test("returns products to their origin and marks profile destinations current", async () => {
  const app = await read("app/StylishMeApp.tsx");

  assert.match(app, /const \[productReturnView, setProductReturnView\] = useState<View>\("shop"\)/);
  assert.match(app, /const openProduct = \(id: string, returnView: View = view\) => \{[\s\S]*?setProductReturnView\(returnView\);[\s\S]*?navigate\("product"\);\s*\};/);
  assert.match(app, /onClick=\{\(\) => navigate\(productReturnView\)\}[^>]*aria-label="Go back"/);
  assert.match(app, /onOpenProduct=\{\(id\) => openProduct\(id, "outfits"\)\}/);
  assert.match(app, /header\("Wishlist"\)/);
  assert.match(app, /const profileViews: View\[\] = \["profile", "wardrobe", "orders", "tracking", "addresses", "notifications", "support", "settings"\]/);
  assert.match(app, /const isMainTabActive = \(target: View\) =>[\s\S]*?target === view[\s\S]*?target === "home" && view === "designer"[\s\S]*?target === "profile" && profileViews\.includes\(view\)/);
  assert.match(app, /aria-current=\{active \? "page" : undefined\}/);
});

test("disables outfit bulk add when every item is unavailable", async () => {
  const [outfitsView, css] = await Promise.all([
    read("app/OutfitsView.tsx"),
    read("app/globals.css"),
  ]);

  assert.match(outfitsView, /const availableCount = items\.filter\(\(product\) => product\.available\)\.length/);
  assert.match(outfitsView, /disabled=\{!availableCount\}/);
  assert.match(outfitsView, /availableCount \? "Add All to Cart" : "All items unavailable"/);
  assert.match(outfitsView, /!product\.available && <b>Unavailable<\/b>/);
  assert.match(css, /\.outfit-actions \.gradient-button:disabled/);
});

test("persists customer state through the configured D1 backend", async () => {
  const [route, schema, hosting] = await Promise.all([
    read("app/api/state/route.ts"),
    read("db/schema.ts"),
    read(".openai/hosting.json"),
  ]);

  assert.match(route, /export async function GET/);
  assert.match(route, /export async function POST/);
  assert.match(route, /customerState/);
  assert.match(route, /savedOutfits/);
  assert.match(route, /profileJson:\s*JSON\.stringify\(profile\)/);
  assert.match(route, /accountRole:\s*previousProfile\.accountRole/);
  assert.match(schema, /sqliteTable\("customer_state"/);
  assert.match(schema, /cartJson/);
  assert.match(schema, /wishlistJson/);
  assert.match(schema, /ordersJson/);
  assert.equal(JSON.parse(hosting).d1, "DB");
});

test("ships the premium mobile design and social card", async () => {
  const [css, layout, image] = await Promise.all([
    read("app/globals.css"),
    read("app/layout.tsx"),
    stat(new URL("public/og.png", root)),
  ]);

  assert.match(css, /grid-template-columns:\s*repeat\(6, 1fr\)/);
  assert.match(css, /linear-gradient\(105deg, #c270d5/);
  assert.match(css, /\.screen-content\s*\{[^}]*width:\s*min\(100%, 960px\)/s);
  assert.match(css, /\.product-grid/);
  assert.match(css, /\.product-hero/);
  assert.match(layout, /StylishMe — Fashion from Namibia/);
  assert.match(layout, /images: \[\{ url: `\$\{origin\}\/og\.png`/);
  assert.ok(image.size > 100_000, "social card should be a real production image");
});

test("wires outfit-only stories into a calm editorial home", async () => {
  const [app, viewer, behavior, css] = await Promise.all([
    read("app/StylishMeApp.tsx"),
    read("app/OutfitStoryViewer.tsx"),
    read("app/outfit-story-behavior.ts"),
    read("app/globals.css"),
  ]);
  assert.match(app, /OUTFIT_STORIES\.map/);
  assert.match(app, /Outfit of the day/i);
  assert.doesNotMatch(app, /\["New In", "Near You", "Designers", "Shoes", "Made Local", "Drops"\]/);
  assert.match(viewer, /Save Outfit/);
  assert.match(viewer, /Add All to Cart/);
  assert.match(viewer, /View Outfit/);
  assert.match(behavior, /5_000/);
  assert.match(viewer, /document\.hidden/);
  assert.match(viewer, /prefers-reduced-motion: reduce/);
  assert.match(viewer, /visibilitychange/);
  assert.match(viewer, /role="dialog"/);
  assert.match(viewer, /aria-modal="true"/);
  assert.match(viewer, /closeButtonRef\.current\?\.focus\(\)/);
  assert.match(viewer, /const fallbackPreviouslyFocused = restoreFocusTo\s*\? null\s*:/s);
  assert.match(viewer, /restoreFocusTo \?\? fallbackPreviouslyFocused/);
  assert.match(viewer, /focusTarget\?\.focus\(\)/);
  assert.match(viewer, /event\.key === "Escape"/);
  assert.match(viewer, /event\.key !== "Tab"/);
  assert.match(viewer, /querySelectorAll<HTMLElement>\("button:not\(\[disabled\]\)"\)/);
  assert.match(viewer, /onKeyDown=\{handleDialogKeyDown\}/);
  assert.match(viewer, /setProgressCycle/);
  assert.match(viewer, /key=\{`\$\{currentStory\.id\}-\$\{progressCycle\}`\}/);
  assert.match(app, /type View = [^;]*"outfits"/);
  assert.match(app, /const \[selectedOutfitId/);
  assert.match(app, /key=\{activeStoryId\}/);
  assert.match(app, /const storyTriggerRef = useRef<HTMLButtonElement \| null>\(null\)/);
  assert.match(app, /onClick=\{\(event\) => \{\s*storyTriggerRef\.current = event\.currentTarget;\s*setActiveStoryId\(story\.id\);\s*\}\}/s);
  assert.match(app, /restoreFocusTo=\{storyTriggerRef\.current\}/);
  assert.match(app, /inert=\{activeStoryId !== null \|\| activeCustomerStory !== null \|\| storyComposerOpen\}/);
  assert.match(app, /aria-hidden=\{activeStoryId !== null \|\| activeCustomerStory !== null \|\| storyComposerOpen \? true : undefined\}/);
  assert.match(app, /role="status"/);
  assert.match(app, /aria-live="polite"/);
  assert.match(app, /const addOutfitToCart/);
  assert.match(app, /profile\.size/);
  assert.match(app, /getSizeStock\(product, recommendation\)/);
  assert.match(app, /pendingOutfitAdd/);
  assert.match(app, /mergeCartLinesWithinStock/);
  assert.match(css, /\.story-viewer/);
  assert.match(css, /\.story-progress button\s*\{[^}]*min-height:\s*44px/s);
  assert.match(css, /\.story-progress span\s*\{[^}]*height:\s*3px/s);
});

test("keeps catalogue-heavy discovery in Shop and presents wishlist pieces as a grid", async () => {
  const [app, css] = await Promise.all([
    read("app/StylishMeApp.tsx"),
    read("app/globals.css"),
  ]);

  const homeSource = app.match(/if \(view === "home"\) content = <>([\s\S]*?)\n  <\/>;\n  else if \(view === "shop"/)?.[1] ?? "";
  assert.doesNotMatch(homeSource, /Shop by category|Available Near You|Recommended for you|Recently viewed/);
  assert.match(app, /Explore sellers/);
  assert.match(app, /Designer lookbooks/);
  assert.match(app, /Brands & boutiques/);
  assert.match(app, /Merch/);
  assert.match(app, /wishlist-grid/);
  assert.match(css, /\.wishlist-grid/);
  assert.match(css, /\.wishlist-product-card/);
});

test("derives designer catalogues and exposes the complete Shop category set", async () => {
  const app = await read("app/StylishMeApp.tsx");

  assert.match(app, /const \[designerReturnView, setDesignerReturnView\] = useState<View>\("home"\)/);
  assert.match(app, /const openDesigner = \(name: string, returnView: View = view\) => \{[\s\S]*?setSelectedDesigner\(name\);[\s\S]*?setDesignerReturnView\(returnView\);[\s\S]*?navigate\("designer"\);\s*\};/);
  assert.match(app, /onClick=\{\(\) => openDesigner\(selected\.designer, "product"\)\}/);
  assert.match(app, /header\(selectedDesigner, designerReturnView\)/);
  assert.match(app, /products\.filter\(\(product\) => product\.designer === selectedDesigner\)/);
  assert.match(app, /filterShopProducts\(products, category, seededDesignerNames, shopFilters\)/);
  assert.match(app, /"Accessories"/);
  assert.match(app, /"Designer"/);
  assert.match(app, /"Sale"/);
});

test("renders a borderless app shell without a fake device status bar", async () => {
  const [app, css] = await Promise.all([
    read("app/StylishMeApp.tsx"),
    read("app/globals.css"),
  ]);

  assert.doesNotMatch(app, /className="phone-shell"/);
  assert.doesNotMatch(app, /className="status-bar"/);
  assert.match(app, /className="app-shell"/);
  assert.match(css, /min-height:\s*100dvh/);
  assert.match(css, /env\(safe-area-inset-top\)/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /\.story-viewer\s*\{[^}]*inset:\s*0/s);
});
