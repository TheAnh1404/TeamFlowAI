"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import type { User } from "@/contracts";

export function AppShell({
  children,
  user,
}: {
  children: ReactNode;
  user?: User;
}) {
  const path = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
      router.replace("/login");
      router.refresh();
    } catch {
      router.replace("/login");
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <>
      <a className="tf-skip" href="#workspace">
        Đến nội dung
      </a>
      <header className="tf-topbar">
        <Link href="/" className="tf-brand">
          ▦ TeamFlow <b>AI</b>
        </Link>
        <span className="tf-community">DevDay · Da Nang</span>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/app">Dự án của tôi</Link>
          {user && (
            <span
              style={{
                fontSize: "0.875rem",
                color: "var(--color-text-secondary)",
                fontWeight: 500,
              }}
            >
              👤 {user.displayName}
            </span>
          )}
          {user && (
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="tf-button secondary"
              style={{
                padding: "0.25rem 0.75rem",
                fontSize: "0.8125rem",
                cursor: "pointer",
              }}
            >
              {isLoggingOut ? "Đang thoát..." : "Đăng xuất"}
            </button>
          )}
        </div>
      </header>
      <div className="tf-shell">
        <aside className="tf-sidebar">
          <p className="tf-eyebrow">KHÔNG GIAN LÀM VIỆC</p>
          <nav aria-label="Điều hướng chính">
            <Link href="/app" aria-current={path === "/app" ? "page" : undefined}>
              ▦ &nbsp; Dự án của tôi
            </Link>
            <Link href="/app/projects/new" aria-current={path.endsWith("/new") ? "page" : undefined}>
              ＋ &nbsp; Tạo dự án
            </Link>
            <Link href="/app/projects/demo-event-website/tasks" aria-current={path.includes("demo-event-website") ? "page" : undefined}>
              ✨ &nbsp; Dự án minh họa
            </Link>
          </nav>
          <div className="tf-side-note">
            <b>AI hỗ trợ. Bạn quyết định.</b>
            <p>Kế hoạch cần được trưởng nhóm duyệt trước khi giao việc.</p>
          </div>
        </aside>
        <div id="workspace" className="tf-content">
          {children}
        </div>
      </div>
    </>
  );
}
