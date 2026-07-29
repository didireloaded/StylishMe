import { notFound, redirect } from "next/navigation";

import { catalogueStoreExists } from "../../catalogue-storage";
import { buildProduct } from "../../product-catalog";
import StorefrontView from "../../StorefrontView";
import { getStylishMeUser } from "../../stylishme-auth";
import { matchesStoreSlug } from "../../unified-domain";

export const dynamic = "force-dynamic";

const seededProducts = Array.from({ length: 41 }, (_, index) => buildProduct(index));

export default async function StorePage({ params }: { params: Promise<{ storeSlug: string }> }) {
  const { storeSlug } = await params;
  const returnTo = `/stores/${encodeURIComponent(storeSlug)}`;
  if (!await getStylishMeUser()) redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  const seeded = seededProducts.some((product) => matchesStoreSlug(product.designer, storeSlug));
  if (!seeded && !await catalogueStoreExists(storeSlug)) notFound();
  return <StorefrontView storeSlug={storeSlug} />;
}
