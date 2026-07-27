import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("Home integrates verified buyer stories without adding comments or another navigation tab", async () => {
  const [app, composer, viewer] = await Promise.all([
    read("app/StylishMeApp.tsx"),
    read("app/CustomerStoryComposer.tsx"),
    read("app/CustomerStoryViewer.tsx"),
  ]);
  assert.match(app, /Add yours/);
  assert.match(app, /customerStories\.filter/);
  assert.match(composer, /Choose purchased pieces/);
  assert.match(composer, /Preview & publish/);
  assert.match(viewer, /Verified purchase/);
  assert.match(viewer, /Shop the pieces/);
  assert.match(viewer, /Like/);
  assert.match(viewer, /Share/);
  assert.match(viewer, /Report/);
  assert.doesNotMatch(`${app}${composer}${viewer}`, /Add comment|Comments|Reply to/);
});

test("customer story upload and browsing failures stay independent from editorial stories", async () => {
  const app = await read("app/StylishMeApp.tsx");
  assert.match(app, /OUTFIT_STORIES\.map/);
  assert.match(app, /Outfit stories are resting/);
  assert.match(app, /refreshCustomerStories/);
});
