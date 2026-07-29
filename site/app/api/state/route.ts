import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { customerState } from "../../../db/schema";
import { recordActivity, type ActivityType } from "../../activity";
import { getStylishMeUser } from "../../stylishme-auth";
import { getCustomerOrders } from "../../commerce-orders";

const safeJson = (value: string, fallback: unknown) => {
  try { return JSON.parse(value); } catch { return fallback; }
};

async function identity() {
  const user = await getStylishMeUser();
  return user?.email ?? null;
}

export async function GET(request: Request) {
  try {
    const email = await identity();
    const accountRequired = new URL(request.url).searchParams.get("account") === "1";
    if (!email && accountRequired) return Response.json({ error: "Your session has expired" }, { status: 401, headers: { "cache-control": "no-store" } });
    if (!email) return Response.json({ state: null, persistence: "device" }, { headers: { "cache-control": "no-store" } });
    const db = getDb();
    const [row] = await db.select().from(customerState).where(eq(customerState.email, email)).limit(1);
    if (!row) return Response.json({ state: null });
    const profile = safeJson(row.profileJson, {}) as Record<string, unknown>;
    const savedOutfits = Array.isArray(profile.savedOutfits)
      ? profile.savedOutfits.filter((id): id is string => typeof id === "string")
      : [];
    const normalizedOrders = await getCustomerOrders(env.DB, email);
    const legacyOrders = safeJson(row.ordersJson, []);
    return Response.json({ state: {
      cart: safeJson(row.cartJson, []),
      wishlist: safeJson(row.wishlistJson, []),
      orders: normalizedOrders.length ? normalizedOrders : legacyOrders,
      profile,
      savedOutfits,
    }}, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "State unavailable" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const email = await identity();
    if (!email && request.headers.get("x-stylishme-account") === "1") return Response.json({ error: "Your session has expired" }, { status: 401, headers: { "cache-control": "no-store" } });
    if (!email) return Response.json({ success: true, persistence: "device" });
    const size = Number(request.headers.get("content-length") ?? "0");
    if (size > 1_000_000) return Response.json({ error: "Account update is too large" }, { status: 413 });
    const body = await request.json() as Record<string, unknown>;
    const cart = Array.isArray(body.cart) ? body.cart.slice(0, 100) : [];
    // Accept catalogue-safe product identities from launch inventory and normalized seller catalogues.
    const wishlist = Array.isArray(body.wishlist)
      ? body.wishlist.filter((id): id is string => typeof id === "string" && /^[a-zA-Z0-9:_-]{1,180}$/.test(id)).slice(0, 500)
      : [];
    const inputProfile = body.profile && typeof body.profile === "object" ? body.profile as Record<string, unknown> : {};
    const savedOutfits = Array.isArray(body.savedOutfits)
      ? body.savedOutfits.filter((id): id is string => typeof id === "string").slice(0, 100)
      : [];
    const text = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";
    const addresses = Array.isArray(inputProfile.addresses)
      ? inputProfile.addresses.slice(0, 10).flatMap((value) => {
        if (!value || typeof value !== "object") return [];
        const address = value as Record<string, unknown>;
        const clean = { label: text(address.label, 60), street: text(address.street, 180), city: text(address.city, 100) };
        return clean.label && clean.street && clean.city ? [clean] : [];
      })
      : [];
    const followedDesigners = Array.isArray(inputProfile.followedDesigners)
      ? inputProfile.followedDesigners.filter((name): name is string => typeof name === "string").map((name) => name.slice(0, 100)).slice(0, 100)
      : [];
    const db = getDb();
    const [existing] = await db.select().from(customerState).where(eq(customerState.email, email)).limit(1);
    const previousProfile = existing ? safeJson(existing.profileJson, {}) as Record<string, unknown> : {};
    const profile = {
      city: text(inputProfile.city, 100) || "Windhoek",
      size: text(inputProfile.size, 20) || "M",
      shoe: text(inputProfile.shoe, 20) || "39",
      fit: text(inputProfile.fit, 40) || "Regular",
      addresses,
      followedDesigners,
      dataLight: inputProfile.dataLight === true,
      savedOutfits,
      accountRole: previousProfile.accountRole,
    };
    const values = {
      email,
      cartJson: JSON.stringify(cart),
      wishlistJson: JSON.stringify(wishlist),
      ordersJson: existing?.ordersJson ?? "[]",
      profileJson: JSON.stringify(profile),
      updatedAt: new Date().toISOString(),
    };
    await db.insert(customerState).values(values).onConflictDoUpdate({
      target: customerState.email,
      set: values,
    });
    const previousCart = existing ? safeJson(existing.cartJson, []) : [];
    const previousWishlist = existing ? safeJson(existing.wishlistJson, []) : [];
    let event: ActivityType | null = null;
    let targetType: string | null = null;
    let targetId: string | null = null;
    if (Array.isArray(previousCart) && cart.length > previousCart.length) {
      const latest = cart[cart.length - 1] as { productId?: unknown } | undefined;
      event = "cart_added";
      targetType = "product";
      targetId = typeof latest?.productId === "string" ? latest.productId : null;
    } else if (Array.isArray(previousWishlist) && wishlist.length > previousWishlist.length) {
      event = "wishlist_saved";
      targetType = "product";
      targetId = wishlist.find(id => !previousWishlist.includes(id)) ?? null;
    }
    if (event) await recordActivity(request, event, targetType, targetId).catch(() => undefined);
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Unable to save" }, { status: 503 });
  }
}
