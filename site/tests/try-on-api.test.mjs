import assert from "node:assert/strict";
import { test } from "node:test";

import { buildProduct } from "../app/product-catalog.ts";
import { createTryOnHandler } from "../app/api/try-on/route.ts";
import { TRY_ON_CONSENT_VERSION } from "../app/try-on-domain.ts";

const NOW = new Date("2026-07-19T12:00:00.000Z");

function tryOnRequest(overrides = {}) {
  const form = new FormData();
  form.set("person", new File([new Uint8Array(128)], "person.jpg", { type: "image/jpeg" }));
  form.set("reference", new File([new Uint8Array(96)], "look.png", { type: "image/png" }));
  form.set("productIds", JSON.stringify(["p1"]));
  form.set("settings", JSON.stringify({ transfer: "outfit-only", background: "preserve", styling: "natural" }));
  form.set("consent", JSON.stringify({ ownsImage: true, understandsAi: true, acceptsPrivacy: true, confirmsAdult: true }));
  form.set("consentVersion", TRY_ON_CONSENT_VERSION);
  form.set("consentedAt", NOW.toISOString());

  for (const [key, value] of Object.entries(overrides)) {
    if (value === null) form.delete(key);
    else form.set(key, value);
  }

  return new Request("https://stylishme.test/api/try-on", { method: "POST", body: form });
}

function services(overrides = {}) {
  return {
    authenticate: async () => ({ email: "didi@example.com" }),
    fetchReference: async () => new File([new Uint8Array(64)], "catalogue.jpg", { type: "image/jpeg" }),
    moderate: async () => false,
    generate: async () => ({ imageBase64: "cHJldmlldw==", mimeType: "image/jpeg" }),
    model: "gpt-image-2",
    now: () => NOW,
    ...overrides,
  };
}

test("try-on API requires an authenticated customer", async () => {
  const handler = createTryOnHandler(services({ authenticate: async () => null }));
  const response = await handler(tryOnRequest());
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.error.code, "AUTH_REQUIRED");
});

test("try-on API rejects stale consent and invalid uploads before generation", async () => {
  let generated = false;
  const handler = createTryOnHandler(services({
    generate: async () => {
      generated = true;
      return { imageBase64: "bad", mimeType: "image/jpeg" };
    },
  }));
  const response = await handler(tryOnRequest({ consentedAt: "2026-07-17T12:00:00.000Z" }));
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.code, "CONSENT_REQUIRED");
  assert.equal(generated, false);
});

test("try-on API requires the complete consent payload, not only a timestamp", async () => {
  const handler = createTryOnHandler(services());
  const response = await handler(tryOnRequest({ consent: null }));
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.code, "CONSENT_REQUIRED");
});

test("try-on API accepts only references from the submitted catalogue products", async () => {
  const product = buildProduct(0);
  const handler = createTryOnHandler(services());
  const response = await handler(tryOnRequest({
    reference: null,
    referenceUrl: product.image,
    productIds: JSON.stringify(["p2"]),
  }));
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.code, "INVALID_REFERENCE");
});

test("try-on API stops when input image moderation flags a photo", async () => {
  let calls = 0;
  let generated = false;
  const handler = createTryOnHandler(services({
    moderate: async () => {
      calls += 1;
      return calls === 1;
    },
    generate: async () => {
      generated = true;
      return { imageBase64: "bad", mimeType: "image/jpeg" };
    },
  }));
  const response = await handler(tryOnRequest());
  const body = await response.json();

  assert.equal(response.status, 422);
  assert.equal(body.error.code, "IMAGE_NOT_ALLOWED");
  assert.equal(generated, false);
});

test("try-on API generates an identity-preserving portrait without storing uploads", async () => {
  let generationInput;
  const handler = createTryOnHandler(services({
    generate: async (input) => {
      generationInput = input;
      return { imageBase64: "cHJldmlldw==", mimeType: "image/jpeg" };
    },
  }));
  const response = await handler(tryOnRequest());
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body, {
    imageBase64: "cHJldmlldw==",
    mimeType: "image/jpeg",
    model: "gpt-image-2",
  });
  assert.equal(generationInput.person.name, "person.jpg");
  assert.equal(generationInput.references[0].name, "look.png");
  assert.match(generationInput.prompt, /Preserve the identity, face, skin tone/i);
  assert.equal(generationInput.size, "1024x1536");
  assert.equal(generationInput.quality, "high");
  assert.equal("inputFidelity" in generationInput, false);
});

test("try-on API combines every selected catalogue garment reference", async () => {
  const selected = [buildProduct(0), buildProduct(1), buildProduct(2)];
  let fetchCount = 0;
  let generationInput;
  const handler = createTryOnHandler(services({
    fetchReference: async () => {
      fetchCount += 1;
      return new File([new Uint8Array(64)], `catalogue-${fetchCount}.jpg`, { type: "image/jpeg" });
    },
    generate: async (input) => {
      generationInput = input;
      return { imageBase64: "cHJldmlldw==", mimeType: "image/jpeg" };
    },
  }));
  const response = await handler(tryOnRequest({
    reference: null,
    referenceUrl: selected[0].image,
    productIds: JSON.stringify(selected.map((product) => product.id)),
  }));

  assert.equal(response.status, 200);
  assert.equal(fetchCount, 3);
  assert.equal(generationInput.references.length, 3);
});

test("try-on API rate-limits expensive preview generation", async () => {
  let generated = false;
  const handler = createTryOnHandler(services({
    consumeQuota: async () => ({ ok: false, retryAfterSeconds: 120 }),
    generate: async () => {
      generated = true;
      return { imageBase64: "bad", mimeType: "image/jpeg" };
    },
  }));
  const response = await handler(tryOnRequest());
  const body = await response.json();

  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "120");
  assert.equal(body.error.code, "RATE_LIMITED");
  assert.equal(generated, false);
});
