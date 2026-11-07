import { TaskDetail } from "@/features/tracking";

// TV2 owns this full-page shell. TV3 supplies delivery UI through the children slot.
export default async function Page({ params }: {
  params: Promise<{ projectId: string; taskId: string }>;
}) {
  const { projectId, taskId } = await params;
  return <TaskDetail key={projectId + ":" + taskId} projectId={projectId} taskId={taskId} />;
}
