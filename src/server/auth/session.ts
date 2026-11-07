import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import type { Database } from "@/server/db/client";
import { projectMembers, sessions, users } from "@/server/db/schema";
import { assert } from "@/server/http/errors";
import type { Session } from "./contracts";

export const SESSION_COOKIE = "teamflow_session";
export const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours fixed per plan
export const DEMO_ACCOUNTS = { TV1: "demo-tv1", TV2: "demo-tv2", TV3: "demo-tv3", MENTOR: "demo-mentor" } as const;

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export function isValidSessionToken(token?: string): boolean {
  return typeof token === "string" && /^[a-f0-9]{64}$/.test(token);
}

/**
 * Validates token and loads fresh session data from database with current project memberships.
 * Selects only public fields on User ({ id, displayName, createdAt }) to ensure zero leakage of email/credentials.
 */
export async function findSession(db: Database, token?: string): Promise<Session | null> {
  if (!isValidSessionToken(token)) return null;

  try {
    const tokenHash = hashSessionToken(token!);
    const [entry] = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        createdAt: users.createdAt,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date().toISOString())));

    if (!entry) return null;

    const memberships = await db
      .select()
      .from(projectMembers)
      .where(eq(projectMembers.userId, entry.id));

    return {
      user: {
        id: entry.id,
        displayName: entry.displayName,
        createdAt: entry.createdAt,
      },
      memberships,
    };
  } catch (err: unknown) {
    console.warn("[findSession] Failed to load session from database:", err instanceof Error ? err.message : String(err));
    return null;
  }
}

/**
 * Issues a new session for a user, optionally revoking a previous browser session in the same transaction.
 */
export async function createSession(
  db: Database,
  userId: string,
  previousToken?: string
): Promise<{ token: string; expiresAt: string }> {
  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();

  await db.transaction(async (tx) => {
    if (isValidSessionToken(previousToken)) {
      await tx.delete(sessions).where(eq(sessions.tokenHash, hashSessionToken(previousToken!)));
    }
    await tx.insert(sessions).values({
      tokenHash: hashSessionToken(token),
      userId,
      expiresAt,
    });
  });

  return { token, expiresAt };
}

/**
 * Revokes a session token. Idempotent.
 */
export async function revokeSession(db: Database, token?: string): Promise<void> {
  if (isValidSessionToken(token)) {
    await db.delete(sessions).where(eq(sessions.tokenHash, hashSessionToken(token!)));
  }
}

/**
 * Revokes all sessions belonging to a specific user (e.g. on password reset or account security event).
 */
export async function revokeAllUserSessions(db: Database, userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

/**
 * Adapter for demo session (strictly disallowed in production or when ENABLE_DEMO_AUTH is disabled).
 */
export async function createDemoSession(
  db: Database,
  account: keyof typeof DEMO_ACCOUNTS,
  previousToken?: string
) {
  assert(
    (process.env.NODE_ENV as string) !== "production" && process.env.ENABLE_DEMO_AUTH === "true",
    403,
    "FORBIDDEN",
    "Đăng nhập demo chưa được bật trên server hoặc bị từ chối ở môi trường production."
  );

  const [user] = await db.select().from(users).where(eq(users.id, DEMO_ACCOUNTS[account]));
  assert(user, 409, "DEMO_NOT_SEEDED", "Chưa có tài khoản demo. Cần chạy seed phía server.");

  return createSession(db, user.id, previousToken);
}
