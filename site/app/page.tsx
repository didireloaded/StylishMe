import AppEntry from "./AppEntry";
import { getStylishMeUser } from "./stylishme-auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getStylishMeUser();
  return <AppEntry user={user ? { name: user.displayName, email: user.email, avatarUrl: user.avatarUrl } : null} />;
}
