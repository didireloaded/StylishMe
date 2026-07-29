import { currentDpoConfig } from "../../../dpo-pay";

export async function GET() {
  const configuredOrigin = process.env.PUBLIC_APP_ORIGIN?.trim();
  const available = currentDpoConfig().available && Boolean(configuredOrigin?.startsWith("https://"));
  return Response.json({
    available,
    provider: available ? "DPO Pay" : null,
    currency: "NAD",
    hosted: true,
  }, { headers: { "cache-control": "no-store" } });
}
