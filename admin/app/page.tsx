import AdminDashboard from "./AdminDashboard";
import { getChatGPTUser } from "./chatgpt-auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getChatGPTUser();
  if (!user) return <main className="access-denied"><section><small>PRIVATE OWNER WORKSPACE</small><h1>Access restricted</h1><p>This workspace is available only to the configured StylishMe owner.</p></section></main>;
  return <AdminDashboard operatorName={user.displayName} />;
}
