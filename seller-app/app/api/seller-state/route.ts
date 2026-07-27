import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { sellerState } from "../../../db/schema";

const tokenFrom = (request: Request) => request.headers.get("x-seller-invite")?.trim() ?? "";
const validToken = (token: string) => /^[a-zA-Z0-9_-]{6,120}$/.test(token);

export async function GET(request: Request) {
  try {
    const token = tokenFrom(request);
    if (!validToken(token)) return Response.json({ error: "A valid invitation is required" }, { status: 401 });
    const [row] = await getDb().select().from(sellerState).where(eq(sellerState.inviteToken, token)).limit(1);
    return Response.json({ state: row ? JSON.parse(row.stateJson) : null });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Store unavailable" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const token = tokenFrom(request);
    if (!validToken(token)) return Response.json({ error: "A valid invitation is required" }, { status: 401 });
    const body = await request.json() as { state?: unknown };
    if (!body.state || typeof body.state !== "object") return Response.json({ error: "Store details are required" }, { status: 400 });
    const state = body.state as { store?: { name?: string } };
    const storeName = state.store?.name?.trim();
    if (!storeName) return Response.json({ error: "Store name is required" }, { status: 400 });
    const values = { inviteToken: token, storeName, stateJson: JSON.stringify(body.state), updatedAt: new Date().toISOString() };
    await getDb().insert(sellerState).values(values).onConflictDoUpdate({ target: sellerState.inviteToken, set: values });
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to save store" }, { status: 503 });
  }
}
