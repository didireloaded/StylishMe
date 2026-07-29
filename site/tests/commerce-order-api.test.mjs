import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("order endpoints use normalized commerce storage and retry-safe checkout keys", async () => {
  const [ordersRoute, detailRoute, stateRoute, app] = await Promise.all([
    read("app/api/orders/route.ts"),
    read("app/api/orders/[orderId]/route.ts"),
    read("app/api/state/route.ts"),
    read("app/StylishMeApp.tsx"),
  ]);

  assert.match(ordersRoute, /createCommerceOrder/);
  assert.match(ordersRoute, /idempotency-key/);
  assert.match(ordersRoute, /StockReservationError/);
  assert.match(ordersRoute, /status: 409/);
  assert.match(ordersRoute, /export async function GET/);
  assert.match(detailRoute, /getCustomerOrders/);
  assert.match(detailRoute, /orderId/);
  assert.match(stateRoute, /getCustomerOrders/);
  assert.match(app, /checkoutKeyRef/);
  assert.match(app, /"idempotency-key"/);
});

test("new checkout no longer writes order history into customer JSON", async () => {
  const route = await read("app/api/orders/route.ts");
  assert.doesNotMatch(route, /ordersJson/);
  assert.doesNotMatch(route, /prepareSandboxOrder/);
  assert.doesNotMatch(route, /sandbox order/i);
});
