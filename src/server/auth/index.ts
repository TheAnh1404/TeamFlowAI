import "server-only";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { getDb, type DatabaseReader } from "@/server/db/client";
import { plans, projectMembers, sessions, tasks, users } from "@/server/db/schema";
import { toUser } from "@/server/db/mappers";
import { ApiError } from "@/server/http/api-error";
import { hashSessionToken } from "./credentials";
import type { AuthorizationProvider, Session, SessionProvider } from "./contracts";

export const SESSION_COOKIE = "teamflow_session";

export async function requireMembership(db: DatabaseReader, session: Session, projectId: string) {
  const [member] = await db.select().from(projectMembers).where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, session.user.id))).for("share");
  if (!member) throw new ApiError(404, "NOT_FOUND", "Dự án không tồn tại hoặc bạn không có quyền truy cập.");
  return member;
}

export const sessionProvider: SessionProvider = {
  async getCurrentSession() {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
    const db = getDb();
    const [record] = await db.select({ user: users }).from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(and(eq(sessions.tokenHash, hashSessionToken(token)), gt(sessions.expiresAt, new Date())));
    if (!record) return null;
    const memberships = await db.select().from(projectMembers).where(eq(projectMembers.userId, record.user.id));
    return { user: toUser(record.user), memberships };
  },
};

export async function requireSession(): Promise<Session> {
  const session = await sessionProvider.getCurrentSession();
  if (!session) throw new ApiError(401, "UNAUTHENTICATED", "Bạn cần thiết lập phiên demo trước khi tiếp tục.");
  return session;
}

export const authorizationProvider: AuthorizationProvider = {
  async assertProjectMember(session, projectId) {
    return requireMembership(getDb(), session, projectId);
  },
  async assertTaskUpdateAllowed(session, taskId) {
    const [task] = await getDb().select().from(tasks).where(eq(tasks.id, taskId));
    if (!task) throw new ApiError(404, "NOT_FOUND", "Không tìm thấy công việc.");
    const member = await requireMembership(getDb(), session, task.projectId);
    if (member.role !== "leader" && member.id !== task.assigneeMemberId) throw new ApiError(403, "FORBIDDEN", "Chỉ người phụ trách hoặc trưởng nhóm được cập nhật.");
  },
  async assertPlanPublishAllowed(session, planId) {
    const [plan] = await getDb().select().from(plans).where(eq(plans.id, planId));
    if (!plan) throw new ApiError(404, "NOT_FOUND", "Không tìm thấy kế hoạch.");
    const member = await requireMembership(getDb(), session, plan.projectId);
    if (member.role !== "leader") throw new ApiError(403, "FORBIDDEN", "Chỉ trưởng nhóm được công bố kế hoạch.");
  },
  async assertAcceptanceAllowed(session, taskId) {
    const [task] = await getDb().select().from(tasks).where(eq(tasks.id, taskId));
    if (!task) throw new ApiError(404, "NOT_FOUND", "Không tìm thấy công việc.");
    const member = await requireMembership(getDb(), session, task.projectId);
    if (member.role !== "leader" && !member.canAccept) throw new ApiError(403, "FORBIDDEN", "Bạn không có quyền nghiệm thu.");
  },
  async assertReportGenerationAllowed(session, projectId) {
    const member = await requireMembership(getDb(), session, projectId);
    if (member.role !== "leader") throw new ApiError(403, "FORBIDDEN", "Chỉ trưởng nhóm được tạo báo cáo.");
  },
};
