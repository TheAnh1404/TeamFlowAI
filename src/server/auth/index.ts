import "server-only";
import { cookies } from "next/headers";
import { getDb } from "@/server/db/client";
import { HttpError } from "@/server/http/errors";
import { createAuthorizationProvider } from "./access";
import { findSession, SESSION_COOKIE } from "./session";
import type { AuthorizationProvider, SessionProvider } from "./contracts";

export const sessionProvider: SessionProvider = {
  async getCurrentSession() {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    return token ? findSession(getDb(), token) : null;
  },
};

export const authorizationProvider: AuthorizationProvider = {
  assertProjectMember: (...args) => createAuthorizationProvider(getDb()).assertProjectMember(...args),
  assertTaskUpdateAllowed: (...args) => createAuthorizationProvider(getDb()).assertTaskUpdateAllowed(...args),
  assertPlanPublishAllowed: (...args) => createAuthorizationProvider(getDb()).assertPlanPublishAllowed(...args),
  assertAcceptanceAllowed: (...args) => createAuthorizationProvider(getDb()).assertAcceptanceAllowed(...args),
  assertReportGenerationAllowed: (...args) => createAuthorizationProvider(getDb()).assertReportGenerationAllowed(...args),
};
export async function requireSession() {
  const session = await sessionProvider.getCurrentSession();
  if (!session) throw new HttpError(401, "UNAUTHENTICATED", "Bạn cần đăng nhập phiên demo để tiếp tục.");
  return session;
}
