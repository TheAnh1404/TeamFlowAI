import { PlaceholderPage } from "@/components/scaffolding/placeholder-page";
import { placeholderIds, routes } from "@/lib/routes";

// TODO(TV1): implement this feature; placeholder reads URL params only.
export default async function Page({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <PlaceholderPage title="Kế hoạch" links={[
    { href: routes.app, label: "Danh sách dự án" },
    { href: routes.plan(projectId), label: "Kế hoạch" },
    { href: routes.tasks(projectId), label: "Công việc" },
    { href: routes.task(projectId, placeholderIds.task), label: "Chi tiết công việc" },
    { href: routes.chat(projectId), label: "Chat" },
    { href: routes.reports(projectId), label: "Báo cáo" },
  ]} />;
}
