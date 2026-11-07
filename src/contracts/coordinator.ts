import { z } from "zod";
import { idSchema, instantSchema } from "./common";
import { messageSchema } from "./tracking";
export const workDateSchema = z.iso.date();
export const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const timezoneSchema = z.string().max(100).refine(value => {
    try {
        new Intl.DateTimeFormat("en", { timeZone: value });
        return true;
    }
    catch {
        return false;
    }
}, "Múi giờ không hợp lệ");
export const chatPostInputSchema = z.object({
    content: z.string().trim().min(1).max(8000), taskId: idSchema.nullable().default(null),
    replyToId: idSchema.nullable().default(null), mentionMemberIds: z.array(idSchema).max(8).default([]),
    recordUpdate: z.boolean().default(false),
}).strict();
export const chatPostSchema = chatPostInputSchema.extend({
    id: idSchema, projectId: idSchema, authorMemberId: idSchema, clientRequestId: idSchema,
    taskVersionAtPost: z.number().int().nullable(), createdAt: instantSchema, updatedAt: instantSchema,
    analysisStatus: z.enum(["queued", "skipped", "analyzed", "clarification_required", "failed"]),
    analysis: messageSchema.nullable(),
});
export const coordinatorEventSchema = z.object({
    id: idSchema, projectId: idSchema, eventType: z.string(), occurrenceKey: z.string(),
    text: z.string(), target: z.string(), createdAt: instantSchema,
});
export const feedItemSchema = z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("post"), id: idSchema, createdAt: instantSchema, post: chatPostSchema }),
    z.object({ kind: z.literal("event"), id: idSchema, createdAt: instantSchema, event: coordinatorEventSchema }),
    z.object({ kind: z.literal("legacy"), id: idSchema, createdAt: instantSchema, message: messageSchema }),
]);
export const feedPageSchema = z.object({ items: z.array(feedItemSchema), cursor: z.string().nullable(), olderCursor: z.string().nullable(), hasMore: z.boolean(), syncCursor: z.string() });
export const workItemSchema = z.object({
    id: idSchema, text: z.string().trim().min(1).max(2000), taskId: idSchema.nullable(),
    durationMinutes: z.number().int().min(1).max(1440).nullable(),
}).strict();
export const checkinPayloadSchema = z.object({
    plannedWork: z.string().max(4000), completedWork: z.array(workItemSchema).max(30),
    noWorkUpdate: z.boolean(), blockers: z.string().max(4000), nextActions: z.string().max(4000),
    sourcePostIds: z.array(idSchema).max(30),
    sourceEvidence: z.array(z.object({ entity: z.enum(["ProgressUpdate", "Submission"]), id: idSchema }).strict()).max(30).default([]),
}).strict().superRefine((value, ctx) => {
    if (new Set(value.completedWork.map(item => item.id)).size !== value.completedWork.length)
        ctx.addIssue({ code: "custom", message: "Work item ID bị trùng" });
    if (value.completedWork.reduce((sum, item) => sum + (item.durationMinutes ?? 0), 0) > 1440)
        ctx.addIssue({ code: "custom", message: "Tổng phút không vượt 1.440" });
    if (value.noWorkUpdate && value.completedWork.length)
        ctx.addIssue({ code: "custom", message: "Chọn chưa có cập nhật hoặc nhập công việc" });
});
export const checkinInputSchema = z.object({ expectedVersion: z.number().int().min(0), payload: checkinPayloadSchema }).strict();
export const emptyCheckin: CheckinPayload = { plannedWork: "", completedWork: [], noWorkUpdate: false, blockers: "", nextActions: "", sourcePostIds: [], sourceEvidence: [] };
export const scheduleSchema = z.object({
    enabled: z.boolean(), timezone: timezoneSchema, workdays: z.array(z.number().int().min(1).max(7)).min(1).max(7),
    holidays: z.array(workDateSchema).max(366), morningTime: timeSchema, eodTime: timeSchema,
    repeatTime: timeSchema.nullable(), weeklyTime: timeSchema, weeklyMode: z.enum(["friday", "monday"]),
    appEnabled: z.boolean(), chatEnabled: z.boolean(), emailEnabled: z.boolean(),
    participantMemberIds: z.array(idSchema).max(8),
}).strict().refine(v => v.morningTime < v.eodTime && (!v.repeatTime || v.repeatTime > v.eodTime), "Giờ nhắc phải theo thứ tự sáng, cuối ngày, nhắc lại");
export const settingsInputSchema = z.object({ expectedVersion: z.number().int().min(0), settings: scheduleSchema }).strict();
export const defaultSchedule: Schedule = { enabled: false, timezone: "Asia/Ho_Chi_Minh", workdays: [1, 2, 3, 4, 5], holidays: [], morningTime: "09:00", eodTime: "17:00", repeatTime: null, weeklyTime: "18:00", weeklyMode: "friday", appEnabled: true, chatEnabled: true, emailEnabled: false, participantMemberIds: [] };
export const memberPreferenceSchema = z.object({ participation: z.boolean(), pausedDates: z.array(workDateSchema).max(366) }).strict();
export const notificationPreferenceSchema = z.object({
    emailEnabled: z.boolean(), reportsEmailEnabled: z.boolean(), timezone: timezoneSchema,
    morningTime: timeSchema, eodTime: timeSchema, quietStart: timeSchema, quietEnd: timeSchema,
}).strict();
export const defaultNotificationPreference: NotificationPreference = { emailEnabled: false, reportsEmailEnabled: false, timezone: "Asia/Ho_Chi_Minh", morningTime: "09:15", eodTime: "17:15", quietStart: "22:00", quietEnd: "08:00" };
export const notificationSchema = z.object({ id: idSchema, recipientUserId: idSchema, projectId: idSchema, dedupeKey: z.string(), type: z.string(), text: z.string(), target: z.string(), createdAt: instantSchema, readAt: instantSchema.nullable() });
export const meetingInputSchema = z.object({
    title: z.string().trim().min(1).max(200), startsAt: instantSchema, timezone: timezoneSchema,
    leadMinutes: z.number().int().min(5).max(1440), periodMode: z.enum(["week", "since_last_meeting", "custom"]),
    periodStart: instantSchema.nullable(), canceled: z.boolean().default(false), prepareNow: z.boolean().default(false),
    expectedVersion: z.number().int().min(0),
}).strict().refine(v => v.periodMode !== "custom" || v.periodStart !== null, "Chọn mốc bắt đầu kỳ");
export const reportRequestSchema = z.object({ periodStart: instantSchema, periodEnd: instantSchema }).strict();
export const sourceRefV2Schema = z.object({ entity: z.enum(["Task", "Message", "ProgressUpdate", "Submission", "Review", "ChatPost", "CheckinRevision", "TaskActivityEvent", "CheckinRequest"]), id: idSchema }).strict();
export const reportSummaryV2Schema = z.array(z.object({
    text: z.string().min(1).max(4000), sourceRefs: z.array(sourceRefV2Schema).max(100),
    metricKeys: z.array(z.string()).max(30), quotes: z.array(z.object({ source: sourceRefV2Schema, quote: z.string().min(1).max(2000) }).strict()).max(30),
}).strict()).max(50);
export type ChatPostInput = z.infer<typeof chatPostInputSchema>;
export type ChatPost = z.infer<typeof chatPostSchema>;
export type FeedItem = z.infer<typeof feedItemSchema>;
export type FeedPage = z.infer<typeof feedPageSchema>;
export type CheckinPayload = z.infer<typeof checkinPayloadSchema>;
export type Schedule = z.infer<typeof scheduleSchema>;
export type NotificationPreference = z.infer<typeof notificationPreferenceSchema>;
export type ReportSummaryV2 = z.infer<typeof reportSummaryV2Schema>;
export type SourceRefV2 = z.infer<typeof sourceRefV2Schema>;
export const reportArtifactV2Schema = z.object({
    id: idSchema, projectId: idSchema, requestedByMemberId: idSchema,
    trigger: z.enum(["manual", "weekly", "meeting"]), dedupeKey: z.string(),
    periodStart: instantSchema, periodEnd: instantSchema.nullable(), asOf: instantSchema.nullable(),
    status: z.enum(["queued", "generating", "failed", "attention", "draft", "published", "canceled"]),
    version: z.number().int().positive(), snapshot: z.record(z.string(), z.unknown()).nullable(),
    metrics: z.record(z.string(), z.unknown()).nullable(), snapshotHash: z.string().nullable(),
    summary: reportSummaryV2Schema.nullable(),
    summaryHistory: z.array(z.object({ version: z.number().int().positive(), summary: reportSummaryV2Schema, actorMemberId: idSchema, at: instantSchema })),
    aiMode: z.enum(["real", "mock"]).nullable(), metadata: z.record(z.string(), z.unknown()),
    createdAt: instantSchema, publishedAt: instantSchema.nullable(), publishedByMemberId: idSchema.nullable(),
    hasUpdatesAfterSnapshot: z.boolean().optional(),
});
export const checkinRevisionSchema = z.object({
    id: idSchema, checkinId: idSchema, projectId: idSchema, memberId: idSchema, workDate: workDateSchema,
    revision: z.number().int().positive(), payload: checkinPayloadSchema, submittedAt: instantSchema,
});
export const dailyCheckinSchema = z.object({
    id: idSchema, projectId: idSchema, memberId: idSchema, workDate: workDateSchema,
    version: z.number().int().positive(), draft: checkinPayloadSchema,
    latestSubmittedRevisionId: idSchema.nullable(), updatedAt: instantSchema,
});
export const checkinDayRowSchema = z.object({
    memberId: idSchema, name: z.string(), status: z.enum(["not_requested", "awaiting", "draft", "submitted", "paused", "skipped"]),
    checkin: dailyCheckinSchema.nullable(), revisions: z.array(checkinRevisionSchema), requested: z.boolean(),
});
export type ReportArtifactV2 = z.infer<typeof reportArtifactV2Schema>;
export type CheckinDayRow = z.infer<typeof checkinDayRowSchema>;
