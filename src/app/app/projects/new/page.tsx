import { PlaceholderPage } from "@/components/scaffolding/placeholder-page";
import { placeholderIds, routes } from "@/lib/routes";

// P03 — TODO(TV1): project creation. No form or mutation in scaffold.
export default function NewProjectPage() {
  return <PlaceholderPage title="Tạo dự án" links={[
    { href: routes.app, label: "Danh sách dự án" },
    { href: routes.plan(placeholderIds.project), label: "Kế hoạch" },
  ]} />;
}
