import { currentSessionToken, destroySession, expiredSessionCookie } from "../../../stylishme-auth";

export async function POST() {
  try {
    await destroySession(await currentSessionToken());
    return Response.json({ success: true }, { headers: { "set-cookie": expiredSessionCookie(), "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "Unable to sign out. Please try again." }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
