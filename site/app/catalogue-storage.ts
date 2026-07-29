import { env } from "cloudflare:workers";

import { normalizeSellerCatalogue, resolveStoreSlug, type SellerCatalogueState } from "./catalogue-domain";

type SyncInput = {
  sellerId: string;
  ownerEmail: string;
  approved: boolean;
  storeName: string;
  state: SellerCatalogueState;
  updatedAt: string;
};

type SlugRow = { id: string; seller_id: string; store_slug: string; product_slug: string };

export async function syncSellerCatalogue(input: SyncInput) {
  const rows = await env.DB.prepare("SELECT id, seller_id, store_slug, product_slug FROM catalog_products WHERE store_slug IS NOT NULL")
    .all() as { results?: SlugRow[] };
  const slugRows: SlugRow[] = rows.results ?? [];
  const existing = slugRows.find((row) => row.seller_id === input.sellerId)?.store_slug;
  const reserved = new Set<string>(slugRows.filter((row) => row.seller_id !== input.sellerId).map((row) => row.store_slug));
  const storeSlug = existing || resolveStoreSlug(input.storeName, input.sellerId, reserved);
  const existingProductSlugs = new Map(slugRows.filter((row) => row.seller_id === input.sellerId).map((row) => [row.id, row.product_slug]));
  const normalized = normalizeSellerCatalogue({ ...input.state, products: input.approved ? input.state.products : [] }, input.sellerId, storeSlug, existingProductSlugs);
  const statements = [
    env.DB.prepare(`INSERT INTO seller_state (invite_token, owner_email, approved, store_name, state_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(invite_token) DO UPDATE SET owner_email = excluded.owner_email, approved = excluded.approved,
      store_name = excluded.store_name, state_json = excluded.state_json, updated_at = excluded.updated_at`)
      .bind(input.sellerId, input.ownerEmail, input.approved ? 1 : 0, input.storeName, JSON.stringify(input.state), input.updatedAt),
    env.DB.prepare("UPDATE inventory_variants SET available_quantity = reserved_quantity, version = version + 1, updated_at = ? WHERE product_id IN (SELECT id FROM catalog_products WHERE seller_id = ?)")
      .bind(input.updatedAt, input.sellerId),
    env.DB.prepare("UPDATE catalog_products SET status = 'archived', updated_at = ? WHERE seller_id = ?")
      .bind(input.updatedAt, input.sellerId),
  ];
  for (const product of normalized.products) {
    statements.push(env.DB.prepare(`INSERT INTO catalog_products
      (id, seller_id, store_slug, product_slug, name, description, category, currency, price_cents, status, image_url, metadata_json, published_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'NAD', ?, 'published', ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET store_slug = excluded.store_slug, product_slug = excluded.product_slug,
      name = excluded.name, description = excluded.description, category = excluded.category,
      price_cents = excluded.price_cents, status = 'published', image_url = excluded.image_url,
      metadata_json = excluded.metadata_json, published_at = COALESCE(catalog_products.published_at, excluded.published_at),
      updated_at = excluded.updated_at`)
      .bind(product.id, product.sellerId, product.storeSlug, product.productSlug, product.name, product.description,
        product.category, product.priceCents, product.imageUrl, product.metadataJson, input.updatedAt, input.updatedAt, input.updatedAt));
  }
  for (const variant of normalized.variants) {
    statements.push(env.DB.prepare(`INSERT INTO inventory_variants
      (id, product_id, size, colour, sku, available_quantity, reserved_quantity, version, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?)
      ON CONFLICT(id) DO UPDATE SET size = excluded.size, colour = excluded.colour, sku = excluded.sku,
      available_quantity = MAX(excluded.available_quantity, inventory_variants.reserved_quantity),
      version = inventory_variants.version + 1, updated_at = excluded.updated_at`)
      .bind(variant.id, variant.productId, variant.size, variant.colour, variant.sku, variant.availableQuantity, input.updatedAt));
  }
  await env.DB.batch(statements);
  return normalized;
}

export async function catalogueStoreExists(storeSlug: string, productSlug?: string) {
  const query = productSlug
    ? "SELECT id FROM catalog_products WHERE store_slug = ? AND product_slug = ? AND status = 'published' LIMIT 1"
    : "SELECT id FROM catalog_products WHERE store_slug = ? AND status = 'published' LIMIT 1";
  const row = productSlug
    ? await env.DB.prepare(query).bind(storeSlug, productSlug).first()
    : await env.DB.prepare(query).bind(storeSlug).first();
  return Boolean(row);
}
