import "server-only";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import type { CreateDemoSessionInput } from "@/contracts/auth";
import { getDb } from "@/server/db/client";
import { sessions, users } from "@/server/db/schema";
import { ApiError } from "@/server/http/api-error";
import { newSessionToken, hashSessionToken } from "./credentials";
import { SESSION_COOKIE, requireSession } from "./index";

export async function createDemoSession(input: CreateDemoSessionInput) {
  if (process.env.ENABLE_DEMO_AUTH !== "true") throw new ApiError(403, "FORBIDDEN", "Đăng nhập demo chưa được bật trên server.");
  const db = getDb();
  const demoUserId = input.demoAccount === "TV1" ? "demo-tv1" : input.demoAccount === "TV2" ? "demo-tv2" : "demo-tv3";
  const [user] = await db.select().from(users).where(eq(users.id, demoUserId));
  if (!user) throw new ApiError(503, "DEMO_NOT_READY", "Chưa có tài khoản demo. TV2 cần chạy seed.");
  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const cookieStore = await cookies();
  const previous = cookieStore.get(SESSION_COOKIE)?.value;
  await db.transaction(async tx => {
    if (previous && /^[a-f0-9]{64}$/.test(previous)) await tx.delete(sessions).where(eq(sessions.tokenHash, hashSessionToken(previous)));
    await tx.insert(sessions).values({ tokenHash: hashSessionToken(token), userId: user.id, expiresAt: expiresAt.toISOString() });
  });
  cookieStore.set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt });
  return requireSession();
}

export async function endDemoSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token && /^[a-f0-9]{64}$/.test(token)) await getDb().delete(sessions).where(eq(sessions.tokenHash, hashSessionToken(token)));
  cookieStore.delete(SESSION_COOKIE);
  return { signedOut: true };
}
