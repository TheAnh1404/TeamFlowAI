import Link from "next/link";
import type { TaskStatus } from "@/contracts";
import { routes } from "@/lib/routes";
import styles from "./tracking.module.css";

export const statusLabels: Record<TaskStatus, string> = {
  todo: "Chưa làm", in_progress: "Đang làm", blocked: "Bị chặn",
  in_review: "Chờ nghiệm thu", changes_requested: "Cần sửa", done: "Hoàn thành",
};
export function StatusBadge({ status }: { status: TaskStatus | "overdue" }) {
  return <span className={styles.badge} data-status={status}><svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="4" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>{status === "overdue" ? "Quá hạn" : statusLabels[status]}</span>;
}
export function ProjectNav({ projectId }: { projectId: string }) {
  return <nav aria-label="Điều hướng dự án" className={styles.tabs}>
    <Link href={routes.app}>Dự án</Link><Link href={routes.tasks(projectId)}>Công việc</Link>
    <Link href={routes.plan(projectId)}>Kế hoạch</Link><Link href={routes.chat(projectId)}>Chat</Link>
    <Link href={routes.reports(projectId)}>Báo cáo</Link>
  </nav>;
}
export function LoadNotice({ loading, error, retry }: { loading: boolean; error: string | null; retry: () => void }) {
  return <>
    {loading && <p role="status">Đang tải dữ liệu…</p>}
    {error && <div role="alert" className={styles.notice + " " + styles.error}><p>{error}</p><div className={styles.actions}><button className={styles.button} onClick={retry}>Thử tải lại</button><Link href={routes.app}>Về danh sách dự án / phiên demo</Link></div></div>}
  </>;
}
export function displayTime(value: string, timeZone = "Asia/Ho_Chi_Minh"): string {
  try { return new Date(value).toLocaleString("vi-VN", { timeZone }); }
  catch { return value; }
}
