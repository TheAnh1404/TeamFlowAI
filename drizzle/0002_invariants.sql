-- Deferred: TV1 may insert Tasks before updating Plan within the same transaction.
ALTER TABLE "tasks" ADD CONSTRAINT "accepted_submission_same_task"
FOREIGN KEY ("acceptedSubmissionId", "id", "projectId")
REFERENCES "submissions" ("id", "taskId", "projectId") DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
CREATE FUNCTION enforce_published_task() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM tasks t JOIN plans p ON p.id = t."planId" AND p."projectId" = t."projectId"
    JOIN projects pr ON pr.id = t."projectId"
    WHERE t.id = NEW.id AND p.status = 'published' AND t.deadline <= pr.deadline
  ) THEN
    RAISE EXCEPTION 'Task requires published plan and valid project deadline' USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END $$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER task_requires_published_plan AFTER INSERT OR UPDATE ON tasks
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION enforce_published_task();
--> statement-breakpoint
CREATE FUNCTION freeze_task_content() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF ROW(NEW.id, NEW."projectId", NEW."planId", NEW.title, NEW.description, NEW."assigneeMemberId", NEW.deadline, NEW.criteria, NEW."dependencyTaskIds", NEW."createdAt")
    IS DISTINCT FROM ROW(OLD.id, OLD."projectId", OLD."planId", OLD.title, OLD.description, OLD."assigneeMemberId", OLD.deadline, OLD.criteria, OLD."dependencyTaskIds", OLD."createdAt") THEN
    RAISE EXCEPTION 'Published task content is immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER task_content_immutable BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION freeze_task_content();
