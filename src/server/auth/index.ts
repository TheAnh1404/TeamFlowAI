import "server-only";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { getDb, type DatabaseReader } from "@/server/db/client";
import { projectMembers } from "@/server/db/schema";
import { HttpError } from "@/server/http/errors";
import { createAuthorizationProvider } from "./access";
import { findSession, SESSION_COOKIE } from "./session";
import type { AuthorizationProvider, Session, SessionProvider } from "./contracts";

export { SESSION_COOKIE } from "./session";
export * from "./contracts";

export async function requireMembership(db: DatabaseReader, session: Session, projectId: string) {
  const [member] = await db
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, session.user.id)));
  if (!member) throw new HttpError(404, "NOT_FOUND", "Dự án không tồn tại hoặc bạn không có quyền truy cập.");
  return member;
}

export const sessionProvider: SessionProvider = {
  async getCurrentSession() {
    const jar = await cookies();
    const token = jar.get(SESSION_COOKIE)?.value;
    return token ? findSession(getDb(), token) : null;
  },
};

export async function requireSession(): Promise<Session> {
  const session = await sessionProvider.getCurrentSession();
  if (!session) throw new HttpError(401, "UNAUTHENTICATED", "Bạn cần đăng nhập để tiếp tục.");
  return session;
}

export const authorizationProvider: AuthorizationProvider = {
  assertProjectMember: (...args) => createAuthorizationProvider(getDb()).assertProjectMember(...args),
  assertTaskUpdateAllowed: (...args) => createAuthorizationProvider(getDb()).assertTaskUpdateAllowed(...args),
  assertPlanPublishAllowed: (...args) => createAuthorizationProvider(getDb()).assertPlanPublishAllowed(...args),
  assertAcceptanceAllowed: (...args) => createAuthorizationProvider(getDb()).assertAcceptanceAllowed(...args),
  assertReportGenerationAllowed: (...args) => createAuthorizationProvider(getDb()).assertReportGenerationAllowed(...args),
};
