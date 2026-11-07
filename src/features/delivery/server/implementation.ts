import "server-only";
import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { submitWorkInputSchema, confirmAcceptanceInputSchema, generateWeeklyReportInputSchema,
  type Task, type Submission, type Review, type RequestReviewResult, type WeeklyReport, type SourceRef } from "@/contracts";
import { getDb, type Database, type DataConnection } from "@/server/db/client";
import { tasks, submissions, reviews, weeklyReports } from "@/server/db/schema";
import { projectMember, taskWithMember, assertUpdater } from "@/server/auth/access";
import type { Session } from "@/server/auth/contracts";
import { assert, conflict, notFound } from "@/server/http/errors";
import { commitMutation, mutationIdentity, replay } from "@/server/db/mutations";
import { readReportSnapshot } from "@/server/db/report-snapshot";
import { aiProvider } from "@/server/ai";
import type { AiProvider } from "@/server/ai/contracts";
import { validateReviewerProposal, validateReportProposal } from "@/server/ai/validator";
import { calculateReportMetrics } from "./metrics";
import type { DeliveryService } from "./service";
import { boundedAi } from "@/server/ai/timeout";
import {withUserAiSettings} from "@/features/ai-settings/server/service";

async function submissionAccess(db: DataConnection, session: Session, id: string) {
  const [submission] = await db.select().from(submissions).where(eq(submissions.id, id));
  if (!submission) throw notFound();
  const access = await taskWithMember(db, session, submission.taskId);
  return { submission, ...access };
}
const latest = async (db: DataConnection, taskId: string) => (await db.select().from(submissions).where(eq(submissions.taskId, taskId)).orderBy(desc(submissions.revision)).limit(1))[0];
const reviewFor = async (db: DataConnection, id: string) => (await db.select().from(reviews).where(eq(reviews.submissionId, id)))[0] ?? null;
async function lockTask(db: DataConnection, session: Session, id: string) {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, id)).for("update");
  if (!task) throw notFound();
  return { task, member: await projectMember(db, session, task.projectId) };
}

export function createDeliveryService(db: Database, provider: AiProvider = aiProvider, timeoutMs=30000): DeliveryService {
  provider=boundedAi(provider,timeoutMs);
  return {
    async listSubmissions(s, id) {
      await taskWithMember(db, s, id);
      return db.select().from(submissions).where(eq(submissions.taskId, id)).orderBy(desc(submissions.revision));
    },
    async submitWork(s, id, raw, options) {
      const input = submitWorkInputSchema.parse(raw);
      assert(input.content.trim() && input.content.length <= 24000, 422, "VALIDATION_ERROR", "Bài nộp cần nội dung, tối đa 24.000 ký tự.");
      const access = await taskWithMember(db, s, id); assertUpdater(access.member, access.task);
      const identity = mutationIdentity(s.user.id, `POST /api/tasks/${id}/submissions`, options.idempotencyKey, input);
      return commitMutation(db, identity, async tx => {
        const {task, member} = await lockTask(tx, s, id); assertUpdater(member, task);
        if (task.version !== input.expectedTaskVersion) throw conflict();
        assert(task.status !== "done", 409, "INVALID_TRANSITION", "Công việc đã nghiệm thu; không thể nộp bài mới.");
        const previous = await latest(tx, id);
        const submission: Submission = { id: randomUUID(), projectId: task.projectId, taskId: id, authorMemberId: member.id,
          revision: (previous?.revision ?? 0) + 1, contentType: input.contentType, content: input.content,
          criteriaSnapshot: task.criteria, submittedAt: new Date().toISOString() };
        const next: Task = {...task, status: "in_review", version: task.version + 1};
        await tx.insert(submissions).values(submission);
        await tx.update(tasks).set({status: next.status, version: next.version}).where(eq(tasks.id, id));
        return {submission, task: next};
      });
    },
    async getReview(s, id) { await submissionAccess(db, s, id); return reviewFor(db, id); },
    async requestReview(s, id, options) {
      const snapshot = await submissionAccess(db, s, id); assertUpdater(snapshot.member, snapshot.task);
      const identity = mutationIdentity(s.user.id, `POST /api/submissions/${id}/review`, options.idempotencyKey, {});
      const saved = await replay<RequestReviewResult>(db, identity); if (saved !== undefined) return saved;
      const existing = await reviewFor(db, id);
      // Review is immutable and unique per submission. AI runs outside transactions.
      const result = existing ? null : await withUserAiSettings(db,s,()=>provider.generate("reviewer", {submission: snapshot.submission}));
      const validated = result ? validateReviewerProposal(result.proposal, snapshot.submission) : null;
      return commitMutation(db, identity, async tx => {
        const {task, member} = await lockTask(tx, s, snapshot.task.id); assertUpdater(member, task);
        const prior = await reviewFor(tx, id); if (prior) return {review: prior, task};
        assert(result && validated, 409, "VERSION_CONFLICT", "Kết quả đánh giá đã thay đổi. Hãy thử lại.");
        assert(["mock", "real"].includes(result.aiMode), 502, "AI_INVALID_OUTPUT", "Chế độ AI không hợp lệ.");
        const review: Review = {...validated, id: randomUUID(), projectId: task.projectId, taskId: task.id,
          submissionId: id, aiMode: result.aiMode, createdAt: new Date().toISOString()};
        let next = task;
        const current = await latest(tx, task.id);
        if (current?.id === id && task.status === "in_review") {
          if (task.version !== snapshot.task.version) throw conflict();
          if (review.results.some(r => r.verdict === "not_met")) {
            next = {...task, status: "changes_requested", version: task.version + 1};
            await tx.update(tasks).set({status: next.status, version: next.version}).where(eq(tasks.id, task.id));
          }
        }
        await tx.insert(reviews).values(review);
        return {review, task: next};
      });
    },
    async confirmAcceptance(s, id, raw, options) {
      const input = confirmAcceptanceInputSchema.parse(raw);
      const access = await taskWithMember(db, s, id);
      assert(access.member.role === "leader" || access.member.canAccept, 403, "FORBIDDEN", "Bạn không có quyền nghiệm thu.");
      const identity = mutationIdentity(s.user.id, `POST /api/tasks/${id}/accept`, options.idempotencyKey, input);
      return commitMutation(db, identity, async tx => {
        const {task, member} = await lockTask(tx, s, id);
        assert(member.role === "leader" || member.canAccept, 403, "FORBIDDEN", "Bạn không có quyền nghiệm thu.");
        if (task.version !== input.expectedTaskVersion) throw conflict();
        assert(task.status === "in_review", 409, "INVALID_TRANSITION", "Công việc phải đang chờ nghiệm thu.");
        const submission = await latest(tx, id);
        assert(submission?.id === input.submissionId, 422, "VALIDATION_ERROR", "Chỉ nghiệm thu phiên bản bài nộp mới nhất của công việc.");
        const review = await reviewFor(tx, submission.id);
        assert(review, 422, "VALIDATION_ERROR", "Bài nộp chưa có nhận xét đối chiếu tiêu chí.");
        validateReviewerProposal(review, submission);
        assert(review.results.length > 0 && review.results.every(r => r.verdict === "met"), 422, "VALIDATION_ERROR", "Còn tiêu chí chưa đạt hoặc chưa đủ bằng chứng.");
        const next: Task = {...task, status: "done", version: task.version + 1, acceptedSubmissionId: submission.id,
          acceptedByMemberId: member.id, acceptedAt: new Date().toISOString()};
        await tx.update(tasks).set({status: next.status, version: next.version, acceptedSubmissionId: next.acceptedSubmissionId,
          acceptedByMemberId: next.acceptedByMemberId, acceptedAt: next.acceptedAt}).where(eq(tasks.id, id));
        return next;
      });
    },
    async listReports(s, id) { await projectMember(db, s, id); return db.select().from(weeklyReports).where(eq(weeklyReports.projectId, id)).orderBy(desc(weeklyReports.createdAt)); },
    async getReport(s, id) {
      const [report] = await db.select().from(weeklyReports).where(eq(weeklyReports.id, id)); if (!report) throw notFound();
      await projectMember(db, s, report.projectId); return report;
    },
    async generateWeeklyReport(s, id, raw, options) {
      const input = generateWeeklyReportInputSchema.parse(raw);
      const member = await projectMember(db, s, id);
      assert(member.role === "leader", 403, "FORBIDDEN", "Chỉ trưởng nhóm được tạo báo cáo.");
      const identity = mutationIdentity(s.user.id, `POST /api/projects/${id}/reports`, options.idempotencyKey, input);
      const saved = await replay<WeeklyReport>(db, identity); if (saved !== undefined) return saved;
      const snapshot = await readReportSnapshot(s, id, db);
      assert(Date.parse(input.periodStart) < Date.parse(input.periodEnd) && Date.parse(input.periodEnd) <= Date.parse(snapshot.asOf), 422, "VALIDATION_ERROR", "Kỳ báo cáo cần có thời điểm bắt đầu trước kết thúc và không nằm trong tương lai.");
      const metrics = calculateReportMetrics(snapshot.sources, input.periodStart, input.periodEnd, snapshot.asOf);
      const sourceRefs: SourceRef[] = [
        ...snapshot.sources.tasks.map(t => ({entity: "Task" as const, id: t.id})),
        ...snapshot.sources.submissions.map(t => ({entity: "Submission" as const, id: t.id})),
        ...snapshot.sources.reviews.map(t => ({entity: "Review" as const, id: t.id})),
        ...snapshot.sources.messages.map(t => ({entity: "Message" as const, id: t.id})),
        ...snapshot.sources.progressUpdates.map(t => ({entity: "ProgressUpdate" as const, id: t.id})),
      ];
      const aiInput = {...input, ...snapshot, metrics, sourceRefs};
      const result = await withUserAiSettings(db,s,()=>provider.generate("weekly_report", aiInput));
      const summary = validateReportProposal(result.proposal, aiInput);
      assert(["mock", "real"].includes(result.aiMode), 502, "AI_INVALID_OUTPUT", "Chế độ AI không hợp lệ.");
      return commitMutation(db, identity, async tx => {
        const actor = await projectMember(tx, s, id);
        assert(actor.role === "leader", 403, "FORBIDDEN", "Chỉ trưởng nhóm được tạo báo cáo.");
        const report: WeeklyReport = {...input, id: randomUUID(), projectId: id, generatedByMemberId: actor.id,
          asOf: snapshot.asOf, metrics, sourceRefs, summary, aiMode: result.aiMode, createdAt: new Date().toISOString()};
        await tx.insert(weeklyReports).values(report); return report;
      });
    },
  };
}

export const deliveryService: DeliveryService = {
  submitWork: (...a) => createDeliveryService(getDb()).submitWork(...a),
  listSubmissions: (...a) => createDeliveryService(getDb()).listSubmissions(...a),
  requestReview: (...a) => createDeliveryService(getDb()).requestReview(...a),
  getReview: (...a) => createDeliveryService(getDb()).getReview(...a),
  confirmAcceptance: (...a) => createDeliveryService(getDb()).confirmAcceptance(...a),
  generateWeeklyReport: (...a) => createDeliveryService(getDb()).generateWeeklyReport(...a),
  listReports: (...a) => createDeliveryService(getDb()).listReports(...a),
  getReport: (...a) => createDeliveryService(getDb()).getReport(...a),
};
