import Link from "next/link";
import { requireSession } from "@/server/auth";
import { HttpError } from "@/server/http/errors";
import { routes } from "@/lib/routes";
import { DeliverySlot } from "@/features/delivery";
import { DemoSessionBar } from "../components/session-bar";
import { TrackingWorkbench } from "../components/workbench";
import { formatTime } from "../model";
import { loadWorkspace } from "./workspace";
import { DEMO_PROJECT_ID, getDemoWorkspaceData } from "../demo-fixture";
import styles from "../components/tracking.module.css";

export async function TrackingPage({
  projectId,
  screen,
  taskId,
}: {
  projectId: string;
  screen: "board" | "chat" | "task";
  taskId?: string;
}) {
  const isDemo = projectId === DEMO_PROJECT_ID;
  let session, data;

  if (isDemo) {
    data = getDemoWorkspaceData();
    session = {
      user: {
        id: "user-tv1",
        displayName: "Hoàng Anh (Trưởng nhóm)",
        createdAt: "2026-11-01T08:00:00.000Z",
      },
      memberships: [],
    };
  } else {
    try {
      session = await requireSession();
      data = await loadWorkspace(session, projectId);
    } catch (error) {
      return (
        <div className={styles.workspace}>
          <DemoSessionBar user={session?.user} />
          <h1>{error instanceof HttpError && error.status === 401 ? "Bắt đầu phiên làm việc" : "Không thể mở dự án"}</h1>
          <p role="alert">
            {error instanceof HttpError ? error.message : "Chưa đọc được dữ liệu. Kiểm tra cấu hình Neon và migration phía server."}
          </p>
          <div style={{ marginTop: "1rem" }}>
            <Link href={routes.app} className="tf-button">
              Về danh sách dự án
            </Link>
          </div>
        </div>
      );
    }
  }

  if (taskId && !data.tasks.some((t) => t.id === taskId)) {
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
      {isDemo ? (
        <div
          style={{
            background: "var(--color-primary-soft)",
            border: "1px solid #CCFBF1",
            borderRadius: "8px",
            padding: "8px 16px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "0.8125rem",
            color: "var(--color-primary)",
          }}
        >
          <span>
            ✨ <strong>Chế độ Xem Dữ Liệu Minh Họa</strong> · Dự án mẫu phục vụ trải nghiệm & đánh giá giao diện.
          </span>
          <Link
            href={routes.app}
            style={{
              color: "inherit",
              fontWeight: 600,
              textDecoration: "underline",
            }}
          >
            Quay lại dự án thật ✕
          </Link>
        </div>
      ) : (
        <DemoSessionBar user={session.user} />
      )}

      <div className={styles.header}>
        <div>
          <Link href={routes.app}>← Dự án của tôi</Link>
          <h1 style={{ margin: "6px 0" }}>{data.project.name}</h1>
        </div>
        <p className={styles.muted}>
          Hạn dự án: {formatTime(data.project.deadline, data.project.timeZone)}
        </p>
      </div>

      <nav className={styles.tabs} aria-label="Điều hướng dự án">
        {[
          ["Công việc", routes.tasks(projectId), screen !== "chat"],
          ["Kế hoạch", routes.plan(projectId), false],
          ["Chat", routes.chat(projectId), screen === "chat"],
          ["Báo cáo", routes.reports(projectId), false],
        ].map(([label, href, active]) => (
          <Link
            key={String(label)}
            href={String(href)}
            aria-current={active ? "page" : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>

      <TrackingWorkbench
        data={data}
        screen={screen}
        taskId={taskId}
        renderDelivery={(props) => <DeliverySlot {...props} />}
      />
    </div>
  );
}
