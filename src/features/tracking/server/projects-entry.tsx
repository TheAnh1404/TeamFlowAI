import Link from "next/link";
import { sessionProvider } from "@/server/auth";
import { listSessionProjects } from "@/server/db/readers";
import { routes } from "@/lib/routes";
import { formatTime } from "../model";
import styles from "../components/tracking.module.css";

export async function ProjectsEntry() {
  let session;
  let projects;
  try {
    session = await sessionProvider.getCurrentSession();
    projects = session ? await listSessionProjects(session) : [];
  } catch {
    return <div className={styles.workspace}><h1>Không thể tải dự án</h1><p role="alert">Chưa đọc được dữ liệu. Kiểm tra kết nối cơ sở dữ liệu.</p></div>;
  }

  return (
    <div className={styles.workspace}>
      <div className={styles.header}>
        <div><p className="tf-eyebrow">KHÔNG GIAN LÀM VIỆC</p><h1>Dự án của tôi</h1></div>
        {session && <Link href={routes.newProject} className="tf-button">Tạo dự án mới</Link>}
      </div>
      {!session ? (
        <div className={styles.empty}><p>Đăng nhập để xem các dự án bạn tham gia.</p><Link href="/login" className="tf-button">Đăng nhập</Link><Link href="/register" className="tf-button secondary">Tạo tài khoản</Link></div>
      ) : projects.length === 0 ? (
        <div className={styles.empty}><h2>Bạn chưa tham gia dự án nào</h2><p>Tạo dự án mới hoặc chờ trưởng nhóm thêm bạn vào dự án.</p><Link href={routes.newProject} className="tf-button">Tạo dự án đầu tiên</Link></div>
      ) : (
        <div style={{ display: "grid", gap: 16, marginTop: 24 }}>
          {projects.map(({ project, member, planStatus, taskTotal, doneTotal }) => {
            const isDraft = planStatus === "draft";
            const href = isDraft && member.role === "leader" ? routes.plan(project.id) : routes.tasks(project.id);
            return (
              <article key={project.id} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-subtle)", borderRadius: 12, padding: 20 }}>
                <div className={styles.header}><div><h2><Link href={href}>{project.name}</Link></h2><p>{project.goal}</p><p className={styles.muted}>{member.role === "leader" ? "Trưởng nhóm" : "Thành viên"} · {isDraft ? "Bản nháp kế hoạch" : "Đã công bố"}</p></div><Link href={href} className="tf-button">Mở dự án</Link></div>
                <p className={styles.muted}>Hạn: {formatTime(project.deadline, project.timeZone)} · {doneTotal} / {taskTotal} công việc hoàn thành</p>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
