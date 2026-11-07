import { TrackingPage } from "@/features/tracking/server/page";

// TODO(TV2): implement this feature; placeholder reads URL params only.
export default async function Page({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <TrackingPage projectId={projectId} screen="chat" />;
}
