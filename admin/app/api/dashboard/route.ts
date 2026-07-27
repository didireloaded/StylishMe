import { getChatGPTUser } from "../../chatgpt-auth";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in to open StylishMe Admin" }, { status: 401 });

  const origin = process.env.STYLISHME_API_ORIGIN;
  const secret = process.env.STYLISHME_ADMIN_API_KEY;
  if (!origin || !secret) {
    return Response.json({ error: "The live marketplace connection is not ready" }, { status: 503 });
  }

  try {
    const response = await fetch(`${origin.replace(/\/$/, "")}/api/admin-feed`, {
      headers: { authorization: `Bearer ${secret}` },
      cache: "no-store",
    });
    const body = await response.text();
    return new Response(body, {
      status: response.status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store, private",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return Response.json({ error: "StylishMe activity is temporarily unavailable" }, { status: 503 });
  }
}
