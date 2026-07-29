import { productShareUrl as unifiedProductShareUrl, storeShareUrl as unifiedStoreShareUrl } from "./unified-domain";

export type ProductDraft = {
  name: string;
  description: string;
  category: string;
  price: number;
  images: string[];
  colours: string[];
  variants: Array<{ size: string; colour: string; quantity: number }>;
};

export type ListingQualityResult = {
  publishable: boolean;
  issues: string[];
};

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

export function listingQuality(product: ProductDraft & {
  collection?: string;
  material?: string;
  fit?: string;
  delivery?: string[];
  returns?: string;
}): ListingQualityResult {
  const issues: string[] = [];
  if (product.name.trim().length < 4) issues.push("Add a clear product name");
  if (product.description.trim().length < 40) issues.push("Describe the product in at least 40 characters");
  if (!product.category.trim()) issues.push("Choose a category");
  if (!product.collection?.trim()) issues.push("Add a collection name");
  if (!(Number(product.price) > 0)) issues.push("Add a valid price");
  if (!product.material?.trim()) issues.push("Add the material");
  if (!product.fit?.trim()) issues.push("Add fit guidance");
  if (!product.images.length) issues.push("Add at least one product photo");
  if (!product.colours.length) issues.push("Add a colour");
  if (!product.variants.length) issues.push("Add at least one size and colour option");
  if (product.variants.some(variant => !variant.size.trim() || !variant.colour.trim())) issues.push("Complete every size and colour option");
  if (totalStock(product.variants) < 1) issues.push("Add available stock");
  if (!product.delivery?.length) issues.push("Choose delivery or pickup");
  if (!product.returns?.trim()) issues.push("Add return information");
  return { publishable: issues.length === 0, issues };
}

export function storeShareUrl(storeName: string) {
  const origin = typeof window === "undefined"
    ? "https://stylishme-namibia.didireloaded.chatgpt.site"
    : window.location.origin;
  return unifiedStoreShareUrl(storeName, origin);
}

export function productShareUrl(storeName: string, productName: string) {
  const origin = typeof window === "undefined"
    ? "https://stylishme-namibia.didireloaded.chatgpt.site"
    : window.location.origin;
  return unifiedProductShareUrl(storeName, productName, origin);
}
