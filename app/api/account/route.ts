import { eq } from "drizzle-orm";

import { getDb } from "../../../db";
import { customerState } from "../../../db/schema";
import { recordActivity } from "../../activity";
import { getChatGPTUser } from "../../chatgpt-auth";

async function identity() {
  const user = await getChatGPTUser();
  return user?.email ?? null;
}

function parseProfile(value: string | undefined) {
  if (!value) return {} as Record<string, unknown>;
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {} as Record<string, unknown>;
  }
}

export async function GET() {
  const email = await identity();
  if (!email) return Response.json({ role: null, persistence: "device" });
  const [row] = await getDb().select().from(customerState).where(eq(customerState.email, email)).limit(1);
  const profile = parseProfile(row?.profileJson) as { accountRole?: string };
  return Response.json({ role: profile.accountRole ?? null });
}

export async function POST(request: Request) {
  let body: { role?: string };
  try {
    body = await request.json() as { role?: string };
  } catch {
    return Response.json({ error: "Choose customer or seller" }, { status: 400 });
  }
  if (body.role !== "customer" && body.role !== "seller") {
    return Response.json({ error: "Choose customer or seller" }, { status: 400 });
  }
  const email = await identity();
  if (!email && body.role === "seller") {
    return Response.json({ error: "Sign in securely before creating a seller account" }, { status: 401 });
  }
  if (!email) return Response.json({ success: true, role: body.role, persistence: "device" });
  const db = getDb();
  const [row] = await db.select().from(customerState).where(eq(customerState.email, email)).limit(1);
  const profile = parseProfile(row?.profileJson);
  const values = {
    email,
    cartJson: row?.cartJson ?? "[]",
    wishlistJson: row?.wishlistJson ?? "[]",
    ordersJson: row?.ordersJson ?? "[]",
    profileJson: JSON.stringify({ ...profile, accountRole: body.role }),
    updatedAt: new Date().toISOString(),
  };
  await db.insert(customerState).values(values).onConflictDoUpdate({ target: customerState.email, set: values });
  await recordActivity(
    request,
    body.role === "seller" ? "seller_joined" : "customer_joined",
    body.role === "seller" ? "store" : null,
    null,
  ).catch(() => undefined);
  return Response.json({ success: true, role: body.role });
}
