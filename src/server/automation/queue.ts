import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, gt, lte, or, sql } from "drizzle-orm";
import type { Database, Transaction, DataConnection } from "@/server/db/client";
import { automationJobs, coordinatorReportRuns } from "@/server/db/schema";
import { HttpError } from "@/server/http/errors";
import { AiError } from "@/server/ai/errors";
export type Job = typeof automationJobs.$inferSelect;
export type JobType = "analyze_post" | "reminder" | "report" | "email_digest" | "email_report" | "email_verification" | "notify";
export interface AutomationExecutionContext {
    readonly principal: "coordinator-system";
    readonly jobId: string;
    readonly projectId: string | null;
    readonly claimToken: string;
    readonly scope: JobType;
}
export async function enqueue(db: DataConnection, type: JobType, dedupeKey: string, payload: Record<string, unknown>, projectId: string | null, runAt: string, expiresAt: string) {
    const [job] = await db.insert(automationJobs).values({ id: randomUUID(), type, dedupeKey, payload, projectId, runAt, expiresAt, status: "queued", attempts: 0, createdAt: runAt }).onConflictDoNothing({ target: automationJobs.dedupeKey }).returning();
    return job ?? null;
}
export async function claimJob(db: Database, now: string): Promise<Job | null> {
    return db.transaction(async (tx) => {
        await tx.execute(sql `select pg_advisory_xact_lock(hashtext('coordinator-ai-concurrency'))`);
        const running = await tx.execute<{
            count: number;
        }>(sql `SELECT count(*)::int AS count FROM automation_jobs WHERE status='running' AND "lockedUntil">${now}::timestamptz AND type IN ('analyze_post','report')`);
        const [row] = await tx.select().from(automationJobs).where(and(lte(automationJobs.runAt, now), or(eq(automationJobs.status, "queued"), and(eq(automationJobs.status, "running"), lte(automationJobs.lockedUntil, now))), running.rows[0].count >= 2 ? sql `${automationJobs.type} NOT IN ('analyze_post','report')` : undefined))
            .orderBy(automationJobs.runAt, automationJobs.id).limit(1).for("update", { skipLocked: true });
        if (!row)
            return null;
        if (row.attempts >= 5 || row.expiresAt <= now) {
            await tx.update(automationJobs).set({ status: row.attempts >= 5 ? "attention" : "expired", completedAt: now, claimToken: null, lockedUntil: null }).where(eq(automationJobs.id, row.id));
            if (row.type === "report")
                await tx.update(coordinatorReportRuns).set({ status: "attention" }).where(and(row.payload.reportId ? eq(coordinatorReportRuns.id, String(row.payload.reportId)) : eq(coordinatorReportRuns.dedupeKey, row.dedupeKey), sql `${coordinatorReportRuns.status} IN ('queued','failed','generating')`));
            return null;
        }
        if (row.projectId && ["analyze_post", "report"].includes(row.type)) {
            const day = now.slice(0, 10) + "T00:00:00.000Z", configured = Number(process.env.COORDINATOR_DAILY_AI_JOB_LIMIT ?? 100), limit = Number.isFinite(configured) ? Math.max(1, configured) : 100;
            const usage = await tx.execute<{
                attempts: number;
            }>(sql `SELECT coalesce(sum(attempts),0)::int AS attempts FROM automation_jobs WHERE "projectId"=${row.projectId} AND type IN ('analyze_post','report') AND "createdAt">=${day}::timestamptz`);
            if (usage.rows[0].attempts >= limit) {
                const next = new Date(Date.parse(day) + 86400000).toISOString();
                await tx.update(automationJobs).set({ status: next < row.expiresAt ? "queued" : "attention", runAt: next, lastErrorCode: "AI_DAILY_BUDGET_LIMIT" }).where(eq(automationJobs.id, row.id));
                return null;
            }
        }
        const [job] = await tx.update(automationJobs).set({ status: "running", attempts: row.attempts + 1, claimToken: randomUUID(), lockedUntil: new Date(Date.parse(now) + 90000).toISOString() }).where(eq(automationJobs.id, row.id)).returning();
        return job;
    });
}
export async function withLease<T>(db: Database, job: Job, action: (tx: Transaction) => Promise<T>, now?: string) {
    return db.transaction(async (tx) => {
        const [current] = await tx.select().from(automationJobs).where(eq(automationJobs.id, job.id)).for("update");
        if (!current || current.claimToken !== job.claimToken || current.status !== "running" || !current.lockedUntil || current.lockedUntil <= (now ?? new Date().toISOString()))
            throw new HttpError(409, "LEASE_LOST", "Job đã được worker khác nhận.");
        return action(tx);
    });
}
export async function finishJob(tx: Transaction, job: Job, status = "succeeded", now = new Date().toISOString()) {
    await tx.update(automationJobs).set({ status, completedAt: now, claimToken: null, lockedUntil: null, lastErrorCode: null }).where(and(eq(automationJobs.id, job.id), eq(automationJobs.claimToken, job.claimToken!)));
}
export async function failJob(db: Database, job: Job, error: unknown, now = new Date().toISOString(), onFailure?: (tx: Transaction, updated: Job) => Promise<void>) {
    const code = error instanceof HttpError || error instanceof AiError ? error.code : "DEPENDENCY_UNAVAILABLE";
    const permanent = code === "AI_INVALID_OUTPUT" || error instanceof HttpError && [400, 401, 403, 404, 409, 422].includes(error.status) && code !== "VERSION_CONFLICT";
    const status = permanent || job.attempts >= 5 ? "attention" : "queued";
    const delay = [60, 300, 900, 1800, 3600][Math.min(job.attempts - 1, 4)] + Math.floor(Math.random() * 20);
    const retryAfter = error && typeof error === "object" && "retryAfterSeconds" in error ? Number(error.retryAfterSeconds) : 0;
    return db.transaction(async (tx) => {
        const [updated] = await tx.update(automationJobs).set({ status, runAt: new Date(Date.parse(now) + Math.max(delay, Math.min(86400, retryAfter || 0)) * 1000).toISOString(), lastErrorCode: code, claimToken: null, lockedUntil: null })
            .where(and(eq(automationJobs.id, job.id), eq(automationJobs.status, "running"), eq(automationJobs.claimToken, job.claimToken!), gt(automationJobs.lockedUntil, now))).returning();
        if (updated && onFailure)
            await onFailure(tx, updated);
        return updated;
    });
}
export async function serializeProject(db: DataConnection, projectId: string) { await db.execute(sql `select pg_advisory_xact_lock(hashtext(${`coordinator:${projectId}`}))`); }
