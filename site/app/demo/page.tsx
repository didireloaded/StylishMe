import { getChatGPTUser } from "../chatgpt-auth";
import DemoExperience from "../DemoExperience";
import SessionResetGate from "../SessionResetGate";

export const dynamic = "force-dynamic";

export default async function DemoPage() {
  const user = await getChatGPTUser();
  return (
    <SessionResetGate signedIn={Boolean(user)} returnTo="/demo">
      <DemoExperience />
    </SessionResetGate>
  );
}
