-- Baseline records describe only the state known when this migration is applied.
INSERT INTO task_activity_events (id,"projectId","taskId","taskVersion",kind,"actorMemberId",before,after,"occurredAt")
SELECT 'baseline:'||id,"projectId",id,version,'baseline',NULL,NULL,to_jsonb(tasks),clock_timestamp() FROM tasks;
--> statement-breakpoint
CREATE FUNCTION coordinator_task_activity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE event_kind text; actor text;
BEGIN
  actor := nullif(current_setting('teamflow.actor_member_id',true),'');
  IF TG_OP='INSERT' THEN
    event_kind := 'published';
    SELECT "approvedByMemberId" INTO actor FROM plans WHERE id=NEW."planId";
  ELSIF NEW.version=OLD.version THEN
    RETURN NEW;
  ELSIF NEW.status='done' THEN
    event_kind := 'accepted'; actor := NEW."acceptedByMemberId";
  ELSIF NEW.status='in_review' AND OLD.status<>'in_review' THEN
    event_kind := 'submitted';
  ELSIF NEW.status='changes_requested' OR (NEW.status='in_review' AND OLD.status='in_review') THEN
    event_kind := 'reviewed';
  ELSE event_kind := 'progress'; END IF;
  INSERT INTO task_activity_events (id,"projectId","taskId","taskVersion",kind,"actorMemberId",before,after,"occurredAt")
  VALUES (NEW.id||':'||NEW.version||':'||event_kind,NEW."projectId",NEW.id,NEW.version,event_kind,actor,
    CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) ELSE NULL END,to_jsonb(NEW),CASE WHEN event_kind='accepted' THEN NEW."acceptedAt" ELSE clock_timestamp() END);
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER coordinator_task_activity AFTER INSERT OR UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION coordinator_task_activity();
--> statement-breakpoint
CREATE FUNCTION coordinator_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Coordinator source history is append-only'; END $$;
--> statement-breakpoint
CREATE TRIGGER checkin_revisions_append_only BEFORE UPDATE OR DELETE ON daily_checkin_revisions FOR EACH ROW EXECUTE FUNCTION coordinator_append_only();
--> statement-breakpoint
CREATE TRIGGER task_events_append_only BEFORE UPDATE OR DELETE ON task_activity_events FOR EACH ROW EXECUTE FUNCTION coordinator_append_only();
--> statement-breakpoint
ALTER TABLE chat_posts ADD CONSTRAINT chat_reply_same_project FOREIGN KEY ("replyToId","projectId") REFERENCES chat_posts(id,"projectId");
--> statement-breakpoint
CREATE FUNCTION coordinator_report_snapshot_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.snapshot IS NOT NULL AND (NEW.snapshot IS DISTINCT FROM OLD.snapshot OR NEW.metrics IS DISTINCT FROM OLD.metrics OR NEW."asOf" IS DISTINCT FROM OLD."asOf" OR NEW."periodStart" IS DISTINCT FROM OLD."periodStart" OR NEW."periodEnd" IS DISTINCT FROM OLD."periodEnd") THEN
   RAISE EXCEPTION 'Report snapshot and metrics are immutable';
 END IF;
 IF OLD.status='published' AND NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'Published report is immutable'; END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER coordinator_report_snapshot_immutable BEFORE UPDATE ON coordinator_report_runs FOR EACH ROW EXECUTE FUNCTION coordinator_report_snapshot_immutable();
--> statement-breakpoint
ALTER TABLE daily_checkins ADD CONSTRAINT checkin_version_positive CHECK (version>0);
--> statement-breakpoint
ALTER TABLE daily_checkin_revisions ADD CONSTRAINT checkin_revision_positive CHECK (revision>0);
--> statement-breakpoint
ALTER TABLE automation_jobs ADD CONSTRAINT job_status_valid CHECK (status IN ('queued','running','succeeded','skipped','expired','attention'));
--> statement-breakpoint
CREATE INDEX notifications_unread_idx ON notifications ("recipientUserId","projectId") WHERE "readAt" IS NULL;
