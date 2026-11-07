CREATE TABLE email_verification_tokens (
 id text PRIMARY KEY NOT NULL,
 "userId" text NOT NULL CONSTRAINT "email_verification_tokens_userId_users_id_fk" REFERENCES users(id),
 email text NOT NULL,
 "tokenHash" text NOT NULL CONSTRAINT "email_verification_tokens_tokenHash_unique" UNIQUE,
 "expiresAt" timestamptz NOT NULL,
 "consumedAt" timestamptz,
 "createdAt" timestamptz NOT NULL
);
--> statement-breakpoint
CREATE INDEX email_verification_user_idx ON email_verification_tokens ("userId","createdAt");
--> statement-breakpoint
CREATE FUNCTION coordinator_chat_source_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.content IS DISTINCT FROM OLD.content OR NEW."projectId" IS DISTINCT FROM OLD."projectId" OR NEW."authorMemberId" IS DISTINCT FROM OLD."authorMemberId" OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt" OR NEW."taskId" IS DISTINCT FROM OLD."taskId" OR NEW."taskVersionAtPost" IS DISTINCT FROM OLD."taskVersionAtPost" THEN
  RAISE EXCEPTION 'Raw chat source is immutable';
 END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER coordinator_chat_source_immutable BEFORE UPDATE ON chat_posts FOR EACH ROW EXECUTE FUNCTION coordinator_chat_source_immutable();
