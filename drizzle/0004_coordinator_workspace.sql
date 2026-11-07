CREATE TABLE "automation_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"projectId" text,
	"dedupeKey" text NOT NULL,
	"payload" jsonb NOT NULL,
	"runAt" timestamp with time zone NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"status" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"claimToken" text,
	"lockedUntil" timestamp with time zone,
	"lastErrorCode" text,
	"createdAt" timestamp with time zone NOT NULL,
	"completedAt" timestamp with time zone,
	CONSTRAINT "automation_jobs_dedupeKey_unique" UNIQUE("dedupeKey"),
	CONSTRAINT "automation_attempts_valid" CHECK ("automation_jobs"."attempts" >= 0)
);

--> statement-breakpoint
CREATE TABLE "chat_posts" (
	"id" text PRIMARY KEY NOT NULL,
	"projectId" text NOT NULL,
	"authorMemberId" text NOT NULL,
	"content" text NOT NULL,
	"taskId" text,
	"taskVersionAtPost" integer,
	"replyToId" text,
	"mentionMemberIds" jsonb NOT NULL,
	"recordUpdate" boolean NOT NULL,
	"clientRequestId" text NOT NULL,
	"analysisStatus" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL,
	CONSTRAINT "chat_posts_authorMemberId_clientRequestId_unique" UNIQUE("authorMemberId","clientRequestId"),
	CONSTRAINT "chat_posts_id_projectId_unique" UNIQUE("id","projectId"),
	CONSTRAINT "chat_post_content_length" CHECK (length("chat_posts"."content") BETWEEN 1 AND 8000),
	CONSTRAINT "chat_post_analysis_status" CHECK ("chat_posts"."analysisStatus" IN ('queued','skipped','analyzed','clarification_required','failed'))
);

--> statement-breakpoint
CREATE TABLE "daily_checkin_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"projectId" text NOT NULL,
	"memberId" text NOT NULL,
	"workDate" text NOT NULL,
	"requestedAt" timestamp with time zone NOT NULL,
	"eligibility" jsonb NOT NULL,
	CONSTRAINT "daily_checkin_requests_projectId_memberId_workDate_unique" UNIQUE("projectId","memberId","workDate")
);

--> statement-breakpoint
CREATE TABLE "daily_checkin_revisions" (
	"id" text PRIMARY KEY NOT NULL,
	"checkinId" text NOT NULL,
	"projectId" text NOT NULL,
	"memberId" text NOT NULL,
	"workDate" text NOT NULL,
	"revision" integer NOT NULL,
	"payload" jsonb NOT NULL,
	"submittedAt" timestamp with time zone NOT NULL,
	CONSTRAINT "daily_checkin_revisions_checkinId_revision_unique" UNIQUE("checkinId","revision")
);

--> statement-breakpoint
CREATE TABLE "coordinator_events" (
	"id" text PRIMARY KEY NOT NULL,
	"projectId" text NOT NULL,
	"eventType" text NOT NULL,
	"occurrenceKey" text NOT NULL,
	"text" text NOT NULL,
	"target" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	CONSTRAINT "coordinator_events_occurrenceKey_eventType_unique" UNIQUE("occurrenceKey","eventType")
);

--> statement-breakpoint
CREATE TABLE "coordinator_report_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"projectId" text NOT NULL,
	"requestedByMemberId" text NOT NULL,
	"trigger" text NOT NULL,
	"dedupeKey" text NOT NULL,
	"periodStart" timestamp with time zone NOT NULL,
	"periodEnd" timestamp with time zone,
	"asOf" timestamp with time zone,
	"status" text NOT NULL,
	"version" integer NOT NULL,
	"snapshot" jsonb,
	"metrics" jsonb,
	"snapshotHash" text,
	"summary" jsonb,
	"summaryHistory" jsonb NOT NULL,
	"aiMode" text,
	"metadata" jsonb NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"publishedAt" timestamp with time zone,
	"publishedByMemberId" text,
	CONSTRAINT "coordinator_report_runs_dedupeKey_unique" UNIQUE("dedupeKey")
);

--> statement-breakpoint
CREATE TABLE "project_coordinator_settings" (
	"projectId" text PRIMARY KEY NOT NULL,
	"settings" jsonb NOT NULL,
	"version" integer NOT NULL,
	"enabledByMemberId" text NOT NULL,
	"effectiveAt" timestamp with time zone NOT NULL,
	"nextRunAt" timestamp with time zone NOT NULL,
	"lastRunAt" timestamp with time zone
);

--> statement-breakpoint
CREATE TABLE "daily_checkins" (
	"id" text PRIMARY KEY NOT NULL,
	"projectId" text NOT NULL,
	"memberId" text NOT NULL,
	"workDate" text NOT NULL,
	"version" integer NOT NULL,
	"draft" jsonb NOT NULL,
	"latestSubmittedRevisionId" text,
	"updatedAt" timestamp with time zone NOT NULL,
	CONSTRAINT "daily_checkins_projectId_memberId_workDate_unique" UNIQUE("projectId","memberId","workDate")
);

--> statement-breakpoint
CREATE TABLE "email_deliveries" (
	"id" text PRIMARY KEY NOT NULL,
	"jobId" text NOT NULL,
	"recipientUserId" text NOT NULL,
	"providerKey" text NOT NULL,
	"providerId" text,
	"status" text NOT NULL,
	"request" jsonb NOT NULL,
	"firstAttemptAt" timestamp with time zone NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL,
	CONSTRAINT "email_deliveries_jobId_unique" UNIQUE("jobId"),
	CONSTRAINT "email_deliveries_providerKey_unique" UNIQUE("providerKey"),
	CONSTRAINT "email_deliveries_providerId_unique" UNIQUE("providerId")
);

--> statement-breakpoint
CREATE TABLE "email_webhook_events" (
	"id" text PRIMARY KEY NOT NULL,
	"receivedAt" timestamp with time zone NOT NULL,
	"type" text NOT NULL
);

--> statement-breakpoint
CREATE TABLE "member_checkin_preferences" (
	"memberId" text PRIMARY KEY NOT NULL,
	"projectId" text NOT NULL,
	"participation" boolean NOT NULL,
	"pausedDates" jsonb NOT NULL
);

--> statement-breakpoint
CREATE TABLE "user_notification_preferences" (
	"userId" text PRIMARY KEY NOT NULL,
	"preferences" jsonb NOT NULL,
	"suppressedAt" timestamp with time zone,
	"suppressionReason" text
);

--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"recipientUserId" text NOT NULL,
	"projectId" text NOT NULL,
	"dedupeKey" text NOT NULL,
	"type" text NOT NULL,
	"text" text NOT NULL,
	"target" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"readAt" timestamp with time zone,
	CONSTRAINT "notifications_recipientUserId_dedupeKey_unique" UNIQUE("recipientUserId","dedupeKey")
);

--> statement-breakpoint
CREATE TABLE "project_meetings" (
	"id" text PRIMARY KEY NOT NULL,
	"projectId" text NOT NULL,
	"title" text NOT NULL,
	"startsAt" timestamp with time zone NOT NULL,
	"timezone" text NOT NULL,
	"leadMinutes" integer NOT NULL,
	"periodMode" text NOT NULL,
	"periodStart" timestamp with time zone,
	"version" integer NOT NULL,
	"canceledAt" timestamp with time zone,
	"configuredByMemberId" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL
);

--> statement-breakpoint
CREATE TABLE "task_activity_events" (
	"id" text PRIMARY KEY NOT NULL,
	"projectId" text NOT NULL,
	"taskId" text NOT NULL,
	"taskVersion" integer NOT NULL,
	"kind" text NOT NULL,
	"actorMemberId" text,
	"before" jsonb,
	"after" jsonb NOT NULL,
	"occurredAt" timestamp with time zone NOT NULL,
	CONSTRAINT "task_activity_events_taskId_taskVersion_kind_unique" UNIQUE("taskId","taskVersion","kind")
);

--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "chatPostId" text;
--> statement-breakpoint
ALTER TABLE "automation_jobs" ADD CONSTRAINT "automation_jobs_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "chat_posts" ADD CONSTRAINT "chat_posts_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "chat_posts" ADD CONSTRAINT "chat_posts_authorMemberId_projectId_project_members_id_projectId_fk" FOREIGN KEY ("authorMemberId","projectId") REFERENCES "public"."project_members"("id","projectId") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "chat_posts" ADD CONSTRAINT "chat_posts_taskId_projectId_tasks_id_projectId_fk" FOREIGN KEY ("taskId","projectId") REFERENCES "public"."tasks"("id","projectId") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "daily_checkin_requests" ADD CONSTRAINT "daily_checkin_requests_memberId_projectId_project_members_id_projectId_fk" FOREIGN KEY ("memberId","projectId") REFERENCES "public"."project_members"("id","projectId") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "daily_checkin_revisions" ADD CONSTRAINT "daily_checkin_revisions_checkinId_daily_checkins_id_fk" FOREIGN KEY ("checkinId") REFERENCES "public"."daily_checkins"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "coordinator_events" ADD CONSTRAINT "coordinator_events_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "coordinator_report_runs" ADD CONSTRAINT "coordinator_report_runs_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "coordinator_report_runs" ADD CONSTRAINT "coordinator_report_runs_requestedByMemberId_projectId_project_members_id_projectId_fk" FOREIGN KEY ("requestedByMemberId","projectId") REFERENCES "public"."project_members"("id","projectId") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "project_coordinator_settings" ADD CONSTRAINT "project_coordinator_settings_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "project_coordinator_settings" ADD CONSTRAINT "project_coordinator_settings_enabledByMemberId_projectId_project_members_id_projectId_fk" FOREIGN KEY ("enabledByMemberId","projectId") REFERENCES "public"."project_members"("id","projectId") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "daily_checkins" ADD CONSTRAINT "daily_checkins_memberId_projectId_project_members_id_projectId_fk" FOREIGN KEY ("memberId","projectId") REFERENCES "public"."project_members"("id","projectId") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "email_deliveries" ADD CONSTRAINT "email_deliveries_jobId_automation_jobs_id_fk" FOREIGN KEY ("jobId") REFERENCES "public"."automation_jobs"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "email_deliveries" ADD CONSTRAINT "email_deliveries_recipientUserId_users_id_fk" FOREIGN KEY ("recipientUserId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "member_checkin_preferences" ADD CONSTRAINT "member_checkin_preferences_memberId_projectId_project_members_id_projectId_fk" FOREIGN KEY ("memberId","projectId") REFERENCES "public"."project_members"("id","projectId") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_notification_preferences" ADD CONSTRAINT "user_notification_preferences_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipientUserId_users_id_fk" FOREIGN KEY ("recipientUserId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "project_meetings" ADD CONSTRAINT "project_meetings_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "project_meetings" ADD CONSTRAINT "project_meetings_configuredByMemberId_projectId_project_members_id_projectId_fk" FOREIGN KEY ("configuredByMemberId","projectId") REFERENCES "public"."project_members"("id","projectId") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "task_activity_events" ADD CONSTRAINT "task_activity_events_taskId_projectId_tasks_id_projectId_fk" FOREIGN KEY ("taskId","projectId") REFERENCES "public"."tasks"("id","projectId") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "automation_jobs_due_idx" ON "automation_jobs" USING btree ("status","runAt");
--> statement-breakpoint
CREATE INDEX "automation_jobs_lease_idx" ON "automation_jobs" USING btree ("lockedUntil");
--> statement-breakpoint
CREATE INDEX "chat_posts_feed_idx" ON "chat_posts" USING btree ("projectId","createdAt","id");
--> statement-breakpoint
CREATE INDEX "chat_posts_sync_idx" ON "chat_posts" USING btree ("projectId","updatedAt","id");
--> statement-breakpoint
CREATE INDEX "checkin_requests_period_idx" ON "daily_checkin_requests" USING btree ("projectId","workDate");
--> statement-breakpoint
CREATE INDEX "checkin_revisions_snapshot_idx" ON "daily_checkin_revisions" USING btree ("projectId","workDate","submittedAt");
--> statement-breakpoint
CREATE INDEX "coordinator_events_feed_idx" ON "coordinator_events" USING btree ("projectId","createdAt","id");
--> statement-breakpoint
CREATE INDEX "coordinator_reports_project_idx" ON "coordinator_report_runs" USING btree ("projectId","createdAt");
--> statement-breakpoint
CREATE INDEX "coordinator_next_run_idx" ON "project_coordinator_settings" USING btree ("nextRunAt");
--> statement-breakpoint
CREATE INDEX "checkins_period_idx" ON "daily_checkins" USING btree ("projectId","workDate");
--> statement-breakpoint
CREATE INDEX "notifications_user_cursor_idx" ON "notifications" USING btree ("recipientUserId","createdAt","id");
--> statement-breakpoint
CREATE INDEX "project_meetings_start_idx" ON "project_meetings" USING btree ("projectId","startsAt");
--> statement-breakpoint
CREATE INDEX "task_events_period_idx" ON "task_activity_events" USING btree ("projectId","occurredAt");
--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_chatPostId_chat_posts_id_fk" FOREIGN KEY ("chatPostId") REFERENCES "public"."chat_posts"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_chatPostId_unique" UNIQUE("chatPostId");
