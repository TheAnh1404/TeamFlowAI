ALTER TABLE "progress_updates" DROP CONSTRAINT "progress_updates_messageId_projectId_messages_id_projectId_fk";
--> statement-breakpoint
ALTER TABLE "project_members" ALTER COLUMN "availableHoursPerWeek" SET DATA TYPE double precision;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_id_taskId_projectId_unique" UNIQUE("id","taskId","projectId");--> statement-breakpoint
ALTER TABLE "progress_updates" ADD CONSTRAINT "progress_updates_messageId_taskId_projectId_messages_id_taskId_projectId_fk" FOREIGN KEY ("messageId","taskId","projectId") REFERENCES "public"."messages"("id","taskId","projectId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "message_resolution_valid" CHECK ("messages"."resolution" IN ('clarification_required','applied','no_change'));--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submission_content_type_valid" CHECK ("submissions"."contentType" IN ('text','markdown','code'));
