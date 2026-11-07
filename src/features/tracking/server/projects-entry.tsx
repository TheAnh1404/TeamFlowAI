import Link from "next/link";
import { sessionProvider } from "@/server/auth";
import { listSessionProjects } from "@/server/db/readers";
import { routes } from "@/lib/routes";
import { ProjectListView } from "../components/project-list-view";
import styles from "../components/tracking.module.css";

export async function ProjectsEntry() {
  let session;
  let projects;
  try {
    session = await sessionProvider.getCurrentSession();
    projects = session ? await listSessionProjects(session) : [];
  } catch (cause) {
    console.error("[ProjectsEntry] Error loading session or projects:", cause);
    return (
      <div className={styles.workspace}>
        <h1>Không thể tải dự án</h1>
        <p role="alert">Chưa đọc được dữ liệu. Kiểm tra kết nối cơ sở dữ liệu.</p>
      </div>
    );
  }

  return (
    <div className={styles.workspace}>
      <div className={styles.header} style={{ marginBottom: 20 }}>
        <div>
          <p className="tf-eyebrow">KHÔNG GIAN LÀM VIỆC ĐA NHÓM</p>
          <h1 style={{ margin: "4px 0" }}>Dự án của tôi</h1>
          <p style={{ color: "var(--color-text-secondary)", margin: 0, fontSize: "0.9375rem" }}>
            Quản lý các nhóm bạn dẫn dắt và tham gia thực hiện các dự án của nhóm khác.
          </p>
        </div>
        {session && (
          <Link href={routes.newProject} className="tf-button" style={{ whiteSpace: "nowrap" }}>
            ＋ Tạo dự án mới
          </Link>
        )}
      </div>

      {!session ? (
        <div className={styles.empty}>
          <p>Đăng nhập để xem và quản lý các dự án bạn tham gia.</p>
          <Link href="/login" className="tf-button">
            Đăng nhập
          </Link>
          <Link href="/register" className="tf-button secondary">
            Tạo tài khoản
          </Link>
        </div>
      ) : projects.length === 0 ? (
        <div className={styles.empty}>
          <h2>Bạn chưa tham gia dự án nào</h2>
          <p>
            Bạn có thể khởi tạo một dự án mới để làm <strong>Trưởng nhóm</strong>, hoặc cung cấp email/tên tài khoản để Trưởng nhóm khác thêm bạn vào làm <strong>Thành viên</strong>.
          </p>
          <Link href={routes.newProject} className="tf-button">
            ＋ Tạo dự án đầu tiên
          </Link>
        </div>
      ) : (
        <ProjectListView projects={projects} userName={session.user.displayName} />
      )}
    </div>
  );
}
