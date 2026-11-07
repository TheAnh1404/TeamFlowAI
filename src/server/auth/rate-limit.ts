import "server-only";
import { createHmac } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import type { Database } from "@/server/db/client";
import { authRateLimits } from "@/server/db/schema";

const DEFAULT_SECRET = "teamflow_rate_limit_secret_minimum_32_bytes_2026_default";

function getRateLimitSecret(): string {
  return process.env.AUTH_RATE_LIMIT_SECRET || DEFAULT_SECRET;
}

export function computeScopeHash(scope: string, identifier: string): string {
  const hmac = createHmac("sha256", getRateLimitSecret());
  hmac.update(`${scope}:${identifier.slice(0, 500)}`);
  return hmac.digest("hex");
}

export function extractClientIp(request: Request): string {
  // Support custom trusted header or x-forwarded-for (first IP)
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "127.0.0.1";
}

export interface RateLimitConfig {
  maxAttempts: number;
  windowSeconds: number;
}

export const RATE_LIMITS = {
  registerIp: { maxAttempts: 5, windowSeconds: 60 * 60 }, // 5 / 60 mins
  loginEmailIp: { maxAttempts: 10, windowSeconds: 15 * 60 }, // 10 / 15 mins
  loginIp: { maxAttempts: 100, windowSeconds: 15 * 60 }, // 100 / 15 mins
} as const;

export interface RateLimitCheckResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

/**
 * Checks and increments rate limit counter atomically in the database.
 */
export async function checkAndConsumeRateLimit(
  db: Database,
  scope: string,
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitCheckResult> {
  const scopeHash = computeScopeHash(scope, identifier);
  const now = new Date();
  const nowIso = now.toISOString();

  return await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(authRateLimits)
      .where(eq(authRateLimits.scopeHash, scopeHash));

    if (!existing || new Date(existing.expiresAt) <= now) {
      // New window or expired window -> upsert starting with 1 attempt
      const expiresAt = new Date(now.getTime() + config.windowSeconds * 1000).toISOString();
      await tx
        .insert(authRateLimits)
        .values({
          scopeHash,
          windowStartedAt: nowIso,
          attemptCount: 1,
          expiresAt,
        })
        .onConflictDoUpdate({
          target: authRateLimits.scopeHash,
          set: {
            windowStartedAt: nowIso,
            attemptCount: 1,
            expiresAt,
          },
        });

      return { allowed: true };
    }

    if (existing.attemptCount >= config.maxAttempts) {
      const remainingMs = Math.max(0, new Date(existing.expiresAt).getTime() - now.getTime());
      const retryAfterSeconds = Math.max(1, Math.ceil(remainingMs / 1000));
      return { allowed: false, retryAfterSeconds };
    }

    // Increment existing counter
    await tx
      .update(authRateLimits)
      .set({
        attemptCount: sql`${authRateLimits.attemptCount} + 1`,
      })
      .where(eq(authRateLimits.scopeHash, scopeHash));

    return { allowed: true };
  });
}
