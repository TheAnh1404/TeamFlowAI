CREATE TABLE "user_ai_settings" (
	"userId" text PRIMARY KEY NOT NULL,
	"encryptedApiKey" text,
	"model" text NOT NULL,
	"mode" text NOT NULL,
	"lastCheck" jsonb,
	"updatedAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_ai_settings" ADD CONSTRAINT "user_ai_settings_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;