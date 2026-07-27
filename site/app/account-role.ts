import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { customerState } from "../db/schema";
import type { AccountRole } from "./unified-domain";

export async function requireAccountRole(email: string, role: AccountRole) {
  const [row] = await getDb().select({ profileJson: customerState.profileJson }).from(customerState).where(eq(customerState.email, email)).limit(1);
  if (!row) return false;
  try { return (JSON.parse(row.profileJson) as { accountRole?: string }).accountRole === role; }
  catch { return false; }
}
