import Link from "next/link";
import { requireSession } from "@/server/auth";
import { HttpError } from "@/server/http/errors";
import { routes } from "@/lib/routes";
import { DemoSessionBar } from "../components/session-bar";
import { IntegratedWorkbench } from "../components/integrated-workbench";
import { formatTime } from "../model";
import { loadWorkspace } from "./workspace";
import styles from "../components/tracking.module.css";
import { MentorManagement } from "@/features/supervision/components/mentor-management";

export async function TrackingPage({ projectId, screen, taskId }: { projectId: string; screen: "board" | "chat" | "task"; taskId?: string }) {
  let session, data;
  try { session = await requireSession(); data = await loadWorkspace(session, projectId); }
  catch (error) {
    return <div className={styles.workspace}><DemoSessionBar user={session?.user} /><h1>{error instanceof HttpError && error.status === 401 ? "Bắt đầu phiên làm việc" : "Không thể mở dự án"}</h1><p role="alert">{error instanceof HttpError ? error.message : "Chưa đọc được dữ liệu. Kiểm tra cấu hình Neon và migration phía server."}</p><Link href={routes.app}>Về danh sách dự án</Link></div>;
  }
  if (taskId && !data.tasks.some((t) => t.id === taskId)) return <div className={styles.workspace}><h1>Không tìm thấy công việc</h1><Link href={routes.tasks(projectId)}>Về danh sách công việc</Link></div>;
  return <div className={styles.workspace}>
    <DemoSessionBar user={session.user} /><div className={styles.header}><div><Link href={routes.app}>← Dự án của tôi</Link><h1>{data.project.name}</h1></div><p className={styles.muted}>Hạn dự án: {formatTime(data.project.deadline, data.project.timeZone)}</p></div>
    <nav className={styles.tabs} aria-label="Điều hướng dự án">{[
      ["Công việc", routes.tasks(projectId), screen !== "chat"], ["Kế hoạch", routes.plan(projectId), false],
      ["Chat", routes.chat(projectId), screen === "chat"], ["Báo cáo", routes.reports(projectId), false],
    ].map(([label, href, active]) => <Link key={String(label)} href={String(href)} aria-current={active ? "page" : undefined}>{label}</Link>)}</nav>
    {data.actor.role === "leader" && <MentorManagement projectId={projectId} memberUserIds={data.members.map(m=>m.user.id)}/>}
    <IntegratedWorkbench data={data} screen={screen} taskId={taskId} />
  </div>;
}
