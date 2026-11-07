CREATE TABLE IF NOT EXISTS "project_mentors" (
	"id" text PRIMARY KEY NOT NULL,
	"projectId" text NOT NULL,
	"userId" text NOT NULL,
	"grantedByMemberId" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	CONSTRAINT "project_mentors_projectId_userId_unique" UNIQUE("projectId","userId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_ai_settings" (
	"userId" text PRIMARY KEY NOT NULL,
	"encryptedApiKey" text,
	"model" text NOT NULL,
	"mode" text NOT NULL,
	"lastCheck" jsonb,
	"updatedAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "kind" text;
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "title" text;
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "message" text;
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "snapshot" jsonb;
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "resolvedAt" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "dedupeKey" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "type" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "text" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "target" DROP NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_mentors" ADD CONSTRAINT "project_mentors_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_mentors" ADD CONSTRAINT "project_mentors_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_mentors" ADD CONSTRAINT "project_mentors_grantedByMemberId_projectId_project_members_id_projectId_fk" FOREIGN KEY ("grantedByMemberId","projectId") REFERENCES "public"."project_members"("id","projectId") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_ai_settings" ADD CONSTRAINT "user_ai_settings_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_recipient_created" ON "notifications" USING btree ("recipientUserId","createdAt");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "notifications_project_recipient_kind_unique" ON "notifications" ("projectId", "recipientUserId", "kind");
