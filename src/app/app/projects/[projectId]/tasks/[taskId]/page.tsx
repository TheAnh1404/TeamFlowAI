import { PlaceholderPage } from "@/components/scaffolding/placeholder-page";
import { routes } from "@/lib/routes";

// P06 — TODO(TV2): full-page task shell.
// TODO(TV3): later expose submission/review UI through delivery/index.ts;
// TV2 composes it here. No cross-feature internal imports or drawer in scaffold.
export default async function TaskDetailPage({ params }: {
  params: Promise<{ projectId: string; taskId: string }>;
}) {
  const { projectId } = await params;
  return <PlaceholderPage title="Chi tiết công việc" links={[
    { href: routes.tasks(projectId), label: "Công việc" },
    { href: routes.chat(projectId), label: "Chat" },
    { href: routes.reports(projectId), label: "Báo cáo" },
    { href: routes.app, label: "Danh sách dự án" },
  ]} />;
}
