import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import sharp from "sharp";

import { inspectAndReencodeStoryImage } from "../app/customer-story-image.ts";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("customer story storage has separate stories, tags, likes and reports", async () => {
  const schema = await read("db/schema.ts");
  for (const table of ["customer_outfit_stories", "customer_outfit_story_products", "customer_outfit_story_likes", "customer_outfit_story_reports"]) {
    assert.match(schema, new RegExp(table));
  }
  assert.match(schema, /story_likes_story_actor_idx/);
});

test("customer story migration is safe when runtime-created tables already exist", async () => {
  const migration = await read("drizzle/0004_flat_champions.sql");
  assert.doesNotMatch(migration, /CREATE TABLE `(activity_events|customer_outfit_stor)/);
  assert.doesNotMatch(migration, /CREATE (?:UNIQUE )?INDEX `(activity_events|customer_stories|story_)/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS `activity_events`/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS `customer_outfit_stories`/);
});

test("story images are sanitized without metadata at a useful portrait size", async () => {
  const input = await sharp({ create: { width: 900, height: 1200, channels: 3, background: "#b45f55" } })
    .jpeg()
    .withMetadata({ exif: { IFD0: { Artist: "private" } } })
    .toBuffer();
  const output = await inspectAndReencodeStoryImage(input, "image/jpeg");
  const metadata = await sharp(output.bytes).metadata();
  assert.equal(output.contentType, "image/jpeg");
  assert.equal(metadata.format, "jpeg");
  assert.equal(metadata.exif, undefined);
});

test("story images reject landscape and undersized photographs", async () => {
  const landscape = await sharp({ create: { width: 1600, height: 1000, channels: 3, background: "#222" } }).jpeg().toBuffer();
  await assert.rejects(() => inspectAndReencodeStoryImage(landscape, "image/jpeg"), /portrait/);
  const small = await sharp({ create: { width: 400, height: 600, channels: 3, background: "#222" } }).png().toBuffer();
  await assert.rejects(() => inspectAndReencodeStoryImage(small, "image/png"), /720/);
});

test("public customer story output deliberately omits private ownership and order fields", async () => {
  const storage = await read("app/customer-story-storage.ts");
  const publicMapping = storage.slice(storage.indexOf("export function toPublicStory"));
  assert.match(publicMapping, /imageUrl/);
  assert.doesNotMatch(publicMapping, /ownerEmail/);
  assert.doesNotMatch(publicMapping, /orderId/);
  assert.doesNotMatch(publicMapping, /actorHash/);
});
