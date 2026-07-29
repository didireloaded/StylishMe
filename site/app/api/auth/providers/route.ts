import { oauthAvailability } from "../../../oauth";

export async function GET() {
  const availability = oauthAvailability();
  return Response.json(availability, { headers: { "cache-control": "no-store" } });
}
