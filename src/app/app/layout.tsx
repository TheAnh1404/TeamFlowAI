import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { sessionProvider } from "@/server/auth";
import { AppShell } from "@/components/layout/app-shell";

export default async function Layout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await sessionProvider.getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  return <AppShell user={session.user}>{children}</AppShell>;
}
