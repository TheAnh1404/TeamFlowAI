import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { and, desc, eq, lte, sql } from "drizzle-orm";
import type { Session } from "@/server/auth/contracts";
import { projectMember } from "@/server/auth/access";
import type { Database, Transaction } from "@/server/db/client";
import * as s from "@/server/db/schema";
import { assert, conflict, notFound } from "@/server/http/errors";
import { addNotification, leader } from "@/features/tracking/server/coordinator-service";
import { aiProvider } from "@/server/ai";
import type { AiProvider, ReportAiInput } from "@/server/ai/contracts";
import { calculateReportMetrics } from "./service";
import { validateReportV2 } from "@/server/ai/coordinator-validator";
import type { ReportSummaryV2, SourceRefV2 } from "@/contracts/coordinator";
import { commitMutation, mutationIdentity } from "@/server/db/mutations";
import { enqueue, finishJob, serializeProject, withLease, type Job } from "@/server/automation/queue";
import { addDays, localParts, weekStart } from "@/server/automation/time";
export interface FrozenSource {
    entity: SourceRefV2["entity"];
    id: string;
    data: Record<string, unknown>;
}
export interface SnapshotV2 {
    projectId: string;
    asOf: string;
    periodStart: string;
    periodEnd: string;
    timezone: string;
    sources: FrozenSource[];
    members: {
        id: string;
        userId: string;
        name: string;
    }[];
}
export async function freezeSnapshot(tx: Transaction, projectId: string, periodStart: string, end: string | null, timezone: string) {
    const clock = await tx.execute<{
        timestamp: string;
    }>(sql `select transaction_timestamp()::text as timestamp`);
    const asOf = new Date(clock.rows[0].timestamp).toISOString(), periodEnd = end ?? asOf;
    assert(periodStart < periodEnd && periodEnd <= asOf, 422, "VALIDATION_ERROR", "Kỳ báo cáo không hợp lệ hoặc chưa kết thúc.");
    const tasks = await tx.select({ task: s.tasks }).from(s.tasks).innerJoin(s.plans, and(eq(s.plans.id, s.tasks.planId), eq(s.plans.status, "published"))).where(and(eq(s.tasks.projectId, projectId), lte(s.tasks.createdAt, asOf)));
    const messages = await tx.select().from(s.messages).where(and(eq(s.messages.projectId, projectId), lte(s.messages.createdAt, asOf)));
    const updates = await tx.select().from(s.progressUpdates).where(and(eq(s.progressUpdates.projectId, projectId), lte(s.progressUpdates.createdAt, asOf)));
    const submissions = await tx.select().from(s.submissions).where(and(eq(s.submissions.projectId, projectId), lte(s.submissions.submittedAt, asOf)));
    const reviews = await tx.select().from(s.reviews).where(and(eq(s.reviews.projectId, projectId), lte(s.reviews.createdAt, asOf)));
    const posts = await tx.select().from(s.chatPosts).where(and(eq(s.chatPosts.projectId, projectId), lte(s.chatPosts.createdAt, asOf), sql `${s.chatPosts.createdAt} >= ${periodStart}::timestamptz AND ${s.chatPosts.createdAt} < ${periodEnd}::timestamptz`));
    const revisions = await tx.selectDistinctOn([s.checkinRevisions.checkinId]).from(s.checkinRevisions).where(and(eq(s.checkinRevisions.projectId, projectId), lte(s.checkinRevisions.submittedAt, asOf))).orderBy(s.checkinRevisions.checkinId, desc(s.checkinRevisions.revision));
    const requests = await tx.select().from(s.checkinRequests).where(and(eq(s.checkinRequests.projectId, projectId), lte(s.checkinRequests.requestedAt, asOf)));
    const events = await tx.select().from(s.taskActivityEvents).where(and(eq(s.taskActivityEvents.projectId, projectId), lte(s.taskActivityEvents.occurredAt, asOf)));
    const members = await tx.select({ id: s.projectMembers.id, userId: s.projectMembers.userId, name: s.users.displayName }).from(s.projectMembers).innerJoin(s.users, eq(s.users.id, s.projectMembers.userId)).where(eq(s.projectMembers.projectId, projectId));
    const sources: FrozenSource[] = [];
    function collect(entity: FrozenSource["entity"], rows: {
        id: string;
    }[]) {
        for (const row of rows)
            sources.push({ entity, id: row.id, data: row as Record<string, unknown> });
    }
    collect("Task", tasks.map(t => t.task));
    collect("Message", messages);
    collect("ProgressUpdate", updates);
    collect("Submission", submissions);
    collect("Review", reviews);
    collect("ChatPost", posts);
    collect("CheckinRevision", revisions);
    collect("CheckinRequest", requests);
    collect("TaskActivityEvent", events);
    const snapshot: SnapshotV2 = { projectId, asOf, periodStart, periodEnd, timezone, sources, members };
    const legacy: ReportAiInput["sources"] = { tasks: tasks.map(t => t.task), messages, progressUpdates: updates, submissions, reviews };
    const metrics: Record<string, unknown> = { ...calculateReportMetrics(legacy, { periodStart, periodEnd }, asOf) };
    const within = (v: string) => v >= periodStart && v < periodEnd;
    // workDate is the member's chosen project day, not the server submission day.
    const inWorkPeriod = (date: string) => date >= localParts(periodStart, timezone).date && date <= localParts(new Date(Date.parse(periodEnd) - 1), timezone).date;
    const relevantRevisions = revisions.filter(r => inWorkPeriod(r.workDate));
    const relevantRequests = requests.filter(r => inWorkPeriod(r.workDate));
    metrics.submittedTaskCount = new Set(submissions.filter(r => within(r.submittedAt)).map(r => r.taskId)).size;
    metrics.acceptedTaskCount = new Set(events.filter(r => r.kind === "accepted" && within(r.occurredAt)).map(r => r.taskId)).size;
    metrics.expectedCheckins = relevantRequests.length;
    metrics.submittedCheckins = relevantRequests.filter(r => relevantRevisions.some(c => c.memberId === r.memberId && c.workDate === r.workDate)).length;
    metrics.activeBlockers = tasks.map(t => t.task).filter(t => t.status === "blocked").map(task => {
        const latest = updates.filter(u => u.taskId === task.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))[0];
        return { taskId: task.id, memberId: task.assigneeMemberId, text: latest?.statusAfter === "blocked" ? latest.blocker ?? "Chưa có mô tả trở ngại" : "Chưa có mô tả trở ngại", sourceRefs: [{ entity: "Task", id: task.id }, ...(latest ? [{ entity: "ProgressUpdate", id: latest.id }] : [])] };
    });
    metrics.memberRollup = members.map(member => {
        const checkins = relevantRevisions.filter(r => r.memberId === member.id), items = checkins.flatMap(r => r.payload.completedWork);
        const known = items.filter(i => i.durationMinutes !== null);
        const latestDay = [...checkins].sort((a, b) => b.workDate.localeCompare(a.workDate) || b.revision - a.revision)[0];
        const datedSources = [...messages.filter(m => m.authorMemberId === member.id && within(m.createdAt)).map(m => m.createdAt), ...posts.filter(p => p.authorMemberId === member.id).map(p => p.createdAt), ...updates.filter(u => u.authorMemberId === member.id && within(u.createdAt)).map(u => u.createdAt), ...submissions.filter(s => s.authorMemberId === member.id && within(s.submittedAt)).map(s => s.submittedAt), ...checkins.map(c => c.submittedAt)];
        return { ...member, selfReportedWork: items, blockers: checkins.filter(r => r.payload.blockers.trim()).map(r => ({ text: r.payload.blockers, revisionId: r.id })),
            nextActions: latestDay?.payload.nextActions.trim() ? [latestDay.payload.nextActions] : [],
            selfReportedMinutes: known.length ? known.reduce((n, i) => n + i.durationMinutes!, 0) : null, unknownDurationItems: items.length - known.length,
            expectedCheckins: relevantRequests.filter(r => r.memberId === member.id).length, submittedCheckins: checkins.length,
            submittedTasks: new Set(submissions.filter(r => r.authorMemberId === member.id && within(r.submittedAt)).map(r => r.taskId)).size,
            acceptedTasks: events.filter(r => r.kind === "accepted" && within(r.occurredAt) && r.after.assigneeMemberId === member.id).length,
            lastUpdate: datedSources.sort().at(-1) ?? null, sourceRefs: checkins.map(r => ({ entity: "CheckinRevision", id: r.id })) };
    });
    metrics.elapsedTaskMinutes = events.filter(e => e.kind === "accepted" && within(e.occurredAt)).map(e => {
        const started = events.filter(a => a.taskId === e.taskId && a.after.status === "in_progress" && a.occurredAt <= e.occurredAt).sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))[0];
        return { taskId: e.taskId, calendarMinutes: started ? Math.round((Date.parse(e.occurredAt) - Date.parse(started.occurredAt)) / 60000) : null };
    });
    const baseline = events.filter(e => e.kind === "baseline").map(e => e.occurredAt).sort()[0];
    metrics.historyCoverage = baseline && periodStart < baseline ? `Lịch sử trước ${baseline} chưa đầy đủ; baseline không tái dựng sự kiện quá khứ.` : "Số trạng thái tại asOf; thời gian là tự khai hoặc thời gian lịch, không phải chấm công.";
    return { snapshot, metrics, hash: createHash("sha256").update(JSON.stringify(snapshot)).digest("hex") };
}
async function jobReport(tx: Transaction, job: Job) {
    const projectId = job.projectId!;
    await serializeProject(tx, projectId);
    if (job.payload.reportId) {
        const [r] = await tx.select().from(s.coordinatorReportRuns).where(and(eq(s.coordinatorReportRuns.id, String(job.payload.reportId)), eq(s.coordinatorReportRuns.projectId, projectId)));
        if (!r)
            throw notFound();
        return r;
    }
    let memberId: string, periodStart: string, periodEnd: string | null = null, timezone: string, trigger: string;
    const now = new Date().toISOString();
    if (job.payload.meetingId) {
        const [meeting] = await tx.select().from(s.projectMeetings).where(and(eq(s.projectMeetings.id, String(job.payload.meetingId)), eq(s.projectMeetings.projectId, projectId)));
        if (!meeting || meeting.canceledAt || meeting.version !== job.payload.meetingVersion || meeting.startsAt <= now)
            return null;
        memberId = meeting.configuredByMemberId;
        timezone = meeting.timezone;
        trigger = "meeting";
        periodStart = meeting.periodStart ?? weekStart(localParts(now, timezone).date, timezone);
        if (meeting.periodMode === "since_last_meeting") {
            const [prior] = await tx.select().from(s.projectMeetings).where(and(eq(s.projectMeetings.projectId, projectId), sql `${s.projectMeetings.startsAt}<${meeting.startsAt}::timestamptz`, sql `${s.projectMeetings.canceledAt} IS NULL`)).orderBy(desc(s.projectMeetings.startsAt)).limit(1);
            if (prior && prior.startsAt < now)
                periodStart = prior.startsAt;
        }
    }
    else {
        const [setting] = await tx.select().from(s.coordinatorSettings).where(eq(s.coordinatorSettings.projectId, projectId));
        if (!setting || !setting.settings.enabled || setting.version !== job.payload.scheduleVersion)
            return null;
        memberId = setting.enabledByMemberId;
        timezone = setting.settings.timezone;
        trigger = "weekly";
        const date = String(job.payload.workDate);
        periodStart = weekStart(date, timezone);
        if (setting.settings.weeklyMode === "monday") {
            periodEnd = periodStart;
            periodStart = weekStart(addDays(date, -7), timezone);
        }
    }
    const [actor] = await tx.select().from(s.projectMembers).where(and(eq(s.projectMembers.id, memberId), eq(s.projectMembers.projectId, projectId), eq(s.projectMembers.role, "leader")));
    assert(actor, 403, "AUTOMATION_POLICY_INVALID", "Người cấu hình không còn quyền trưởng nhóm.");
    const [report] = await tx.insert(s.coordinatorReportRuns).values({ id: randomUUID(), projectId, requestedByMemberId: memberId, trigger, dedupeKey: job.dedupeKey, periodStart, periodEnd, status: "queued", version: 1, summaryHistory: [], metadata: { ...job.payload, timezone, scheduledFor: job.runAt }, createdAt: now }).onConflictDoNothing().returning();
    if (report)
        return report;
    const [existing] = await tx.select().from(s.coordinatorReportRuns).where(eq(s.coordinatorReportRuns.dedupeKey, job.dedupeKey));
    return existing;
}
export async function generateCoordinatorReport(db: Database, job: Job, ai: AiProvider = aiProvider) {
    const report = await withLease(db, job, tx => jobReport(tx, job));
    if (!report) {
        await withLease(db, job, tx => finishJob(tx, job, "skipped"));
        return;
    }
    if (report.status === "published" || report.status === "draft") {
        await withLease(db, job, tx => finishJob(tx, job));
        return;
    }
    // Capture and persist before the external AI call; retries reuse this exact snapshot.
    await db.transaction(async (tx) => {
        const [current] = await tx.select().from(s.coordinatorReportRuns).where(eq(s.coordinatorReportRuns.id, report.id));
        if (current.snapshot)
            return;
        const [project] = await tx.select().from(s.projects).where(eq(s.projects.id, report.projectId));
        const [setting] = await tx.select().from(s.coordinatorSettings).where(eq(s.coordinatorSettings.projectId, report.projectId));
        const frozen = await freezeSnapshot(tx, report.projectId, report.periodStart, report.periodEnd, String(report.metadata.timezone ?? setting?.settings.timezone ?? project.timeZone));
        const [lease] = await tx.select().from(s.automationJobs).where(eq(s.automationJobs.id, job.id)).for("update");
        assert(lease.claimToken === job.claimToken && lease.lockedUntil! > new Date().toISOString(), 409, "LEASE_LOST", "Worker đã hết lease.");
        await tx.update(s.coordinatorReportRuns).set({ snapshot: frozen.snapshot as unknown as Record<string, unknown>, metrics: frozen.metrics, snapshotHash: frozen.hash, asOf: frozen.snapshot.asOf, periodEnd: frozen.snapshot.periodEnd, status: "generating", metadata: { ...current.metadata, startedAt: new Date().toISOString(), promptVersion: "coordinator-report-v2-1" } }).where(and(eq(s.coordinatorReportRuns.id, report.id), sql `${s.coordinatorReportRuns.snapshot} IS NULL`));
    }, { isolationLevel: "repeatable read" });
    const [current] = await db.select().from(s.coordinatorReportRuns).where(eq(s.coordinatorReportRuns.id, report.id));
    const snapshot = current.snapshot as unknown as SnapshotV2;
    assert(Buffer.byteLength(JSON.stringify(snapshot)) <= 180000, 422, "AI_SOURCE_BUDGET", "Snapshot quá lớn để tạo diễn giải; số liệu vẫn được giữ. Thu hẹp kỳ và tạo báo cáo mới.");
    const generated = await ai.generate("coordinator_report_v2", { snapshot, metrics: current.metrics! });
    const summary = validateReportV2(generated.proposal, { snapshot, metrics: current.metrics! });
    await withLease(db, job, async (tx) => {
        // Recheck schedule/meeting after AI, immediately before exposing a draft.
        if (!job.payload.reportId && !(await jobReport(tx, job))) {
            await tx.update(s.coordinatorReportRuns).set({ status: "canceled" }).where(eq(s.coordinatorReportRuns.id, current.id));
            await finishJob(tx, job, "skipped");
            return;
        }
        const [owner] = await tx.select().from(s.projectMembers).where(and(eq(s.projectMembers.id, current.requestedByMemberId), eq(s.projectMembers.role, "leader"), eq(s.projectMembers.projectId, current.projectId)));
        assert(owner, 403, "AUTOMATION_POLICY_INVALID", "Người yêu cầu không còn quyền trưởng nhóm.");
        await tx.update(s.coordinatorReportRuns).set({ status: "draft", summary, aiMode: generated.aiMode, metadata: { ...current.metadata, completedAt: new Date().toISOString() } }).where(eq(s.coordinatorReportRuns.id, current.id));
        await addNotification(tx, current.projectId, owner.userId, `draft:${current.id}`, "report_draft_ready", "Bản nháp báo cáo đã sẵn sàng.", `/app/projects/${encodeURIComponent(current.projectId)}/reports?report=${current.id}`);
        await enqueue(tx, "email_report", `email:draft:${current.id}`, { userId: owner.userId, reportId: current.id, draft: true }, current.projectId, new Date().toISOString(), new Date(Date.now() + 3600000).toISOString());
        await finishJob(tx, job);
    });
}
export function createReportV2Service(db: Database) {
    async function accessible(session: Session, id: string) {
        const [r] = await db.select().from(s.coordinatorReportRuns).where(eq(s.coordinatorReportRuns.id, id));
        if (!r)
            throw notFound();
        const actor = await projectMember(db, session, r.projectId);
        if (actor.role !== "leader" && r.status !== "published")
            throw notFound();
        let hasUpdatesAfterSnapshot = false;
        if (r.asOf) {
            const changed = await db.execute<{
                changed: boolean;
            }>(sql `SELECT EXISTS(SELECT 1 FROM task_activity_events WHERE "projectId"=${r.projectId} AND "occurredAt">${r.asOf}::timestamptz UNION ALL SELECT 1 FROM daily_checkin_revisions WHERE "projectId"=${r.projectId} AND "submittedAt">${r.asOf}::timestamptz UNION ALL SELECT 1 FROM chat_posts WHERE "projectId"=${r.projectId} AND "createdAt">${r.asOf}::timestamptz) AS changed`);
            hasUpdatesAfterSnapshot = changed.rows[0].changed;
        }
        return { ...r, hasUpdatesAfterSnapshot };
    }
    return {
        async list(session: Session, projectId: string) { const actor = await projectMember(db, session, projectId); return db.select({ id: s.coordinatorReportRuns.id, status: s.coordinatorReportRuns.status, trigger: s.coordinatorReportRuns.trigger, asOf: s.coordinatorReportRuns.asOf, periodStart: s.coordinatorReportRuns.periodStart, periodEnd: s.coordinatorReportRuns.periodEnd, version: s.coordinatorReportRuns.version, createdAt: s.coordinatorReportRuns.createdAt, aiMode: s.coordinatorReportRuns.aiMode }).from(s.coordinatorReportRuns).where(and(eq(s.coordinatorReportRuns.projectId, projectId), actor.role === "leader" ? undefined : eq(s.coordinatorReportRuns.status, "published"))).orderBy(desc(s.coordinatorReportRuns.createdAt)).limit(50); },
        get: accessible,
        async source(session: Session, id: string, ref: SourceRefV2) {
            const report = await accessible(session, id), snapshot = report.snapshot as unknown as SnapshotV2;
            const source = snapshot?.sources.find(s => s.entity === ref.entity && s.id === ref.id);
            if (!source)
                throw notFound();
            return { asOf: report.asOf, ...source };
        },
        async revise(session: Session, id: string, version: number, summary: ReportSummaryV2, key: string) {
            const r = await accessible(session, id);
            await leader(db, session, r.projectId);
            validateReportV2(summary, { snapshot: r.snapshot as unknown as SnapshotV2, metrics: r.metrics! });
            return commitMutation(db, mutationIdentity(session.user.id, `report-revise:${id}`, key, { version, summary }), async (tx) => {
                const actor = await leader(tx, session, r.projectId);
                const [current] = await tx.select().from(s.coordinatorReportRuns).where(eq(s.coordinatorReportRuns.id, id)).for("update");
                if (current.version !== version)
                    throw conflict();
                assert(current.status === "draft", 409, "INVALID_TRANSITION", "Chỉ sửa diễn giải bản nháp.");
                const [saved] = await tx.update(s.coordinatorReportRuns).set({ summary, version: version + 1, summaryHistory: [...current.summaryHistory, { version: current.version, summary: current.summary ?? [], actorMemberId: actor.id, at: new Date().toISOString() }] }).where(eq(s.coordinatorReportRuns.id, id)).returning();
                return saved;
            });
        },
        async publish(session: Session, id: string, version: number, key: string) {
            const r = await accessible(session, id);
            await leader(db, session, r.projectId);
            return commitMutation(db, mutationIdentity(session.user.id, `report-publish:${id}`, key, { version }), async (tx) => {
                const actor = await leader(tx, session, r.projectId);
                await serializeProject(tx, r.projectId);
                const [current] = await tx.select().from(s.coordinatorReportRuns).where(eq(s.coordinatorReportRuns.id, id)).for("update");
                if (current.version !== version)
                    throw conflict();
                assert(current.status === "draft", 409, "INVALID_TRANSITION", "Báo cáo chưa có bản nháp để chia sẻ.");
                const now = new Date().toISOString(), target = `/app/projects/${encodeURIComponent(r.projectId)}/reports?report=${id}`;
                const [published] = await tx.update(s.coordinatorReportRuns).set({ status: "published", version: version + 1, publishedAt: now, publishedByMemberId: actor.id }).where(eq(s.coordinatorReportRuns.id, id)).returning();
                await tx.insert(s.coordinatorEvents).values({ id: randomUUID(), projectId: r.projectId, eventType: "report_published", occurrenceKey: `publish:${id}`, text: "Trưởng nhóm đã chia sẻ báo cáo với nhóm.", target, createdAt: now }).onConflictDoNothing();
                const members = await tx.select().from(s.projectMembers).where(eq(s.projectMembers.projectId, r.projectId));
                for (const member of members) {
                    await addNotification(tx, r.projectId, member.userId, `publish:${id}`, "report_published", "Báo cáo đã được trưởng nhóm chia sẻ.", target, now);
                    await enqueue(tx, "email_report", `email:publish:${id}:${member.userId}`, { reportId: id, userId: member.userId, draft: false }, r.projectId, now, new Date(Date.parse(now) + 3600000).toISOString());
                }
                return published;
            });
        },
        async retry(session: Session, id: string, key: string) {
            const r = await accessible(session, id);
            await leader(db, session, r.projectId);
            return commitMutation(db, mutationIdentity(session.user.id, `report-retry:${id}`, key, {}), async (tx) => {
                await leader(tx, session, r.projectId);
                const [current] = await tx.select().from(s.coordinatorReportRuns).where(eq(s.coordinatorReportRuns.id, id)).for("update");
                assert(["failed", "attention"].includes(current.status), 409, "INVALID_TRANSITION", "Báo cáo chưa cần thử lại.");
                const now = new Date().toISOString();
                await tx.update(s.coordinatorReportRuns).set({ status: "queued" }).where(eq(s.coordinatorReportRuns.id, id));
                await enqueue(tx, "report", `report-retry:${id}:${key}`, { reportId: id }, r.projectId, now, new Date(Date.parse(now) + 86400000).toISOString());
                return { queued: true, snapshotReused: !!current.snapshot };
            });
        },
    };
}
