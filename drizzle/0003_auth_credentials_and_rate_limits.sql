ALTER TABLE "users" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "emailVerifiedAt" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE TABLE "user_credentials" (
	"userId" text PRIMARY KEY NOT NULL,
	"passwordHash" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL,
	CONSTRAINT "user_credentials_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE "auth_rate_limits" (
	"scopeHash" text PRIMARY KEY NOT NULL,
	"windowStartedAt" timestamp with time zone NOT NULL,
	"attemptCount" integer NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	CONSTRAINT "attempt_count_nonnegative" CHECK ("auth_rate_limits"."attemptCount" >= 0)
);
--> statement-breakpoint
CREATE INDEX "auth_rate_limits_expires_idx" ON "auth_rate_limits" USING btree ("expiresAt");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("userId");
