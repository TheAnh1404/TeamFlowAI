import { sql } from "drizzle-orm";
import { pgTable, text, integer, doublePrecision, boolean, jsonb, customType, unique, uniqueIndex, index, check, foreignKey, pgEnum } from "drizzle-orm/pg-core";
import type { Criterion, DraftTask, CriterionResult, ReportMetrics, SourceRef, SummaryItem } from "@/contracts";
import type { CheckinPayload, Schedule, NotificationPreference, ReportSummaryV2 } from "@/contracts/coordinator";

// PostgreSQL timestamps are normalized to the public ISO/UTC contract.
const instant = customType<{ data: string; driverData: string | Date }>({
  dataType: () => "timestamp with time zone", toDriver: (v) => v, fromDriver: (v) => new Date(v).toISOString(),
});

export const roleEnum = pgEnum("project_role", ["leader", "member"]);
export const projectRole = roleEnum;

export const taskStatusEnum = pgEnum("task_status", ["todo", "in_progress", "blocked", "in_review", "changes_requested", "done"]);
export const taskStatus = taskStatusEnum;

export const aiModeEnum = pgEnum("ai_mode", ["real", "mock"]);
export const aiMode = aiModeEnum;

export const planStatus = pgEnum("plan_status", ["draft", "published"]);
export const messageResolution = pgEnum("message_resolution", ["clarification_required", "applied", "no_change"]);
export const submissionContentType = pgEnum("submission_content_type", ["text", "markdown", "code"]);

export const users = pgTable("users", {
  id: text().primaryKey(),
  displayName: text().notNull(),
  createdAt: instant().notNull(),
  email: text(),
  emailVerifiedAt: instant(),
}, t => [uniqueIndex("users_email_unique").on(t.email)]);

export const userCredentials = pgTable("user_credentials", {
  userId: text().primaryKey().references(() => users.id, { onDelete: "cascade" }),
  passwordHash: text().notNull(),
  createdAt: instant().notNull(),
  updatedAt: instant().notNull(),
});

export const authRateLimits = pgTable("auth_rate_limits", {
  scopeHash: text().primaryKey(),
  windowStartedAt: instant().notNull(),
  attemptCount: integer().notNull(),
  expiresAt: instant().notNull(),
}, (t) => [
  check("attempt_count_nonnegative", sql`${t.attemptCount} >= 0`),
  index("auth_rate_limits_expires_idx").on(t.expiresAt),
]);

export const projects = pgTable("projects", {
  id: text().primaryKey(), name: text().notNull(), goal: text().notNull(),
  deliverables: jsonb().$type<string[]>().notNull(), deadline: instant().notNull(),
  timeZone: text().notNull().default("Asia/Ho_Chi_Minh"), createdAt: instant().notNull(),
});

export const projectMembers = pgTable("project_members", {
  id: text().primaryKey(), projectId: text().notNull().references(() => projects.id),
  userId: text().notNull().references(() => users.id), role: roleEnum().notNull(),
  canAccept: boolean().notNull(), skills: jsonb().$type<string[]>().notNull(), availableHoursPerWeek: doublePrecision().notNull(),
}, (t) => [unique().on(t.projectId, t.userId), unique().on(t.id, t.projectId),
  uniqueIndex("one_leader_per_project").on(t.projectId).where(sql`${t.role} = 'leader'`),
  check("nonnegative_hours", sql`${t.availableHoursPerWeek} >= 0`),
  check("leader_can_accept", sql`${t.role} <> 'leader' OR ${t.canAccept}`),
]);

export const plans = pgTable("plans", {
  id: text().primaryKey(), projectId: text().notNull().references(() => projects.id).unique(),
  status: text({ enum: ["draft", "published"] }).notNull(), version: integer().notNull(),
  draftTasks: jsonb().$type<DraftTask[]>().notNull(), aiMode: aiModeEnum().notNull(),
  approvedByMemberId: text(), publishedAt: instant(), createdAt: instant().notNull(),
}, (t) => [unique().on(t.id, t.projectId), check("plan_version_positive", sql`${t.version} > 0`),
  check("plan_publication_consistent", sql`(${t.status} = 'draft' AND ${t.approvedByMemberId} IS NULL AND ${t.publishedAt} IS NULL) OR (${t.status} = 'published' AND ${t.approvedByMemberId} IS NOT NULL AND ${t.publishedAt} IS NOT NULL)`),
  foreignKey({ columns: [t.approvedByMemberId, t.projectId], foreignColumns: [projectMembers.id, projectMembers.projectId] }),
]);

export const tasks = pgTable("tasks", {
  id: text().primaryKey(), projectId: text().notNull().references(() => projects.id), planId: text().notNull(),
  title: text().notNull(), description: text().notNull(), assigneeMemberId: text().notNull(), deadline: instant().notNull(),
  criteria: jsonb().$type<Criterion[]>().notNull(), dependencyTaskIds: jsonb().$type<string[]>().notNull(),
  status: taskStatusEnum().notNull().default("todo"), version: integer().notNull().default(1),
  acceptedSubmissionId: text(), acceptedByMemberId: text(), acceptedAt: instant(), createdAt: instant().notNull(),
}, (t) => [unique().on(t.id, t.projectId), index("tasks_project_status").on(t.projectId, t.status),
  check("task_version_positive", sql`${t.version} > 0`),
  check("task_has_criteria", sql`jsonb_array_length(${t.criteria}) > 0`),
  check("task_acceptance_consistent", sql`(${t.status} = 'done' AND ${t.acceptedSubmissionId} IS NOT NULL AND ${t.acceptedByMemberId} IS NOT NULL AND ${t.acceptedAt} IS NOT NULL) OR (${t.status} <> 'done' AND ${t.acceptedSubmissionId} IS NULL AND ${t.acceptedByMemberId} IS NULL AND ${t.acceptedAt} IS NULL)`),
  foreignKey({ columns: [t.planId, t.projectId], foreignColumns: [plans.id, plans.projectId] }),
  foreignKey({ columns: [t.assigneeMemberId, t.projectId], foreignColumns: [projectMembers.id, projectMembers.projectId] }),
  foreignKey({ columns: [t.acceptedByMemberId, t.projectId], foreignColumns: [projectMembers.id, projectMembers.projectId] }),
]);

export const messages = pgTable("messages", {
  id: text().primaryKey(), projectId: text().notNull().references(() => projects.id), authorMemberId: text().notNull(),
  content: text().notNull(), taskId: text(), candidateTaskIds: jsonb().$type<string[]>().notNull(),
  resolution: text({ enum: ["clarification_required", "applied", "no_change"] }).notNull(),
  clarificationQuestion: text(), aiMode: aiModeEnum().notNull(), createdAt: instant().notNull(),
  chatPostId: text().unique().references(() => chatPosts.id),
}, (t) => [unique().on(t.id, t.projectId), unique().on(t.id, t.taskId, t.projectId), index("messages_project_created").on(t.projectId, t.createdAt),
  foreignKey({ columns: [t.authorMemberId, t.projectId], foreignColumns: [projectMembers.id, projectMembers.projectId] }),
  foreignKey({ columns: [t.taskId, t.projectId], foreignColumns: [tasks.id, tasks.projectId] }),
  check("clarification_has_question", sql`${t.resolution} <> 'clarification_required' OR (${t.clarificationQuestion} IS NOT NULL AND length(trim(${t.clarificationQuestion})) > 0)`),
  check("message_resolution_valid", sql`${t.resolution} IN ('clarification_required','applied','no_change')`),
]);

export const progressUpdates = pgTable("progress_updates", {
  id: text().primaryKey(), projectId: text().notNull().references(() => projects.id), taskId: text().notNull(),
  messageId: text().notNull().unique(), authorMemberId: text().notNull(), statusBefore: taskStatusEnum().notNull(),
  statusAfter: taskStatusEnum().notNull(), note: text().notNull(), blocker: text(), createdAt: instant().notNull(),
}, (t) => [index("progress_task_created").on(t.taskId, t.createdAt),
  foreignKey({ columns: [t.taskId, t.projectId], foreignColumns: [tasks.id, tasks.projectId] }),
  foreignKey({ columns: [t.messageId, t.taskId, t.projectId], foreignColumns: [messages.id, messages.taskId, messages.projectId] }),
  foreignKey({ columns: [t.authorMemberId, t.projectId], foreignColumns: [projectMembers.id, projectMembers.projectId] }),
  check("progress_allowed_transition", sql`${t.statusBefore} IN ('todo','in_progress','blocked') AND ${t.statusAfter} IN ('in_progress','blocked')`),
  check("blocked_requires_reason", sql`${t.statusAfter} <> 'blocked' OR (${t.blocker} IS NOT NULL AND length(trim(${t.blocker})) > 0)`),
]);

export const submissions = pgTable("submissions", {
  id: text().primaryKey(), projectId: text().notNull().references(() => projects.id), taskId: text().notNull(),
  authorMemberId: text().notNull(), revision: integer().notNull(), contentType: text({ enum: ["text", "markdown", "code"] }).notNull(),
  content: text().notNull(), criteriaSnapshot: jsonb().$type<Criterion[]>().notNull(), submittedAt: instant().notNull(),
}, (t) => [unique().on(t.taskId, t.revision), unique().on(t.id, t.taskId, t.projectId),
  check("revision_positive", sql`${t.revision} > 0`),
  check("submission_content_type_valid", sql`${t.contentType} IN ('text','markdown','code')`),
  foreignKey({ columns: [t.taskId, t.projectId], foreignColumns: [tasks.id, tasks.projectId] }),
  foreignKey({ columns: [t.authorMemberId, t.projectId], foreignColumns: [projectMembers.id, projectMembers.projectId] }),
]);

export const reviews = pgTable("reviews", {
  id: text().primaryKey(), projectId: text().notNull().references(() => projects.id), taskId: text().notNull(),
  submissionId: text().notNull().unique(), results: jsonb().$type<CriterionResult[]>().notNull(), summary: text().notNull(),
  aiMode: aiModeEnum().notNull(), createdAt: instant().notNull(),
}, (t) => [foreignKey({ columns: [t.submissionId, t.taskId, t.projectId], foreignColumns: [submissions.id, submissions.taskId, submissions.projectId] })]);

export const weeklyReports = pgTable("weekly_reports", {
  id: text().primaryKey(), projectId: text().notNull().references(() => projects.id), generatedByMemberId: text().notNull(),
  periodStart: instant().notNull(), periodEnd: instant().notNull(), asOf: instant().notNull(),
  metrics: jsonb().$type<ReportMetrics>().notNull(), sourceRefs: jsonb().$type<SourceRef[]>().notNull(),
  summary: jsonb().$type<SummaryItem[]>().notNull(), aiMode: aiModeEnum().notNull(), createdAt: instant().notNull(),
}, (t) => [foreignKey({ columns: [t.generatedByMemberId, t.projectId], foreignColumns: [projectMembers.id, projectMembers.projectId] }),
  check("report_period_valid", sql`${t.periodStart} < ${t.periodEnd} AND ${t.periodEnd} <= ${t.asOf}`),
]);

export const sessions = pgTable("sessions", {
  tokenHash: text().primaryKey(), userId: text().notNull().references(() => users.id), expiresAt: instant().notNull(),
}, (t) => [
  index("sessions_user_id_idx").on(t.userId),
]);

export const mutationResults = pgTable("mutation_results", {
  scope: text().primaryKey(), userId: text().notNull().references(() => users.id),
  fingerprint: text().notNull(), result: jsonb().$type<unknown>().notNull(), createdAt: instant().notNull(),
});

export const mutationRequests = mutationResults;

export const chatPosts = pgTable("chat_posts", {
  id: text().primaryKey(), projectId: text().notNull().references(() => projects.id),
  authorMemberId: text().notNull(), content: text().notNull(), taskId: text(), taskVersionAtPost: integer(),
  replyToId: text(), mentionMemberIds: jsonb().$type<string[]>().notNull(), recordUpdate: boolean().notNull(),
  clientRequestId: text().notNull(), analysisStatus: text().notNull(), createdAt: instant().notNull(), updatedAt: instant().notNull(),
}, t => [unique().on(t.authorMemberId, t.clientRequestId), unique().on(t.id, t.projectId),
  index("chat_posts_feed_idx").on(t.projectId, t.createdAt, t.id), index("chat_posts_sync_idx").on(t.projectId, t.updatedAt, t.id),
  foreignKey({ columns: [t.authorMemberId, t.projectId], foreignColumns: [projectMembers.id, projectMembers.projectId] }),
  foreignKey({ columns: [t.taskId, t.projectId], foreignColumns: [tasks.id, tasks.projectId] }),
  check("chat_post_content_length", sql`length(${t.content}) BETWEEN 1 AND 8000`),
  check("chat_post_analysis_status", sql`${t.analysisStatus} IN ('queued','skipped','analyzed','clarification_required','failed')`),
]);
export const coordinatorEvents = pgTable("coordinator_events", {
  id: text().primaryKey(), projectId: text().notNull().references(() => projects.id), eventType: text().notNull(),
  occurrenceKey: text().notNull(), text: text().notNull(), target: text().notNull(), createdAt: instant().notNull(),
}, t => [unique().on(t.occurrenceKey, t.eventType), index("coordinator_events_feed_idx").on(t.projectId, t.createdAt, t.id)]);
export const coordinatorSettings = pgTable("project_coordinator_settings", {
  projectId: text().primaryKey().references(() => projects.id), settings: jsonb().$type<Schedule>().notNull(),
  version: integer().notNull(), enabledByMemberId: text().notNull(), effectiveAt: instant().notNull(),
  nextRunAt: instant().notNull(), lastRunAt: instant(),
}, t => [index("coordinator_next_run_idx").on(t.nextRunAt), foreignKey({ columns: [t.enabledByMemberId, t.projectId], foreignColumns: [projectMembers.id, projectMembers.projectId] })]);
export const notificationPreferences = pgTable("user_notification_preferences", {
  userId: text().primaryKey().references(() => users.id), preferences: jsonb().$type<NotificationPreference>().notNull(),
  suppressedAt: instant(), suppressionReason: text(),
});
export const memberCheckinPreferences = pgTable("member_checkin_preferences", {
  memberId: text().primaryKey(), projectId: text().notNull(), participation: boolean().notNull(), pausedDates: jsonb().$type<string[]>().notNull(),
}, t => [foreignKey({ columns: [t.memberId, t.projectId], foreignColumns: [projectMembers.id, projectMembers.projectId] })]);
export const checkinRequests = pgTable("daily_checkin_requests", {
  id: text().primaryKey(), projectId: text().notNull(), memberId: text().notNull(), workDate: text().notNull(),
  requestedAt: instant().notNull(), eligibility: jsonb().$type<{ scheduleVersion: number; timezone: string; slots: string[] }>().notNull(),
}, t => [unique().on(t.projectId, t.memberId, t.workDate), index("checkin_requests_period_idx").on(t.projectId, t.workDate), foreignKey({ columns: [t.memberId, t.projectId], foreignColumns: [projectMembers.id, projectMembers.projectId] })]);
export const dailyCheckins = pgTable("daily_checkins", {
  id: text().primaryKey(), projectId: text().notNull(), memberId: text().notNull(), workDate: text().notNull(),
  version: integer().notNull(), draft: jsonb().$type<CheckinPayload>().notNull(), latestSubmittedRevisionId: text(), updatedAt: instant().notNull(),
}, t => [unique().on(t.projectId, t.memberId, t.workDate), index("checkins_period_idx").on(t.projectId, t.workDate), foreignKey({ columns: [t.memberId, t.projectId], foreignColumns: [projectMembers.id, projectMembers.projectId] })]);
export const checkinRevisions = pgTable("daily_checkin_revisions", {
  id: text().primaryKey(), checkinId: text().notNull().references(() => dailyCheckins.id), projectId: text().notNull(), memberId: text().notNull(), workDate: text().notNull(),
  revision: integer().notNull(), payload: jsonb().$type<CheckinPayload>().notNull(), submittedAt: instant().notNull(),
}, t => [unique().on(t.checkinId, t.revision), index("checkin_revisions_snapshot_idx").on(t.projectId, t.workDate, t.submittedAt)]);
export const notifications = pgTable("notifications", {
  id: text().primaryKey(), recipientUserId: text().notNull().references(() => users.id), projectId: text().notNull().references(() => projects.id),
  dedupeKey: text(), type: text(), text: text(), target: text(),
  kind: text({ enum: ["deadline_risk"] }), title: text(), message: text(),
  snapshot: jsonb().$type<{ asOf: string; deadline: string; accepted: number; total: number; progressPercent: number; elapsedPercent: number }>(),
  createdAt: instant().notNull(), readAt: instant(), resolvedAt: instant(),
}, t => [
  unique().on(t.recipientUserId, t.dedupeKey),
  unique().on(t.projectId, t.recipientUserId, t.kind),
  index("notifications_user_cursor_idx").on(t.recipientUserId, t.createdAt, t.id),
  index("notifications_recipient_created").on(t.recipientUserId, t.createdAt),
]);
export const automationJobs = pgTable("automation_jobs", {
  id: text().primaryKey(), type: text().notNull(), projectId: text().references(() => projects.id),
  dedupeKey: text().notNull().unique(), payload: jsonb().$type<Record<string, unknown>>().notNull(),
  runAt: instant().notNull(), expiresAt: instant().notNull(), status: text().notNull(), attempts: integer().notNull().default(0),
  claimToken: text(), lockedUntil: instant(), lastErrorCode: text(), createdAt: instant().notNull(), completedAt: instant(),
}, t => [index("automation_jobs_due_idx").on(t.status, t.runAt), index("automation_jobs_lease_idx").on(t.lockedUntil), check("automation_attempts_valid", sql`${t.attempts} >= 0`)]);
export const projectMeetings = pgTable("project_meetings", {
  id: text().primaryKey(), projectId: text().notNull().references(() => projects.id), title: text().notNull(), startsAt: instant().notNull(),
  timezone: text().notNull(), leadMinutes: integer().notNull(), periodMode: text().notNull(), periodStart: instant(),
  version: integer().notNull(), canceledAt: instant(), configuredByMemberId: text().notNull(), createdAt: instant().notNull(),
}, t => [index("project_meetings_start_idx").on(t.projectId, t.startsAt), foreignKey({ columns: [t.configuredByMemberId, t.projectId], foreignColumns: [projectMembers.id, projectMembers.projectId] })]);
export const taskActivityEvents = pgTable("task_activity_events", {
  id: text().primaryKey(), projectId: text().notNull(), taskId: text().notNull(), taskVersion: integer().notNull(), kind: text().notNull(),
  actorMemberId: text(), before: jsonb().$type<Record<string, unknown>>(), after: jsonb().$type<Record<string, unknown>>().notNull(), occurredAt: instant().notNull(),
}, t => [unique().on(t.taskId, t.taskVersion, t.kind), index("task_events_period_idx").on(t.projectId, t.occurredAt), foreignKey({ columns: [t.taskId, t.projectId], foreignColumns: [tasks.id, tasks.projectId] })]);
export const coordinatorReportRuns = pgTable("coordinator_report_runs", {
  id: text().primaryKey(), projectId: text().notNull().references(() => projects.id), requestedByMemberId: text().notNull(),
  trigger: text().notNull(), dedupeKey: text().notNull().unique(), periodStart: instant().notNull(), periodEnd: instant(), asOf: instant(),
  status: text().notNull(), version: integer().notNull(), snapshot: jsonb().$type<Record<string, unknown>>(), metrics: jsonb().$type<Record<string, unknown>>(),
  snapshotHash: text(), summary: jsonb().$type<ReportSummaryV2>(), summaryHistory: jsonb().$type<{ version: number; summary: ReportSummaryV2; actorMemberId: string; at: string }[]>().notNull(),
  aiMode: text(), metadata: jsonb().$type<Record<string, unknown>>().notNull(), createdAt: instant().notNull(), publishedAt: instant(), publishedByMemberId: text(),
}, t => [index("coordinator_reports_project_idx").on(t.projectId, t.createdAt), foreignKey({ columns: [t.requestedByMemberId, t.projectId], foreignColumns: [projectMembers.id, projectMembers.projectId] })]);
export const emailDeliveries = pgTable("email_deliveries", {
  id: text().primaryKey(), jobId: text().notNull().unique().references(() => automationJobs.id), recipientUserId: text().notNull().references(() => users.id),
  providerKey: text().notNull().unique(), providerId: text().unique(), status: text().notNull(),
  request: jsonb().$type<{ from: string; to: string; subject: string; text: string }>().notNull(), firstAttemptAt: instant().notNull(), updatedAt: instant().notNull(),
});
export const emailWebhookEvents = pgTable("email_webhook_events", { id: text().primaryKey(), receivedAt: instant().notNull(), type: text().notNull() });
export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: text().primaryKey(), userId: text().notNull().references(() => users.id), email: text().notNull(),
  tokenHash: text().notNull().unique(), expiresAt: instant().notNull(), consumedAt: instant(), createdAt: instant().notNull(),
}, t => [index("email_verification_user_idx").on(t.userId,t.createdAt)]);

// Read-only mentor grants are separate from task membership and acceptance rights.
export const projectMentors = pgTable("project_mentors", {
  id: text().primaryKey(), projectId: text().notNull().references(() => projects.id),
  userId: text().notNull().references(() => users.id), grantedByMemberId: text().notNull(),
  createdAt: instant().notNull(),
}, t => [unique().on(t.projectId, t.userId), foreignKey({columns:[t.grantedByMemberId,t.projectId],foreignColumns:[projectMembers.id,projectMembers.projectId]})]);

export const userAiSettings = pgTable("user_ai_settings", {
  userId: text().primaryKey().references(() => users.id),
  encryptedApiKey: text(), model: text().notNull(), mode: text({ enum: ["inherit", "mock", "real"] }).notNull(),
  lastCheck: jsonb().$type<import("@/features/ai-settings/contracts").ConnectionCheck>(), updatedAt: instant().notNull(),
});
