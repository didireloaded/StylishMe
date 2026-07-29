import type { FulfilmentStatus } from "./fulfilment-domain";

export type DhlConfig = { available: boolean; apiKey: string; apiUrl: string };
export type CourierEvent = { providerEventId: string; status: FulfilmentStatus; description: string; location: string | null; occurredAt: string };

export class CourierTrackingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CourierTrackingError";
  }
}

export function currentDhlConfig(source: Record<string, string | undefined> = process.env): DhlConfig {
  const apiKey = source.DHL_API_KEY?.trim() ?? "";
  return {
    available: Boolean(apiKey) && !/^demo(?:-|$)/i.test(apiKey),
    apiKey,
    apiUrl: source.DHL_TRACKING_API_URL?.trim() || "https://api-eu.dhl.com/track/shipments",
  };
}

const clean = (value: unknown, length: number) => typeof value === "string" ? value.trim().slice(0, length) : "";
const mapDhlStatus = (code: unknown): FulfilmentStatus => {
  const value = clean(code, 80).toLowerCase().replaceAll("_", "-");
  if (value === "delivered") return "delivered";
  if (value === "out-for-delivery") return "out_for_delivery";
  if (["transit", "in-transit"].includes(value)) return "in_transit";
  return "shipped";
};
const locationFrom = (value: unknown) => {
  if (!value || typeof value !== "object") return null;
  const location = value as { address?: { addressLocality?: unknown } };
  return clean(location.address?.addressLocality, 120) || null;
};
const eventFrom = (value: unknown, index: number): CourierEvent | null => {
  if (!value || typeof value !== "object") return null;
  const event = value as Record<string, unknown>;
  const timestamp = clean(event.timestamp, 80);
  const description = clean(event.description, 300);
  const status = mapDhlStatus(event.statusCode);
  if (!timestamp || Number.isNaN(Date.parse(timestamp))) return null;
  return {
    providerEventId: `dhl:${clean(event.statusCode, 80) || "event"}:${timestamp}:${index}`,
    status,
    description: description || "DHL shipment update",
    location: locationFrom(event.location),
    occurredAt: new Date(timestamp).toISOString(),
  };
};

export async function fetchDhlTracking(config: DhlConfig, trackingNumber: string, fetcher: typeof fetch = fetch) {
  if (!config.available || !config.apiKey) throw new CourierTrackingError("DHL tracking is not configured");
  if (/^demo(?:-|$)/i.test(config.apiKey)) throw new CourierTrackingError("A production DHL subscription key is required");
  const tracking = clean(trackingNumber, 80);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9 ._/-]{2,79}$/.test(tracking)) throw new CourierTrackingError("Tracking number is invalid");
  const url = new URL(config.apiUrl);
  url.searchParams.set("trackingNumber", tracking);
  url.searchParams.set("requesterCountryCode", "NA");
  const response = await fetcher(url, { headers: { Accept: "application/json", "DHL-API-Key": config.apiKey } });
  if (!response.ok) throw new CourierTrackingError(response.status === 404 ? "DHL shipment was not found" : "DHL tracking is temporarily unavailable");
  const body = await response.json() as { shipments?: unknown[] };
  const shipment = body.shipments?.[0];
  if (!shipment || typeof shipment !== "object") throw new CourierTrackingError("DHL shipment was not found");
  const record = shipment as Record<string, unknown>;
  const events = (Array.isArray(record.events) ? record.events : []).map(eventFrom).filter((event): event is CourierEvent => Boolean(event));
  const current = eventFrom(record.status, events.length);
  if (current && !events.some(event => event.providerEventId === current.providerEventId || (event.status === current.status && event.occurredAt === current.occurredAt))) events.push(current);
  events.sort((left, right) => left.occurredAt.localeCompare(right.occurredAt));
  const status = mapDhlStatus((record.status as Record<string, unknown> | undefined)?.statusCode);
  const estimated = clean(record.estimatedTimeOfDelivery, 80);
  const serviceUrl = clean(record.serviceUrl, 500);
  return {
    status,
    estimatedDeliveryAt: estimated && !Number.isNaN(Date.parse(estimated)) ? new Date(estimated).toISOString() : null,
    trackingUrl: serviceUrl.startsWith("https://") ? serviceUrl : null,
    events,
  };
}
