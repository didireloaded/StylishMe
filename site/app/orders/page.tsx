import { redirect } from "next/navigation";
import { requireStylishMeUser } from "../stylishme-auth";

export const dynamic = "force-dynamic";
export default async function OrdersRoute({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireStylishMeUser("/orders");
  const params = await searchParams;
  const target = new URLSearchParams({ view: "orders" });
  const payment = typeof params.payment === "string" ? params.payment : "";
  const order = typeof params.order === "string" ? params.order : "";
  if (["paid", "pending", "declined", "expired", "cancelled", "verification-error"].includes(payment)) target.set("payment", payment);
  if (/^[A-Z0-9-]{8,80}$/i.test(order)) target.set("order", order);
  redirect(`/?${target.toString()}`);
}
