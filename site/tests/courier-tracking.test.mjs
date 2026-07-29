import assert from "node:assert/strict";
import test from "node:test";

import { currentDhlConfig, fetchDhlTracking } from "../app/courier-tracking.ts";

test("DHL tracking stays unavailable until a real subscription key is configured", () => {
  assert.deepEqual(currentDhlConfig({}), { available: false, apiKey: "", apiUrl: "https://api-eu.dhl.com/track/shipments" });
});

test("DHL adapter authenticates, encodes the tracking number, and keeps structured milestones", async () => {
  let request;
  const result = await fetchDhlTracking(
    { available: true, apiKey: "live-key", apiUrl: "https://api-eu.dhl.com/track/shipments" },
    "JD 014 600 003 838 000 001",
    async (url, init) => {
      request = { url: String(url), init };
      return Response.json({ shipments: [{
        id: "JD014600003838000001",
        service: "express",
        status: { statusCode: "transit", description: "Shipment is moving", timestamp: "2026-07-29T10:30:00+02:00", location: { address: { addressLocality: "Windhoek" } } },
        estimatedTimeOfDelivery: "2026-07-30T16:00:00+02:00",
        events: [{ statusCode: "pre-transit", description: "Shipment information received", timestamp: "2026-07-29T08:00:00+02:00" }],
      }] });
    },
  );
  assert.equal(new URL(request.url).searchParams.get("trackingNumber"), "JD 014 600 003 838 000 001");
  assert.equal(request.init.headers["DHL-API-Key"], "live-key");
  assert.equal(result.status, "in_transit");
  assert.equal(result.events[0].providerEventId.length > 0, true);
  assert.equal(result.events.at(-1).location, "Windhoek");
});

test("DHL adapter rejects demo mode and malformed provider responses", async () => {
  await assert.rejects(() => fetchDhlTracking({ available: false, apiKey: "", apiUrl: "https://api-eu.dhl.com/track/shipments" }, "123"), /not configured/i);
  await assert.rejects(() => fetchDhlTracking({ available: true, apiKey: "demo-key", apiUrl: "https://api-eu.dhl.com/track/shipments" }, "123"), /production/i);
  await assert.rejects(() => fetchDhlTracking({ available: true, apiKey: "live-key", apiUrl: "https://api-eu.dhl.com/track/shipments" }, "123", async () => Response.json({ shipments: [] })), /not found/i);
});
