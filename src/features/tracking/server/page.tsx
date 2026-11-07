import Link from "next/link";
import { requireSession } from "@/server/auth";
import { HttpError } from "@/server/http/errors";
import { routes } from "@/lib/routes";
import { TrackingWorkbench } from "../components/workbench";
import { formatTime } from "../model";
import { loadWorkspace } from "./workspace";
import styles from "../components/tracking.module.css";

export async function TrackingPage({ projectId, screen, taskId }: { projectId: string; screen: "board" | "chat" | "task"; taskId?: string }) {
  let session;
  let data;
  try {
    session = await requireSession();
    data = await loadWorkspace(session, projectId);
  } catch (error) {
    return (
      <div className={styles.workspace}>
        <h1>{error instanceof HttpError && error.status === 401 ? "Bắt đầu phiên làm việc" : "Không thể mở dự án"}</h1>
        <p role="alert">{error instanceof HttpError ? error.message : "Chưa đọc được dữ liệu. Kiểm tra cấu hình Neon và migration phía server."}</p>
        <Link href={routes.app} className="tf-button">Về danh sách dự án</Link>
      </div>
    );
  }

  if (taskId && !data.tasks.some((task) => task.id === taskId)) {
    return (
      <div className={styles.workspace}>
        <h1>Không tìm thấy công việc</h1>
        <p>Công việc không tồn tại hoặc bạn không có quyền truy cập.</p>
        <Link href={routes.tasks(projectId)}>Về danh sách công việc</Link>
      </div>
    );
  }

  return (
    <div className={styles.workspace}>
      <div className={styles.header}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
            <Link href={routes.app} style={{ fontSize: "0.875rem", color: "var(--color-primary)", textDecoration: "none" }}>
              ← Tất cả dự án
            </Link>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 4,
                background: data.actor.role === "leader" ? "var(--color-primary-soft, #f0fdfa)" : "var(--color-surface-subtle, #f1f5f9)",
                color: data.actor.role === "leader" ? "var(--color-primary, #0f766e)" : "var(--color-text-secondary, #475569)",
                border: "1px solid",
                borderColor: data.actor.role === "leader" ? "var(--color-primary, #0f766e)" : "var(--color-border-subtle, #e2e8f0)",
              }}
            >
              {data.actor.role === "leader" ? "👑 VAI TRÒ: TRƯỞNG NHÓM" : "👤 VAI TRÒ: THÀNH VIÊN"}
            </span>
          </div>
          <h1 style={{ margin: "4px 0" }}>{data.project.name}</h1>
        </div>
        <p className={styles.muted}>Hạn dự án: {formatTime(data.project.deadline, data.project.timeZone)}</p>
      </div>
      <nav className={styles.tabs} aria-label="Điều hướng dự án">
        {[
          ["Công việc", routes.tasks(projectId), screen !== "chat"],
          ["Kế hoạch", routes.plan(projectId), false],
          ["Chat", routes.chat(projectId), screen === "chat"],
          ["Báo cáo", routes.reports(projectId), false],
          ["Giám sát", `/app/projects/${projectId}/supervision`, false],
        ].map(([label, href, active]) => (
          <Link key={String(label)} href={String(href)} aria-current={active ? "page" : undefined}>{label}</Link>
        ))}
      </nav>
      <TrackingWorkbench data={data} screen={screen} taskId={taskId} />
    </div>
  );
}
