import { notFound, redirect } from "next/navigation";

import { catalogueStoreExists } from "../../../../catalogue-storage";
import { buildProduct } from "../../../../product-catalog";
import StorefrontView from "../../../../StorefrontView";
import { getStylishMeUser } from "../../../../stylishme-auth";
import { matchesStoreSlug, matchesProductSlug } from "../../../../unified-domain";

export const dynamic = "force-dynamic";

const seededProducts = Array.from({ length: 41 }, (_, index) => buildProduct(index));

export default async function ProductPage({ params }: { params: Promise<{ storeSlug: string; productSlug: string }> }) {
  const { storeSlug, productSlug } = await params;
  const returnTo = `/stores/${encodeURIComponent(storeSlug)}/products/${encodeURIComponent(productSlug)}`;
  if (!await getStylishMeUser()) redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  const seeded = seededProducts.some((product) => matchesStoreSlug(product.designer, storeSlug) && matchesProductSlug(product.name, productSlug));
  if (!seeded && !await catalogueStoreExists(storeSlug, productSlug)) notFound();
  return <StorefrontView storeSlug={storeSlug} linkedProduct={productSlug} />;
}
