CREATE TYPE "public"."project_role" AS ENUM('leader', 'member');
--> statement-breakpoint
CREATE TYPE "public"."plan_status" AS ENUM('draft', 'published');
--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('todo', 'in_progress', 'blocked', 'in_review', 'changes_requested', 'done');
--> statement-breakpoint
CREATE TYPE "public"."ai_mode" AS ENUM('real', 'mock');
--> statement-breakpoint
CREATE TYPE "public"."message_resolution" AS ENUM('clarification_required', 'applied', 'no_change');
--> statement-breakpoint
CREATE TYPE "public"."submission_content_type" AS ENUM('text', 'markdown', 'code');
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"demo_account" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_demo_account_unique" UNIQUE("demo_account")
);

--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"goal" text NOT NULL,
	"deliverables" text[] NOT NULL,
	"deadline" timestamp with time zone NOT NULL,
	"time_zone" text DEFAULT 'Asia/Ho_Chi_Minh' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE TABLE "project_members" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "project_role" NOT NULL,
	"can_accept" boolean DEFAULT false NOT NULL,
	"skills" text[] DEFAULT '{}'::text[] NOT NULL,
	"available_hours_per_week" real DEFAULT 0 NOT NULL,
	CONSTRAINT "members_project_user_unique" UNIQUE("project_id","user_id"),
	CONSTRAINT "members_project_id_unique" UNIQUE("project_id","id"),
	CONSTRAINT "members_hours_nonnegative" CHECK ("project_members"."available_hours_per_week" >= 0)
);

--> statement-breakpoint
CREATE TABLE "plans" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"status" "plan_status" DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"draft_tasks" jsonb NOT NULL,
	"ai_mode" "ai_mode" NOT NULL,
	"approved_by_member_id" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plans_project_id_unique" UNIQUE("project_id"),
	CONSTRAINT "plans_project_and_id_unique" UNIQUE("project_id","id"),
	CONSTRAINT "plans_version_positive" CHECK ("plans"."version" > 0)
);

--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"assignee_member_id" text NOT NULL,
	"deadline" timestamp with time zone NOT NULL,
	"criteria" jsonb NOT NULL,
	"dependency_task_ids" text[] DEFAULT '{}'::text[] NOT NULL,
	"status" "task_status" DEFAULT 'todo' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"accepted_submission_id" text,
	"accepted_by_member_id" text,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tasks_project_id_unique" UNIQUE("project_id","id"),
	CONSTRAINT "tasks_version_positive" CHECK ("tasks"."version" > 0)
);

--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"author_member_id" text NOT NULL,
	"content" text NOT NULL,
	"task_id" text,
	"candidate_task_ids" text[] DEFAULT '{}'::text[] NOT NULL,
	"resolution" "message_resolution" NOT NULL,
	"clarification_question" text,
	"ai_mode" "ai_mode" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "messages_project_id_unique" UNIQUE("project_id","id")
);

--> statement-breakpoint
CREATE TABLE "progress_updates" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"task_id" text NOT NULL,
	"message_id" text NOT NULL,
	"author_member_id" text NOT NULL,
	"status_before" "task_status" NOT NULL,
	"status_after" "task_status" NOT NULL,
	"note" text NOT NULL,
	"blocker" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "progress_updates_message_id_unique" UNIQUE("message_id")
);

--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"task_id" text NOT NULL,
	"author_member_id" text NOT NULL,
	"revision" integer NOT NULL,
	"content_type" "submission_content_type" NOT NULL,
	"content" text NOT NULL,
	"criteria_snapshot" jsonb NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "submissions_task_revision_unique" UNIQUE("task_id","revision"),
	CONSTRAINT "submissions_project_task_id_unique" UNIQUE("project_id","task_id","id"),
	CONSTRAINT "submissions_revision_positive" CHECK ("submissions"."revision" > 0)
);

--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"task_id" text NOT NULL,
	"submission_id" text NOT NULL,
	"results" jsonb NOT NULL,
	"summary" text NOT NULL,
	"ai_mode" "ai_mode" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_submission_id_unique" UNIQUE("submission_id")
);

--> statement-breakpoint
CREATE TABLE "weekly_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"generated_by_member_id" text NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"as_of" timestamp with time zone NOT NULL,
	"metrics" jsonb NOT NULL,
	"source_refs" jsonb NOT NULL,
	"summary" jsonb NOT NULL,
	"ai_mode" "ai_mode" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE TABLE "sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE TABLE "mutation_requests" (
	"scope" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"fingerprint" text NOT NULL,
	"result" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_project_id_approved_by_member_id_project_members_project_id_id_fk" FOREIGN KEY ("project_id","approved_by_member_id") REFERENCES "public"."project_members"("project_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_accepted_submission_id_submissions_id_fk" FOREIGN KEY ("accepted_submission_id") REFERENCES "public"."submissions"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_plan_id_plans_project_id_id_fk" FOREIGN KEY ("project_id","plan_id") REFERENCES "public"."plans"("project_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_assignee_member_id_project_members_project_id_id_fk" FOREIGN KEY ("project_id","assignee_member_id") REFERENCES "public"."project_members"("project_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_accepted_by_member_id_project_members_project_id_id_fk" FOREIGN KEY ("project_id","accepted_by_member_id") REFERENCES "public"."project_members"("project_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_project_id_author_member_id_project_members_project_id_id_fk" FOREIGN KEY ("project_id","author_member_id") REFERENCES "public"."project_members"("project_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_project_id_task_id_tasks_project_id_id_fk" FOREIGN KEY ("project_id","task_id") REFERENCES "public"."tasks"("project_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "progress_updates" ADD CONSTRAINT "progress_updates_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "progress_updates" ADD CONSTRAINT "progress_updates_project_id_task_id_tasks_project_id_id_fk" FOREIGN KEY ("project_id","task_id") REFERENCES "public"."tasks"("project_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "progress_updates" ADD CONSTRAINT "progress_updates_project_id_message_id_messages_project_id_id_fk" FOREIGN KEY ("project_id","message_id") REFERENCES "public"."messages"("project_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "progress_updates" ADD CONSTRAINT "progress_updates_project_id_author_member_id_project_members_project_id_id_fk" FOREIGN KEY ("project_id","author_member_id") REFERENCES "public"."project_members"("project_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_project_id_task_id_tasks_project_id_id_fk" FOREIGN KEY ("project_id","task_id") REFERENCES "public"."tasks"("project_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_project_id_author_member_id_project_members_project_id_id_fk" FOREIGN KEY ("project_id","author_member_id") REFERENCES "public"."project_members"("project_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_project_id_task_id_submission_id_submissions_project_id_task_id_id_fk" FOREIGN KEY ("project_id","task_id","submission_id") REFERENCES "public"."submissions"("project_id","task_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "weekly_reports" ADD CONSTRAINT "weekly_reports_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "weekly_reports" ADD CONSTRAINT "weekly_reports_project_id_generated_by_member_id_project_members_project_id_id_fk" FOREIGN KEY ("project_id","generated_by_member_id") REFERENCES "public"."project_members"("project_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mutation_requests" ADD CONSTRAINT "mutation_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "members_one_leader" ON "project_members" USING btree ("project_id") WHERE "project_members"."role" = 'leader';
--> statement-breakpoint
CREATE INDEX "tasks_project_status_index" ON "tasks" USING btree ("project_id","status");
--> statement-breakpoint
CREATE INDEX "messages_project_time_index" ON "messages" USING btree ("project_id","created_at");
--> statement-breakpoint
CREATE INDEX "progress_task_time_index" ON "progress_updates" USING btree ("task_id","created_at");
--> statement-breakpoint
CREATE INDEX "sessions_expiry_index" ON "sessions" USING btree ("expires_at");
