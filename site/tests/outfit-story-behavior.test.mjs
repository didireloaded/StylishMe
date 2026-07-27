import assert from "node:assert/strict";
import test from "node:test";

const behavior = await import("../app/outfit-story-behavior.ts");

test("wraps story navigation deterministically in both directions", () => {
  assert.equal(behavior.getStoryIndex(4, 4), 0);
  assert.equal(behavior.getStoryIndex(-1, 4), 3);
  assert.equal(behavior.getStoryIndex(8, 4), 0);
  assert.equal(behavior.getStoryIndex(2, 0), 0);
});

test("only auto-advances for a visible document without reduced motion", () => {
  assert.equal(behavior.STORY_DURATION, 5_000);
  assert.equal(behavior.canAutoAdvance(false, false), true);
  assert.equal(behavior.canAutoAdvance(true, false), false);
  assert.equal(behavior.canAutoAdvance(false, true), false);
  assert.equal(behavior.canAutoAdvance(true, true), false);
});

test("wraps keyboard focus forward and backward at modal boundaries", () => {
  assert.equal(behavior.getFocusWrapIndex(3, 4, false), 0);
  assert.equal(behavior.getFocusWrapIndex(0, 4, true), 3);
  assert.equal(behavior.getFocusWrapIndex(1, 4, false), null);
  assert.equal(behavior.getFocusWrapIndex(2, 4, true), null);
  assert.equal(behavior.getFocusWrapIndex(-1, 4, false), 0);
  assert.equal(behavior.getFocusWrapIndex(-1, 4, true), 3);
  assert.equal(behavior.getFocusWrapIndex(0, 0, false), null);
});
