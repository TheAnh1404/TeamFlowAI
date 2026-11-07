import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import type { Database } from "@/server/db/client";
import { projectMembers, sessions, users } from "@/server/db/schema";
import { assert } from "@/server/http/errors";
import type { Session } from "./contracts";

export const SESSION_COOKIE = "teamflow_session";
export const DEMO_ACCOUNTS = { TV1: "demo-tv1", TV2: "demo-tv2", TV3: "demo-tv3" } as const;
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export async function findSession(db: Database, token?: string): Promise<Session | null> {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const [entry] = await db.select({ user: users }).from(sessions).innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, digest(token)), gt(sessions.expiresAt, new Date().toISOString())));
  if (!entry) return null;
  return { user: entry.user, memberships: await db.select().from(projectMembers).where(eq(projectMembers.userId, entry.user.id)) };
}
export async function createDemoSession(db: Database, account: keyof typeof DEMO_ACCOUNTS, code: string, previousToken?: string) {
  const configuredCode = process.env.DEMO_ACCESS_CODE;
  assert(process.env.ENABLE_DEMO_AUTH === "true" && configuredCode && configuredCode.length >= 16, 403, "FORBIDDEN", "Đăng nhập demo chưa được bật hoặc cấu hình.");
  assert(timingSafeEqual(Buffer.from(digest(code)), Buffer.from(digest(configuredCode))), 403, "FORBIDDEN", "Mã truy cập demo không hợp lệ.");
  const [user] = await db.select().from(users).where(eq(users.id, DEMO_ACCOUNTS[account]));
  assert(user, 409, "DEMO_NOT_SEEDED", "Chưa có tài khoản demo. Cần chạy seed phía server.");
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 8 * 3600_000).toISOString();
  await db.transaction(async (tx) => {
    if (previousToken) await tx.delete(sessions).where(eq(sessions.tokenHash, digest(previousToken)));
    await tx.insert(sessions).values({ tokenHash: digest(token), userId: user.id, expiresAt });
  });
  return { token, expiresAt };
}
export async function revokeSession(db: Database, token?: string) {
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, digest(token)));
}
