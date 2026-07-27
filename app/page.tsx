import { getChatGPTUser } from "./chatgpt-auth";
import AppEntry from "./AppEntry";
import SessionResetGate from "./SessionResetGate";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getChatGPTUser();
  return (
    <SessionResetGate signedIn={Boolean(user)} returnTo="/">
      <AppEntry user={user ? { name: user.displayName, email: user.email } : null} />
    </SessionResetGate>
  );
}
