import "server-only";
import { randomUUID } from "node:crypto";
import { desc, eq, sql } from "drizzle-orm";
import {
  confirmAcceptanceInputSchema, generateWeeklyReportInputSchema, submitWorkInputSchema,
  type ConfirmAcceptanceInput, type GenerateWeeklyReportInput, type Id, type MutationOptions,
  type RequestReviewResult, type Review, type Submission, type SubmitWorkInput,
  type SubmitWorkResult, type Task, type TaskStatus, type WeeklyReport, type ReportMetrics, type SourceRef, sourceRefSchema,
} from "@/contracts";
import { aiProvider } from "@/server/ai";
import type { AiProvider, ReportAiInput } from "@/server/ai/contracts";
import { validateReportProposal, validateReviewerProposal } from "@/server/ai/validator";
import { projectMember, taskWithMember, assertUpdater } from "@/server/auth/access";
import type { Session } from "@/server/auth/contracts";
import { getDb, type Database, type Transaction } from "@/server/db/client";
import { mutationIdentity, replay, type MutationIdentity } from "@/server/db/mutations";
import { readReportSnapshot } from "@/server/db/report-snapshot";
import { mutationResults, submissions, reviews, tasks, weeklyReports, messages, progressUpdates } from "@/server/db/schema";
import { assert, conflict, notFound } from "@/server/http/errors";
import { findReview, listTaskSubmissions, lockDeliveryTask, submissionWithMember } from "./repository";

export class DeliveryServiceError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "DeliveryServiceError";
  }
}

export interface ProjectConsolidatedDeliverable {
  projectId: Id;
  isAllTasksAccepted: boolean;
  totalTasks: number;
  acceptedTasksCount: number;
  pendingTasks: { id: string; title: string; status: TaskStatus; assigneeMemberId: string }[];
  completedSections: {
    task: Task;
    acceptedSubmission: Submission | null;
    review: Review | null;
  }[];
  assembledAt: string | null;
}

export interface DeliveryService {
  submitWork(session: Session, taskId: Id, input: SubmitWorkInput, options: MutationOptions): Promise<SubmitWorkResult>;
  listSubmissions(session: Session, taskId: Id): Promise<Submission[]>;
  requestReview(session: Session, submissionId: Id, options: MutationOptions): Promise<RequestReviewResult>;
  getReview(session: Session, submissionId: Id): Promise<Review | null>;
  confirmAcceptance(session: Session, taskId: Id, input: ConfirmAcceptanceInput, options: MutationOptions): Promise<Task>;
  generateWeeklyReport(session: Session, projectId: Id, input: GenerateWeeklyReportInput, options: MutationOptions): Promise<WeeklyReport>;
  listReports(session: Session, projectId: Id): Promise<WeeklyReport[]>;
  getReport(session: Session, reportId: Id): Promise<WeeklyReport>;
  getReportSource(session: Session, reportId: Id, ref: SourceRef): Promise<unknown>;
  getProjectConsolidatedDeliverable(session: Session, projectId: Id): Promise<ProjectConsolidatedDeliverable>;
}

// Refresh DB permissions even on replay; result and business writes commit together.
async function mutate<T>(db: Database, identity: MutationIdentity, authorize: (tx: Transaction) => Promise<unknown>, work: (tx: Transaction) => Promise<T>): Promise<T> {
  return db.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${identity.scope}))`);
    await authorize(tx);
    const saved = await replay<T>(tx, identity);
    if (saved !== undefined) return saved;
    const result = await work(tx);
    await tx.insert(mutationResults).values({ ...identity, result, createdAt: new Date().toISOString() });
    return result;
  });
}

export function createDeliveryService(db: Database, ai: AiProvider = aiProvider): DeliveryService {
  const updater = async (connection: Database | Transaction, session: Session, taskId: string) => {
    const access = await taskWithMember(connection, session, taskId);
    assertUpdater(access.member, access.task);
    return access;
  };
  const acceptor = async (connection: Database | Transaction, session: Session, taskId: string) => {
    const access = await taskWithMember(connection, session, taskId);
    assert(access.member.role === "leader" || access.member.canAccept, 403, "FORBIDDEN", "Bạn không có quyền nghiệm thu.");
    return access;
  };
  const leader = async (connection: Database | Transaction, session: Session, projectId: string) => {
    const member = await projectMember(connection, session, projectId);
    assert(member.role === "leader", 403, "FORBIDDEN", "Chỉ trưởng nhóm được tạo báo cáo.");
    return member;
  };
  return {
    async listSubmissions(session, taskId) {
      await taskWithMember(db, session, taskId);
      return listTaskSubmissions(db, taskId);
    },
    async submitWork(session, taskId, raw, options) {
      const input = submitWorkInputSchema.strict().parse(raw);
      assert(input.content.trim(), 422, "VALIDATION_ERROR", "Bài nộp không được để trống.");
      await updater(db, session, taskId);
      const identity = mutationIdentity(session.user.id, `POST /api/tasks/${taskId}/submissions`, options.idempotencyKey, input);
      return mutate(db, identity, tx => updater(tx, session, taskId), async tx => {
        const { task, member } = await lockDeliveryTask(tx, session, taskId);
        assertUpdater(member, task);
        assert(task.status !== "done", 409, "INVALID_TRANSITION", "Công việc đã được nghiệm thu.");
        if (task.version !== input.expectedTaskVersion) throw conflict();
        const previous = await listTaskSubmissions(tx, taskId);
        const submission: Submission = {
          id: randomUUID(), projectId: task.projectId, taskId, authorMemberId: member.id,
          revision: (previous[0]?.revision ?? 0) + 1, contentType: input.contentType,
          content: input.content, criteriaSnapshot: task.criteria, submittedAt: new Date().toISOString(),
        };
        await tx.insert(submissions).values(submission);
        await tx.execute(sql`select set_config('teamflow.actor_member_id',${member.id},true)`);
        const [updated] = await tx.update(tasks).set({ status: "in_review", version: task.version + 1 }).where(eq(tasks.id, taskId)).returning();
        return { submission, task: updated };
      });
    },
    async getReview(session, submissionId) {
      await submissionWithMember(db, session, submissionId);
      return findReview(db, submissionId);
    },
    async requestReview(session, submissionId, options) {
      const { submission } = await submissionWithMember(db, session, submissionId);
      const { task } = await updater(db, session, submission.taskId);
      const identity = mutationIdentity(session.user.id, `POST /api/submissions/${submissionId}/review`, options.idempotencyKey, {});
      const saved = await replay<RequestReviewResult>(db, identity);
      if (saved !== undefined) return saved;
      const existing = await findReview(db, submissionId);
      const generated = existing ? null : await ai.generate("reviewer", { submission });
      const proposal = generated ? validateReviewerProposal(generated.proposal, submission) : null;
      return mutate(db, identity, tx => updater(tx, session, task.id), async tx => {
        const { task: current, member } = await lockDeliveryTask(tx, session, task.id);
        assertUpdater(member, current);
        const prior = await findReview(tx, submissionId);
        if (prior) return { review: prior, task: current };
        if (current.version !== task.version) throw conflict();
        const review: Review = {
          id: randomUUID(), projectId: submission.projectId, taskId: task.id, submissionId,
          ...proposal!, aiMode: generated!.aiMode, createdAt: new Date().toISOString(),
        };
        await tx.insert(reviews).values(review);
        const latest = (await listTaskSubmissions(tx, task.id))[0];
        let updated = current;
        if (latest?.id === submissionId && current.status !== "done") {
          await tx.execute(sql`select set_config('teamflow.actor_member_id',${member.id},true)`);
          const [row] = await tx.update(tasks).set({
            status: review.results.some(r => r.verdict === "not_met") ? "changes_requested" : "in_review",
            version: current.version + 1,
          }).where(eq(tasks.id, task.id)).returning();
          updated = row;
        }
        return { review, task: updated };
      });
    },
    async confirmAcceptance(session, taskId, raw, options) {
      const input = confirmAcceptanceInputSchema.strict().parse(raw);
      await acceptor(db, session, taskId);
      const identity = mutationIdentity(session.user.id, `POST /api/tasks/${taskId}/accept`, options.idempotencyKey, input);
      return mutate(db, identity, tx => acceptor(tx, session, taskId), async tx => {
        const { task, member } = await lockDeliveryTask(tx, session, taskId);
        assert(member.role === "leader" || member.canAccept, 403, "FORBIDDEN", "Bạn không có quyền nghiệm thu.");
        if (task.version !== input.expectedTaskVersion) throw conflict();
        assert(task.status === "in_review", 409, "INVALID_TRANSITION", "Công việc phải đang chờ nghiệm thu.");
        const latest = (await listTaskSubmissions(tx, taskId))[0];
        assert(latest?.id === input.submissionId, 422, "VALIDATION_ERROR", "Chỉ được nghiệm thu bài nộp mới nhất của công việc.");
        const review = await findReview(tx, latest.id);
        assert(review, 422, "VALIDATION_ERROR", "Bài nộp chưa có nhận xét.");
        validateReviewerProposal(review, latest);
        assert(review.results.length > 0 && review.results.every(r => r.verdict === "met"), 422, "VALIDATION_ERROR", "Mọi tiêu chí phải đạt và có bằng chứng trước khi nghiệm thu.");
        const [updated] = await tx.update(tasks).set({ status: "done", version: task.version + 1,
          acceptedSubmissionId: latest.id, acceptedByMemberId: member.id, acceptedAt: new Date().toISOString(),
        }).where(eq(tasks.id, taskId)).returning();
        return updated;
      });
    },
    async generateWeeklyReport(session, projectId, raw, options) {
      const input = generateWeeklyReportInputSchema.strict().parse(raw);
      await leader(db, session, projectId);
      const identity = mutationIdentity(session.user.id, `POST /api/projects/${projectId}/reports`, options.idempotencyKey, input);
      const saved = await replay<WeeklyReport>(db, identity);
      if (saved !== undefined) return saved;
      const { asOf, sources } = await readReportSnapshot(session, projectId, db);
      assert(Date.parse(input.periodStart) < Date.parse(input.periodEnd) && Date.parse(input.periodEnd) <= Date.parse(asOf), 422, "VALIDATION_ERROR", "Kỳ báo cáo phải có thời điểm bắt đầu trước kết thúc và không ở tương lai.");
      const metrics = calculateReportMetrics(sources, input, asOf);
      const sourceRefs: SourceRef[] = [
        ...sources.tasks.map(t => ({ entity: "Task" as const, id: t.id })),
        ...sources.messages.map(t => ({ entity: "Message" as const, id: t.id })),
        ...sources.progressUpdates.map(t => ({ entity: "ProgressUpdate" as const, id: t.id })),
        ...sources.submissions.map(t => ({ entity: "Submission" as const, id: t.id })),
        ...sources.reviews.map(t => ({ entity: "Review" as const, id: t.id })),
      ];
      const aiInput: ReportAiInput = { ...input, asOf, sources, metrics, sourceRefs };
      const generated = await ai.generate("weekly_report", aiInput);
      const summary = validateReportProposal(generated.proposal, aiInput);
      return mutate(db, identity, tx => leader(tx, session, projectId), async tx => {
        const member = await leader(tx, session, projectId);
        const report: WeeklyReport = { id: randomUUID(), projectId, generatedByMemberId: member.id,
          ...input, asOf, metrics, sourceRefs, summary, aiMode: generated.aiMode, createdAt: new Date().toISOString() };
        await tx.insert(weeklyReports).values(report);
        return report;
      });
    },
    async listReports(session, projectId) {
      await projectMember(db, session, projectId);
      return db.select().from(weeklyReports).where(eq(weeklyReports.projectId, projectId)).orderBy(desc(weeklyReports.createdAt));
    },
    async getReport(session, reportId) {
      const [report] = await db.select().from(weeklyReports).where(eq(weeklyReports.id, reportId));
      if (!report) throw notFound();
      await projectMember(db, session, report.projectId);
      return report;
    },
    async getReportSource(session, reportId, raw) {
      const ref = sourceRefSchema.strict().parse(raw);
      const [report] = await db.select().from(weeklyReports).where(eq(weeklyReports.id, reportId));
      if (!report) throw notFound();
      await projectMember(db, session, report.projectId);
      if (!report.sourceRefs.some(source => source.entity === ref.entity && source.id === ref.id)) throw notFound();
      const table = { Task: tasks, Submission: submissions, Review: reviews, Message: messages, ProgressUpdate: progressUpdates }[ref.entity];
      const [source] = await db.select().from(table).where(eq(table.id, ref.id));
      if (!source || source.projectId !== report.projectId) throw notFound();
      return source;
    },
    async getProjectConsolidatedDeliverable(session, projectId) {
      await projectMember(db, session, projectId);
      const { asOf, sources } = await readReportSnapshot(session, projectId, db);
      const totalTasks = sources.tasks.length;
      const acceptedTasks = sources.tasks.filter((t) => t.status === "done");
      const pendingTasks = sources.tasks
        .filter((t) => t.status !== "done")
        .map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          assigneeMemberId: t.assigneeMemberId,
        }));

      // Bất biến: CHỈ KHI 100% CÔNG VIỆC ĐƯỢC LEADER DUYỆT thì mới xác nhận hoàn chỉnh
      const isAllTasksAccepted = totalTasks > 0 && pendingTasks.length === 0;

      const completedSections = sources.tasks.map((task) => {
        const taskSubs = sources.submissions
          .filter((s) => s.taskId === task.id)
          .sort((a, b) => b.revision - a.revision);
        const acceptedSubmission = task.acceptedSubmissionId
          ? taskSubs.find((s) => s.id === task.acceptedSubmissionId) || taskSubs[0] || null
          : taskSubs[0] || null;

        const review = acceptedSubmission
          ? sources.reviews.find((r) => r.submissionId === acceptedSubmission.id) || null
          : null;

        return {
          task,
          acceptedSubmission,
          review,
        };
      });

      return {
        projectId,
        isAllTasksAccepted,
        totalTasks,
        acceptedTasksCount: acceptedTasks.length,
        pendingTasks,
        completedSections,
        assembledAt: isAllTasksAccepted ? asOf : null,
      };
    },
  };
}

export function calculateReportMetrics(sources: ReportAiInput["sources"], period: GenerateWeeklyReportInput, asOf: string): ReportMetrics {
  const start = Date.parse(period.periodStart), end = Date.parse(period.periodEnd);
  const within = (value: string) => Date.parse(value) >= start && Date.parse(value) < end;
  const metrics: ReportMetrics = { statusCounts: { todo: 0, in_progress: 0, blocked: 0, in_review: 0, changes_requested: 0, done: 0 },
    dueInPeriodTotal: 0, submittedOnTimeTotal: 0, acceptedOnTimeTotal: 0, overdueOpenTotal: 0,
    submissionsInPeriodTotal: sources.submissions.filter(s => within(s.submittedAt)).length,
    progressUpdatesInPeriodTotal: sources.progressUpdates.filter(s => within(s.createdAt)).length };
  for (const task of sources.tasks) {
    metrics.statusCounts[task.status]++;
    if (within(task.deadline)) {
      metrics.dueInPeriodTotal++;
      if (sources.submissions.some(s => s.taskId === task.id && Date.parse(s.submittedAt) <= Date.parse(task.deadline))) metrics.submittedOnTimeTotal++;
      if (task.acceptedAt && Date.parse(task.acceptedAt) <= Date.parse(task.deadline)) metrics.acceptedOnTimeTotal++;
    }
    if (task.status !== "done" && Date.parse(task.deadline) < Date.parse(asOf)) metrics.overdueOpenTotal++;
  }
  return metrics;
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
  getReportSource: (...a) => createDeliveryService(getDb()).getReportSource(...a),
  getProjectConsolidatedDeliverable: (...a) => createDeliveryService(getDb()).getProjectConsolidatedDeliverable(...a),
};
