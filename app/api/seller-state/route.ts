import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { sellerState } from "../../../db/schema";
import { recordActivity } from "../../activity";
import { getChatGPTUser } from "../../chatgpt-auth";
import { listingQuality } from "../../seller-domain";
import { requireAccountRole } from "../../account-role";

type StoreInput = {
  name?: unknown;
  type?: unknown;
  owner?: unknown;
  city?: unknown;
  story?: unknown;
  phone?: unknown;
};

type ProductInput = Record<string, unknown> & {
  id?: unknown;
  name?: unknown;
  status?: unknown;
  images?: unknown;
  variants?: unknown;
};

const cleanText = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

function cleanState(value: unknown, email: string) {
  if (!value || typeof value !== "object") return null;
  const incoming = value as { store?: StoreInput; products?: unknown };
  const name = cleanText(incoming.store?.name, 100);
  const owner = cleanText(incoming.store?.owner, 100);
  if (!name || !owner) return null;
  const products = Array.isArray(incoming.products) ? incoming.products.slice(0, 250) : [];
  const safeProducts = products.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const product = item as ProductInput;
    const productName = cleanText(product.name, 140);
    if (!productName) return [];
    const safeProduct = {
      ...product,
      id: cleanText(product.id, 100) || crypto.randomUUID(),
      name: productName,
      description: cleanText(product.description, 1800),
      category: cleanText(product.category, 80),
      collection: cleanText(product.collection, 100),
      material: cleanText(product.material, 160),
      fit: cleanText(product.fit, 80),
      returns: cleanText(product.returns, 500),
      images: Array.isArray(product.images)
        ? product.images.filter((image): image is string => typeof image === "string" && image.startsWith("/api/seller-images/")).slice(0, 5)
        : [],
      variants: Array.isArray(product.variants) ? product.variants.slice(0, 80) : [],
      colours: Array.isArray(product.colours) ? product.colours.filter((colour): colour is string => typeof colour === "string").slice(0, 20) : [],
      delivery: Array.isArray(product.delivery) ? product.delivery.filter((method): method is string => typeof method === "string").slice(0, 10) : [],
      price: typeof product.price === "number" && Number.isFinite(product.price) ? Math.max(0, product.price) : 0,
    };
    const quality = listingQuality(safeProduct as Parameters<typeof listingQuality>[0]);
    return [{
      ...safeProduct,
      status: product.status === "Draft" ? "Draft" : quality.publishable ? "Live" : "Changes requested",
      qualityIssues: quality.issues,
    }];
  });
  const storeReady = Boolean(name && owner && cleanText(incoming.store?.type, 60) && cleanText(incoming.store?.city, 100));
  return {
    store: {
      name,
      owner,
      email,
      type: cleanText(incoming.store?.type, 60) || "Designer",
      city: cleanText(incoming.store?.city, 100) || "Windhoek",
      story: cleanText(incoming.store?.story, 1800),
      phone: cleanText(incoming.store?.phone, 40),
      approved: storeReady,
    },
    products: safeProducts,
  };
}

export async function GET() {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "Sign in securely to open seller tools" }, { status: 401 });
    if (!await requireAccountRole(user.email, "seller")) return Response.json({ error: "Seller access is required" }, { status: 403 });
    const [row] = await getDb().select().from(sellerState).where(eq(sellerState.ownerEmail, user.email)).limit(1);
    return Response.json({ state: row ? JSON.parse(row.stateJson) : null }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "Store unavailable" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "Sign in securely to manage a store" }, { status: 401 });
    if (!await requireAccountRole(user.email, "seller")) return Response.json({ error: "Seller access is required" }, { status: 403 });
    const size = Number(request.headers.get("content-length") ?? "0");
    if (size > 750_000) return Response.json({ error: "Store update is too large" }, { status: 413 });
    const body = await request.json() as { state?: unknown };
    const db = getDb();
    const [existing] = await db.select().from(sellerState).where(eq(sellerState.ownerEmail, user.email)).limit(1);
    const state = cleanState(body.state, user.email);
    if (!state) return Response.json({ error: "Add a store name and owner name" }, { status: 400 });
    const values = {
      inviteToken: existing?.inviteToken ?? crypto.randomUUID(),
      ownerEmail: user.email,
      approved: state.store.approved,
      storeName: state.store.name,
      stateJson: JSON.stringify(state),
      updatedAt: new Date().toISOString(),
    };
    if (existing) {
      await db.update(sellerState).set(values).where(eq(sellerState.ownerEmail, user.email));
    } else {
      await db.insert(sellerState).values(values);
    }
    let previousState: { products?: unknown[] } | null = null;
    if (existing) {
      try { previousState = JSON.parse(existing.stateJson) as { products?: unknown[] }; } catch {}
    }
    const event = !existing
      ? "seller_joined"
      : state.products.length > (Array.isArray(previousState?.products) ? previousState.products.length : 0)
        ? "product_submitted"
        : "seller_updated";
    await recordActivity(
      request,
      event,
      event === "product_submitted" ? "product" : "store",
      event === "product_submitted" ? state.products[0]?.id : state.store.name,
    ).catch(() => undefined);
    return Response.json({ success: true, state }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "Unable to save store" }, { status: 503 });
  }
}
