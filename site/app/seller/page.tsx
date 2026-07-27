import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "../../db";
import { customerState } from "../../db/schema";
import { requireChatGPTUser } from "../chatgpt-auth";

export const dynamic = "force-dynamic";
export default async function SellerRoute() {
  const user = await requireChatGPTUser("/seller");
  const [row] = await getDb().select({ profileJson: customerState.profileJson }).from(customerState).where(eq(customerState.email, user.email)).limit(1);
  let accountRole = "";
  try { accountRole = row ? (JSON.parse(row.profileJson) as { accountRole?: string }).accountRole ?? "" : ""; } catch {}
  if (accountRole !== "seller") redirect("/?join=seller");
  redirect("/");
}
