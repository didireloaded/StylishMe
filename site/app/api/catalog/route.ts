import { eq } from "drizzle-orm";

import { getDb } from "../../../db";
import { sellerState } from "../../../db/schema";
import { matchesStoreSlug } from "../../unified-domain";

export async function GET(request: Request) {
  try {
    const storeSlug = new URL(request.url).searchParams.get("store");
    const rows = await getDb().select().from(sellerState).where(eq(sellerState.approved, true));
    const products = rows.flatMap((row) => {
      try {
        const state = JSON.parse(row.stateJson) as { store?: Record<string, unknown>; products?: Array<Record<string, unknown>> };
        const storeName = typeof state.store?.name === "string" ? state.store.name : "";
        if (storeSlug && !matchesStoreSlug(storeName, storeSlug)) return [];
        const publicStore = {
          name: storeName,
          type: typeof state.store?.type === "string" ? state.store.type : "Seller",
          city: typeof state.store?.city === "string" ? state.store.city : "Namibia",
          story: typeof state.store?.story === "string" ? state.store.story : "",
        };
        return (state.products ?? [])
          .filter((product) => product.status === "Live")
          .map((product) => ({ ...product, store: publicStore }));
      } catch {
        return [];
      }
    });
    return Response.json({ products }, { headers: { "cache-control": "public, max-age=60" } });
  } catch {
    return Response.json({ error: "Catalogue unavailable" }, { status: 503 });
  }
}
