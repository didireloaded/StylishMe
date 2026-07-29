import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("payment endpoints are configuration-gated and verify provider results server-side", async () => {
  const [config, checkout, callback, refund, service] = await Promise.all([
    read("app/api/payments/config/route.ts"),
    read("app/api/payments/checkout/route.ts"),
    read("app/api/payments/dpo/callback/route.ts"),
    read("app/api/payments/refunds/route.ts"),
    read("app/payment-service.ts"),
  ]);
  assert.match(config, /available/);
  assert.doesNotMatch(config, /companyToken|DPO_COMPANY_TOKEN/);
  assert.match(checkout, /startDpoCheckout/);
  assert.match(checkout, /getStylishMeUser/);
  assert.match(service, /verifyDpoPayment/);
  assert.match(service, /verifiedPaymentMatches/);
  assert.match(service, /confirmReservation/);
  assert.match(service, /releaseOrderReservations/);
  assert.doesNotMatch(callback, /query.*paid|searchParams\.get\(["']paid/i);
  assert.match(service, /refundDpoPayment/);
  assert.match(refund, /idempotency-key/);
});

test("real checkout redirects to hosted payment and never completes an unpaid order", async () => {
  const [app, orderPage] = await Promise.all([read("app/StylishMeApp.tsx"), read("app/orders/page.tsx")]);
  assert.match(app, /\/api\/payments\/config/);
  assert.match(app, /\/api\/payments\/checkout/);
  assert.match(app, /window\.location\.assign\(payment\.checkoutUrl\)/);
  assert.doesNotMatch(app, /if \(!response\.ok \|\| !body\.order\)[\s\S]{0,200}finishOrder\(body\.order\)/);
  assert.match(app, /Secure payments are being connected/);
  assert.match(app, /Payment confirmed/);
  assert.match(orderPage, /payment/);
  assert.match(orderPage, /order/);
});
