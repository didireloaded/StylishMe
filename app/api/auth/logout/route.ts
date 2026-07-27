import { currentSessionToken, destroySession, expiredSessionCookie } from "../../../stylishme-auth";

export async function POST() {
  await destroySession(await currentSessionToken()).catch(() => undefined);
  return Response.json({ success: true }, { headers: { "set-cookie": expiredSessionCookie(), "cache-control": "no-store" } });
}
