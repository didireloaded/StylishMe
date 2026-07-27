export type EligibleStoryItem = { orderId: string; productId: string };
export type PublicCustomerStory = {
  id: string;
  displayName: string;
  caption: string;
  town: string;
  imageUrl: string;
  status: "published";
  publishedAt: string;
  ringExpiresAt: string;
  likeCount: number;
  liked: boolean;
  isOwner: boolean;
  products: Array<{ id: string; name: string; seller: string; image: string; price: number }>;
};

type StoredOrder = { id?: unknown; status?: unknown; items?: unknown };
const eligibleStatuses = new Set(["delivered", "collected"]);

export function eligibleStoryItems(orders: unknown): EligibleStoryItem[] {
  if (!Array.isArray(orders)) return [];
  const seen = new Set<string>();
  return orders.flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const order = value as StoredOrder;
    if (typeof order.id !== "string" || typeof order.status !== "string" || !eligibleStatuses.has(order.status.toLowerCase())) return [];
    const orderId = order.id;
    if (!Array.isArray(order.items)) return [];
    return order.items.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const productId = (item as { productId?: unknown }).productId;
      if (typeof productId !== "string" || !/^p\d{1,4}$/.test(productId)) return [];
      const key = `${orderId}:${productId}`;
      if (seen.has(key)) return [];
      seen.add(key);
      return [{ orderId, productId }];
    });
  });
}

export function cleanStoryText(value: unknown, max: number) {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max) : "";
}

export function isRingActive(story: { status: string; ringExpiresAt: string }, now = new Date()) {
  return story.status === "published" && new Date(story.ringExpiresAt).getTime() > now.getTime();
}

export function toggleLikeState(liked: boolean, count: number) {
  return liked ? { liked: false, count: Math.max(0, count - 1) } : { liked: true, count: Math.max(0, count) + 1 };
}
