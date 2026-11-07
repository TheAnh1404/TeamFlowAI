import Link from "next/link";
import { sessionProvider } from "@/server/auth";
import { listSessionProjects } from "@/server/db/readers";
import { routes } from "@/lib/routes";
import { DemoSessionBar } from "../components/session-bar";
import { formatTime } from "../model";
import styles from "../components/tracking.module.css";
import { MentorProjects } from "@/features/supervision/components/mentor-projects";

export async function ProjectsEntry() {
  let session, projects;
  try { session = await sessionProvider.getCurrentSession(); projects = session ? await listSessionProjects(session) : []; }
  catch { return <div className={styles.workspace}><DemoSessionBar /><h1>Dự án của tôi</h1><p role="alert">Chưa đọc được dữ liệu. Kiểm tra cấu hình Neon và migration phía server.</p></div>; }
  return <div className={styles.workspace}><DemoSessionBar user={session?.user} /><div className={styles.header}><h1>Dự án của tôi</h1>{session && <Link href={routes.newProject}>Tạo dự án mới</Link>}</div>
    {!session ? <p>Chọn tài khoản demo để xem các dự án bạn tham gia.</p> : projects.length === 0 ? <div className={styles.empty}><h2>Chưa có dự án</h2><p>Tạo dự án mới hoặc nhờ trưởng nhóm thêm bạn vào dự án.</p></div> : projects.map(({ project, member, planStatus, taskTotal, doneTotal }) => <section className={styles.notice} key={project.id}><h2><Link href={routes.tasks(project.id)}>{project.name}</Link></h2>{planStatus === "draft" && member.role === "leader" && <span className={styles.badge}>Bản nháp</span>}<p>{project.goal}</p><p>Hoàn thành {doneTotal} / {taskTotal} công việc · Hạn: {formatTime(project.deadline, project.timeZone)}</p>{taskTotal === 0 && <p>{member.role === "leader" ? <Link href={routes.plan(project.id)}>Tiếp tục kế hoạch</Link> : "Kế hoạch đang được trưởng nhóm hoàn thiện."}</p>}</section>)}
    {session && <MentorProjects session={session}/>}
  </div>;
}
