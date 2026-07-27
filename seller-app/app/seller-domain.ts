export type ProductDraft = {
  name: string;
  description: string;
  category: string;
  price: number;
  images: string[];
  colours: string[];
  variants: Array<{ size: string; colour: string; quantity: number }>;
};

const slug = (value: string) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export function totalStock(variants: ProductDraft["variants"]) {
  return variants.reduce((sum, variant) => sum + Math.max(0, Number(variant.quantity) || 0), 0);
}

export function productReadiness(product: ProductDraft) {
  const missing: string[] = [];
  if (!product.name.trim()) missing.push("name");
  if (!product.description.trim()) missing.push("description");
  if (!product.category.trim()) missing.push("category");
  if (!(product.price > 0)) missing.push("price");
  if (!product.images.length) missing.push("image");
  if (!product.colours.length) missing.push("colour");
  if (!product.variants.length || totalStock(product.variants) < 1) missing.push("stock");
  return { ready: missing.length === 0, missing };
}

const CUSTOMER_APP = "https://stylishme-namibia.didireloaded.chatgpt.site/";

export function storeShareUrl(storeName: string) {
  return `${CUSTOMER_APP}?store=${slug(storeName)}`;
}

export function productShareUrl(storeName: string, productName: string) {
  return `${storeShareUrl(storeName)}&product=${slug(productName)}`;
}
