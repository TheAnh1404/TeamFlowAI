import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import type { Database } from "@/server/db/client";
import * as s from "@/server/db/schema";
import { HttpError } from "@/server/http/errors";
import { addNotification } from "@/features/tracking/server/coordinator-service";
import { generateCoordinatorReport } from "@/features/delivery/server/coordinator-reports";
import { analyzePost } from "./chat-worker";
import { dispatch, dispatchDigests, delayedNotification, reminder } from "./dispatcher";
import { deliverEmail } from "@/server/notifications/email";
import { deliverVerification } from "@/server/notifications/verification";
import { claimJob, failJob, finishJob, withLease, type Job } from "./queue";
export async function runJob(db: Database, job: Job) {
    try {
        if (process.env.COORDINATOR_AUTOMATION_ENABLED !== "true" && (["reminder", "email_digest"].includes(job.type) || job.type === "notify" && !job.payload.sourceDedupeKey || job.type === "report" && !job.payload.reportId)) {
            await withLease(db, job, tx => finishJob(tx, job, "skipped"));
            return true;
        }
        switch (job.type) {
            case "analyze_post":
                await analyzePost(db, job);
                break;
            case "reminder":
                await reminder(db, job);
                break;
            case "report":
                await generateCoordinatorReport(db, job);
                break;
            case "email_digest":
            case "email_report":
                await deliverEmail(db, job);
                break;
            case "email_verification":
                await deliverVerification(db, job);
                break;
            case "notify":
                await delayedNotification(db, job);
                break;
            default: throw new HttpError(422, "UNKNOWN_JOB_TYPE", "Job không thuộc allowlist.");
        }
        return true;
    }
    catch (error) {
        if (error instanceof HttpError && error.code === "LEASE_LOST")
            return false;
        await failJob(db, job, error, new Date().toISOString(), async (tx, current) => {
            if (job.type === "analyze_post")
                await tx.update(s.chatPosts).set({ analysisStatus: "failed", updatedAt: new Date().toISOString() }).where(and(eq(s.chatPosts.id, String(job.payload.postId)), eq(s.chatPosts.analysisStatus, "queued")));
            if (job.type === "report") {
                if (job.payload.reportId)
                    await tx.update(s.coordinatorReportRuns).set({ status: current.status === "attention" ? "attention" : "failed" }).where(and(eq(s.coordinatorReportRuns.id, String(job.payload.reportId)), inArray(s.coordinatorReportRuns.status, ["queued", "generating", "failed"])));
                else
                    await tx.update(s.coordinatorReportRuns).set({ status: current.status === "attention" ? "attention" : "failed" }).where(and(eq(s.coordinatorReportRuns.dedupeKey, job.dedupeKey), inArray(s.coordinatorReportRuns.status, ["queued", "generating", "failed"])));
            }
            if (current.status === "attention" && job.projectId) {
                const leaders = await tx.select().from(s.projectMembers).where(and(eq(s.projectMembers.projectId, job.projectId), eq(s.projectMembers.role, "leader")));
                for (const actor of leaders)
                    await addNotification(tx, job.projectId, actor.userId, `attention:${job.id}`, "automation_attention", "Một tác vụ Coordinator cần kiểm tra. Mở lịch chạy để xem trạng thái.", `/app/projects/${encodeURIComponent(job.projectId)}/chat#coordinator-settings`);
            }
        });
        return false;
    }
}
export async function tick(db: Database, { now = new Date().toISOString(), budgetMs = 45000, maxJobs = 6, dispatchSchedules = true } = {}) {
    const started = Date.now();
    let enqueued = 0, processed = 0, succeeded = 0;
    // Chat analysis also works while scheduled reminders are paused globally.
    if (dispatchSchedules) {
        enqueued = await dispatch(db, now);
        await dispatchDigests(db, now);
    }
    while (processed < maxJobs && Date.now() - started < Math.max(0, budgetMs - 26000)) {
        const jobs: Job[] = [];
        for (let n = 0; n < 2 && processed + jobs.length < maxJobs; n++) {
            const job = await claimJob(db, new Date().toISOString());
            if (job)
                jobs.push(job);
        }
        if (!jobs.length)
            break;
        processed += jobs.length;
        const results = await Promise.all(jobs.map(job => runJob(db, job)));
        succeeded += results.filter(Boolean).length;
    }
    return { enqueued, processed, succeeded, durationMs: Date.now() - started };
}
