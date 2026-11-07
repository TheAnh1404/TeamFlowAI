"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
export function AppShell({ children }: {
    children: ReactNode;
}) { const path = usePathname(); return <><a className="tf-skip" href="#workspace">Đến nội dung</a><header className="tf-topbar"><Link href="/" className="tf-brand">▦ TeamFlow <b>AI</b></Link><span className="tf-community">DevDay · Da Nang</span><Link href="/app">Dự án của tôi</Link></header><div className="tf-shell"><aside className="tf-sidebar"><p className="tf-eyebrow">KHÔNG GIAN LÀM VIỆC</p><nav aria-label="Điều hướng chính"><Link href="/app" aria-current={path === "/app" ? "page" : undefined}>▦ &nbsp; Dự án của tôi</Link><Link href="/app/projects/new" aria-current={path.endsWith("/new") ? "page" : undefined}>＋ &nbsp; Tạo dự án</Link></nav><div className="tf-side-note"><b>AI hỗ trợ. Bạn quyết định.</b><p>Kế hoạch cần được trưởng nhóm duyệt trước khi giao việc.</p></div></aside><div id="workspace" className="tf-content">{children}</div></div></>; }
