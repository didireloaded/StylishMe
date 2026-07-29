import { env } from "cloudflare:workers";

import { processDueAccountDeletions } from "../../../account-deletion";
import { revokeAccountProviderCredentials } from "../../../provider-credential-lifecycle";
import { safeRelativeReturnPath } from "../../../stylishme-auth";

const noStore = { "cache-control": "no-store" };
const secureEquals = (left: string, right: string) => {
  if (!left || left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
};

export async function POST(request: Request) {
  safeRelativeReturnPath("/");
  const configured = process.env.STYLISHME_ADMIN_API_KEY ?? "";
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secureEquals(configured, supplied)) return Response.json({ error: "Not authorized" }, { status: 401, headers: noStore });
  const result = await processDueAccountDeletions(env.DB, env.MEDIA, new Date(), email => revokeAccountProviderCredentials(env.DB, email));
  return Response.json(result, { headers: noStore });
}
