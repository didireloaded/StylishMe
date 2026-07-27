import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import DemoExperience from "../app/DemoExperience.tsx";
import { ACCOUNT_RESET_MARKER, clearStylishMeSession } from "../app/session-reset.ts";

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = "";
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ state: null }) });
});

afterEach(() => cleanup());

test("the shared preview starts with a clear customer or seller choice", () => {
  render(React.createElement(DemoExperience));

  assert.ok(screen.getByRole("heading", { name: "Meet StylishMe before you join." }));
  assert.ok(screen.getByRole("button", { name: /Explore as a customer/ }));
  assert.ok(screen.getByRole("button", { name: /Explore as a seller/ }));
  assert.ok(screen.getByText(/No account is needed/));
});

test("the customer walkthrough opens the working shopping preview and correct signup", async () => {
  render(React.createElement(DemoExperience));
  fireEvent.click(screen.getByRole("button", { name: /Explore as a customer/ }));

  assert.ok(screen.getByRole("heading", { name: "Start with inspiration, not a crowded catalogue." }));
  fireEvent.click(screen.getByRole("button", { name: "Skip to the demo" }));

  assert.ok(await screen.findByText("CUSTOMER DEMO"));
  const signup = screen.getByRole("link", { name: "Sign up as a customer" });
  assert.match(signup.getAttribute("href"), /join%3Dcustomer/);
  assert.ok(await screen.findByRole("navigation"));
});

test("the seller walkthrough opens a seeded seller preview without loading private data", async () => {
  let requests = 0;
  globalThis.fetch = async () => {
    requests += 1;
    return { ok: true, json: async () => ({}) };
  };

  render(React.createElement(DemoExperience));
  fireEvent.click(screen.getByRole("button", { name: /Explore as a seller/ }));
  fireEvent.click(screen.getByRole("button", { name: "Skip to the demo" }));

  assert.ok(await screen.findByText("SELLER DEMO"));
  assert.ok(screen.getByRole("heading", { name: "Good morning, Maria." }));
  assert.equal(requests, 0);
  assert.match(screen.getByRole("link", { name: "Sign up as a vendor" }).getAttribute("href"), /join%3Dseller/);
});

test("the one-time account reset removes only StylishMe device data", () => {
  localStorage.setItem("stylishme-account-role:person@example.com", "seller");
  localStorage.setItem("stylishme-state:person@example.com", "{}");
  localStorage.setItem("unrelated-preference", "keep");

  assert.equal(clearStylishMeSession(localStorage), true);
  assert.equal(localStorage.getItem("stylishme-account-role:person@example.com"), null);
  assert.equal(localStorage.getItem("stylishme-state:person@example.com"), null);
  assert.equal(localStorage.getItem("unrelated-preference"), "keep");
  assert.equal(localStorage.getItem(ACCOUNT_RESET_MARKER), "complete");
  assert.equal(clearStylishMeSession(localStorage), false);
});
