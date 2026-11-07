import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
export default function Layout({ children }: {
    children: ReactNode;
}) { return <AppShell localDemo={process.env.TEAMFLOW_DATABASE_MODE==="local-demo"}>{children}</AppShell>; }
