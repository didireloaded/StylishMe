import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildProduct } from "../app/product-catalog.ts";
import { prepareSandboxOrder } from "../app/order-creation.ts";

test("authoritative sandbox orders price the stored cart from the catalogue", () => {
  const product = buildProduct(0);
  const order = prepareSandboxOrder([
    { productId: product.id, size: "S", color: product.colors[0], quantity: 2 },
  ], "Express delivery");

  assert.deepEqual(order, {
    fulfilment: "Express delivery",
    items: [{ productId: "p1", size: "S", color: product.colors[0], quantity: 2 }],
    status: "Order confirmed",
    total: 1918,
  });
});

test("authoritative sandbox orders reject cart lines beyond catalogue stock", () => {
  const product = buildProduct(0);

  assert.throws(
    () => prepareSandboxOrder([
      { productId: product.id, size: "M", color: product.colors[0], quantity: 6 },
    ], "Standard delivery"),
    (error) => error instanceof Error && error.name === "OrderValidationError" && /stock/i.test(error.message),
  );
});
test("general customer state cannot overwrite server-owned order history", () => {
  const route = readFileSync(new URL("../app/api/state/route.ts", import.meta.url), "utf8");

  assert.doesNotMatch(route, /body\.orders/);
  assert.match(route, /ordersJson:\s*existing\?\.ordersJson\s*\?\?\s*"\[\]"/);
});
test("signed-in checkout awaits the server order and exposes processing feedback", () => {
  const app = readFileSync(new URL("../app/StylishMeApp.tsx", import.meta.url), "utf8");

  assert.match(app, /fetch\("\/api\/orders"/);
  assert.match(app, /disabled=\{placingOrder \|\| checkoutNeedsAddress\}/);
  assert.match(app, /aria-busy=\{placingOrder\}/);
  assert.match(app, /if \(demoMode\)/);
  assert.doesNotMatch(app, /1100 \+ orders\.length/);
});
test("unexpected order failures return a generic service error", () => {
  const route = readFileSync(new URL("../app/api/orders/route.ts", import.meta.url), "utf8");

  assert.match(route, /error instanceof OrderValidationError/);
  assert.match(route, /status: 503/);
});