import "server-only";
import { and, eq } from "drizzle-orm";
import type { DataConnection } from "@/server/db/client";
import { plans, projectMembers, tasks } from "@/server/db/schema";
import { assert, notFound } from "@/server/http/errors";
import type { Session, AuthorizationProvider } from "./contracts";

export async function projectMember(db: DataConnection, session: Session, projectId: string) {
  const [member] = await db.select().from(projectMembers).where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, session.user.id)));
  if (!member) throw notFound();
  return member;
}
export async function taskWithMember(db: DataConnection, session: Session, taskId: string) {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
  if (!task) throw notFound();
  const member = await projectMember(db, session, task.projectId);
  return { task, member };
}
export function assertUpdater(member: { id: string; role: string }, task: { assigneeMemberId: string }) {
  assert(member.role === "leader" || member.id === task.assigneeMemberId, 403, "FORBIDDEN", "Chỉ người phụ trách hoặc trưởng nhóm được cập nhật công việc.");
}
export function createAuthorizationProvider(db: DataConnection): AuthorizationProvider {
  return {
    assertProjectMember: (session, id) => projectMember(db, session, id),
    async assertTaskUpdateAllowed(session, id) { const { task, member } = await taskWithMember(db, session, id); assertUpdater(member, task); },
    async assertPlanPublishAllowed(session, id) {
      const [plan] = await db.select().from(plans).where(eq(plans.id, id)); if (!plan) throw notFound();
      const member = await projectMember(db, session, plan.projectId);
      assert(member.role === "leader", 403, "FORBIDDEN", "Chỉ trưởng nhóm được công bố kế hoạch.");
    },
    async assertAcceptanceAllowed(session, id) {
      const { member } = await taskWithMember(db, session, id);
      assert(member.role === "leader" || member.canAccept, 403, "FORBIDDEN", "Bạn không có quyền nghiệm thu.");
    },
    async assertReportGenerationAllowed(session, id) {
      const member = await projectMember(db, session, id);
      assert(member.role === "leader", 403, "FORBIDDEN", "Chỉ trưởng nhóm được tạo báo cáo.");
    },
  };
}
