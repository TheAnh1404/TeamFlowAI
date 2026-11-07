import "server-only";
import type {
  ConfirmAcceptanceInput, GenerateWeeklyReportInput, Id, MutationOptions,
  ReportMetrics, RequestReviewResult, Review, SourceRef, Submission,
  SubmitWorkInput, SubmitWorkResult, Task, WeeklyReport,
} from "@/contracts";
import { aiProvider } from "@/server/ai";
import type { Session } from "@/server/auth/contracts";
import { deliveryRepository, type DeliveryRepository } from "./repository";

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

export interface DeliveryService {
  submitWork(session: Session, taskId: Id, input: SubmitWorkInput, options: MutationOptions): Promise<SubmitWorkResult>;
  listSubmissions(session: Session, taskId: Id): Promise<Submission[]>;
  requestReview(session: Session, submissionId: Id, options: MutationOptions): Promise<RequestReviewResult>;
  getReview(session: Session, submissionId: Id): Promise<Review | null>;
  confirmAcceptance(session: Session, taskId: Id, input: ConfirmAcceptanceInput, options: MutationOptions): Promise<Task>;
  generateWeeklyReport(session: Session, projectId: Id, input: GenerateWeeklyReportInput, options: MutationOptions): Promise<WeeklyReport>;
  listReports(session: Session, projectId: Id): Promise<WeeklyReport[]>;
  getReport(session: Session, reportId: Id): Promise<WeeklyReport>;
}

export class DefaultDeliveryService implements DeliveryService {
  constructor(private readonly repo: DeliveryRepository = deliveryRepository) {}

  private getMemberForProject(session: Session, projectId: Id) {
    const member = session.memberships.find((m) => m.projectId === projectId);
    return member ?? null;
  }

  async submitWork(
    session: Session,
    taskId: Id,
    input: SubmitWorkInput,
    options: MutationOptions,
  ): Promise<SubmitWorkResult> {
    // 1. Kiểm tra replay Idempotency
    if (options.idempotencyKey) {
      const cached = await this.repo.getIdempotencyResult<SubmitWorkResult>(options.idempotencyKey);
      if (cached) return cached;
    }

    // 2. Kiểm tra Task tồn tại
    const task = await this.repo.getTask(taskId);
    if (!task) {
      throw new DeliveryServiceError(404, "NOT_FOUND", "Không tìm thấy công việc.");
    }

    // 3. Bất biến: Không thể nộp bài cho task đã 'done'
    if (task.status === "done") {
      throw new DeliveryServiceError(409, "INVALID_TRANSITION", "Công việc đã hoàn thành, không thể nộp bài mới.");
    }

    // 4. Kiểm tra quyền: Người phụ trách hoặc Leader
    const member = this.getMemberForProject(session, task.projectId);
    const isAssignee = member && member.id === task.assigneeMemberId;
    const isLeader = member && member.role === "leader";

    if (!isAssignee && !isLeader) {
      throw new DeliveryServiceError(403, "FORBIDDEN", "Chỉ người phụ trách hoặc trưởng nhóm mới có quyền nộp bài.");
    }

    // 5. Kiểm tra version chống xung đột
    if (task.version !== input.expectedTaskVersion) {
      throw new DeliveryServiceError(409, "VERSION_CONFLICT", "Dữ liệu công việc đã được cập nhật bởi thao tác khác. Vui lòng tải lại.");
    }

    // 6. Tính toán revision mới
    const currentSubmissions = await this.repo.listSubmissions(taskId);
    const latestRevision = currentSubmissions.length > 0 ? Math.max(...currentSubmissions.map((s) => s.revision)) : 0;
    const newRevision = latestRevision + 1;

    const submissionId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const nowIso = new Date().toISOString();

    const submission: Submission = {
      id: submissionId,
      projectId: task.projectId,
      taskId: task.id,
      authorMemberId: member?.id ?? "unknown-member",
      revision: newRevision,
      contentType: input.contentType,
      content: input.content,
      criteriaSnapshot: task.criteria,
      submittedAt: nowIso,
    };

    const updatedTask: Task = {
      ...task,
      status: "in_review",
      version: task.version + 1,
    };

    await this.repo.commitSubmission(submission, updatedTask, input.expectedTaskVersion, options.idempotencyKey);
    const result: SubmitWorkResult = { submission, task: updatedTask };

    if (options.idempotencyKey) {
      await this.repo.saveIdempotencyResult(options.idempotencyKey, result);
    }

    return result;
  }

  async listSubmissions(session: Session, taskId: Id): Promise<Submission[]> {
    const task = await this.repo.getTask(taskId);
    if (!task) {
      throw new DeliveryServiceError(404, "NOT_FOUND", "Không tìm thấy công việc.");
    }
    return this.repo.listSubmissions(taskId);
  }

  async requestReview(
    session: Session,
    submissionId: Id,
    options: MutationOptions,
  ): Promise<RequestReviewResult> {
    if (options.idempotencyKey) {
      const cached = await this.repo.getIdempotencyResult<RequestReviewResult>(options.idempotencyKey);
      if (cached) return cached;
    }

    const submission = await this.repo.getSubmission(submissionId);
    if (!submission) {
      throw new DeliveryServiceError(404, "NOT_FOUND", "Không tìm thấy bài nộp.");
    }

    const task = await this.repo.getTask(submission.taskId);
    if (!task) {
      throw new DeliveryServiceError(404, "NOT_FOUND", "Không tìm thấy công việc liên kết với bài nộp.");
    }

    // Nếu đã có Review hợp lệ, trả lại bản cũ (Idempotent)
    const existingReview = await this.repo.getReview(submissionId);
    if (existingReview) {
      return { review: existingReview, task };
    }

    // Gọi AI Reviewer
    const aiResult = await aiProvider.generate("reviewer", { submission });

    const reviewId = `rev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const review: Review = {
      id: reviewId,
      projectId: submission.projectId,
      taskId: submission.taskId,
      submissionId: submission.id,
      results: aiResult.proposal.results,
      summary: aiResult.proposal.summary,
      aiMode: aiResult.aiMode,
      createdAt: new Date().toISOString(),
    };

    // Kiểm tra xem submission này có phải là revision mới nhất không
    const allSubmissions = await this.repo.listSubmissions(submission.taskId);
    const isLatest = allSubmissions.length === 0 || allSubmissions[0].id === submission.id;

    let updatedTask: Task | null = null;
    if (isLatest) {
      const hasNotMet = review.results.some((r) => r.verdict === "not_met");
      if (hasNotMet) {
        // Có tiêu chí không đạt -> chuyển sang changes_requested
        updatedTask = {
          ...task,
          status: "changes_requested",
          version: task.version + 1,
        };
      } else {
        // Chỉ có met hoặc insufficient_evidence -> giữ nguyên in_review
        // Tuyệt đối không tự chuyển sang done!
        updatedTask = task;
      }
    }

    await this.repo.commitReview(review, updatedTask, task.version, options.idempotencyKey);
    const result: RequestReviewResult = { review, task: updatedTask ?? task };

    if (options.idempotencyKey) {
      await this.repo.saveIdempotencyResult(options.idempotencyKey, result);
    }

    return result;
  }

  async getReview(session: Session, submissionId: Id): Promise<Review | null> {
    const submission = await this.repo.getSubmission(submissionId);
    if (!submission) {
      throw new DeliveryServiceError(404, "NOT_FOUND", "Không tìm thấy bài nộp.");
    }
    return this.repo.getReview(submissionId);
  }

  async confirmAcceptance(
    session: Session,
    taskId: Id,
    input: ConfirmAcceptanceInput,
    options: MutationOptions,
  ): Promise<Task> {
    if (options.idempotencyKey) {
      const cached = await this.repo.getIdempotencyResult<Task>(options.idempotencyKey);
      if (cached) return cached;
    }

    const task = await this.repo.getTask(taskId);
    if (!task) {
      throw new DeliveryServiceError(404, "NOT_FOUND", "Không tìm thấy công việc.");
    }

    // 1. Kiểm tra quyền: Leader hoặc canAccept === true
    const member = this.getMemberForProject(session, task.projectId);
    const canAccept = member && (member.role === "leader" || member.canAccept === true);
    if (!canAccept) {
      throw new DeliveryServiceError(403, "FORBIDDEN", "Chỉ trưởng nhóm hoặc thành viên có quyền nghiệm thu mới được xác nhận hoàn thành.");
    }

    // 2. Kiểm tra version
    if (task.version !== input.expectedTaskVersion) {
      throw new DeliveryServiceError(409, "VERSION_CONFLICT", "Dữ liệu công việc đã thay đổi. Vui lòng tải lại.");
    }

    // 3. Bất biến: Task phải ở trạng thái in_review
    if (task.status !== "in_review") {
      throw new DeliveryServiceError(409, "INVALID_TRANSITION", "Công việc phải ở trạng thái Chờ nghiệm thu (in_review) mới có thể nghiệm thu.");
    }

    // 4. Kiểm tra submissionId và review
    const submission = await this.repo.getSubmission(input.submissionId);
    if (!submission || submission.taskId !== taskId) {
      throw new DeliveryServiceError(422, "VALIDATION_ERROR", "Bài nộp được chọn không hợp lệ cho công việc này.");
    }

    const review = await this.repo.getReview(submission.id);
    if (!review) {
      throw new DeliveryServiceError(422, "VALIDATION_ERROR", "Bài nộp chưa có kết quả đánh giá từ Reviewer AI.");
    }

    // Bất biến cốt lõi: TẤT CẢ tiêu chí phải là 'met'
    const hasUnmet = review.results.some((r) => r.verdict !== "met");
    if (hasUnmet) {
      throw new DeliveryServiceError(
        422,
        "VALIDATION_ERROR",
        "Chưa đủ điều kiện nghiệm thu: Vẫn còn tiêu chí chưa đạt hoặc chưa đủ bằng chứng xác thực.",
      );
    }

    // 5. Cập nhật task sang done
    const updatedTask: Task = {
      ...task,
      status: "done",
      version: task.version + 1,
      acceptedSubmissionId: submission.id,
      acceptedByMemberId: member.id,
      acceptedAt: new Date().toISOString(), // Ghi nhận thời điểm nghiệm thu riêng biệt với submittedAt
    };

    await this.repo.commitAcceptance(updatedTask, input.expectedTaskVersion, options.idempotencyKey);

    if (options.idempotencyKey) {
      await this.repo.saveIdempotencyResult(options.idempotencyKey, updatedTask);
    }

    return updatedTask;
  }

  async generateWeeklyReport(
    session: Session,
    projectId: Id,
    input: GenerateWeeklyReportInput,
    options: MutationOptions,
  ): Promise<WeeklyReport> {
    if (options.idempotencyKey) {
      const cached = await this.repo.getIdempotencyResult<WeeklyReport>(options.idempotencyKey);
      if (cached) return cached;
    }

    // Kiểm tra quyền: Chỉ Leader
    const member = this.getMemberForProject(session, projectId);
    if (!member || member.role !== "leader") {
      throw new DeliveryServiceError(403, "FORBIDDEN", "Chỉ trưởng nhóm mới có quyền bấm tạo báo cáo tuần.");
    }

    const pStartTime = new Date(input.periodStart).getTime();
    const pEndTime = new Date(input.periodEnd).getTime();
    if (isNaN(pStartTime) || isNaN(pEndTime) || pEndTime < pStartTime) {
      throw new DeliveryServiceError(422, "VALIDATION_ERROR", "Khoảng thời gian báo cáo không hợp lệ.");
    }

    const asOf = new Date().toISOString();
    const asOfTime = new Date(asOf).getTime();

    // Đọc snapshot dữ liệu
    const sources = await this.repo.readReportSources(projectId, asOf);

    // Backend tính toán chính xác 100% metrics độc lập với AI
    const statusCounts = {
      todo: 0,
      in_progress: 0,
      blocked: 0,
      in_review: 0,
      changes_requested: 0,
      done: 0,
    };

    let dueInPeriodTotal = 0;
    let submittedOnTimeTotal = 0;
    let acceptedOnTimeTotal = 0;
    let overdueOpenTotal = 0;

    for (const task of sources.tasks) {
      if (statusCounts[task.status] !== undefined) {
        statusCounts[task.status]++;
      }

      const taskDeadlineTime = new Date(task.deadline).getTime();

      // Kiểm tra task đến hạn trong kỳ [periodStart, periodEnd)
      if (taskDeadlineTime >= pStartTime && taskDeadlineTime < pEndTime) {
        dueInPeriodTotal++;

        // Tìm bài nộp đầu tiên của task
        const taskSubs = sources.submissions
          .filter((s) => s.taskId === task.id)
          .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());

        if (taskSubs.length > 0) {
          const firstSubTime = new Date(taskSubs[0].submittedAt).getTime();
          if (firstSubTime <= taskDeadlineTime) {
            submittedOnTimeTotal++;
          }
        }

        // Kiểm tra nghiệm thu đúng hạn
        if (task.acceptedAt) {
          const acceptedTime = new Date(task.acceptedAt).getTime();
          if (acceptedTime <= taskDeadlineTime) {
            acceptedOnTimeTotal++;
          }
        }
      }

      // Quá hạn tại thời điểm asOf
      if (taskDeadlineTime < asOfTime && task.status !== "done") {
        overdueOpenTotal++;
      }
    }

    // Đếm submissions và progressUpdates trong kỳ
    const submissionsInPeriodTotal = sources.submissions.filter((s) => {
      const t = new Date(s.submittedAt).getTime();
      return t >= pStartTime && t < pEndTime;
    }).length;

    const progressUpdatesInPeriodTotal = sources.progressUpdates.filter((p) => {
      const t = new Date(p.createdAt).getTime();
      return t >= pStartTime && t < pEndTime;
    }).length;

    const metrics: ReportMetrics = {
      statusCounts,
      dueInPeriodTotal,
      submittedOnTimeTotal,
      acceptedOnTimeTotal,
      overdueOpenTotal,
      submissionsInPeriodTotal,
      progressUpdatesInPeriodTotal,
    };

    // Thu thập danh sách sourceRefs đầy đủ
    const sourceRefs: SourceRef[] = [
      ...sources.tasks.map((t) => ({ entity: "Task" as const, id: t.id })),
      ...sources.submissions.map((s) => ({ entity: "Submission" as const, id: s.id })),
      ...sources.reviews.map((r) => ({ entity: "Review" as const, id: r.id })),
      ...sources.messages.map((m) => ({ entity: "Message" as const, id: m.id })),
      ...sources.progressUpdates.map((p) => ({ entity: "ProgressUpdate" as const, id: p.id })),
    ];

    // Gọi AI Weekly Report
    const aiResult = await aiProvider.generate("weekly_report", {
      metrics,
      sourceRefs,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      asOf,
      sources,
    });

    const reportId = `wr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const report: WeeklyReport = {
      id: reportId,
      projectId,
      generatedByMemberId: member.id,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      asOf,
      metrics,
      sourceRefs,
      summary: aiResult.proposal,
      aiMode: aiResult.aiMode,
      createdAt: asOf,
    };

    await this.repo.saveReport(report, options.idempotencyKey);

    if (options.idempotencyKey) {
      await this.repo.saveIdempotencyResult(options.idempotencyKey, report);
    }

    return report;
  }

  async listReports(session: Session, projectId: Id): Promise<WeeklyReport[]> {
    return this.repo.listReports(projectId);
  }

  async getReport(session: Session, reportId: Id): Promise<WeeklyReport> {
    const report = await this.repo.getReport(reportId);
    if (!report) {
      throw new DeliveryServiceError(404, "NOT_FOUND", "Không tìm thấy báo cáo.");
    }
    return report;
  }
}

export const deliveryService: DeliveryService = new DefaultDeliveryService();
