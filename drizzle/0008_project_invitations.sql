CREATE TABLE IF NOT EXISTS "project_invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"projectId" text NOT NULL REFERENCES "projects"("id"),
	"inviteeUserId" text NOT NULL REFERENCES "users"("id"),
	"inviterMemberId" text NOT NULL,
	"skills" jsonb NOT NULL,
	"availableHoursPerWeek" double precision NOT NULL,
	"status" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"respondedAt" timestamp with time zone,
	CONSTRAINT "project_invitations_projectId_inviteeUserId_status_unique" UNIQUE("projectId", "inviteeUserId", "status"),
	CONSTRAINT "project_invitations_inviterMemberId_projectId_project_members_id_projectId_fk" FOREIGN KEY ("inviterMemberId", "projectId") REFERENCES "project_members"("id", "projectId")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_invitations_invitee_status_idx" ON "project_invitations" USING btree ("inviteeUserId", "status", "createdAt");
