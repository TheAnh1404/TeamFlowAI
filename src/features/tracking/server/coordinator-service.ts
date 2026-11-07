import "server-only";
import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { chatPostInputSchema, checkinInputSchema, defaultNotificationPreference, defaultSchedule, meetingInputSchema, memberPreferenceSchema, notificationPreferenceSchema, reportRequestSchema, settingsInputSchema, workDateSchema, type FeedItem } from "@/contracts/coordinator";
import type { Session } from "@/server/auth/contracts";
import { projectMember } from "@/server/auth/access";
import { getDb, type DataConnection, type Database } from "@/server/db/client";
import * as s from "@/server/db/schema";
import { commitMutation, mutationIdentity } from "@/server/db/mutations";
import { assert, conflict, notFound, HttpError } from "@/server/http/errors";
import { addDays, localParts, occurrences, quietUntil } from "@/server/automation/time";
import { enqueue, serializeProject } from "@/server/automation/queue";
export async function leader(db: DataConnection, session: Session, projectId: string) {
    const actor = await projectMember(db, session, projectId);
    assert(actor.role === "leader", 403, "FORBIDDEN", "Chỉ trưởng nhóm được thực hiện thao tác này.");
    return actor;
}
export async function getSettings(db: DataConnection, projectId: string) {
    const [settings] = await db.select().from(s.coordinatorSettings).where(eq(s.coordinatorSettings.projectId, projectId));
    if (settings)
        return settings;
    const [project] = await db.select().from(s.projects).where(eq(s.projects.id, projectId));
    if (!project)
        throw notFound();
    return { projectId, settings: { ...defaultSchedule, timezone: project.timeZone }, version: 0, enabledByMemberId: "", effectiveAt: new Date().toISOString(), nextRunAt: new Date().toISOString(), lastRunAt: null };
}
export async function addNotification(db: DataConnection, projectId: string, userId: string, dedupeKey: string, type: string, text: string, target: string, createdAt = new Date().toISOString()) {
    const [preference] = await db.select().from(s.notificationPreferences).where(eq(s.notificationPreferences.userId, userId));
    const runAt = quietUntil(createdAt, preference?.preferences ?? defaultNotificationPreference);
    if (runAt > createdAt) {
        await enqueue(db, "notify", `personal-notification:${userId}:${dedupeKey}`, { userId, type, text, target, sourceDedupeKey: dedupeKey }, projectId, runAt, new Date(Date.parse(createdAt) + 86400000).toISOString());
        return;
    }
    await db.insert(s.notifications).values({ id: randomUUID(), projectId, recipientUserId: userId, dedupeKey, type, text, target, createdAt }).onConflictDoNothing();
}
function cursor(value: string | null) {
    if (!value)
        return null;
    try {
        const parsed = JSON.parse(Buffer.from(value, "base64url").toString());
        assert(typeof parsed.t === "string" && Number.isFinite(Date.parse(parsed.t)) && typeof parsed.id === "string" && parsed.id.length <= 128, 422, "VALIDATION_ERROR", "Cursor không hợp lệ.");
        return { t: new Date(parsed.t).toISOString(), id: parsed.id as string };
    }
    catch {
        throw new HttpError(422, "VALIDATION_ERROR", "Cursor không hợp lệ.");
    }
}
const encode = (t: string, id: string) => Buffer.from(JSON.stringify({ t, id })).toString("base64url");
export function createCoordinatorService(db: Database = getDb()) {
    return {
        async post(session: Session, projectId: string, raw: unknown, key: string) {
            const input = chatPostInputSchema.parse(raw);
            await projectMember(db, session, projectId);
            return commitMutation(db, mutationIdentity(session.user.id, `chat:${projectId}`, key, input), async (tx) => {
                const actor = await projectMember(tx, session, projectId);
                await serializeProject(tx, projectId);
                const [task] = input.taskId ? await tx.select({ task: s.tasks }).from(s.tasks).innerJoin(s.plans, and(eq(s.plans.id, s.tasks.planId), eq(s.plans.status, "published"))).where(and(eq(s.tasks.id, input.taskId), eq(s.tasks.projectId, projectId))) : [];
                assert(!input.taskId || task, 422, "VALIDATION_ERROR", "Công việc chưa công bố hoặc không cùng dự án.");
                if (input.replyToId) {
                    const [reply] = await tx.select().from(s.chatPosts).where(and(eq(s.chatPosts.id, input.replyToId), eq(s.chatPosts.projectId, projectId)));
                    assert(reply, 422, "VALIDATION_ERROR", "Tin trích dẫn không thuộc dự án.");
                }
                const mentions = [...new Set(input.mentionMemberIds)];
                const recipients = mentions.length ? await tx.select().from(s.projectMembers).where(and(eq(s.projectMembers.projectId, projectId), inArray(s.projectMembers.id, mentions))) : [];
                assert(recipients.length === mentions.length, 422, "VALIDATION_ERROR", "Chỉ nhắc thành viên trong dự án.");
                const analyze = input.recordUpdate || /bị chặn|block|trở ngại|bắt đầu|đang làm|tiếp tục|gần xong|phần đó|xong rồi|hoàn thành/iu.test(input.content);
                const now = new Date().toISOString();
                const [post] = await tx.insert(s.chatPosts).values({ ...input, mentionMemberIds: mentions, id: randomUUID(), projectId, authorMemberId: actor.id, clientRequestId: key, taskVersionAtPost: task?.task.version ?? null, analysisStatus: analyze ? "queued" : "skipped", createdAt: now, updatedAt: now }).returning();
                if (analyze)
                    await enqueue(tx, "analyze_post", `analyze:${post.id}`, { postId: post.id }, projectId, now, new Date(Date.parse(now) + 86400000).toISOString());
                for (const recipient of recipients)
                    if (recipient.id !== actor.id)
                        await addNotification(tx, projectId, recipient.userId, `mention:${post.id}`, "mention", "Bạn được nhắc trong trao đổi dự án.", `/app/projects/${encodeURIComponent(projectId)}/chat#${post.id}`, now);
                return { ...post, analysis: null };
            });
        },
        async feed(session: Session, projectId: string, query: URLSearchParams) {
            await projectMember(db, session, projectId);
            const limit = Number(query.get("limit") ?? 50);
            assert(Number.isInteger(limit) && limit >= 1 && limit <= 100, 422, "VALIDATION_ERROR", "Limit từ 1 đến 100.");
            const after = cursor(query.get("after")), before = cursor(query.get("before"));
            assert(!(after && before), 422, "VALIDATION_ERROR", "Chọn một hướng phân trang.");
            const since = query.get("since");
            assert(!since || Number.isFinite(Date.parse(since)), 422, "VALIDATION_ERROR", "Mốc đồng bộ không hợp lệ.");
            const incremental = !!since || !!after;
            return db.transaction(async (connection) => {
                // Serialize the watermark with project feed writes, so a slow commit cannot
                // land behind the acknowledged cursor. The overlap also covers timestamp ties.
                await serializeProject(connection, projectId);
                await projectMember(connection, session, projectId);
                const now = new Date().toISOString();
                // A small overlapping watermark covers timestamp ties; clients merge by stable kind/id.
                const lower = since ? new Date(Date.parse(since) - 1000).toISOString() : null;
                const stamp = incremental ? sql `"updatedAt"` : sql `"createdAt"`;
                const rows = await connection.execute<{
                    kind: "post" | "event" | "legacy";
                    id: string;
                    createdAt: string;
                    updatedAt: string;
                }>(sql `
        SELECT kind,id,"createdAt","updatedAt" FROM (
          SELECT 'post' AS kind,id,"projectId","createdAt","updatedAt" FROM chat_posts
          UNION ALL SELECT 'event',id,"projectId","createdAt","createdAt" FROM coordinator_events
          UNION ALL SELECT 'legacy',id,"projectId","createdAt","createdAt" FROM messages WHERE "chatPostId" IS NULL
        ) feed WHERE "projectId"=${projectId}
        ${lower ? sql `AND "updatedAt" >= ${lower}::timestamptz` : sql ``}
        ${after ? sql `AND (${stamp},id) > (${after.t}::timestamptz,${after.id})` : sql ``}
        ${before ? sql `AND ("createdAt",id) < (${before.t}::timestamptz,${before.id})` : sql ``}
        ORDER BY ${stamp} ${incremental ? sql `ASC` : sql `DESC`},id ${incremental ? sql `ASC` : sql `DESC`} LIMIT ${limit + 1}`);
                const selected = rows.rows.slice(0, limit), ids = (kind: string) => selected.filter(r => r.kind === kind).map(r => r.id);
                const posts = ids("post").length ? await connection.select().from(s.chatPosts).where(inArray(s.chatPosts.id, ids("post"))) : [];
                const events = ids("event").length ? await connection.select().from(s.coordinatorEvents).where(inArray(s.coordinatorEvents.id, ids("event"))) : [];
                const messages = selected.length ? await connection.select().from(s.messages).where(sql `${s.messages.id} IN ${ids("legacy").length ? ids("legacy") : [""]} OR ${s.messages.chatPostId} IN ${ids("post").length ? ids("post") : [""]}`) : [];
                const items: FeedItem[] = [];
                for (const row of selected) {
                    if (row.kind === "post") {
                        const post = posts.find(p => p.id === row.id)!;
                        items.push({ kind: "post", id: post.id, createdAt: post.createdAt, post: { ...post, analysisStatus: post.analysisStatus as "queued", analysis: messages.find(m => m.chatPostId === post.id) ?? null } });
                    }
                    else if (row.kind === "event") {
                        const event = events.find(p => p.id === row.id)!;
                        items.push({ kind: "event", id: event.id, createdAt: event.createdAt, event });
                    }
                    else {
                        const message = messages.find(p => p.id === row.id)!;
                        items.push({ kind: "legacy", id: message.id, createdAt: message.createdAt, message });
                    }
                }
                const last = selected.at(-1), oldest = [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))[0];
                return { items: items.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)), cursor: last ? encode(new Date(incremental ? last.updatedAt : last.createdAt).toISOString(), last.id) : null, olderCursor: oldest ? encode(oldest.createdAt, oldest.id) : null, hasMore: rows.rows.length > limit, syncCursor: now };
            });
        },
        async checkins(session: Session, projectId: string, date: string) {
            await projectMember(db, session, projectId);
            workDateSchema.parse(date);
            const settings = await getSettings(db, projectId);
            const members = await db.select({ member: s.projectMembers, name: s.users.displayName }).from(s.projectMembers).innerJoin(s.users, eq(s.users.id, s.projectMembers.userId)).where(eq(s.projectMembers.projectId, projectId));
            const checkins = await db.select().from(s.dailyCheckins).where(and(eq(s.dailyCheckins.projectId, projectId), eq(s.dailyCheckins.workDate, date)));
            const revisions = await db.select().from(s.checkinRevisions).where(and(eq(s.checkinRevisions.projectId, projectId), eq(s.checkinRevisions.workDate, date))).orderBy(desc(s.checkinRevisions.revision));
            const requests = await db.select().from(s.checkinRequests).where(and(eq(s.checkinRequests.projectId, projectId), eq(s.checkinRequests.workDate, date)));
            const preferences = await db.select().from(s.memberCheckinPreferences).where(eq(s.memberCheckinPreferences.projectId, projectId));
            return members.map(({ member, name }) => {
                const checkin = checkins.find(c => c.memberId === member.id) ?? null;
                const pref = preferences.find(p => p.memberId === member.id);
                const status = revisions.some(r => r.memberId === member.id) ? "submitted" : pref && (!pref.participation || pref.pausedDates.includes(date)) ? "paused" : checkin ? "draft" : requests.some(r => r.memberId === member.id) ? "awaiting" : settings.settings.holidays.includes(date) ? "skipped" : "not_requested";
                // Other members see submitted revisions, never somebody else's unfinished draft.
                return { memberId: member.id, name, status, checkin: member.userId === session.user.id ? checkin : null, revisions: revisions.filter(r => r.memberId === member.id), requested: requests.some(r => r.memberId === member.id) };
            });
        },
        async saveCheckin(session: Session, projectId: string, date: string, raw: unknown, key: string, submit: boolean) {
            const input = checkinInputSchema.parse(raw);
            workDateSchema.parse(date);
            await projectMember(db, session, projectId);
            return commitMutation(db, mutationIdentity(session.user.id, `checkin:${projectId}:${date}:${submit}`, key, input), async (tx) => {
                const actor = await projectMember(tx, session, projectId);
                await serializeProject(tx, projectId);
                const settings = await getSettings(tx, projectId), now = new Date().toISOString(), today = localParts(now, settings.settings.timezone).date;
                assert(date <= today && date >= addDays(today, -6), 422, "VALIDATION_ERROR", "Chỉ cập nhật hôm nay và 6 ngày trước theo múi giờ dự án.");
                if (submit)
                    assert(input.payload.noWorkUpdate || input.payload.completedWork.length > 0, 422, "VALIDATION_ERROR", "Nhập việc đã làm hoặc chọn chưa có cập nhật.");
                for (const item of input.payload.completedWork)
                    if (item.taskId) {
                        const [task] = await tx.select().from(s.tasks).where(and(eq(s.tasks.projectId, projectId), eq(s.tasks.id, item.taskId)));
                        assert(task, 422, "VALIDATION_ERROR", "Công việc không thuộc dự án.");
                    }
                if (input.payload.sourcePostIds.length) {
                    const sources = await tx.select().from(s.chatPosts).where(and(eq(s.chatPosts.projectId, projectId), eq(s.chatPosts.authorMemberId, actor.id), inArray(s.chatPosts.id, [...new Set(input.payload.sourcePostIds)])));
                    assert(sources.length === new Set(input.payload.sourcePostIds).size, 422, "VALIDATION_ERROR", "Nguồn phải là tin nhắn của bạn trong dự án.");
                }
                for (const ref of input.payload.sourceEvidence) {
                    const table = ref.entity === "Submission" ? s.submissions : s.progressUpdates;
                    const [row] = await tx.select({ id: table.id }).from(table).where(and(eq(table.id, ref.id), eq(table.projectId, projectId), eq(table.authorMemberId, actor.id)));
                    assert(row, 422, "VALIDATION_ERROR", "Bằng chứng phải do bạn tạo trong dự án.");
                }
                const [current] = await tx.select().from(s.dailyCheckins).where(and(eq(s.dailyCheckins.projectId, projectId), eq(s.dailyCheckins.memberId, actor.id), eq(s.dailyCheckins.workDate, date))).for("update");
                if ((current?.version ?? 0) !== input.expectedVersion)
                    throw conflict();
                const revisionId = submit ? randomUUID() : current?.latestSubmittedRevisionId ?? null;
                const values = { id: current?.id ?? randomUUID(), projectId, memberId: actor.id, workDate: date, version: (current?.version ?? 0) + 1, draft: input.payload, latestSubmittedRevisionId: revisionId, updatedAt: now };
                if (current)
                    await tx.update(s.dailyCheckins).set(values).where(eq(s.dailyCheckins.id, current.id));
                else
                    await tx.insert(s.dailyCheckins).values(values);
                if (submit)
                    await tx.insert(s.checkinRevisions).values({ id: revisionId!, checkinId: values.id, projectId, memberId: actor.id, workDate: date, revision: values.version, payload: input.payload, submittedAt: now });
                const other = await tx.select().from(s.checkinRevisions).where(and(eq(s.checkinRevisions.memberId, actor.id), eq(s.checkinRevisions.workDate, date))).orderBy(desc(s.checkinRevisions.revision));
                const latest = [...new Map(other.map(r => [r.checkinId, other.find(x => x.checkinId === r.checkinId)!])).values()];
                const minutes = latest.reduce((sum, r) => sum + r.payload.completedWork.reduce((n, i) => n + (i.durationMinutes ?? 0), 0), 0);
                return { ...values, warning: minutes > 1440 ? "Tổng phút tự khai giữa các dự án vượt 1.440 phút; hãy kiểm tra trùng lặp." : null };
            });
        },
        async checkinSources(session: Session, projectId: string, date: string) {
            workDateSchema.parse(date);
            const actor = await projectMember(db, session, projectId), setting = await getSettings(db, projectId);
            const { localInstant } = await import("@/server/automation/time");
            const from = localInstant(date, "00:00", setting.settings.timezone), to = localInstant(addDays(date, 1), "00:00", setting.settings.timezone);
            const posts = await db.select({ id: s.chatPosts.id, text: s.chatPosts.content, taskId: s.chatPosts.taskId }).from(s.chatPosts).where(and(eq(s.chatPosts.projectId, projectId), eq(s.chatPosts.authorMemberId, actor.id), sql `${s.chatPosts.createdAt}>=${from}::timestamptz AND ${s.chatPosts.createdAt}<${to}::timestamptz`)).orderBy(desc(s.chatPosts.createdAt)).limit(30);
            const progress = await db.select({ id: s.progressUpdates.id, text: s.progressUpdates.note, taskId: s.progressUpdates.taskId }).from(s.progressUpdates).where(and(eq(s.progressUpdates.projectId, projectId), eq(s.progressUpdates.authorMemberId, actor.id), sql `${s.progressUpdates.createdAt}>=${from}::timestamptz AND ${s.progressUpdates.createdAt}<${to}::timestamptz`)).limit(30);
            const submissions = await db.select({ id: s.submissions.id, text: s.submissions.content, taskId: s.submissions.taskId }).from(s.submissions).where(and(eq(s.submissions.projectId, projectId), eq(s.submissions.authorMemberId, actor.id), sql `${s.submissions.submittedAt}>=${from}::timestamptz AND ${s.submissions.submittedAt}<${to}::timestamptz`)).limit(30);
            return [...posts.map(p => ({ ...p, entity: "ChatPost" as const })), ...progress.map(p => ({ ...p, entity: "ProgressUpdate" as const })), ...submissions.map(p => ({ ...p, entity: "Submission" as const }))];
        },
        async settings(session: Session, projectId: string) {
            const actor = await projectMember(db, session, projectId);
            const row = await getSettings(db, projectId), now = new Date().toISOString();
            const jobs = await db.select({ id: s.automationJobs.id, type: s.automationJobs.type, status: s.automationJobs.status, runAt: s.automationJobs.runAt, lastErrorCode: s.automationJobs.lastErrorCode }).from(s.automationJobs).where(eq(s.automationJobs.projectId, projectId)).orderBy(desc(s.automationJobs.createdAt)).limit(30);
            return { ...row, preview: occurrences(row.settings, projectId, now, new Date(Date.parse(now) + 7 * 86400000).toISOString()).slice(0, 10), jobs: actor.role === "leader" ? jobs : [], channels: { app: "available", chat: "available", email: process.env.RESEND_API_KEY && process.env.EMAIL_FROM ? "configured" : "not_configured", scheduler: process.env.COORDINATOR_AUTOMATION_ENABLED === "true" ? "enabled" : "disabled" } };
        },
        async updateSettings(session: Session, projectId: string, raw: unknown, key: string) {
            const input = settingsInputSchema.parse(raw);
            await leader(db, session, projectId);
            return commitMutation(db, mutationIdentity(session.user.id, `settings:${projectId}`, key, input), async (tx) => {
                const actor = await leader(tx, session, projectId);
                await serializeProject(tx, projectId);
                const current = await getSettings(tx, projectId);
                if (current.version !== input.expectedVersion)
                    throw conflict();
                const members = await tx.select().from(s.projectMembers).where(eq(s.projectMembers.projectId, projectId));
                assert(input.settings.participantMemberIds.every(id => members.some(m => m.id === id)), 422, "VALIDATION_ERROR", "Người tham gia phải thuộc dự án.");
                const now = new Date().toISOString();
                const values = { projectId, settings: input.settings, version: current.version + 1, enabledByMemberId: actor.id, effectiveAt: now, nextRunAt: now, lastRunAt: null };
                await tx.insert(s.coordinatorSettings).values(values).onConflictDoUpdate({ target: s.coordinatorSettings.projectId, set: values });
                return values;
            });
        },
        async memberPreference(session: Session, projectId: string, raw?: unknown) {
            const actor = await projectMember(db, session, projectId);
            if (raw !== undefined) {
                const input = memberPreferenceSchema.parse(raw);
                await db.insert(s.memberCheckinPreferences).values({ memberId: actor.id, projectId, ...input }).onConflictDoUpdate({ target: s.memberCheckinPreferences.memberId, set: input });
            }
            const [row] = await db.select().from(s.memberCheckinPreferences).where(eq(s.memberCheckinPreferences.memberId, actor.id));
            return row ?? { participation: true, pausedDates: [] };
        },
        async preferences(session: Session, raw?: unknown) {
            if (raw !== undefined) {
                const preferences = notificationPreferenceSchema.parse(raw);
                await db.insert(s.notificationPreferences).values({ userId: session.user.id, preferences }).onConflictDoUpdate({ target: s.notificationPreferences.userId, set: { preferences } });
            }
            const [row] = await db.select().from(s.notificationPreferences).where(eq(s.notificationPreferences.userId, session.user.id));
            const [user] = await db.select({ verifiedAt: s.users.emailVerifiedAt }).from(s.users).where(eq(s.users.id, session.user.id));
            return { preferences: row?.preferences ?? defaultNotificationPreference, emailVerified: !!user?.verifiedAt, suppressed: !!row?.suppressedAt };
        },
        async inbox(session: Session, query: URLSearchParams) {
            const c = cursor(query.get("cursor")), projectId = query.get("projectId");
            const rows = await db.select({ notification: s.notifications }).from(s.notifications).innerJoin(s.projectMembers, and(eq(s.projectMembers.projectId, s.notifications.projectId), eq(s.projectMembers.userId, session.user.id)))
                .where(and(eq(s.notifications.recipientUserId, session.user.id), projectId ? eq(s.notifications.projectId, projectId) : undefined, c ? sql `(${s.notifications.createdAt},${s.notifications.id}) < (${c.t}::timestamptz,${c.id})` : undefined)).orderBy(desc(s.notifications.createdAt), desc(s.notifications.id)).limit(51);
            const count = await db.select({ count: sql<number> `count(*)::int` }).from(s.notifications).innerJoin(s.projectMembers, and(eq(s.projectMembers.projectId, s.notifications.projectId), eq(s.projectMembers.userId, session.user.id))).where(and(eq(s.notifications.recipientUserId, session.user.id), isNull(s.notifications.readAt), projectId ? eq(s.notifications.projectId, projectId) : undefined));
            const items = rows.slice(0, 50).map(r => r.notification), last = items.at(-1);
            return { items, unread: count[0].count, cursor: rows.length > 50 && last ? encode(last.createdAt, last.id) : null };
        },
        async readNotification(session: Session, id: string) {
            const [row] = await db.select().from(s.notifications).where(and(eq(s.notifications.id, id), eq(s.notifications.recipientUserId, session.user.id)));
            if (!row)
                throw notFound();
            await projectMember(db, session, row.projectId);
            await db.update(s.notifications).set({ readAt: row.readAt ?? new Date().toISOString() }).where(eq(s.notifications.id, id));
            return { read: true };
        },
        async meetings(session: Session, projectId: string) { await projectMember(db, session, projectId); return db.select().from(s.projectMeetings).where(eq(s.projectMeetings.projectId, projectId)).orderBy(s.projectMeetings.startsAt); },
        async saveMeeting(session: Session, projectId: string, id: string | null, raw: unknown, key: string) {
            const input = meetingInputSchema.parse(raw);
            await leader(db, session, projectId);
            input.startsAt = new Date(input.startsAt).toISOString();
            if (input.periodStart)
                input.periodStart = new Date(input.periodStart).toISOString();
            return commitMutation(db, mutationIdentity(session.user.id, `meeting:${projectId}:${id ?? "new"}`, key, input), async (tx) => {
                const actor = await leader(tx, session, projectId);
                await serializeProject(tx, projectId);
                const [current] = id ? await tx.select().from(s.projectMeetings).where(and(eq(s.projectMeetings.id, id), eq(s.projectMeetings.projectId, projectId))).for("update") : [];
                if (id && !current)
                    throw notFound();
                if ((current?.version ?? 0) !== input.expectedVersion)
                    throw conflict();
                const now = new Date().toISOString();
                assert(input.canceled || Date.parse(input.startsAt) > Date.parse(now), 422, "VALIDATION_ERROR", "Cuộc họp phải ở tương lai.");
                assert(!input.periodStart || Date.parse(input.periodStart) < Date.parse(input.startsAt), 422, "VALIDATION_ERROR", "Mốc bắt đầu phải trước cuộc họp.");
                const { expectedVersion: _version, canceled, prepareNow, ...data } = input;
                void _version;
                const values = { ...data, id: id ?? randomUUID(), projectId, configuredByMemberId: actor.id, version: (current?.version ?? 0) + 1, canceledAt: canceled ? now : null, createdAt: current?.createdAt ?? now };
                await tx.insert(s.projectMeetings).values(values).onConflictDoUpdate({ target: s.projectMeetings.id, set: values });
                if (!canceled) {
                    const scheduled = new Date(Date.parse(input.startsAt) - input.leadMinutes * 60000).toISOString();
                    assert(scheduled > now || prepareNow, 422, "PREPARE_NOW_REQUIRED", "Mốc chuẩn bị đã qua. Chọn Soạn ngay.");
                    await enqueue(tx, "report", `meeting:${values.id}:${values.version}`, { meetingId: values.id, meetingVersion: values.version }, projectId, prepareNow ? now : scheduled, input.startsAt);
                }
                return values;
            });
        },
        async requestReport(session: Session, projectId: string, raw: unknown, key: string) {
            const input = reportRequestSchema.parse(raw);
            await leader(db, session, projectId);
            input.periodStart = new Date(input.periodStart).toISOString();
            input.periodEnd = new Date(input.periodEnd).toISOString();
            assert(input.periodStart < input.periodEnd && Date.parse(input.periodEnd) <= Date.now(), 422, "VALIDATION_ERROR", "Kỳ phải là [bắt đầu,kết thúc) và không ở tương lai.");
            return commitMutation(db, mutationIdentity(session.user.id, `report:${projectId}`, key, input), async (tx) => {
                const actor = await leader(tx, session, projectId), now = new Date().toISOString(), id = randomUUID();
                const [report] = await tx.insert(s.coordinatorReportRuns).values({ id, projectId, requestedByMemberId: actor.id, trigger: "manual", dedupeKey: `manual:${projectId}:${session.user.id}:${key}`, ...input, status: "queued", version: 1, summaryHistory: [], metadata: {}, createdAt: now }).returning();
                await enqueue(tx, "report", `report:${id}`, { reportId: id }, projectId, now, new Date(Date.parse(now) + 86400000).toISOString());
                return report;
            });
        },
    };
}
