import { redirect } from "next/navigation";
import { requireStylishMeUser } from "../stylishme-auth";

export const dynamic = "force-dynamic";
export default async function OrdersRoute() {
  await requireStylishMeUser("/orders");
  redirect("/?view=orders");
}
