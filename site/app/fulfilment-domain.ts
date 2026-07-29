export type FulfilmentKind = "delivery" | "collection";
export type FulfilmentStatus =
  | "new"
  | "preparing"
  | "ready_to_collect"
  | "shipped"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "collected";

export class FulfilmentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FulfilmentValidationError";
  }
}

const deliveryPath: FulfilmentStatus[] = ["new", "preparing", "shipped", "in_transit", "out_for_delivery", "delivered"];
const collectionPath: FulfilmentStatus[] = ["new", "preparing", "ready_to_collect", "collected"];
const labels: Record<FulfilmentStatus, string> = {
  new: "Order confirmed",
  preparing: "Store preparing order",
  ready_to_collect: "Ready to collect",
  shipped: "Collected by courier",
  in_transit: "In transit",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  collected: "Collected",
};

export const fulfilmentPath = (kind: FulfilmentKind) => kind === "collection" ? collectionPath : deliveryPath;

export function fulfilmentTimeline(kind: FulfilmentKind, current: string) {
  const path = fulfilmentPath(kind);
  const currentIndex = path.indexOf(current as FulfilmentStatus);
  return path.map((status, index) => ({ status, label: labels[status], complete: currentIndex >= index }));
}

const cleanField = (value: unknown, length: number) => typeof value === "string" ? value.trim().slice(0, length) : "";

export function assertFulfilmentTransition(
  kind: FulfilmentKind,
  current: string,
  next: string,
  courier: { provider?: unknown; trackingNumber?: unknown; trackingUrl?: unknown } = {},
) {
  const path = fulfilmentPath(kind);
  const currentIndex = path.indexOf(current as FulfilmentStatus);
  const nextIndex = path.indexOf(next as FulfilmentStatus);
  const provider = cleanField(courier.provider, 40).toLowerCase();
  const trackingNumber = cleanField(courier.trackingNumber, 80);
  const trackingUrl = cleanField(courier.trackingUrl, 500);

  if (kind === "collection" && (provider || trackingNumber || trackingUrl)) {
    throw new FulfilmentValidationError("Store collection does not use courier tracking");
  }
  if (currentIndex < 0 || nextIndex !== currentIndex + 1) {
    throw new FulfilmentValidationError(`This order cannot move from ${current.replaceAll("_", " ")} to ${next.replaceAll("_", " ")}`);
  }
  if (kind === "delivery" && next === "shipped") {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9 ._/-]{2,79}$/.test(trackingNumber)) throw new FulfilmentValidationError("Add a valid tracking number before marking this order shipped");
    if (!provider) throw new FulfilmentValidationError("Choose the courier before marking this order shipped");
  }
  if (trackingUrl) {
    try {
      if (new URL(trackingUrl).protocol !== "https:") throw new Error();
    } catch {
      throw new FulfilmentValidationError("Tracking links must use a secure HTTPS address");
    }
  }
  return { status: next as FulfilmentStatus, provider, trackingNumber, trackingUrl, label: labels[next as FulfilmentStatus] };
}

export function payoutEligibilityDate(completedAt: Date, returnWindowDays = 14) {
  return new Date(completedAt.getTime() + returnWindowDays * 24 * 60 * 60 * 1000).toISOString();
}

export function statusLabel(status: string) {
  return labels[status as FulfilmentStatus] ?? status.replaceAll("_", " ").replace(/^./, value => value.toUpperCase());
}
