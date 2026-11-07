import { TrackingPage } from "@/features/tracking/server/page";

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string }>;
  searchParams?: Promise<{ q?: string | string[]; status?: string | string[]; assignee?: string | string[] }>;
}) {
  const { projectId } = await params;
  return <TrackingPage projectId={projectId} screen="board" />;
}
