import assert from "node:assert/strict";
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import test from "node:test";

import AuthForm from "../app/AuthForm.tsx";
import { readAuthResponse } from "../app/auth-upload.ts";
import OAuthProfileForm from "../app/OAuthProfileForm.tsx";

const props = { returnTo: "/", oauthProviders: { google: false, apple: false } };

test.afterEach(() => cleanup());

test("account creation stops an oversized profile photo before upload", () => {
  render(React.createElement(AuthForm, props));
  fireEvent.click(screen.getByRole("tab", { name: "Create account" }));
  const photo = new window.File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.jpg", { type: "image/jpeg" });
  fireEvent.change(document.querySelector('input[name="avatar"]'), { target: { files: [photo] } });
  assert.match(screen.getByRole("alert").textContent ?? "", /photo.*too large|under 5 MB/i);
});

test("auth upload handling turns a plain-text 413 response into a useful photo error", async () => {
  const body = await readAuthResponse(
    new Response("Payload Too Large", { status: 413, headers: { "content-type": "text/plain" } }),
    "Unable to create your account",
  );
  assert.match(body.error ?? "", /photo.*too large|under 5 MB/i);
  assert.doesNotMatch(body.error ?? "", /unexpected token/i);
});

test("provider profile completion also stops an oversized photo before upload", () => {
  render(React.createElement(OAuthProfileForm));
  const photo = new window.File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.webp", { type: "image/webp" });
  fireEvent.change(document.querySelector('input[name="avatar"]'), { target: { files: [photo] } });
  assert.match(screen.getByRole("alert").textContent ?? "", /photo.*too large|under 5 MB/i);
});
