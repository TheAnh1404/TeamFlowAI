import Link from "next/link";
import { sessionProvider } from "@/server/auth";
import { listSessionProjects } from "@/server/db/readers";
import { routes } from "@/lib/routes";
import { DemoSessionBar } from "../components/session-bar";
import { formatTime } from "../model";
import { DEMO_PROJECT_ID } from "../demo-fixture";
import styles from "../components/tracking.module.css";

export async function ProjectsEntry() {
  let session, projects;
  try {
    session = await sessionProvider.getCurrentSession();
    projects = session ? await listSessionProjects(session) : [];
  } catch {
    return (
      <div className={styles.workspace}>
        {process.env.ENABLE_DEMO_AUTH === "true" && <DemoSessionBar />}
        <div className={styles.header}>
          <h1>Dự án của tôi</h1>
        </div>
        <p role="alert">Chưa đọc được dữ liệu. Kiểm tra cấu hình Neon và migration phía server.</p>
        <div style={{ marginTop: "1.5rem" }}>
          <Link href={routes.tasks(DEMO_PROJECT_ID)} className="tf-button">
            Xem dự án mẫu minh họa →
          </Link>
        </div>
      </div>
    );
  }

  const showDemo = process.env.ENABLE_DEMO_AUTH === "true";

  return (
    <div className={styles.workspace}>
      {showDemo && <DemoSessionBar user={session?.user} />}

      {/* Header */}
      <div className={styles.header}>
        <div>
          <p className="tf-eyebrow" style={{ margin: "0 0 4px" }}>KHÔNG GIAN LÀM VIỆC</p>
          <h1 style={{ margin: 0 }}>Dự án của tôi</h1>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <Link
            href={routes.tasks(DEMO_PROJECT_ID)}
            className="tf-button secondary"
            style={{ fontSize: "0.875rem", padding: "0.5rem 1rem" }}
          >
            ✨ Xem dự án minh họa
          </Link>
          {session && (
            <Link
              href={routes.newProject}
              className="tf-button"
              style={{ fontSize: "0.875rem", padding: "0.5rem 1.25rem" }}
            >
              ＋ Tạo dự án mới
            </Link>
          )}
        </div>
      </div>

      {/* DEMO PREVIEW CARD BANNER */}
      <section
        style={{
          margin: "20px 0 28px",
          background: "linear-gradient(135deg, var(--color-primary-soft) 0%, #FFFFFF 100%)",
          border: "1px solid #CCFBF1",
          borderRadius: "12px",
          padding: "20px 24px",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <span style={{ fontSize: "1.25rem" }}>💡</span>
            <strong style={{ color: "var(--color-primary)", fontSize: "1rem" }}>
              Dự án minh họa: Website đăng ký sự kiện DevDay
            </strong>
            <span className="tf-badge">Mẫu hoàn chỉnh</span>
          </div>
          <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--color-text-secondary)", maxWidth: "620px" }}>
            Trải nghiệm toàn bộ 8 màn hình từ Kế hoạch, Bảng công việc, Nộp bài & AI Review, Kênh Chat Messenger đến Báo cáo tuần mà không cần khởi tạo cơ sở dữ liệu.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <Link
            href={routes.tasks(DEMO_PROJECT_ID)}
            className="tf-button"
            style={{ fontSize: "0.875rem", padding: "0.5rem 1rem" }}
          >
            Mở bảng công việc →
          </Link>
          <Link
            href={routes.chat(DEMO_PROJECT_ID)}
            className="tf-button secondary"
            style={{ fontSize: "0.875rem", padding: "0.5rem 1rem" }}
          >
            Mở Chat
          </Link>
        </div>
      </section>

      {/* Real Projects Section */}
      <div>
        <h2 style={{ fontSize: "1.25rem", margin: "24px 0 16px", color: "var(--color-text-primary)" }}>
          Dự án trong cơ sở dữ liệu ({projects.length})
        </h2>

        {!session ? (
          <div className={styles.empty}>
            <p>Vui lòng đăng nhập để xem các dự án thực tế của bạn.</p>
            <div style={{ marginTop: "1rem", display: "flex", gap: "10px", justifyContent: "center" }}>
              <Link href="/login" className="tf-button">
                Đăng nhập
              </Link>
              <Link href="/register" className="tf-button secondary">
                Tạo tài khoản mới
              </Link>
            </div>
          </div>
        ) : projects.length === 0 ? (
          <div className={styles.empty}>
            <span style={{ fontSize: "2.5rem", display: "block", marginBottom: "8px" }}>📁</span>
            <h3 style={{ margin: "0 0 8px", fontSize: "1.125rem" }}>Bạn chưa tham gia dự án nào</h3>
            <p style={{ color: "var(--color-text-secondary)", maxWidth: "480px", margin: "0 auto 16px", fontSize: "0.875rem" }}>
              Tạo dự án mới với tư cách trưởng nhóm để bắt đầu lập kế hoạch cùng Planner AI, hoặc chờ đồng đội mời vào dự án.
            </p>
            <Link href={routes.newProject} className="tf-button">
              ＋ Tạo dự án đầu tiên của bạn
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "16px" }}>
            {projects.map(({ project, member, planStatus, taskTotal, doneTotal }) => {
              const isDraft = planStatus === "draft";
              const targetUrl = isDraft && member.role === "leader"
                ? routes.plan(project.id)
                : routes.tasks(project.id);

              return (
                <article
                  key={project.id}
                  style={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border-subtle)",
                    borderRadius: "12px",
                    padding: "20px 24px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    transition: "border-color 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <h3 style={{ margin: 0, fontSize: "1.125rem" }}>
                          <Link href={targetUrl} style={{ color: "var(--color-text-primary)", textDecoration: "none" }}>
                            {project.name}
                          </Link>
                        </h3>
                        <span
                          style={{
                            fontSize: "0.6875rem",
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: "4px",
                            background: isDraft ? "#FEF3C7" : "var(--color-status-done-bg)",
                            color: isDraft ? "#92400E" : "var(--color-status-done-fg)",
                          }}
                        >
                          {isDraft ? "Bản nháp kế hoạch" : "Đã công bố"}
                        </span>
                        <span
                          style={{
                            fontSize: "0.6875rem",
                            fontWeight: 500,
                            padding: "2px 8px",
                            borderRadius: "4px",
                            background: "var(--color-surface-subtle)",
                            color: "var(--color-text-secondary)",
                          }}
                        >
                          {member.role === "leader" ? "Trưởng nhóm" : "Thành viên"}
                        </span>
                      </div>
                      <p style={{ margin: "6px 0 0", color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
                        {project.goal}
                      </p>
                    </div>

                    <Link
                      href={targetUrl}
                      className="tf-button"
                      style={{ fontSize: "0.8125rem", padding: "6px 14px" }}
                    >
                      {isDraft && member.role === "leader" ? "Tiếp tục duyệt kế hoạch →" : "Mở công việc →"}
                    </Link>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderTop: "1px solid var(--color-border-subtle)",
                      paddingTop: "12px",
                      fontSize: "0.8125rem",
                      color: "var(--color-text-muted)",
                      flexWrap: "wrap",
                      gap: "8px",
                    }}
                  >
                    <div>
                      Tiến độ: <strong style={{ color: "var(--color-text-primary)" }}>{doneTotal} / {taskTotal}</strong> hoàn thành
                    </div>
                    <div>
                      Hạn dự án: <strong>{formatTime(project.deadline, project.timeZone)}</strong>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
