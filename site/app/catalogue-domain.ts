import { listingQuality, type ProductDraft } from "./seller-domain";

type SellerStore = {
  name?: unknown;
  type?: unknown;
  city?: unknown;
  story?: unknown;
};

type SellerProduct = ProductDraft & {
  id: string;
  status?: string;
  collection?: string;
  material?: string;
  fit?: string;
  delivery?: string[];
  returns?: string;
};

export type SellerCatalogueState = {
  store?: SellerStore;
  products?: SellerProduct[];
};

export type NormalizedCatalogueProduct = {
  id: string;
  sellerId: string;
  storeSlug: string;
  productSlug: string;
  name: string;
  description: string;
  category: string;
  priceCents: number;
  status: "published";
  imageUrl: string;
  metadataJson: string;
};

export type NormalizedInventoryVariant = {
  id: string;
  productId: string;
  size: string;
  colour: string;
  sku: string;
  availableQuantity: number;
};

export function slugify(value: string) {
  return value.toLowerCase().trim().normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "store";
}

export function stableSlugToken(value: string) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).slice(0, 7);
}

export function normalizeSellerCatalogue(
  state: SellerCatalogueState,
  sellerId: string,
  preferredStoreSlug?: string,
  existingProductSlugs: ReadonlyMap<string, string> = new Map(),
) {
  const storeName = typeof state.store?.name === "string" ? state.store.name.trim() : "";
  const storeSlug = preferredStoreSlug || slugify(storeName);
  const candidates = (Array.isArray(state.products) ? state.products : []).filter((product) => {
    if (!product || product.status !== "Live") return false;
    return listingQuality(product).publishable;
  });
  const slugCounts = new Map<string, number>();
  for (const product of candidates) {
    const base = slugify(product.name);
    slugCounts.set(base, (slugCounts.get(base) ?? 0) + 1);
  }

  const products: NormalizedCatalogueProduct[] = [];
  const variants: NormalizedInventoryVariant[] = [];
  for (const product of candidates) {
    const sourceId = String(product.id).trim();
    if (!sourceId) continue;
    const productId = `${sellerId}:${sourceId}`;
    const baseSlug = slugify(product.name);
    const productSlug = existingProductSlugs.get(productId) ?? ((slugCounts.get(baseSlug) ?? 0) > 1
      ? `${baseSlug}-${stableSlugToken(sourceId)}`
      : baseSlug);
    const images = product.images.filter((image) => typeof image === "string" && image.startsWith("/api/seller-images/")).slice(0, 5);
    const metadataJson = JSON.stringify({
      images,
      colours: product.colours,
      collection: product.collection ?? "",
      material: product.material ?? "",
      fit: product.fit ?? "",
      delivery: product.delivery ?? [],
      returns: product.returns ?? "",
      store: {
        name: storeName,
        type: typeof state.store?.type === "string" ? state.store.type : "Seller",
        city: typeof state.store?.city === "string" ? state.store.city : "Namibia",
        story: typeof state.store?.story === "string" ? state.store.story : "",
      },
    });
    products.push({
      id: productId,
      sellerId,
      storeSlug,
      productSlug,
      name: product.name.trim(),
      description: product.description.trim(),
      category: product.category.trim(),
      priceCents: Math.round(product.price * 100),
      status: "published",
      imageUrl: images[0],
      metadataJson,
    });
    product.variants.forEach((variant, index) => {
      const size = variant.size.trim();
      const colour = variant.colour.trim();
      const availableQuantity = Math.max(0, Math.floor(Number(variant.quantity) || 0));
      if (!size || !colour || availableQuantity < 1) return;
      const variantKey = `${sourceId}:${size}:${colour}:${index}`;
      variants.push({
        id: `${sellerId}:${stableSlugToken(variantKey)}`,
        productId,
        size,
        colour,
        sku: `${slugify(storeName).slice(0, 12)}-${stableSlugToken(variantKey)}`.toUpperCase(),
        availableQuantity,
      });
    });
  }
  return { storeSlug, products, variants };
}

export function resolveStoreSlug(storeName: string, sellerId: string, reserved: ReadonlySet<string>) {
  const base = slugify(storeName);
  return reserved.has(base) ? `${base}-${stableSlugToken(sellerId)}` : base;
}
