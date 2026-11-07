import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHmac } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { and, eq, sql } from "drizzle-orm";
import * as s from "../src/server/db/schema";
import type { Database } from "../src/server/db/client";
import type { Session } from "../src/server/auth/contracts";
import { createCoordinatorService } from "../src/features/tracking/server/coordinator-service";
import { createReportV2Service, freezeSnapshot, generateCoordinatorReport } from "../src/features/delivery/server/coordinator-reports";
import { analyzePost } from "../src/server/automation/chat-worker";
import { claimJob, enqueue, finishJob, withLease, failJob } from "../src/server/automation/queue";
import { dispatch, reminder, dispatchDigests } from "../src/server/automation/dispatcher";
import { deliverEmail, handleEmailWebhook, verifyEmailSignature } from "../src/server/notifications/email";
import { localInstant, localParts, occurrences, quietUntil, weekStart } from "../src/server/automation/time";
import { validateReportV2 } from "../src/server/ai/coordinator-validator";
import { defaultSchedule, defaultNotificationPreference, emptyCheckin, feedPageSchema, chatPostInputSchema, reportArtifactV2Schema, checkinDayRowSchema } from "../src/contracts/coordinator";
import { HttpError } from "../src/server/http/errors";
import { requestEmailVerification, confirmEmailVerification, deliverVerification } from "../src/server/notifications/verification";
import type { Coordinator } from "../src/features/tracking/server/coordinator";
import { internalTick } from "../src/server/automation/http";
import { runJob } from "../src/server/automation/worker";
const pg = new PGlite(), db = drizzle(pg, { schema: s }) as unknown as Database, service = createCoordinatorService(db), reports = createReportV2Service(db);
const now = new Date().toISOString(), date = localParts(now, "Asia/Ho_Chi_Minh").date;
const leader: Session = { user: { id: "u1", displayName: "Leader", createdAt: now }, memberships: [] }, member: Session = { user: { id: "u2", displayName: "Member", createdAt: now }, memberships: [] }, outsider: Session = { user: { id: "u3", displayName: "Outside", createdAt: now }, memberships: [] };
const key = () => crypto.randomUUID();
let sequence = 0;
const errorCode = (code: string) => (e: unknown) => e instanceof HttpError && e.code === code;
before(async () => {
    const journal = JSON.parse(await readFile("drizzle/meta/_journal.json", "utf8"));
    for (const entry of journal.entries)
        await pg.exec(await readFile(`drizzle/${entry.tag}.sql`, "utf8"));
    await db.insert(s.users).values([leader, member, outsider].map(actor => ({ ...actor.user, email: `${actor.user.id}@example.com`, emailVerifiedAt: now })));
    await db.insert(s.projects).values(["p1", "p2"].map(id => ({ id, name: id, goal: "Test", deliverables: ["demo"], deadline: "2027-01-01T00:00:00Z", timeZone: "Asia/Ho_Chi_Minh", createdAt: now })));
    await db.insert(s.projectMembers).values([{ id: "m1", projectId: "p1", userId: "u1", role: "leader", canAccept: true, skills: [], availableHoursPerWeek: 10 }, { id: "m2", projectId: "p1", userId: "u2", role: "member", canAccept: false, skills: [], availableHoursPerWeek: 10 }, { id: "m3", projectId: "p2", userId: "u3", role: "leader", canAccept: true, skills: [], availableHoursPerWeek: 10 }]);
    await db.insert(s.plans).values({ id: "plan", projectId: "p1", status: "published", version: 1, draftTasks: [], aiMode: "mock", approvedByMemberId: "m1", publishedAt: now, createdAt: now });
});
after(async () => { await pg.close(); });
async function task() { const [t] = await db.insert(s.tasks).values({ id: `t${++sequence}`, projectId: "p1", planId: "plan", title: "Task", description: "Test", assigneeMemberId: "m2", deadline: "2027-01-01T00:00:00Z", criteria: [{ id: "c1", text: "Evidence" }], dependencyTaskIds: [], status: "todo", version: 1, createdAt: new Date().toISOString() }).returning(); return t; }
async function claim(type: string) {
    // Isolate the requested test job while retaining other rows for assertions.
    await db.update(s.automationJobs).set({ runAt: "2099-01-01T00:00:00Z" }).where(sql `${s.automationJobs.type} <> ${type}`);
    const result = await claimJob(db, new Date().toISOString());
    assert(result);
    return result;
}
test("additive migrations, constraints and baseline leave existing auth usable", async () => {
    assert.equal((await db.select().from(s.users)).length, 3);
    await assert.rejects(db.insert(s.chatPosts).values({ id: key(), projectId: "p2", authorMemberId: "m2", content: "bad", taskId: null, mentionMemberIds: [], recordUpdate: false, clientRequestId: key(), analysisStatus: "queued", createdAt: now, updatedAt: now }));
});
test("raw chat commits immediately; social chat has no AI job; replay/concurrency dedupes", async () => {
    const id = key(), input = { content: "Xin chào", mentionMemberIds: ["m1"] };
    const [a, b] = await Promise.all([service.post(member, "p1", input, id), service.post(member, "p1", input, id)]);
    assert.deepEqual(a, b);
    assert.equal(a.analysisStatus, "skipped");
    assert.equal((await db.select().from(s.notifications)).length, 1);
    await assert.rejects(service.post(member, "p1", { content: "khác" }, id), errorCode("IDEMPOTENCY_CONFLICT"));
    await assert.rejects(service.post(outsider, "p1", input, key()), errorCode("NOT_FOUND"));
    await assert.rejects(service.post(member, "p1", { content: "test", authorMemberId: "m1" }, key()));
    await assert.rejects(service.post(member, "p1", { content: "test", mentionMemberIds: ["m3"] }, key()), errorCode("VALIDATION_ERROR"));
    assert.equal(chatPostInputSchema.safeParse({ content: "a".repeat(8001) }).success, false);
});
test("AI outage leaves persisted post; analysis retries only once into a domain message", async () => {
    const t = await task(), post = await service.post(member, "p1", { content: "đang làm", taskId: t.id }, key()), job = await claim("analyze_post");
    await assert.rejects(analyzePost(db, job, async () => { throw new Error("outage"); }));
    assert.equal((await db.select().from(s.chatPosts).where(eq(s.chatPosts.id, post.id))).length, 1);
    const coordinator: Coordinator = async () => ({ proposal: { intent: "update", taskId: t.id, requestedStatus: "in_progress" }, aiMode: "mock" });
    await analyzePost(db, job, coordinator);
    assert.equal((await db.select().from(s.tasks).where(eq(s.tasks.id, t.id)))[0].status, "in_progress");
    assert.equal((await db.select().from(s.messages).where(eq(s.messages.chatPostId, post.id))).length, 1);
    await assert.rejects(analyzePost(db, job, coordinator), errorCode("LEASE_LOST"));
    const feed = await service.feed(member, "p1", new URLSearchParams());
    assert(feedPageSchema.safeParse(feed).success);
    assert.equal(feed.items.filter(i => i.kind === "post" && i.id === post.id).length, 1);
    assert(!feed.items.some(i => i.kind === "legacy" && i.message.content === "đang làm"));
});
test("stale task versions and delayed posts require explicit clarification", async () => {
    const t = await task(), post = await service.post(member, "p1", { content: "bị chặn vì API", taskId: t.id }, key());
    await db.update(s.tasks).set({ version: 2, status: "in_progress" }).where(eq(s.tasks.id, t.id));
    const job = await claim("analyze_post");
    await analyzePost(db, job, async () => ({ proposal: { intent: "update", taskId: t.id, requestedStatus: "blocked", blocker: "API" }, aiMode: "mock" }));
    const [m] = await db.select().from(s.messages).where(eq(s.messages.chatPostId, post.id));
    assert.equal(m.resolution, "clarification_required");
    assert.equal((await db.select().from(s.tasks).where(eq(s.tasks.id, t.id)))[0].status, "in_progress");
});
test("feed pagination, overlapping incremental sync, invalid cursors and project scoping", async () => {
    for (let n = 0; n < 5; n++)
        await service.post(member, "p1", { content: `history ${n}` }, key());
    const a = await service.feed(member, "p1", new URLSearchParams({ limit: "2" }));
    assert.equal(a.items.length, 2);
    assert(a.hasMore);
    const b = await service.feed(member, "p1", new URLSearchParams({ limit: "2", before: a.olderCursor! }));
    assert(!b.items.some(i => a.items.some(j => j.id === i.id)));
    const post = await service.post(member, "p1", { content: "new" }, key());
    const delta = await service.feed(member, "p1", new URLSearchParams({ since: a.syncCursor }));
    assert(delta.items.some(i => i.id === post.id));
    await assert.rejects(service.feed(outsider, "p1", new URLSearchParams()), errorCode("NOT_FOUND"));
    await assert.rejects(service.feed(member, "p1", new URLSearchParams({ after: "garbage" })), errorCode("VALIDATION_ERROR"));
});
test("check-in draft, submit, append-only revisions, unknown minutes, version conflict and date policy", async () => {
    const payload = { ...emptyCheckin, completedWork: [{ id: "work-a", text: "Hỗ trợ kiểm thử", taskId: null, durationMinutes: null }] };
    const first = await service.saveCheckin(member, "p1", date, { expectedVersion: 0, payload }, key(), false);
    assert.equal(first.version, 1);
    const id = key(), input = { expectedVersion: 1, payload };
    const submitted = await service.saveCheckin(member, "p1", date, input, id, true);
    assert.equal(submitted.version, 2);
    assert.deepEqual(await service.saveCheckin(member, "p1", date, input, id, true), submitted);
    await assert.rejects(service.saveCheckin(member, "p1", date, input, key(), true), errorCode("VERSION_CONFLICT"));
    await service.saveCheckin(member, "p1", date, { expectedVersion: 2, payload: { ...payload, completedWork: [{ ...payload.completedWork[0], text: "Đã bổ sung", durationMinutes: 45 }] } }, key(), true);
    const rows = await service.checkins(leader, "p1", date), row = rows.find(r => r.memberId === "m2")!;
    assert(rows.every(row => checkinDayRowSchema.safeParse(row).success));
    assert.equal(row.revisions.length, 2);
    assert.equal(row.checkin, null);
    await assert.rejects(db.update(s.checkinRevisions).set({ revision: 99 }));
    await assert.rejects(service.saveCheckin(member, "p1", "2099-01-01", { expectedVersion: 0, payload }, key(), true), errorCode("VALIDATION_ERROR"));
    await assert.rejects(service.saveCheckin(member, "p1", date, { expectedVersion: 3, payload: { ...payload, completedWork: [{ ...payload.completedWork[0], durationMinutes: 1441 }] } }, key(), true));
    await assert.rejects(service.saveCheckin(member, "p1", date, { expectedVersion: 3, payload: { ...payload, sourcePostIds: ["foreign-post"] } }, key(), true), errorCode("VALIDATION_ERROR"));
});
test("one logical check-in cannot be submitted twice by concurrent writers", async () => {
    const input = { expectedVersion: 0, payload: { ...emptyCheckin, noWorkUpdate: true } };
    const results = await Promise.allSettled([service.saveCheckin(leader, "p1", date, input, key(), true), service.saveCheckin(leader, "p1", date, input, key(), true)]);
    assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
});
test("scheduler computes DST gaps/overlaps, half-open weeks and overnight quiet hours", () => {
    assert.equal(localInstant("2026-11-07", "09:00", "Asia/Ho_Chi_Minh"), "2026-11-07T02:00:00.000Z");
    assert.equal(localInstant("2026-03-08", "02:30", "America/New_York"), "2026-03-08T07:00:00.000Z");
    assert.equal(localInstant("2026-11-01", "01:30", "America/New_York"), "2026-11-01T05:30:00.000Z");
    assert.equal(weekStart("2026-11-06", "Asia/Ho_Chi_Minh"), "2026-11-01T17:00:00.000Z");
    assert.equal(quietUntil("2026-11-07T16:00:00Z", defaultNotificationPreference), "2026-11-08T01:00:00.000Z");
    const schedule = { ...defaultSchedule, enabled: true };
    const a = occurrences(schedule, "p", "2026-11-06T01:59:00Z", "2026-11-06T02:01:00Z");
    assert.equal(a.length, 1);
    assert.equal(a[0].slot, "morning");
    assert.equal(occurrences({ ...schedule, holidays: ["2026-11-06"] }, "p", "2026-11-06T01:59:00Z", "2026-11-06T02:01:00Z").length, 0);
});
test("job dedupe, lease reclaim and fencing reject an obsolete worker", async () => {
    const start = new Date().toISOString(), expires = new Date(Date.now() + 3600000).toISOString(), id = key();
    await enqueue(db, "notify", id, {}, "p1", start, expires);
    assert.equal(await enqueue(db, "notify", id, {}, "p1", start, expires), null);
    const first = await claim("notify");
    assert(first.claimToken);
    await db.update(s.automationJobs).set({ lockedUntil: "2020-01-01T00:00:00Z" }).where(eq(s.automationJobs.id, first.id));
    const second = await claim("notify");
    assert.notEqual(first.claimToken, second.claimToken);
    await assert.rejects(withLease(db, first, tx => finishJob(tx, first)), errorCode("LEASE_LOST"));
    await withLease(db, second, tx => finishJob(tx, second));
});
test("retry uses bounded backoff and permanent errors need attention", async () => {
    const id = key(), start = new Date().toISOString();
    await enqueue(db, "notify", id, {}, "p1", start, "2099-01-01T00:00:00Z");
    const job = await claim("notify");
    await failJob(db, job, new HttpError(422, "BAD_CONFIG", "bad"));
    const [row] = await db.select().from(s.automationJobs).where(eq(s.automationJobs.id, job.id));
    assert.equal(row.status, "attention");
    assert.equal(row.lastErrorCode, "BAD_CONFIG");
});
test("settings are leader-only, optimistic and enabling after a slot does not backfill", async () => {
    await assert.rejects(service.updateSettings(member, "p1", { expectedVersion: 0, settings: defaultSchedule }, key()), errorCode("FORBIDDEN"));
    const settings = await service.updateSettings(leader, "p1", { expectedVersion: 0, settings: { ...defaultSchedule, enabled: true, workdays: [1, 2, 3, 4, 5, 6, 7] } }, key());
    await dispatch(db, new Date().toISOString());
    assert.equal((await db.select().from(s.automationJobs).where(eq(s.automationJobs.type, "reminder"))).length, 0);
    await assert.rejects(service.updateSettings(leader, "p1", { expectedVersion: 0, settings: settings.settings }, key()), errorCode("VERSION_CONFLICT"));
});
test("reminder creates one chat event and skips members who submitted; requests keep historical eligibility", async () => {
    const row = await service.settings(leader, "p1"), run = new Date().toISOString();
    // Both existing members submitted today; no individual or common reminder is required.
    await enqueue(db, "reminder", key(), { workDate: date, slot: "eod", scheduleVersion: row.version }, "p1", run, "2099-01-01T00:00:00Z");
    const job = await claim("reminder");
    await reminder(db, job);
    const [saved] = await db.select().from(s.automationJobs).where(eq(s.automationJobs.id, job.id));
    assert.equal(saved.status, "skipped");
    await enqueue(db, "reminder", key(), { workDate: date, slot: "morning", scheduleVersion: row.version }, "p1", run, "2099-01-01T00:00:00Z");
    const morning = await claim("reminder");
    await reminder(db, morning);
    assert.equal((await db.select().from(s.coordinatorEvents).where(eq(s.coordinatorEvents.eventType, "morning_prompt"))).length, 1);
    assert.equal((await db.select().from(s.checkinRequests)).length, 2);
});
test("snapshot freezes latest submitted revision once; unknown vs declared minutes and current status remain distinct", async () => {
    const start = new Date(Date.now() - 86400000).toISOString();
    const frozen = await db.transaction(tx => freezeSnapshot(tx, "p1", start, null, "Asia/Ho_Chi_Minh"), { isolationLevel: "repeatable read" });
    const rollup = frozen.metrics.memberRollup as {
        id: string;
        selfReportedMinutes: number | null;
    }[];
    assert.equal(rollup.find(r => r.id === "m2")!.selfReportedMinutes, 45);
    assert.equal(rollup.find(r => r.id === "m1")!.selfReportedMinutes, null);
    assert.equal(frozen.snapshot.sources.filter(r => r.entity === "CheckinRevision" && r.data.memberId === "m2").length, 1);
    const copy = JSON.stringify(frozen);
    const t = await task();
    await db.update(s.tasks).set({ status: "in_progress", version: 2 }).where(eq(s.tasks.id, t.id));
    assert.equal(JSON.stringify(frozen), copy);
    assert((await db.select().from(s.taskActivityEvents).where(eq(s.taskActivityEvents.taskId, t.id))).length >= 2);
    await assert.rejects(db.delete(s.taskActivityEvents).where(eq(s.taskActivityEvents.taskId, t.id)));
});
test("report jobs save a frozen draft, gate access, publish explicit revision, preserve sources after edits", async () => {
    const raw = { periodStart: new Date(Date.now() - 86400000).toISOString(), periodEnd: new Date().toISOString() };
    const created = await service.requestReport(leader, "p1", raw, key()), job = await claim("report");
    await generateCoordinatorReport(db, job);
    const report = await reports.get(leader, created.id);
    reportArtifactV2Schema.parse(report);
    assert.equal(report.status, "draft");
    assert(report.snapshot);
    assert.equal(report.aiMode, "mock");
    await assert.rejects(reports.get(member, created.id), errorCode("NOT_FOUND"));
    assert(!(await reports.list(member, "p1")).some(r => r.id === created.id));
    await assert.rejects(reports.publish(member, created.id, 1, key()), errorCode("NOT_FOUND"));
    const frozen = report.snapshot;
    const published = await reports.publish(leader, created.id, report.version, key());
    assert.equal(published.status, "published");
    assert.deepEqual((await reports.get(member, created.id)).snapshot, frozen);
    await assert.rejects(db.update(s.coordinatorReportRuns).set({ metrics: { fake: 100 } }).where(eq(s.coordinatorReportRuns.id, created.id)));
    await assert.rejects(reports.source(member, created.id, { entity: "ChatPost", id: "elsewhere" }), errorCode("NOT_FOUND"));
});
test("AI validation rejects invented sources, quotes and unsupported metric numbers", async () => {
    const frozen = await db.transaction(tx => freezeSnapshot(tx, "p1", new Date(Date.now() - 86400000).toISOString(), null, "Asia/Ho_Chi_Minh"));
    const input = { snapshot: frozen.snapshot, metrics: frozen.metrics };
    assert.throws(() => validateReportV2([{ text: "Số liệu 987654321", sourceRefs: [], metricKeys: ["statusCounts"], quotes: [] }], input));
    assert.throws(() => validateReportV2([{ text: "bad", sourceRefs: [{ entity: "ChatPost", id: "foreign" }], metricKeys: [], quotes: [] }], input));
    const ref = frozen.snapshot.sources.find(s => s.entity === "Task")!;
    assert.throws(() => validateReportV2([{ text: "bad", sourceRefs: [{ entity: ref.entity, id: ref.id }], metricKeys: [], quotes: [{ source: { entity: ref.entity, id: ref.id }, quote: "made-up-evidence" }] }], input));
});
test("meeting changes cancel obsolete jobs; future/prepare-now validation and membership apply", async () => {
    const input = { title: "Weekly sync", startsAt: new Date(Date.now() + 3600000).toISOString(), timezone: "Asia/Ho_Chi_Minh", leadMinutes: 30, periodMode: "week", periodStart: null, canceled: false, prepareNow: false, expectedVersion: 0 };
    await assert.rejects(service.saveMeeting(member, "p1", null, input, key()), errorCode("FORBIDDEN"));
    const meeting = await service.saveMeeting(leader, "p1", null, input, key());
    assert.equal(meeting.version, 1);
    await service.saveMeeting(leader, "p1", meeting.id, { ...input, canceled: true, expectedVersion: 1 }, key());
    const [queued] = await db.select().from(s.automationJobs).where(eq(s.automationJobs.dedupeKey, `meeting:${meeting.id}:1`));
    await db.update(s.automationJobs).set({ runAt: new Date().toISOString() }).where(eq(s.automationJobs.id, queued.id));
    const job = await claim("report");
    await generateCoordinatorReport(db, job);
    assert.equal((await db.select().from(s.coordinatorReportRuns).where(eq(s.coordinatorReportRuns.dedupeKey, job.dedupeKey))).length, 0);
});
test("notification owner checks and revoked membership do not expose inbox", async () => {
    const inbox = await service.inbox(leader, new URLSearchParams());
    assert(inbox.items.length);
    await assert.rejects(service.readNotification(member, inbox.items[0].id), errorCode("NOT_FOUND"));
    await service.readNotification(leader, inbox.items[0].id);
    await service.readNotification(leader, inbox.items[0].id);
});
test("email verification/opt-in gate skips unverified recipients without claiming delivered", async () => {
    process.env.APP_ORIGIN = "http://localhost:3000";
    process.env.EMAIL_FROM = "TeamFlow <sender@example.com>";
    process.env.EMAIL_SANDBOX_ALLOWLIST = "u2@example.com";
    await service.preferences(member, { ...defaultNotificationPreference, emailEnabled: true, quietStart: "00:00", quietEnd: "00:00" });
    await db.update(s.users).set({ emailVerifiedAt: null }).where(eq(s.users.id, "u2"));
    await enqueue(db, "email_digest", key(), { userId: "u2", entries: [], slot: "eod" }, null, new Date().toISOString(), "2099-01-01T00:00:00Z");
    const job = await claim("email_digest");
    let calls = 0;
    await deliverEmail(db, job, async () => { calls++; return { id: "provider-1" }; });
    assert.equal(calls, 0);
    assert.equal((await db.select().from(s.emailDeliveries).where(eq(s.emailDeliveries.jobId, job.id))).length, 0);
    await db.update(s.users).set({ emailVerifiedAt: now }).where(eq(s.users.id, "u2"));
});
test("webhook signature validates raw payload, timestamp and rejects forgeries", () => {
    const secret = "whsec_" + Buffer.from("test-webhook-secret").toString("base64"), payload = '{"type":"email.delivered","data":{"email_id":"mail-1"}}', timestamp = String(Math.floor(Date.now() / 1000)), id = "event-1";
    const signature = createHmac("sha256", Buffer.from("test-webhook-secret")).update(`${id}.${timestamp}.${payload}`).digest("base64"), headers = new Headers({ "svix-id": id, "svix-timestamp": timestamp, "svix-signature": `v1,${signature}` });
    assert.equal(verifyEmailSignature(payload, headers, secret), id);
    assert.throws(() => verifyEmailSignature(payload + " ", headers, secret));
    assert.throws(() => verifyEmailSignature(payload, headers, secret, Date.now() + 600000));
    // Reference vector from the Svix manual verification documentation.
    assert.equal(verifyEmailSignature('{"event_type":"ping","data":{"success":true}}', new Headers({ "svix-id": "msg_loFOjxBNrRLzqYUf", "svix-timestamp": "1731705121", "svix-signature": "v1,rAvfW3dJ/X/qxhsaXPOyyCGmRKsaKWcsNccKXlIktD0=" }), "whsec_plJ3nmyCDGBKInavdOK15jsl", 1731705121000), "msg_loFOjxBNrRLzqYUf");
});
async function claimSpecific(dedupeKey: string) {
    const [target] = await db.select().from(s.automationJobs).where(eq(s.automationJobs.dedupeKey, dedupeKey));
    assert(target);
    await db.update(s.automationJobs).set({ runAt: "2099-01-01T00:00:00Z" }).where(sql `${s.automationJobs.id} <> ${target.id}`);
    await db.update(s.automationJobs).set({ runAt: new Date().toISOString() }).where(eq(s.automationJobs.id, target.id));
    const job = await claimJob(db, new Date().toISOString());
    assert(job);
    assert.equal(job.id, target.id);
    return job;
}
test("email uncertain retries keep provider key/payload; accepted differs from delivered, webhook dedupes and suppresses", async () => {
    await service.preferences(member, { ...defaultNotificationPreference, reportsEmailEnabled: true, quietStart: "00:00", quietEnd: "00:00" });
    const [report] = await db.select().from(s.coordinatorReportRuns).where(eq(s.coordinatorReportRuns.status, "published"));
    const id = key(), now = new Date().toISOString();
    await enqueue(db, "email_report", id, { userId: "u2", reportId: report.id, draft: false }, "p1", now, "2099-01-01T00:00:00Z");
    const job = await claimSpecific(id), calls: {
        key: string;
        body: unknown;
    }[] = [];
    await assert.rejects(deliverEmail(db, job, async (body, key) => { calls.push({ key, body }); throw new HttpError(503, "EMAIL_DELIVERY_UNCERTAIN", "timeout"); }));
    const [uncertain] = await db.select().from(s.emailDeliveries).where(eq(s.emailDeliveries.jobId, job.id));
    assert.equal(uncertain.status, "uncertain");
    await deliverEmail(db, job, async (body, key) => { calls.push({ key, body }); return { id: "mail-accepted" }; });
    assert.deepEqual(calls[0], calls[1]);
    assert.equal((await db.select().from(s.emailDeliveries).where(eq(s.emailDeliveries.jobId, job.id)))[0].status, "accepted");
    const secret = "whsec_" + Buffer.from("webhook-secret").toString("base64");
    process.env.RESEND_WEBHOOK_SECRET = secret;
    function request(type: string, id: string) { const body = JSON.stringify({ type, data: { email_id: "mail-accepted" } }), timestamp = String(Math.floor(Date.now() / 1000)), signature = createHmac("sha256", Buffer.from("webhook-secret")).update(`${id}.${timestamp}.${body}`).digest("base64"); return new Request("http://localhost/api/webhooks/email", { method: "POST", headers: { "svix-id": id, "svix-timestamp": timestamp, "svix-signature": `v1,${signature}` }, body }); }
    await handleEmailWebhook(db, request("email.delivered", "evt-delivery"));
    await handleEmailWebhook(db, request("email.delivered", "evt-delivery"));
    assert.equal((await db.select().from(s.emailWebhookEvents).where(eq(s.emailWebhookEvents.id, "evt-delivery"))).length, 1);
    await handleEmailWebhook(db, request("email.bounced", "evt-bounce"));
    await handleEmailWebhook(db, request("email.delivered", "evt-late-delivery"));
    assert.equal((await db.select().from(s.emailDeliveries).where(eq(s.emailDeliveries.jobId, job.id)))[0].status, "bounced");
    assert((await db.select().from(s.notificationPreferences).where(eq(s.notificationPreferences.userId, "u2")))[0].suppressedAt);
});
test("one user's multiple projects produce a single digest slot with distinct project entries", async () => {
    await db.update(s.notificationPreferences).set({ suppressedAt: null, suppressionReason: null }).where(eq(s.notificationPreferences.userId, "u2"));
    await db.insert(s.projectMembers).values({ id: "m4", projectId: "p2", userId: "u2", role: "member", canAccept: false, skills: [], availableHoursPerWeek: 10 });
    const settings = { ...defaultSchedule, enabled: true, emailEnabled: true, workdays: [1, 2, 3, 4, 5, 6, 7] };
    const a = await service.settings(leader, "p1");
    await service.updateSettings(leader, "p1", { expectedVersion: a.version, settings }, key());
    await service.updateSettings(outsider, "p2", { expectedVersion: 0, settings }, key());
    await service.preferences(member, { ...defaultNotificationPreference, emailEnabled: true, morningTime: "12:00", quietStart: "00:00", quietEnd: "00:00" });
    const instant = localInstant(date, "12:01", "Asia/Ho_Chi_Minh");
    await db.update(s.coordinatorSettings).set({ effectiveAt: new Date(Date.parse(instant) - 3600000).toISOString() });
    await dispatchDigests(db, instant);
    await dispatchDigests(db, instant);
    const jobs = await db.select().from(s.automationJobs).where(eq(s.automationJobs.dedupeKey, `digest:u2:${date}:morning`));
    assert.equal(jobs.length, 1);
    assert.equal((jobs[0].payload.entries as unknown[]).length, 2);
    assert.equal(jobs[0].payload.userId, "u2");
});
test("verification is scoped to signed-in owner and email, expires, consumes token once without returning it", async () => {
    process.env.RESEND_API_KEY = "test-only";
    await db.update(s.users).set({ emailVerifiedAt: null }).where(eq(s.users.id, "u2"));
    const response = await requestEmailVerification(db, member);
    assert.equal(response.requested, true);
    assert(!JSON.stringify(response).includes("token"));
    const [record] = await db.select().from(s.emailVerificationTokens).where(eq(s.emailVerificationTokens.userId, "u2"));
    const job = await claimSpecific(`verification:${record.id}`);
    let link = "";
    await deliverVerification(db, job, async (body) => { link = body.text; return { id: "verification-provider" }; });
    const token = /token=([a-f0-9]{64})/.exec(link)![1];
    assert(token);
    await assert.rejects(confirmEmailVerification(db, leader, token), errorCode("INVALID_VERIFICATION"));
    await confirmEmailVerification(db, member, token);
    await confirmEmailVerification(db, member, token);
    assert((await db.select().from(s.users).where(eq(s.users.id, "u2")))[0].emailVerifiedAt);
    await db.update(s.emailVerificationTokens).set({ expiresAt: "2020-01-01T00:00:00Z" }).where(eq(s.emailVerificationTokens.id, record.id));
    await assert.rejects(confirmEmailVerification(db, member, token), errorCode("INVALID_VERIFICATION"));
});
test("unrelated project inbox reveals no notifications and current membership stays authoritative", async () => {
    const inbox = await service.inbox(outsider, new URLSearchParams({ projectId: "p1" }));
    assert.equal(inbox.items.length, 0);
    assert.equal(inbox.unread, 0);
    assert.equal((await db.select().from(s.projectMembers).where(and(eq(s.projectMembers.id, "m2"), eq(s.projectMembers.role, "member")))).length, 1);
});
test("two dispatchers catch up exactly one occurrence; a future schedule revision refreshes an undelivered slot", async () => {
    await db.insert(s.projects).values({ id: "p3", name: "Scheduler test", goal: "Test", deliverables: ["demo"], deadline: "2027-01-01T00:00:00Z", timeZone: "Asia/Ho_Chi_Minh", createdAt: now });
    await db.insert(s.projectMembers).values({ id: "m5", projectId: "p3", userId: "u1", role: "leader", canAccept: true, skills: [], availableHoursPerWeek: 10 });
    const settings = { ...defaultSchedule, enabled: true };
    await service.updateSettings(leader, "p3", { expectedVersion: 0, settings }, key());
    await db.update(s.coordinatorSettings).set({ effectiveAt: "2026-11-09T01:00:00Z", lastRunAt: "2026-11-09T01:59:00Z", nextRunAt: "2026-11-09T02:00:00Z" }).where(eq(s.coordinatorSettings.projectId, "p3"));
    await Promise.all([dispatch(db, "2026-11-09T02:04:00.000Z"), dispatch(db, "2026-11-09T02:04:00.000Z")]);
    const id = "p3:2026-11-09:morning:daily";
    assert.equal((await db.select().from(s.automationJobs).where(eq(s.automationJobs.dedupeKey, id))).length, 1);
    await service.updateSettings(leader, "p3", { expectedVersion: 1, settings: { ...settings, morningTime: "09:10" } }, key());
    await db.update(s.coordinatorSettings).set({ effectiveAt: "2026-11-09T02:05:00Z", lastRunAt: "2026-11-09T02:05:00Z", nextRunAt: "2026-11-09T02:06:00Z" }).where(eq(s.coordinatorSettings.projectId, "p3"));
    await dispatch(db, "2026-11-09T02:11:00.000Z");
    const [job] = await db.select().from(s.automationJobs).where(eq(s.automationJobs.dedupeKey, id));
    assert.equal(job.payload.scheduleVersion, 2);
    assert.equal(job.runAt, "2026-11-09T02:10:00.000Z");
});
test("two running AI jobs fence further AI claims across independent ticks", async () => {
    const jobs = [];
    for (let i = 0; i < 3; i++) {
        const id = key();
        await enqueue(db, "analyze_post", id, { postId: "test-concurrency" }, "p1", new Date().toISOString(), "2099-01-01T00:00:00Z");
        jobs.push(id);
    }
    await db.update(s.automationJobs).set({ runAt: "2099-01-01T00:00:00Z" }).where(sql `${s.automationJobs.dedupeKey} NOT IN (${sql.join(jobs.map(id => sql `${id}`), sql `, `)})`);
    const a = await claimJob(db, new Date().toISOString()), b = await claimJob(db, new Date().toISOString()), c = await claimJob(db, new Date().toISOString());
    assert(a && b);
    assert.equal(c, null);
    await withLease(db, a, tx => finishJob(tx, a));
    await withLease(db, b, tx => finishJob(tx, b));
    const final = await claimJob(db, new Date().toISOString());
    assert(final);
    await withLease(db, final, tx => finishJob(tx, final));
});
test("obsolete workers cannot write failure metadata after a new claim; invalid job types are audited as attention", async () => {
    const id = key();
    await enqueue(db, "notify", id, {}, "p1", new Date().toISOString(), "2099-01-01T00:00:00Z");
    const first = await claimSpecific(id);
    await db.update(s.automationJobs).set({ lockedUntil: "2020-01-01T00:00:00Z" }).where(eq(s.automationJobs.id, first.id));
    const second = await claimJob(db, new Date().toISOString());
    assert(second);
    let mutated = false;
    assert.equal(await failJob(db, first, new Error("late"), new Date().toISOString(), async () => { mutated = true; }), undefined);
    assert.equal(mutated, false);
    await withLease(db, second, tx => finishJob(tx, second));
    const bad = key();
    await enqueue(db, "notify", bad, {}, "p1", new Date().toISOString(), "2099-01-01T00:00:00Z");
    await db.update(s.automationJobs).set({ type: "arbitrary_sql" }).where(eq(s.automationJobs.dedupeKey, bad));
    const job = await claimSpecific(bad);
    await runJob(db, job);
    assert.equal((await db.select().from(s.automationJobs).where(eq(s.automationJobs.id, job.id)))[0].status, "attention");
});
test("internal endpoint denies missing/forged credentials before any database connection", async () => {
    const original = process.env.COORDINATOR_SERVICE_SECRET;
    delete process.env.COORDINATOR_SERVICE_SECRET;
    assert.equal((await internalTick(new Request("http://localhost/api/internal/coordinator/tick", { method: "POST" }))).status, 503);
    process.env.COORDINATOR_SERVICE_SECRET = "x".repeat(40);
    const response = await internalTick(new Request("http://localhost/api/internal/coordinator/tick", { method: "POST", headers: { Authorization: "Bearer forged" } }));
    assert.equal(response.status, 401);
    assert(!(await response.text()).includes("xxxxx"));
    if (original === undefined)
        delete process.env.COORDINATOR_SERVICE_SECRET;
    else
        process.env.COORDINATOR_SERVICE_SECRET = original;
});
test("self-completion and fabricated blocker evidence cannot mutate a task", async () => {
    const t = await task(), id = key();
    const post = await service.post(member, "p1", { content: "mình xong rồi", taskId: t.id }, id);
    const job = await claimSpecific(`analyze:${post.id}`);
    let called = false;
    await analyzePost(db, job, async () => { called = true; return { proposal: { intent: "update", taskId: t.id, requestedStatus: "blocked", blocker: "invented" }, aiMode: "mock" }; });
    assert.equal(called, false);
    assert.equal((await db.select().from(s.tasks).where(eq(s.tasks.id, t.id)))[0].status, "todo");
    const p = await service.post(member, "p1", { content: "đang làm", taskId: t.id }, key()), j = await claimSpecific(`analyze:${p.id}`);
    await analyzePost(db, j, async () => ({ proposal: { intent: "update", taskId: t.id, requestedStatus: "blocked", blocker: "invented" }, aiMode: "mock" }));
    assert.equal((await db.select().from(s.messages).where(eq(s.messages.chatPostId, p.id)))[0].resolution, "clarification_required");
});
