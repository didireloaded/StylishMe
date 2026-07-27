import { redirect } from "next/navigation";
import { requireChatGPTUser } from "../chatgpt-auth";

export const dynamic = "force-dynamic";
export default async function OrdersRoute() {
  await requireChatGPTUser("/orders");
  redirect("/?view=orders");
}
