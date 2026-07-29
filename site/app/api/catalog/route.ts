import { and, eq, notLike } from "drizzle-orm";

import { getDb } from "../../../db";
import { catalogProducts, inventoryVariants } from "../../../db/schema";

type PublicMetadata = {
  images?: string[];
  colours?: string[];
  collection?: string;
  material?: string;
  fit?: string;
  delivery?: string[];
  returns?: string;
  store?: { name?: string; type?: string; city?: string; story?: string };
};

const metadata = (value: string): PublicMetadata => {
  try { return JSON.parse(value) as PublicMetadata; } catch { return {}; }
};

export async function GET(request: Request) {
  try {
    const storeSlug = new URL(request.url).searchParams.get("store");
    const publishedSellerProduct = and(eq(catalogProducts.status, "published"), notLike(catalogProducts.sellerId, "launch:%"));
    const condition = storeSlug
      ? and(publishedSellerProduct, eq(catalogProducts.storeSlug, storeSlug))
      : publishedSellerProduct;
    const rows = await getDb().select({
      id: catalogProducts.id,
      storeSlug: catalogProducts.storeSlug,
      productSlug: catalogProducts.productSlug,
      name: catalogProducts.name,
      description: catalogProducts.description,
      category: catalogProducts.category,
      priceCents: catalogProducts.priceCents,
      imageUrl: catalogProducts.imageUrl,
      metadataJson: catalogProducts.metadataJson,
      variantId: inventoryVariants.id,
      size: inventoryVariants.size,
      colour: inventoryVariants.colour,
      availableQuantity: inventoryVariants.availableQuantity,
      reservedQuantity: inventoryVariants.reservedQuantity,
    }).from(catalogProducts)
      .leftJoin(inventoryVariants, eq(inventoryVariants.productId, catalogProducts.id))
      .where(condition);

    const products = new Map<string, Record<string, unknown> & { variants: Array<Record<string, unknown>> }>();
    for (const row of rows) {
      if (!products.has(row.id)) {
        const meta = metadata(row.metadataJson);
        products.set(row.id, {
          id: row.id,
          storeSlug: row.storeSlug,
          productSlug: row.productSlug,
          name: row.name,
          description: row.description,
          category: row.category,
          collection: meta.collection ?? "",
          material: meta.material ?? "",
          fit: meta.fit ?? "",
          delivery: meta.delivery ?? [],
          returns: meta.returns ?? "",
          price: row.priceCents / 100,
          priceCents: row.priceCents,
          images: Array.isArray(meta.images) && meta.images.length ? meta.images : [row.imageUrl],
          colours: meta.colours ?? [],
          store: {
            name: meta.store?.name ?? "StylishMe seller",
            type: meta.store?.type ?? "Seller",
            city: meta.store?.city ?? "Namibia",
            story: meta.store?.story ?? "",
          },
          variants: [],
        });
      }
      if (row.variantId && row.size && row.colour) {
        products.get(row.id)?.variants.push({
          id: row.variantId,
          size: row.size,
          colour: row.colour,
          quantity: Math.max(0, (row.availableQuantity ?? 0) - (row.reservedQuantity ?? 0)),
        });
      }
    }
    return Response.json({ products: Array.from(products.values()) }, { headers: { "cache-control": "public, max-age=60" } });
  } catch {
    return Response.json({ error: "Catalogue unavailable" }, { status: 503 });
  }
}
