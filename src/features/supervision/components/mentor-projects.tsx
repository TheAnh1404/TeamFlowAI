import Link from "next/link";
import type { Session } from "@/server/auth/contracts";
import { supervisionService } from "../server/service";
export async function MentorProjects({session}:{session:Session}) {
  const rows=await supervisionService().listMentorProjects(session);
  if(!rows.length)return null;
  return <section className="tf-card"><h2>Dự án bạn hướng dẫn</h2><p>Bạn có quyền xem timeline và tiến độ của các dự án được trưởng nhóm cấp quyền.</p>{rows.map(({project})=><p key={project.id}><Link href={`/app/projects/${encodeURIComponent(project.id)}/supervision`}>{project.name} →</Link></p>)}</section>;
}
