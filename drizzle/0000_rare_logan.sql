CREATE TYPE "public"."ai_mode" AS ENUM('real', 'mock');--> statement-breakpoint
CREATE TYPE "public"."project_role" AS ENUM('leader', 'member');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('todo', 'in_progress', 'blocked', 'in_review', 'changes_requested', 'done');--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"projectId" text NOT NULL,
	"authorMemberId" text NOT NULL,
	"content" text NOT NULL,
	"taskId" text,
	"candidateTaskIds" jsonb NOT NULL,
	"resolution" text NOT NULL,
	"clarificationQuestion" text,
	"aiMode" "ai_mode" NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	CONSTRAINT "messages_id_projectId_unique" UNIQUE("id","projectId"),
	CONSTRAINT "clarification_has_question" CHECK ("messages"."resolution" <> 'clarification_required' OR ("messages"."clarificationQuestion" IS NOT NULL AND length(trim("messages"."clarificationQuestion")) > 0))
);
--> statement-breakpoint
CREATE TABLE "mutation_results" (
	"scope" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"fingerprint" text NOT NULL,
	"result" jsonb NOT NULL,
	"createdAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" text PRIMARY KEY NOT NULL,
	"projectId" text NOT NULL,
	"status" text NOT NULL,
	"version" integer NOT NULL,
	"draftTasks" jsonb NOT NULL,
	"aiMode" "ai_mode" NOT NULL,
	"approvedByMemberId" text,
	"publishedAt" timestamp with time zone,
	"createdAt" timestamp with time zone NOT NULL,
	CONSTRAINT "plans_projectId_unique" UNIQUE("projectId"),
	CONSTRAINT "plans_id_projectId_unique" UNIQUE("id","projectId"),
	CONSTRAINT "plan_version_positive" CHECK ("plans"."version" > 0),
	CONSTRAINT "plan_publication_consistent" CHECK (("plans"."status" = 'draft' AND "plans"."approvedByMemberId" IS NULL AND "plans"."publishedAt" IS NULL) OR ("plans"."status" = 'published' AND "plans"."approvedByMemberId" IS NOT NULL AND "plans"."publishedAt" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "progress_updates" (
	"id" text PRIMARY KEY NOT NULL,
	"projectId" text NOT NULL,
	"taskId" text NOT NULL,
	"messageId" text NOT NULL,
	"authorMemberId" text NOT NULL,
	"statusBefore" "task_status" NOT NULL,
	"statusAfter" "task_status" NOT NULL,
	"note" text NOT NULL,
	"blocker" text,
	"createdAt" timestamp with time zone NOT NULL,
	CONSTRAINT "progress_updates_messageId_unique" UNIQUE("messageId"),
	CONSTRAINT "progress_allowed_transition" CHECK ("progress_updates"."statusBefore" IN ('todo','in_progress','blocked') AND "progress_updates"."statusAfter" IN ('in_progress','blocked')),
	CONSTRAINT "blocked_requires_reason" CHECK ("progress_updates"."statusAfter" <> 'blocked' OR ("progress_updates"."blocker" IS NOT NULL AND length(trim("progress_updates"."blocker")) > 0))
);
--> statement-breakpoint
CREATE TABLE "project_members" (
	"id" text PRIMARY KEY NOT NULL,
	"projectId" text NOT NULL,
	"userId" text NOT NULL,
	"role" "project_role" NOT NULL,
	"canAccept" boolean NOT NULL,
	"skills" jsonb NOT NULL,
	"availableHoursPerWeek" integer NOT NULL,
	CONSTRAINT "project_members_projectId_userId_unique" UNIQUE("projectId","userId"),
	CONSTRAINT "project_members_id_projectId_unique" UNIQUE("id","projectId"),
	CONSTRAINT "nonnegative_hours" CHECK ("project_members"."availableHoursPerWeek" >= 0),
	CONSTRAINT "leader_can_accept" CHECK ("project_members"."role" <> 'leader' OR "project_members"."canAccept")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"goal" text NOT NULL,
	"deliverables" jsonb NOT NULL,
	"deadline" timestamp with time zone NOT NULL,
	"timeZone" text DEFAULT 'Asia/Ho_Chi_Minh' NOT NULL,
	"createdAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"projectId" text NOT NULL,
	"taskId" text NOT NULL,
	"submissionId" text NOT NULL,
	"results" jsonb NOT NULL,
	"summary" text NOT NULL,
	"aiMode" "ai_mode" NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	CONSTRAINT "reviews_submissionId_unique" UNIQUE("submissionId")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"tokenHash" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"projectId" text NOT NULL,
	"taskId" text NOT NULL,
	"authorMemberId" text NOT NULL,
	"revision" integer NOT NULL,
	"contentType" text NOT NULL,
	"content" text NOT NULL,
	"criteriaSnapshot" jsonb NOT NULL,
	"submittedAt" timestamp with time zone NOT NULL,
	CONSTRAINT "submissions_taskId_revision_unique" UNIQUE("taskId","revision"),
	CONSTRAINT "submissions_id_taskId_projectId_unique" UNIQUE("id","taskId","projectId"),
	CONSTRAINT "revision_positive" CHECK ("submissions"."revision" > 0)
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"projectId" text NOT NULL,
	"planId" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"assigneeMemberId" text NOT NULL,
	"deadline" timestamp with time zone NOT NULL,
	"criteria" jsonb NOT NULL,
	"dependencyTaskIds" jsonb NOT NULL,
	"status" "task_status" DEFAULT 'todo' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"acceptedSubmissionId" text,
	"acceptedByMemberId" text,
	"acceptedAt" timestamp with time zone,
	"createdAt" timestamp with time zone NOT NULL,
	CONSTRAINT "tasks_id_projectId_unique" UNIQUE("id","projectId"),
	CONSTRAINT "task_version_positive" CHECK ("tasks"."version" > 0),
	CONSTRAINT "task_has_criteria" CHECK (jsonb_array_length("tasks"."criteria") > 0),
	CONSTRAINT "task_acceptance_consistent" CHECK (("tasks"."status" = 'done' AND "tasks"."acceptedSubmissionId" IS NOT NULL AND "tasks"."acceptedByMemberId" IS NOT NULL AND "tasks"."acceptedAt" IS NOT NULL) OR ("tasks"."status" <> 'done' AND "tasks"."acceptedSubmissionId" IS NULL AND "tasks"."acceptedByMemberId" IS NULL AND "tasks"."acceptedAt" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"displayName" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weekly_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"projectId" text NOT NULL,
	"generatedByMemberId" text NOT NULL,
	"periodStart" timestamp with time zone NOT NULL,
	"periodEnd" timestamp with time zone NOT NULL,
	"asOf" timestamp with time zone NOT NULL,
	"metrics" jsonb NOT NULL,
	"sourceRefs" jsonb NOT NULL,
	"summary" jsonb NOT NULL,
	"aiMode" "ai_mode" NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	CONSTRAINT "report_period_valid" CHECK ("weekly_reports"."periodStart" < "weekly_reports"."periodEnd" AND "weekly_reports"."periodEnd" <= "weekly_reports"."asOf")
);
--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_authorMemberId_projectId_project_members_id_projectId_fk" FOREIGN KEY ("authorMemberId","projectId") REFERENCES "public"."project_members"("id","projectId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_taskId_projectId_tasks_id_projectId_fk" FOREIGN KEY ("taskId","projectId") REFERENCES "public"."tasks"("id","projectId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mutation_results" ADD CONSTRAINT "mutation_results_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_approvedByMemberId_projectId_project_members_id_projectId_fk" FOREIGN KEY ("approvedByMemberId","projectId") REFERENCES "public"."project_members"("id","projectId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_updates" ADD CONSTRAINT "progress_updates_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_updates" ADD CONSTRAINT "progress_updates_taskId_projectId_tasks_id_projectId_fk" FOREIGN KEY ("taskId","projectId") REFERENCES "public"."tasks"("id","projectId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_updates" ADD CONSTRAINT "progress_updates_messageId_projectId_messages_id_projectId_fk" FOREIGN KEY ("messageId","projectId") REFERENCES "public"."messages"("id","projectId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_updates" ADD CONSTRAINT "progress_updates_authorMemberId_projectId_project_members_id_projectId_fk" FOREIGN KEY ("authorMemberId","projectId") REFERENCES "public"."project_members"("id","projectId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_submissionId_taskId_projectId_submissions_id_taskId_projectId_fk" FOREIGN KEY ("submissionId","taskId","projectId") REFERENCES "public"."submissions"("id","taskId","projectId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_taskId_projectId_tasks_id_projectId_fk" FOREIGN KEY ("taskId","projectId") REFERENCES "public"."tasks"("id","projectId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_authorMemberId_projectId_project_members_id_projectId_fk" FOREIGN KEY ("authorMemberId","projectId") REFERENCES "public"."project_members"("id","projectId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_planId_projectId_plans_id_projectId_fk" FOREIGN KEY ("planId","projectId") REFERENCES "public"."plans"("id","projectId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigneeMemberId_projectId_project_members_id_projectId_fk" FOREIGN KEY ("assigneeMemberId","projectId") REFERENCES "public"."project_members"("id","projectId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_acceptedByMemberId_projectId_project_members_id_projectId_fk" FOREIGN KEY ("acceptedByMemberId","projectId") REFERENCES "public"."project_members"("id","projectId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_reports" ADD CONSTRAINT "weekly_reports_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_reports" ADD CONSTRAINT "weekly_reports_generatedByMemberId_projectId_project_members_id_projectId_fk" FOREIGN KEY ("generatedByMemberId","projectId") REFERENCES "public"."project_members"("id","projectId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "messages_project_created" ON "messages" USING btree ("projectId","createdAt");--> statement-breakpoint
CREATE INDEX "progress_task_created" ON "progress_updates" USING btree ("taskId","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "one_leader_per_project" ON "project_members" USING btree ("projectId") WHERE "project_members"."role" = 'leader';--> statement-breakpoint
CREATE INDEX "tasks_project_status" ON "tasks" USING btree ("projectId","status");