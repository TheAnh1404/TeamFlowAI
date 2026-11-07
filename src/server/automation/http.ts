import "server-only";
import { timingSafeEqual } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { requireSession } from "@/server/auth";
import { getDb } from "@/server/db/client";
import { endpoint, assert, readJson } from "@/server/http/errors";
import { createCoordinatorService } from "@/features/tracking/server/coordinator-service";
import { createReportV2Service } from "@/features/delivery/server/coordinator-reports";
import { createTrackingService } from "@/features/tracking/server/implementation";
import { resolveTaskReferenceInputSchema } from "@/contracts";
import { reportSummaryV2Schema, sourceRefV2Schema } from "@/contracts/coordinator";
import { handleEmailWebhook } from "@/server/notifications/email";
import { tick } from "./worker";
import { occurrences, localParts } from "./time";
import { eligibleMembers } from "./dispatcher";
import { coordinatorSettings } from "@/server/db/schema";
import { leader } from "@/features/tracking/server/coordinator-service";
import { automationJobs, emailDeliveries } from "@/server/db/schema";
import { confirmEmailVerification, requestEmailVerification } from "@/server/notifications/verification";
type Context = {
    params: Promise<Record<string, string>>;
};
const key = (r: Request) => { const k = r.headers.get("Idempotency-Key"); assert(k, 422, "VALIDATION_ERROR", "Thiếu Idempotency-Key."); return k; };
const json = (r: Request) => readJson(r, z.unknown());
// Thin routes share identical authentication, origin/body bounds and error handling.
export function projectHandler(action: "feed" | "post" | "checkins" | "draft" | "submit" | "settings" | "memberPreference" | "meetings" | "reports" | "checkinSources") {
    return async (request: Request, context: Context) => {
        const response = await endpoint(async () => {
            const session = await requireSession(), p = await context.params, projectId = p.projectId, db = getDb(), service = createCoordinatorService(db), query = new URL(request.url).searchParams;
            switch (action) {
                case "feed": return service.feed(session, projectId, query);
                case "post": return service.post(session, projectId, await json(request), key(request));
                case "checkins": {
                    const date = query.get("workDate");
                    assert(date, 422, "VALIDATION_ERROR", "Chọn ngày làm việc.");
                    return service.checkins(session, projectId, date);
                }
                case "checkinSources": {
                    const date = query.get("workDate");
                    assert(date, 422, "VALIDATION_ERROR", "Chọn ngày làm việc.");
                    return service.checkinSources(session, projectId, date);
                }
                case "draft":
                case "submit": return service.saveCheckin(session, projectId, p.workDate, await json(request), key(request), action === "submit");
                case "settings": return request.method === "GET" ? service.settings(session, projectId) : service.updateSettings(session, projectId, await json(request), key(request));
                case "memberPreference": return service.memberPreference(session, projectId, request.method === "GET" ? undefined : await json(request));
                case "meetings": return request.method === "GET" ? service.meetings(session, projectId) : service.saveMeeting(session, projectId, p.meetingId ?? null, await json(request), key(request));
                case "reports": return request.method === "GET" ? createReportV2Service(db).list(session, projectId) : service.requestReport(session, projectId, await json(request), key(request));
            }
        });
        if (response.ok && request.method === "POST" && (action === "post" || action === "reports"))
            return new Response(response.body, { status: action === "post" ? 201 : 202, headers: response.headers });
        return response;
    };
}
export function reportHandler(action: "get" | "publish" | "retry" | "source" | "revise") {
    return (request: Request, context: Context) => endpoint(async () => {
        const session = await requireSession(), { reportId } = await context.params, service = createReportV2Service(getDb());
        if (action === "get")
            return service.get(session, reportId);
        if (action === "source")
            return service.source(session, reportId, sourceRefV2Schema.parse(Object.fromEntries(new URL(request.url).searchParams)));
        if (action === "retry") {
            await readJson(request, z.object({}).strict());
            return service.retry(session, reportId, key(request));
        }
        if (action === "revise") {
            const body = await readJson(request, z.object({ expectedVersion: z.number().int().positive(), summary: reportSummaryV2Schema }).strict());
            return service.revise(session, reportId, body.expectedVersion, body.summary, key(request));
        }
        const body = await readJson(request, z.object({ expectedVersion: z.number().int().positive() }).strict());
        return service.publish(session, reportId, body.expectedVersion, key(request));
    });
}
export const resolvePost = (request: Request, context: Context) => endpoint(async () => {
    const session = await requireSession(), { postId } = await context.params, db = getDb();
    const rows = await db.execute<{
        id: string;
    }>(sql `SELECT m.id FROM messages m JOIN chat_posts p ON m."chatPostId"=p.id JOIN project_members a ON a.id=p."authorMemberId" WHERE p.id=${postId} AND a."userId"=${session.user.id}`);
    assert(rows.rows.length, 404, "NOT_FOUND", "Chưa có đề xuất cần xác nhận.");
    return createTrackingService(db).resolveTaskReference(session, rows.rows[0].id, await readJson(request, resolveTaskReferenceInputSchema.strict()), { idempotencyKey: key(request) });
});
export const getInbox = (request: Request) => endpoint(async () => createCoordinatorService().inbox(await requireSession(), new URL(request.url).searchParams));
export const readNotification = (request: Request, context: Context) => endpoint(async () => { await readJson(request, z.object({}).strict()); return createCoordinatorService().readNotification(await requireSession(), (await context.params).notificationId); });
export const preferences = (request: Request) => endpoint(async () => createCoordinatorService().preferences(await requireSession(), request.method === "GET" ? undefined : await json(request)));
export const emailWebhook = (request: Request) => endpoint(() => handleEmailWebhook(getDb(), request));
export const emailVerification = (request: Request) => endpoint(async () => {
    const session = await requireSession(), input = await readJson(request, z.object({ token: z.string().optional() }).strict());
    return input.token ? confirmEmailVerification(getDb(), session, input.token) : requestEmailVerification(getDb(), session);
});
export const retryProjectJob = (request: Request, context: Context) => endpoint(async () => {
    const session = await requireSession(), { projectId, jobId } = await context.params;
    await readJson(request, z.object({}).strict());
    const db = getDb();
    return db.transaction(async (tx) => {
        await leader(tx, session, projectId);
        const [job] = await tx.select().from(automationJobs).where(and(eq(automationJobs.id, jobId), eq(automationJobs.projectId, projectId))).for("update");
        assert(job && job.status === "attention", 409, "INVALID_TRANSITION", "Chỉ thử lại tác vụ cần kiểm tra.");
        assert(job.expiresAt > new Date().toISOString(), 409, "OCCURRENCE_EXPIRED", "Mốc nhắc đã hết hiệu lực. Với báo cáo, hãy tạo yêu cầu mới có kỳ rõ ràng.");
        const [delivery] = await tx.select().from(emailDeliveries).where(eq(emailDeliveries.jobId, jobId));
        assert(!delivery || Date.now() - Date.parse(delivery.firstAttemptAt) < 23 * 3600000, 409, "EMAIL_UNCERTAIN_ATTENTION", "Không tự gửi lại email đã quá cửa sổ idempotency; kiểm tra provider.");
        await tx.update(automationJobs).set({ status: "queued", attempts: 0, runAt: new Date().toISOString(), claimToken: null, lockedUntil: null }).where(eq(automationJobs.id, jobId));
        return { queued: true };
    });
});
export const internalTick = (request: Request) => endpoint(async () => {
    const secret = process.env.COORDINATOR_SERVICE_SECRET, token = request.headers.get("authorization")?.replace(/^Bearer /, "");
    assert(secret && secret.length >= 32, 503, "AUTOMATION_NOT_CONFIGURED", "Chưa cấu hình service credential.");
    const expected = Buffer.from(secret), received = Buffer.from(token ?? "");
    assert(expected.length === received.length && timingSafeEqual(expected, received), 401, "UNAUTHORIZED", "Service credential không hợp lệ.");
    const db = getDb();
    if (new URL(request.url).searchParams.get("dryRun") === "1") {
        const now = new Date().toISOString(), settings = await db.select().from(coordinatorSettings).limit(20);
        const previews = await Promise.all(settings.map(async (row) => ({ projectId: row.projectId, version: row.version, enabled: row.settings.enabled,
            next: occurrences(row.settings, row.projectId, now, new Date(Date.parse(now) + 7 * 86400000).toISOString()).slice(0, 8),
            eligibleToday: (await eligibleMembers(db, row.projectId, localParts(now, row.settings.timezone).date, row.settings.participantMemberIds, false)).map(m => m.id) })));
        return { dryRun: true, asOf: now, previews, sideEffects: false };
    }
    // Persistent one-minute dispatcher rate limit, independent of process lifetime.
    const acquired = await db.execute<{
        key: string;
    }>(sql `INSERT INTO auth_rate_limits ("scopeHash","windowStartedAt","attemptCount","expiresAt") VALUES ('coordinator-tick',clock_timestamp(),1,clock_timestamp()+interval '45 seconds') ON CONFLICT ("scopeHash") DO UPDATE SET "windowStartedAt"=clock_timestamp(),"expiresAt"=clock_timestamp()+interval '45 seconds',"attemptCount"=1 WHERE auth_rate_limits."expiresAt"<clock_timestamp() RETURNING "scopeHash" AS key`);
    assert(acquired.rows.length, 429, "RATE_LIMITED", "Tick đang chạy hoặc vừa chạy.");
    return tick(db, { dispatchSchedules: process.env.COORDINATOR_AUTOMATION_ENABLED === "true" });
});
