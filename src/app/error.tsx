"use client";

import Link from "next/link";
import { routes } from "@/lib/routes";

export default function ErrorPage() {
  return <main><h1>Không thể mở trang</h1><p role="alert">Vui lòng tải lại trang.</p><Link href={routes.home}>Về trang chủ</Link></main>;
}
