export type AccountRole = "customer" | "seller";
export type SellerProductFilter = "All" | "Live" | "Needs details" | "Needs attention";
export type SellerOrderFilter = "To prepare" | "Ready" | "Completed";

const slug = (value: string) =>
  value.toLowerCase().trim().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "store";

export function catalogueProductUrl(storeNameOrSlug: string, productNameOrSlug: string) {
  return `/stores/${slug(storeNameOrSlug)}/products/${slug(productNameOrSlug)}`;
}

export function storeShareUrl(storeName: string, origin = "https://stylishme-namibia.didireloaded.chatgpt.site") {
  return `${origin.replace(/\/$/, "")}/stores/${slug(storeName)}`;
}

export function productShareUrl(storeName: string, productName: string, origin = "https://stylishme-namibia.didireloaded.chatgpt.site") {
  return `${origin.replace(/\/$/, "")}${catalogueProductUrl(storeName, productName)}`;
}

export function matchesStoreSlug(storeName: string, storeSlug: string) {
  return slug(storeName) === slug(storeSlug);
}

export function matchesProductSlug(productName: string, productSlug: string) {
  return slug(productName) === slug(productSlug);
}

export function filterSellerProducts<T extends { status: string; variants: Array<{ quantity: number }> }>(
  products: T[],
  filter: SellerProductFilter,
) {
  if (filter === "All") return products;
  if (filter === "Live") return products.filter((product) => product.status === "Live");
  if (filter === "Needs details") return products.filter((product) => product.status === "Changes requested");
  return products.filter((product) =>
    product.status === "Changes requested"
    || product.variants.reduce((sum, variant) => sum + Math.max(0, Number(variant.quantity) || 0), 0) < 1,
  );
}

export function filterSellerOrders<T extends { status: string }>(orders: T[], filter: SellerOrderFilter) {
  return orders.filter((order) => order.status === filter);
}

export function checkoutDestinationHeading(fulfilment: string) {
  return fulfilment === "Store collection" ? "Choose a collection store" : "Delivery address";
}
