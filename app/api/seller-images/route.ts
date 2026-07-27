import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";

import { getDb } from "../../../db";
import { sellerState } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";
import { requireAccountRole } from "../../account-role";

const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);

function hasValidSignature(bytes: Uint8Array, type: string) {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes.slice(0, 8).every((value, index) => value === [137, 80, 78, 71, 13, 10, 26, 10][index]);
  if (type === "image/webp") return new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  return false;
}

export async function POST(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "Sign in securely to add product photos" }, { status: 401 });
    if (!await requireAccountRole(user.email, "seller")) return Response.json({ error: "Seller access is required" }, { status: 403 });
    const [seller] = await getDb().select().from(sellerState).where(eq(sellerState.ownerEmail, user.email)).limit(1);
    if (!seller) return Response.json({ error: "Finish setting up your store first" }, { status: 403 });
    const form = await request.formData();
    const file = form.get("image");
    if (!(file instanceof File) || !allowed.has(file.type) || !file.size || file.size > 8 * 1024 * 1024) {
      return Response.json({ error: "Choose a JPG, PNG or WebP image under 8 MB" }, { status: 400 });
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!hasValidSignature(bytes, file.type)) {
      return Response.json({ error: "That file does not appear to be a valid image" }, { status: 400 });
    }
    const extension = file.type.split("/")[1].replace("jpeg", "jpg");
    const key = `${seller.inviteToken}/${crypto.randomUUID()}.${extension}`;
    await env.MEDIA.put(key, bytes, { httpMetadata: { contentType: file.type } });
    return Response.json({ url: `/api/seller-images/${encodeURIComponent(key)}` }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "Unable to add that image right now" }, { status: 503 });
  }
}
