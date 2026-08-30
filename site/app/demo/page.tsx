import DemoExperience from "../DemoExperience";

export const dynamic = "force-dynamic";

export default async function DemoPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const role = params.role === "customer" || params.role === "seller" ? params.role : null;
  const stage = role && (params.stage === "tour" || params.stage === "explore") ? params.stage : "choose";
  return <DemoExperience initialRole={role} initialStage={stage} />;
}
