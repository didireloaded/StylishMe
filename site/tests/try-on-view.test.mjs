import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import TryOnView from "../app/TryOnView.tsx";
import { buildProduct } from "../app/product-catalog.ts";

const products = [buildProduct(0), buildProduct(1)];

function renderTryOn(overrides = {}) {
  const calls = { opened: [], addedProducts: [], addedLooks: 0, continued: 0 };
  render(React.createElement(TryOnView, {
    products,
    initialProductIds: [products[0].id],
    onOpenProduct: (id) => calls.opened.push(id),
    onAddProduct: (id) => calls.addedProducts.push(id),
    onAddLook: () => { calls.addedLooks += 1; },
    onContinueShopping: () => { calls.continued += 1; },
    ...overrides,
  }));
  return calls;
}

function acceptConsent() {
  for (const name of [/my image/i, /digitally created/i, /privacy/i, /18 or older/i]) {
    fireEvent.click(screen.getByRole("checkbox", { name }));
  }
}

async function reachReview() {
  fireEvent.click(screen.getByRole("button", { name: "Start Try-On" }));
  acceptConsent();
  fireEvent.click(screen.getByRole("button", { name: "Continue to photo" }));
  const photo = new window.File([new Uint8Array(128)], "full-body.jpg", { type: "image/jpeg" });
  fireEvent.change(screen.getByLabelText("Upload full-length photo"), { target: { files: [photo] } });
  fireEvent.click(await screen.findByRole("button", { name: "Choose outfit" }));
  fireEvent.click(screen.getByRole("button", { name: "Continue to settings" }));
  fireEvent.click(screen.getByRole("button", { name: "Review preview" }));
}

beforeEach(() => {
  document.body.innerHTML = "";
  globalThis.fetch = async () => ({
    ok: false,
    status: 503,
    json: async () => ({ error: { code: "TRY_ON_UNAVAILABLE", message: "Try-on is temporarily unavailable. Shopping is still open." } }),
  });
});

afterEach(() => cleanup());

test("try-on blocks photo selection until every consent statement is complete", () => {
  renderTryOn();
  fireEvent.click(screen.getByRole("button", { name: "Start Try-On" }));
  assert.equal(screen.getByRole("button", { name: "Continue to photo" }).disabled, true);
  acceptConsent();
  assert.equal(screen.getByRole("button", { name: "Continue to photo" }).disabled, false);
});

test("try-on rejects an unsupported upload with a useful error", async () => {
  renderTryOn();
  fireEvent.click(screen.getByRole("button", { name: "Start Try-On" }));
  acceptConsent();
  fireEvent.click(screen.getByRole("button", { name: "Continue to photo" }));
  const badFile = new window.File(["not an image"], "outfit.pdf", { type: "application/pdf" });
  fireEvent.change(screen.getByLabelText("Upload full-length photo"), { target: { files: [badFile] } });
  assert.ok(await screen.findByText("Choose a JPG, PNG, or WebP image."));
  assert.equal(screen.getByRole("button", { name: "Choose outfit" }).disabled, true);
});

test("try-on reports provider unavailability without blocking shopping", async () => {
  const calls = renderTryOn();
  await reachReview();
  fireEvent.click(screen.getByRole("button", { name: "Create Preview" }));
  assert.ok(await screen.findByText("Try-on is temporarily unavailable. Shopping is still open."));
  fireEvent.click(screen.getByRole("button", { name: "Continue shopping" }));
  assert.equal(calls.continued, 1);
});

test("a completed preview stays connected to catalogue products", async () => {
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ imageBase64: "YWktcHJldmlldw==", mimeType: "image/jpeg", model: "gpt-image-2" }),
  });
  const calls = renderTryOn();
  await reachReview();
  fireEvent.click(screen.getByRole("button", { name: "Create Preview" }));

  assert.ok(await screen.findByRole("heading", { name: "Your preview is ready" }));
  assert.ok(screen.getByText("Digitally created outfit preview"));
  assert.ok(screen.getByText(products[0].name));
  fireEvent.click(screen.getByRole("button", { name: `Add ${products[0].name} to cart` }));
  fireEvent.click(screen.getByRole("button", { name: "Add full look to cart" }));
  assert.deepEqual(calls.addedProducts, [products[0].id]);
  assert.equal(calls.addedLooks, 1);

  fireEvent.click(screen.getByRole("button", { name: "Delete preview" }));
  await waitFor(() => assert.ok(screen.getByRole("button", { name: "Start Try-On" })));
});

test("guest try-on asks for secure sign-in before accepting a personal photo", () => {
  renderTryOn({ isSignedIn: false, signInUrl: "/secure-sign-in" });
  fireEvent.click(screen.getByRole("button", { name: "Start Try-On" }));
  assert.ok(screen.getByRole("heading", { name: "Sign in before adding your photo." }));
  assert.equal(screen.getByRole("link", { name: "Sign in securely" }).getAttribute("href"), "/secure-sign-in");
});

test("Style Me turns an occasion brief into a shoppable look without technical language", () => {
  const calls = renderTryOn({ initialIntent: "style" });
  assert.ok(screen.getByRole("heading", { name: "What are you dressing for?" }));
  fireEvent.click(screen.getByRole("button", { name: "N$2,500" }));
  fireEvent.change(screen.getByPlaceholderText("e.g. black trousers or white sneakers"), { target: { value: "white sneakers" } });
  fireEvent.click(screen.getByRole("button", { name: "Create my look" }));

  assert.ok(screen.getByRole("heading", { name: "Dinner, made yours." }));
  assert.ok(screen.getByText(/Keep your white sneakers/));
  fireEvent.click(screen.getByRole("button", { name: "Add full look to cart" }));
  assert.equal(calls.addedLooks, 1);
  fireEvent.click(screen.getByRole("button", { name: "See this look on me" }));
  assert.ok(screen.getByRole("heading", { name: "Before we begin" }));
  assert.equal(document.body.textContent.match(/\bAI\b/gi), null);
});
