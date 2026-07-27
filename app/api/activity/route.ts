import { ACTIVITY_TYPES, recordActivity, type ActivityType } from "../../activity";

export async function POST(request: Request) {
  const size = Number(request.headers.get("content-length") ?? "0");
  if (size > 2_000) return Response.json({ accepted: false }, { status: 413 });

  try {
    const body = await request.json() as { event?: unknown; targetType?: unknown; targetId?: unknown; context?: unknown; sessionId?: unknown };
    if (typeof body.event !== "string" || !ACTIVITY_TYPES.includes(body.event as ActivityType)) {
      return Response.json({ accepted: false }, { status: 400 });
    }
    await recordActivity(
      request,
      body.event as ActivityType,
      typeof body.targetType === "string" ? body.targetType : null,
      typeof body.targetId === "string" ? body.targetId : null,
      body.context,
      body.sessionId,
    );
    return Response.json({ accepted: true }, { status: 202 });
  } catch {
    return Response.json({ accepted: false }, { status: 400 });
  }
}
