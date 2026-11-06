import Link from "next/link";

export interface PlaceholderLink {
  readonly href: string;
  readonly label: string;
}

interface PlaceholderPageProps {
  readonly title: string;
  readonly links: readonly PlaceholderLink[];
}

export function PlaceholderPage({ title, links }: PlaceholderPageProps) {
  return (
    <main>
      <h1>{title}</h1>
      <p>Trang đang ở giai đoạn khung, chưa triển khai chức năng.</p>
      <nav aria-label="Điều hướng">
        <ul>{links.map(({ href, label }) => <li key={href}><Link href={href}>{label}</Link></li>)}</ul>
      </nav>
    </main>
  );
}
