CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"projectId" text NOT NULL,
	"recipientUserId" text NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"readAt" timestamp with time zone,
	"resolvedAt" timestamp with time zone,
	CONSTRAINT "notifications_projectId_recipientUserId_kind_unique" UNIQUE("projectId","recipientUserId","kind")
);
--> statement-breakpoint
CREATE TABLE "project_mentors" (
	"id" text PRIMARY KEY NOT NULL,
	"projectId" text NOT NULL,
	"userId" text NOT NULL,
	"grantedByMemberId" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	CONSTRAINT "project_mentors_projectId_userId_unique" UNIQUE("projectId","userId")
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipientUserId_users_id_fk" FOREIGN KEY ("recipientUserId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_mentors" ADD CONSTRAINT "project_mentors_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_mentors" ADD CONSTRAINT "project_mentors_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_mentors" ADD CONSTRAINT "project_mentors_grantedByMemberId_projectId_project_members_id_projectId_fk" FOREIGN KEY ("grantedByMemberId","projectId") REFERENCES "public"."project_members"("id","projectId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notifications_recipient_created" ON "notifications" USING btree ("recipientUserId","createdAt");