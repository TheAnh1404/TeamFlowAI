import { TrackingPage } from "@/features/tracking/server/page";

export default async function Page({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <TrackingPage projectId={projectId} screen="chat" />;
}
