import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("likes are authenticated, unique and toggle through the backend", async () => {
  const route = await read("app/api/customer-stories/[id]/like/route.ts");
  assert.match(route, /getChatGPTUser/);
  assert.match(route, /storyActorHash/);
  assert.match(route, /DELETE FROM customer_outfit_story_likes/);
  assert.match(route, /INSERT INTO customer_outfit_story_likes/);
  assert.match(route, /COUNT\(\*\)/);
});

test("reports use controlled reasons, reject owners and rate limit reporters", async () => {
  const route = await read("app/api/customer-stories/[id]/report/route.ts");
  assert.match(route, /inappropriate/);
  assert.match(route, /misleading/);
  assert.match(route, /privacy/);
  assert.match(route, /spam/);
  assert.match(route, /owner_email === user\.email/);
  assert.match(route, />= 10/);
});

test("only an owner can delete a story and its stored photograph", async () => {
  const route = await read("app/api/customer-stories/[id]/route.ts");
  assert.match(route, /owner_email !== user\.email/);
  assert.match(route, /status = 'deleted'/);
  assert.match(route, /MEDIA\.delete/);
});
