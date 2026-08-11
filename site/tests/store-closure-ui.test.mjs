import assert from "node:assert/strict";
import React from "react";
import test from "node:test";
import { cleanup, render, screen } from "@testing-library/react";

import StoreClosureControl from "../app/StoreClosureControl.tsx";

test.afterEach(() => cleanup());

test("seller settings distinguish store closure from customer account deletion", () => {
  globalThis.fetch = async () => new Promise(() => undefined);
  render(React.createElement(StoreClosureControl, { storeName: "Omutima" }));
  assert.ok(screen.getByRole("heading", { name: "Close my store" }));
  assert.ok(screen.getByText(/customer account will remain active/i));
  assert.ok(screen.getByRole("button", { name: "Review store closure" }));
});
