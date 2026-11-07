import { TrackingPage } from "@/features/tracking/server/page";

// P06 — TODO(TV2): full-page task shell.
// TODO(TV3): later expose submission/review UI through delivery/index.ts;
// TV2 composes it here. No cross-feature internal imports or drawer in scaffold.
export default async function TaskDetailPage({ params }: {
  params: Promise<{ projectId: string; taskId: string }>;
}) {
  const { projectId, taskId } = await params;
  return <TrackingPage projectId={projectId} taskId={taskId} screen="task" />;
}
