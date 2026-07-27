import { env } from "cloudflare:workers";

const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  const token = request.headers.get("x-seller-invite")?.trim() ?? "";
  if (!/^[a-zA-Z0-9_-]{6,120}$/.test(token)) return Response.json({ error: "A valid invitation is required" }, { status: 401 });
  const form = await request.formData();
  const file = form.get("image");
  if (!(file instanceof File) || !allowed.has(file.type) || file.size > 8 * 1024 * 1024) return Response.json({ error: "Choose a JPG, PNG or WebP image under 8 MB" }, { status: 400 });
  const extension = file.type.split("/")[1].replace("jpeg", "jpg");
  const key = `${token}/${crypto.randomUUID()}.${extension}`;
  await env.MEDIA.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
  return Response.json({ url: `/api/seller-images/${encodeURIComponent(key)}` });
}
