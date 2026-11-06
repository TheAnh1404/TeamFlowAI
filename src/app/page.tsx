import { PlaceholderPage } from "@/components/scaffolding/placeholder-page";
import { routes } from "@/lib/routes";

// P01 — TODO(TV1): implement the landing page in a feature session.
export default function HomePage() {
  return <PlaceholderPage title="TeamFlow AI" links={[{ href: routes.app, label: "Danh sách dự án" }]} />;
}
