import { ProjectChat } from "@/features/tracking";

export default async function Page({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <ProjectChat key={projectId} projectId={projectId} />;
}
