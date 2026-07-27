import { redirect } from "next/navigation";
import AppEntry from "./AppEntry";
import { getStylishMeUser } from "./stylishme-auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getStylishMeUser();
  if (!user) redirect(`/login?returnTo=${encodeURIComponent("/")}`);
  return <AppEntry user={{ name: user.displayName, email: user.email, avatarUrl: user.avatarUrl }} />;
}
