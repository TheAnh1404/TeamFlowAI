import { TaskList } from "@/features/tracking";

export default async function Page({ params, searchParams }: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ q?: string | string[]; status?: string | string[]; assignee?: string | string[] }>;
}) {
  const { projectId } = await params;
  const filters = await searchParams;
  const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? "" : value ?? "";
  return <TaskList key={projectId} projectId={projectId} initialSearch={first(filters.q)} initialStatus={first(filters.status)} initialAssignee={first(filters.assignee)} />;
}
