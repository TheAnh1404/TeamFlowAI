import { WeeklyReportView } from "@/features/delivery/components/WeeklyReportView";

export default async function WeeklyReportsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <WeeklyReportView projectId={projectId} />;
}
