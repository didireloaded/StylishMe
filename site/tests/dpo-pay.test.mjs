import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCreateTokenXml,
  buildRefundXml,
  buildVerifyTokenXml,
  dpoConfigFrom,
  mapDpoStatus,
  parseDpoResponse,
  verifiedPaymentMatches,
} from "../app/dpo-pay.ts";

const config = {
  available: true,
  companyToken: "merchant-token",
  serviceType: "5525",
  apiUrl: "https://secure.3gdirectpay.com/API/v6/",
  checkoutUrl: "https://secure.3gdirectpay.com/payv2.php",
};

test("DPO is unavailable unless both merchant values are configured", () => {
  assert.equal(dpoConfigFrom({}).available, false);
  assert.equal(dpoConfigFrom({ DPO_COMPANY_TOKEN: "token" }).available, false);
  assert.equal(dpoConfigFrom({ DPO_COMPANY_TOKEN: "token", DPO_SERVICE_TYPE: "5525" }).available, true);
});

test("create-token XML uses exact NAD cents and escapes customer-controlled data", () => {
  const xml = buildCreateTokenXml(config, {
    orderId: "SM-1<&",
    amountCents: 12345,
    customerEmail: "didi+shop@example.com",
    returnUrl: "https://stylish.me/api/payments/dpo/return?from=checkout&ok=1",
    callbackUrl: "https://stylish.me/api/payments/dpo/callback?source=web&v=1",
    serviceDate: new Date("2026-07-29T10:00:00.000Z"),
  });

  assert.match(xml, /<PaymentAmount>123\.45<\/PaymentAmount>/);
  assert.match(xml, /<PaymentCurrency>NAD<\/PaymentCurrency>/);
  assert.match(xml, /<CompanyRef>SM-1&lt;&amp;<\/CompanyRef>/);
  assert.match(xml, /from=checkout&amp;ok=1/);
  assert.match(xml, /<customerEmail>didi\+shop@example\.com<\/customerEmail>/);
  assert.match(xml, /<ServiceType>5525<\/ServiceType>/);
  assert.doesNotMatch(xml, /<Card|CVV|cardNumber/i);
});

test("verification and refund XML identify the original transaction", () => {
  const verify = buildVerifyTokenXml(config, { transactionToken: "pay-1", orderId: "SM-1" });
  const refund = buildRefundXml(config, { transactionToken: "pay-1", amountCents: 2500, reason: "Returned & unworn" });
  assert.match(verify, /<Request>verifyToken<\/Request>/);
  assert.match(verify, /<CompanyRef>SM-1<\/CompanyRef>/);
  assert.match(refund, /<Request>refundToken<\/Request>/);
  assert.match(refund, /<refundAmount>25\.00<\/refundAmount>/);
  assert.match(refund, /Returned &amp; unworn/);
});

test("DPO response parsing decodes safe fields and classifies terminal states", () => {
  const parsed = parseDpoResponse(`<?xml version="1.0"?><API3G>
    <Result>000</Result><ResultExplanation>Transaction Paid</ResultExplanation>
    <TransToken>token-123</TransToken><TransRef>R123</TransRef>
    <CompanyRef>SM-1</CompanyRef><TransactionAmount>123.45</TransactionAmount>
    <TransactionCurrency>nad</TransactionCurrency><FraudAlert>000</FraudAlert>
  </API3G>`);
  assert.deepEqual(parsed, {
    result: "000",
    explanation: "Transaction Paid",
    transactionToken: "token-123",
    transactionReference: "R123",
    companyRef: "SM-1",
    amount: "123.45",
    currency: "NAD",
    fraudAlert: "000",
  });
  assert.equal(mapDpoStatus("000"), "paid");
  assert.equal(mapDpoStatus("901"), "declined");
  assert.equal(mapDpoStatus("903"), "expired");
  assert.equal(mapDpoStatus("904"), "cancelled");
  assert.equal(mapDpoStatus("900"), "pending");
});

test("a paid response is accepted only when reference, currency, amount, and fraud checks match", () => {
  const response = { result: "000", companyRef: "SM-1", amount: "123.45", currency: "NAD", fraudAlert: "000" };
  assert.equal(verifiedPaymentMatches(response, { orderId: "SM-1", amountCents: 12345, currency: "NAD" }), true);
  assert.equal(verifiedPaymentMatches({ ...response, amount: "123.44" }, { orderId: "SM-1", amountCents: 12345, currency: "NAD" }), false);
  assert.equal(verifiedPaymentMatches({ ...response, companyRef: "SM-2" }, { orderId: "SM-1", amountCents: 12345, currency: "NAD" }), false);
  assert.equal(verifiedPaymentMatches({ ...response, fraudAlert: "006" }, { orderId: "SM-1", amountCents: 12345, currency: "NAD" }), false);
});
