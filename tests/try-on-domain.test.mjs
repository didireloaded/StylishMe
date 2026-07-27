import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTryOnPrompt,
  parseTryOnResponse,
  progressMessage,
  validateTryOnConsent,
  validateTryOnFile,
} from "../app/try-on-domain.ts";

test("requires every try-on consent statement", () => {
  assert.equal(validateTryOnConsent({
    ownsImage: true,
    understandsAi: true,
    acceptsPrivacy: false,
    confirmsAdult: true,
  }).ok, false);

  assert.equal(validateTryOnConsent({
    ownsImage: true,
    understandsAi: true,
    acceptsPrivacy: true,
    confirmsAdult: true,
  }).ok, true);
});

test("accepts only supported try-on images within the limit", () => {
  assert.equal(validateTryOnFile({ name: "me.jpg", type: "image/jpeg", size: 2_000_000 }).ok, true);
  assert.match(validateTryOnFile({ name: "me.pdf", type: "application/pdf", size: 10 }).message, /JPG, PNG, or WebP/);
  assert.match(validateTryOnFile({ name: "me.png", type: "image/png", size: 15_000_000 }).message, /10 MB/);
});

test("builds a controlled identity-preserving prompt", () => {
  const prompt = buildTryOnPrompt({
    transfer: "outfit-and-shoes",
    background: "preserve",
    styling: "natural",
  });

  assert.match(prompt, /Preserve the identity/);
  assert.match(prompt, /Do not reshape/);
  assert.match(prompt, /outfit and shoes/);
});

test("maps job states to meaningful progress messages", () => {
  assert.equal(progressMessage("validating"), "Checking your images");
  assert.equal(progressMessage("generating"), "Creating your preview");
});

test("parses only complete try-on image responses", () => {
  assert.deepEqual(parseTryOnResponse({
    imageBase64: "abc",
    mimeType: "image/jpeg",
    model: "gpt-image-2",
  }), {
    imageBase64: "abc",
    mimeType: "image/jpeg",
    model: "gpt-image-2",
  });
  assert.equal(parseTryOnResponse({ imageBase64: "" }), null);
});
