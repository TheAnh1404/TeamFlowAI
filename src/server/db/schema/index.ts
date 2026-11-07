import { sql } from "drizzle-orm";
import { boolean, check, foreignKey, index, integer, jsonb, pgEnum, pgTable, real, text, timestamp, unique, uniqueIndex, type AnyPgColumn } from "drizzle-orm/pg-core";
import { aiModeSchema, messageResolutionSchema, planStatusSchema, projectRoleSchema, submissionContentTypeSchema, taskStatusSchema } from "@/contracts/enums";
import type { Criterion, CriterionResult, DraftTask, ReportMetrics, SourceRef, SummaryItem } from "@/contracts";

export const projectRole = pgEnum("project_role", projectRoleSchema.enum);
export const planStatus = pgEnum("plan_status", planStatusSchema.enum);
export const taskStatus = pgEnum("task_status", taskStatusSchema.enum);
export const aiMode = pgEnum("ai_mode", aiModeSchema.enum);
export const messageResolution = pgEnum("message_resolution", messageResolutionSchema.enum);
export const submissionContentType = pgEnum("submission_content_type", submissionContentTypeSchema.enum);
const date = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  demoAccount: text("demo_account").unique(),
  createdAt: date("created_at").notNull().defaultNow(),
});

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  goal: text("goal").notNull(),
  deliverables: text("deliverables").array().notNull(),
  deadline: date("deadline").notNull(),
  timeZone: text("time_zone").notNull().default("Asia/Ho_Chi_Minh"),
  createdAt: date("created_at").notNull().defaultNow(),
});

export const projectMembers = pgTable("project_members", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  userId: text("user_id").notNull().references(() => users.id),
  role: projectRole("role").notNull(),
  canAccept: boolean("can_accept").notNull().default(false),
  skills: text("skills").array().notNull().default(sql`'{}'::text[]`),
  availableHoursPerWeek: real("available_hours_per_week").notNull().default(0),
}, (t) => [
  unique("members_project_user_unique").on(t.projectId, t.userId),
  unique("members_project_id_unique").on(t.projectId, t.id),
  uniqueIndex("members_one_leader").on(t.projectId).where(sql`${t.role} = 'leader'`),
  check("members_hours_nonnegative", sql`${t.availableHoursPerWeek} >= 0`),
]);

export const plans = pgTable("plans", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id).unique(),
  status: planStatus("status").notNull().default("draft"),
  version: integer("version").notNull().default(1),
  draftTasks: jsonb("draft_tasks").$type<DraftTask[]>().notNull(),
  aiMode: aiMode("ai_mode").notNull(),
  approvedByMemberId: text("approved_by_member_id"),
  publishedAt: date("published_at"),
  createdAt: date("created_at").notNull().defaultNow(),
}, (t) => [
  unique("plans_project_and_id_unique").on(t.projectId, t.id),
  foreignKey({ columns: [t.projectId, t.approvedByMemberId], foreignColumns: [projectMembers.projectId, projectMembers.id] }),
  check("plans_version_positive", sql`${t.version} > 0`),
]);

export const tasks = pgTable("tasks", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  planId: text("plan_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  assigneeMemberId: text("assignee_member_id").notNull(),
  deadline: date("deadline").notNull(),
  criteria: jsonb("criteria").$type<Criterion[]>().notNull(),
  dependencyTaskIds: text("dependency_task_ids").array().notNull().default(sql`'{}'::text[]`),
  status: taskStatus("status").notNull().default("todo"),
  version: integer("version").notNull().default(1),
  acceptedSubmissionId: text("accepted_submission_id").references((): AnyPgColumn => submissions.id),
  acceptedByMemberId: text("accepted_by_member_id"),
  acceptedAt: date("accepted_at"),
  createdAt: date("created_at").notNull().defaultNow(),
}, (t) => [
  unique("tasks_project_id_unique").on(t.projectId, t.id),
  foreignKey({ columns: [t.projectId, t.planId], foreignColumns: [plans.projectId, plans.id] }),
  foreignKey({ columns: [t.projectId, t.assigneeMemberId], foreignColumns: [projectMembers.projectId, projectMembers.id] }),
  foreignKey({ columns: [t.projectId, t.acceptedByMemberId], foreignColumns: [projectMembers.projectId, projectMembers.id] }),
  index("tasks_project_status_index").on(t.projectId, t.status),
  check("tasks_version_positive", sql`${t.version} > 0`),
]);

export const messages = pgTable("messages", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  authorMemberId: text("author_member_id").notNull(),
  content: text("content").notNull(),
  taskId: text("task_id"),
  candidateTaskIds: text("candidate_task_ids").array().notNull().default(sql`'{}'::text[]`),
  resolution: messageResolution("resolution").notNull(),
  clarificationQuestion: text("clarification_question"),
  aiMode: aiMode("ai_mode").notNull(),
  createdAt: date("created_at").notNull().defaultNow(),
}, (t) => [
  unique("messages_project_id_unique").on(t.projectId, t.id),
  foreignKey({ columns: [t.projectId, t.authorMemberId], foreignColumns: [projectMembers.projectId, projectMembers.id] }),
  foreignKey({ columns: [t.projectId, t.taskId], foreignColumns: [tasks.projectId, tasks.id] }),
  index("messages_project_time_index").on(t.projectId, t.createdAt),
]);

export const progressUpdates = pgTable("progress_updates", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  taskId: text("task_id").notNull(),
  messageId: text("message_id").notNull().unique(),
  authorMemberId: text("author_member_id").notNull(),
  statusBefore: taskStatus("status_before").notNull(),
  statusAfter: taskStatus("status_after").notNull(),
  note: text("note").notNull(),
  blocker: text("blocker"),
  createdAt: date("created_at").notNull().defaultNow(),
}, (t) => [
  foreignKey({ columns: [t.projectId, t.taskId], foreignColumns: [tasks.projectId, tasks.id] }),
  foreignKey({ columns: [t.projectId, t.messageId], foreignColumns: [messages.projectId, messages.id] }),
  foreignKey({ columns: [t.projectId, t.authorMemberId], foreignColumns: [projectMembers.projectId, projectMembers.id] }),
  index("progress_task_time_index").on(t.taskId, t.createdAt),
]);

export const submissions = pgTable("submissions", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  taskId: text("task_id").notNull(),
  authorMemberId: text("author_member_id").notNull(),
  revision: integer("revision").notNull(),
  contentType: submissionContentType("content_type").notNull(),
  content: text("content").notNull(),
  criteriaSnapshot: jsonb("criteria_snapshot").$type<Criterion[]>().notNull(),
  submittedAt: date("submitted_at").notNull().defaultNow(),
}, (t) => [
  unique("submissions_task_revision_unique").on(t.taskId, t.revision),
  unique("submissions_project_task_id_unique").on(t.projectId, t.taskId, t.id),
  foreignKey({ columns: [t.projectId, t.taskId], foreignColumns: [tasks.projectId, tasks.id] }),
  foreignKey({ columns: [t.projectId, t.authorMemberId], foreignColumns: [projectMembers.projectId, projectMembers.id] }),
  check("submissions_revision_positive", sql`${t.revision} > 0`),
]);

export const reviews = pgTable("reviews", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  taskId: text("task_id").notNull(),
  submissionId: text("submission_id").notNull().unique(),
  results: jsonb("results").$type<CriterionResult[]>().notNull(),
  summary: text("summary").notNull(),
  aiMode: aiMode("ai_mode").notNull(),
  createdAt: date("created_at").notNull().defaultNow(),
}, (t) => [foreignKey({ columns: [t.projectId, t.taskId, t.submissionId], foreignColumns: [submissions.projectId, submissions.taskId, submissions.id] })]);

export const weeklyReports = pgTable("weekly_reports", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  generatedByMemberId: text("generated_by_member_id").notNull(),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  asOf: date("as_of").notNull(),
  metrics: jsonb("metrics").$type<ReportMetrics>().notNull(),
  sourceRefs: jsonb("source_refs").$type<SourceRef[]>().notNull(),
  summary: jsonb("summary").$type<SummaryItem[]>().notNull(),
  aiMode: aiMode("ai_mode").notNull(),
  createdAt: date("created_at").notNull().defaultNow(),
}, (t) => [foreignKey({ columns: [t.projectId, t.generatedByMemberId], foreignColumns: [projectMembers.projectId, projectMembers.id] })]);

// Technical tables: opaque server sessions and successful idempotent responses.
export const sessions = pgTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  expiresAt: date("expires_at").notNull(),
  createdAt: date("created_at").notNull().defaultNow(),
}, (t) => [index("sessions_expiry_index").on(t.expiresAt)]);

export const mutationRequests = pgTable("mutation_requests", {
  scope: text("scope").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  fingerprint: text("fingerprint").notNull(),
  result: jsonb("result").$type<unknown>().notNull(),
  createdAt: date("created_at").notNull().defaultNow(),
});
