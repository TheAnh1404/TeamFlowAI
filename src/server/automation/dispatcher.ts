import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, isNull, lte, sql } from "drizzle-orm";
import type { Database, DataConnection } from "@/server/db/client";
import * as s from "@/server/db/schema";
import { defaultNotificationPreference } from "@/contracts/coordinator";
import { addNotification } from "@/features/tracking/server/coordinator-service";
import { localInstant, localParts, occurrences, quietUntil } from "./time";
import { enqueue, finishJob, serializeProject, withLease, type Job } from "./queue";
export async function eligibleMembers(db: DataConnection, projectId: string, date: string, participantIds: string[], onlyMissing: boolean) {
    const members = await db.select().from(s.projectMembers).where(eq(s.projectMembers.projectId, projectId));
    const preferences = await db.select().from(s.memberCheckinPreferences).where(eq(s.memberCheckinPreferences.projectId, projectId));
    const submitted = onlyMissing ? await db.select({ memberId: s.checkinRevisions.memberId }).from(s.checkinRevisions).where(and(eq(s.checkinRevisions.projectId, projectId), eq(s.checkinRevisions.workDate, date))) : [];
    return members.filter(member => {
        const pref = preferences.find(p => p.memberId === member.id);
        return (!participantIds.length || participantIds.includes(member.id)) && (!pref || pref.participation && !pref.pausedDates.includes(date)) && !submitted.some(r => r.memberId === member.id);
    });
}
export async function dispatch(db: Database, now = new Date().toISOString()) {
    const settings = await db.select().from(s.coordinatorSettings).where(lte(s.coordinatorSettings.nextRunAt, now)).orderBy(s.coordinatorSettings.nextRunAt).limit(20);
    let enqueued = 0;
    for (const row of settings)
        await db.transaction(async (tx) => {
            await serializeProject(tx, row.projectId);
            const [current] = await tx.select().from(s.coordinatorSettings).where(eq(s.coordinatorSettings.projectId, row.projectId)).for("update");
            if (current.nextRunAt > now)
                return;
            const [leader] = await tx.select().from(s.projectMembers).where(and(eq(s.projectMembers.id, current.enabledByMemberId), eq(s.projectMembers.projectId, row.projectId), eq(s.projectMembers.role, "leader")));
            if (!current.settings.enabled || !leader) {
                if (!leader) {
                    await tx.update(s.coordinatorSettings).set({ settings: { ...current.settings, enabled: false } }).where(eq(s.coordinatorSettings.projectId, row.projectId));
                    const attentionKey = `policy:${row.projectId}:${current.version}`;
                    const attention = await enqueue(tx, "reminder", attentionKey, { reason: "AUTOMATION_POLICY_INVALID" }, row.projectId, now, new Date(Date.parse(now) + 86400000).toISOString());
                    if (attention) {
                        await tx.update(s.automationJobs).set({ status: "attention", lastErrorCode: "AUTOMATION_POLICY_INVALID" }).where(eq(s.automationJobs.id, attention.id));
                        const leaders = await tx.select().from(s.projectMembers).where(and(eq(s.projectMembers.projectId, row.projectId), eq(s.projectMembers.role, "leader")));
                        for (const owner of leaders)
                            await addNotification(tx, row.projectId, owner.userId, attentionKey, "automation_attention", "Lịch Coordinator đã tạm dừng vì người cấu hình không còn quyền trưởng nhóm. Kiểm tra và lưu lại lịch.", `/app/projects/${encodeURIComponent(row.projectId)}/chat#coordinator-settings`, now);
                    }
                }
                await tx.update(s.coordinatorSettings).set({ nextRunAt: new Date(Date.parse(now) + 60000).toISOString() }).where(eq(s.coordinatorSettings.projectId, row.projectId));
                return;
            }
            const after = [current.lastRunAt ?? current.effectiveAt, current.effectiveAt, new Date(Date.parse(now) - 7 * 86400000).toISOString()].sort().at(-1)!;
            for (const occurrence of occurrences(current.settings, row.projectId, after, now)) {
                const payload = { ...occurrence, scheduleVersion: current.version };
                const job = await enqueue(tx, occurrence.slot === "weekly" ? "report" : "reminder", occurrence.key, payload, row.projectId, occurrence.scheduledFor, occurrence.expiresAt);
                if (occurrence.expiresAt <= now) {
                    if (job) {
                        await tx.update(s.automationJobs).set({ status: occurrence.slot === "weekly" ? "attention" : "expired", lastErrorCode: "OCCURRENCE_EXPIRED", completedAt: now }).where(eq(s.automationJobs.id, job.id));
                        if (occurrence.slot === "weekly")
                            await addNotification(tx, row.projectId, leader.userId, `missed:${occurrence.key}`, "automation_attention", "Lịch báo cáo tuần đã quá cửa sổ chạy bù. Bạn có thể soạn báo cáo thủ công với kỳ rõ ràng.", `/app/projects/${encodeURIComponent(row.projectId)}/reports`, now);
                    }
                    continue;
                }
                if (job)
                    enqueued++;
                else {
                    // Same logical slot survives schedule revisions. Refresh an unexecuted old-version job,
                    // while a delivered occurrence remains protected by both its event and dedupe key.
                    await tx.update(s.automationJobs).set({ payload, runAt: occurrence.scheduledFor, expiresAt: occurrence.expiresAt, status: "queued", attempts: 0, lastErrorCode: null, completedAt: null })
                        .where(and(eq(s.automationJobs.dedupeKey, occurrence.key), sql `${s.automationJobs.status} IN ('queued','skipped','expired','attention')`, sql `${s.automationJobs.payload}->>'scheduleVersion' <> ${String(current.version)}`, sql `NOT EXISTS(SELECT 1 FROM coordinator_events WHERE "occurrenceKey"=${occurrence.key})`));
                }
            }
            await tx.update(s.coordinatorSettings).set({ lastRunAt: now, nextRunAt: new Date(Date.parse(now) + 60000).toISOString() }).where(eq(s.coordinatorSettings.projectId, row.projectId));
        });
    return enqueued;
}
export async function reminder(db: Database, job: Job) {
    await withLease(db, job, async (tx) => {
        const projectId = job.projectId!, date = String(job.payload.workDate), slot = String(job.payload.slot), now = new Date().toISOString();
        await serializeProject(tx, projectId);
        const [row] = await tx.select().from(s.coordinatorSettings).where(eq(s.coordinatorSettings.projectId, projectId));
        if (!row || !row.settings.enabled || row.version !== job.payload.scheduleVersion || localParts(now, row.settings.timezone).date !== date || job.expiresAt <= now) {
            await finishJob(tx, job, "skipped");
            return;
        }
        const [owner] = await tx.select().from(s.projectMembers).where(and(eq(s.projectMembers.id, row.enabledByMemberId), eq(s.projectMembers.role, "leader"), eq(s.projectMembers.projectId, projectId)));
        if (!owner) {
            await finishJob(tx, job, "skipped");
            return;
        }
        const members = await eligibleMembers(tx, projectId, date, row.settings.participantMemberIds, slot !== "morning");
        if (!members.length) {
            await finishJob(tx, job, "skipped");
            return;
        }
        const text = slot === "morning" ? "Chào ngày mới. Xem công việc và ghi kế hoạch hôm nay của bạn." : slot === "repeat" ? "Lời nhắc cuối ngày: bạn có thể gửi cập nhật ngắn về công việc, trở ngại và bước tiếp theo." : "Cùng cập nhật cuối ngày: đã làm gì, trở ngại và bước tiếp theo. Chưa có cập nhật công việc cũng là lựa chọn hợp lệ.";
        const target = `/app/projects/${encodeURIComponent(projectId)}/chat?workDate=${date}#daily-checkin`;
        if (row.settings.chatEnabled)
            await tx.insert(s.coordinatorEvents).values({ id: randomUUID(), projectId, eventType: slot === "morning" ? "morning_prompt" : "daily_checkin_prompt", occurrenceKey: job.dedupeKey, text, target, createdAt: now }).onConflictDoNothing();
        for (const member of members) {
            await tx.insert(s.checkinRequests).values({ id: randomUUID(), projectId, memberId: member.id, workDate: date, requestedAt: now, eligibility: { scheduleVersion: row.version, timezone: row.settings.timezone, slots: ["morning", "eod", ...(row.settings.repeatTime ? ["repeat"] : [])] } }).onConflictDoNothing();
            if (row.settings.appEnabled) {
                const [pref] = await tx.select().from(s.notificationPreferences).where(eq(s.notificationPreferences.userId, member.userId));
                const runAt = quietUntil(now, pref?.preferences ?? defaultNotificationPreference);
                if (runAt === now)
                    await addNotification(tx, projectId, member.userId, job.dedupeKey, slot === "morning" ? "morning_prompt" : "daily_checkin_prompt", text, target, now);
                else if (runAt < job.expiresAt)
                    await enqueue(tx, "notify", `notify:${job.id}:${member.userId}`, { userId: member.userId, workDate: date, slot, scheduleVersion: row.version, text, target }, projectId, runAt, job.expiresAt);
            }
        }
        await finishJob(tx, job);
    });
}
export async function dispatchDigests(db: Database, now = new Date().toISOString()) {
    const prefs = await db.select().from(s.notificationPreferences).where(isNull(s.notificationPreferences.suppressedAt));
    // Read all opted-in accounts by indexed user id; bounded per scheduler batch below.
    const enabled = prefs.filter(p => p.preferences.emailEnabled && !p.suppressedAt).slice(0, 100);
    for (const pref of enabled) {
        const p = localParts(now, pref.preferences.timezone);
        for (const slot of ["morning", "eod"] as const) {
            const scheduledFor = localInstant(p.date, slot === "morning" ? pref.preferences.morningTime : pref.preferences.eodTime, pref.preferences.timezone);
            if (scheduledFor > now || Date.parse(now) - Date.parse(scheduledFor) > 3600000)
                continue;
            const runAt = quietUntil(now, pref.preferences);
            if (Date.parse(runAt) > Date.parse(scheduledFor) + 3600000)
                continue;
            const memberships = await db.select().from(s.projectMembers).where(eq(s.projectMembers.userId, pref.userId));
            const entries: {
                projectId: string;
                memberId: string;
                workDate: string;
                scheduleVersion: number;
            }[] = [];
            for (const member of memberships) {
                const [setting] = await db.select().from(s.coordinatorSettings).where(eq(s.coordinatorSettings.projectId, member.projectId));
                if (!setting?.settings.enabled || !setting.settings.emailEnabled || setting.effectiveAt > scheduledFor)
                    continue;
                const projectDate = localParts(scheduledFor, setting.settings.timezone);
                if (!setting.settings.workdays.includes(projectDate.weekday) || setting.settings.holidays.includes(projectDate.date))
                    continue;
                if (projectDate.time < (slot === "morning" ? setting.settings.morningTime : setting.settings.eodTime))
                    continue;
                if (!(await eligibleMembers(db, member.projectId, projectDate.date, setting.settings.participantMemberIds, slot === "eod")).some(m => m.id === member.id))
                    continue;
                entries.push({ projectId: member.projectId, memberId: member.id, workDate: projectDate.date, scheduleVersion: setting.version });
            }
            if (entries.length)
                await enqueue(db, "email_digest", `digest:${pref.userId}:${p.date}:${slot}`, { userId: pref.userId, entries, slot, localDate: p.date }, null, runAt, new Date(Date.parse(scheduledFor) + 3600000).toISOString());
        }
    }
}
export async function delayedNotification(db: Database, job: Job) {
    await withLease(db, job, async (tx) => {
        if (job.payload.sourceDedupeKey) {
            const [member] = await tx.select().from(s.projectMembers).where(and(eq(s.projectMembers.userId, String(job.payload.userId)), eq(s.projectMembers.projectId, job.projectId!)));
            if (member && (job.payload.type !== "report_draft_ready" || member.role === "leader"))
                await tx.insert(s.notifications).values({ id: randomUUID(), recipientUserId: member.userId, projectId: job.projectId!, dedupeKey: String(job.payload.sourceDedupeKey), type: String(job.payload.type), text: String(job.payload.text), target: String(job.payload.target), createdAt: new Date().toISOString() }).onConflictDoNothing();
            await finishJob(tx, job, member ? "succeeded" : "skipped");
            return;
        }
        const [setting] = await tx.select().from(s.coordinatorSettings).where(eq(s.coordinatorSettings.projectId, job.projectId!));
        if (!setting?.settings.enabled || !setting.settings.appEnabled || setting.version !== job.payload.scheduleVersion) {
            await finishJob(tx, job, "skipped");
            return;
        }
        const members = await eligibleMembers(tx, job.projectId!, String(job.payload.workDate), setting.settings.participantMemberIds, job.payload.slot !== "morning");
        const member = members.find(m => m.userId === job.payload.userId);
        if (member)
            await addNotification(tx, job.projectId!, member.userId, job.dedupeKey, String(job.payload.slot) === "morning" ? "morning_prompt" : "daily_checkin_prompt", String(job.payload.text), String(job.payload.target));
        await finishJob(tx, job, member ? "succeeded" : "skipped");
    });
}
