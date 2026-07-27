import { getDb } from "../../../db";
import { sellerState } from "../../../db/schema";

export async function GET() {
  try {
    const rows = await getDb().select().from(sellerState);
    const products = rows.flatMap((row) => {
      const state = JSON.parse(row.stateJson) as { store?: Record<string, unknown>; products?: Array<Record<string, unknown>> };
      return (state.products ?? []).filter((product) => product.status === "Live").map((product) => ({ ...product, store: state.store }));
    });
    return Response.json({ products }, { headers: { "access-control-allow-origin": "https://stylishme-namibia.didireloaded.chatgpt.site", "cache-control": "public, max-age=60" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Catalogue unavailable" }, { status: 503 });
  }
}
