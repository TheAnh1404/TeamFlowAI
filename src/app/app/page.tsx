import { PlaceholderPage } from "@/components/scaffolding/placeholder-page";
import { placeholderIds, routes } from "@/lib/routes";

// P02 — TODO(TV1): project list. Session infrastructure remains TV2-owned.
export default function ProjectsPage() {
  return <PlaceholderPage title="Danh sách dự án" links={[
    { href: routes.home, label: "Trang chủ" },
    { href: routes.newProject, label: "Tạo dự án" },
    { href: routes.plan(placeholderIds.project), label: "Kế hoạch" },
    { href: routes.tasks(placeholderIds.project), label: "Công việc" },
  ]} />;
}
