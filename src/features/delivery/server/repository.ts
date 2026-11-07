import "server-only";
import type {
  Id, Instant, Message, ProgressUpdate, Review, Submission, Task, WeeklyReport,
} from "@/contracts";
import type { ReportAiInput } from "@/server/ai/contracts";

export interface DeliveryRepository {
  getTask(taskId: Id): Promise<Task | null>;
  listSubmissions(taskId: Id): Promise<Submission[]>;
  getSubmission(submissionId: Id): Promise<Submission | null>;
  getReview(submissionId: Id): Promise<Review | null>;
  commitSubmission(submission: Submission, task: Task, expectedVersion: number, idempotencyKey: string): Promise<void>;
  commitReview(review: Review, task: Task | null, expectedVersion: number, idempotencyKey: string): Promise<void>;
  commitAcceptance(task: Task, expectedVersion: number, idempotencyKey: string): Promise<void>;
  readReportSources(projectId: Id, asOf: Instant): Promise<ReportAiInput["sources"]>;
  saveReport(report: WeeklyReport, idempotencyKey: string): Promise<void>;
  listReports(projectId: Id): Promise<WeeklyReport[]>;
  getReport(reportId: Id): Promise<WeeklyReport | null>;
  getIdempotencyResult<T>(key: string): Promise<T | null>;
  saveIdempotencyResult<T>(key: string, result: T): Promise<void>;
}

// Global in-memory storage for resilient runtime state and fixture isolation
class InMemoryDeliveryRepository implements DeliveryRepository {
  private tasks = new Map<Id, Task>();
  private submissions = new Map<Id, Submission>();
  private submissionsByTask = new Map<Id, Id[]>();
  private reviews = new Map<Id, Review>(); // key: submissionId
  private reports = new Map<Id, WeeklyReport>();
  private reportsByProject = new Map<Id, Id[]>();
  private messages = new Map<Id, Message>();
  private progressUpdates = new Map<Id, ProgressUpdate>();
  private idempotencyStore = new Map<string, unknown>();

  constructor() {
    this.seedFixtures();
  }

  private seedFixtures() {
    const p1 = "p1";
    const pl1 = "pl1";
    const m1 = "m1"; // Leader
    const m2 = "m2"; // Assignee

    const nowIso = new Date().toISOString();
    const pastHourIso = new Date(Date.now() - 3600000).toISOString();
    const deadlineIso = new Date(Date.now() + 86400000 * 2).toISOString();

    // 1. Task mẫu t1
    const t1: Task = {
      id: "t1",
      projectId: p1,
      planId: pl1,
      title: "Soạn nội dung demo và tài liệu hướng dẫn",
      description: "Nộp đoạn Markdown giới thiệu TeamFlow AI và các bước sử dụng phần mềm.",
      assigneeMemberId: m2,
      deadline: deadlineIso,
      criteria: [
        { id: "c1", text: "Có mục tiêu sản phẩm" },
        { id: "c2", text: "Có hướng dẫn các bước sử dụng" },
      ],
      dependencyTaskIds: [],
      status: "in_review",
      version: 3,
      acceptedSubmissionId: null,
      acceptedByMemberId: null,
      acceptedAt: null,
      createdAt: pastHourIso,
    };
    this.tasks.set(t1.id, t1);

    // 2. Submission mẫu s1 (revision 1)
    const s1: Submission = {
      id: "s1",
      projectId: p1,
      taskId: "t1",
      authorMemberId: m2,
      revision: 1,
      contentType: "markdown",
      content: `# Giới thiệu TeamFlow AI
Mục tiêu sản phẩm: Cung cấp giải pháp quản trị dự án thông minh với 3 trợ lý AI hỗ trợ lập kế hoạch, theo dõi tiến độ và đối chiếu nghiệm thu minh bạch.`,
      criteriaSnapshot: t1.criteria,
      submittedAt: pastHourIso,
    };
    this.submissions.set(s1.id, s1);
    this.submissionsByTask.set(t1.id, [s1.id]);

    // 3. Review mẫu r1 cho s1
    const r1: Review = {
      id: "r1",
      projectId: p1,
      taskId: "t1",
      submissionId: "s1",
      results: [
        {
          criterionId: "c1",
          verdict: "met",
          evidence: [{ submissionId: "s1", quote: "Mục tiêu sản phẩm: Cung cấp giải pháp quản trị dự án thông minh với 3 trợ lý AI" }],
          missing: "",
          suggestion: "Tiêu chí về mục tiêu được trình bày rõ ràng.",
        },
        {
          criterionId: "c2",
          verdict: "insufficient_evidence",
          evidence: [],
          missing: "Bài nộp chưa cung cấp nội dung chứng minh các bước sử dụng.",
          suggestion: "Vui lòng bổ sung quy trình các bước sử dụng trong bản nộp tiếp theo.",
        },
      ],
      summary: "Bài nộp có mục tiêu rõ ràng; tuy nhiên cần bổ sung bằng chứng cụ thể cho hướng dẫn sử dụng trước khi nghiệm thu.",
      aiMode: "mock",
      createdAt: pastHourIso,
    };
    this.reviews.set(s1.id, r1);

    // 4. Message & ProgressUpdate mẫu
    const msg1: Message = {
      id: "msg1",
      projectId: p1,
      authorMemberId: m2,
      content: "Đã nộp bài cho task t1, chờ reviewer kiểm tra.",
      taskId: "t1",
      candidateTaskIds: ["t1"],
      resolution: "applied",
      clarificationQuestion: null,
      aiMode: "mock",
      createdAt: pastHourIso,
    };
    this.messages.set(msg1.id, msg1);

    const pu1: ProgressUpdate = {
      id: "pu1",
      projectId: p1,
      taskId: "t1",
      messageId: "msg1",
      authorMemberId: m2,
      statusBefore: "todo",
      statusAfter: "in_review",
      note: "Chuyển sang in_review sau khi nộp bài",
      blocker: null,
      createdAt: pastHourIso,
    };
    this.progressUpdates.set(pu1.id, pu1);

    // 5. WeeklyReport mẫu wr1
    const wr1: WeeklyReport = {
      id: "wr1",
      projectId: p1,
      generatedByMemberId: m1,
      periodStart: new Date(Date.now() - 86400000 * 7).toISOString(),
      periodEnd: nowIso,
      asOf: nowIso,
      metrics: {
        statusCounts: {
          todo: 0,
          in_progress: 0,
          blocked: 0,
          in_review: 1,
          changes_requested: 0,
          done: 0,
        },
        dueInPeriodTotal: 1,
        submittedOnTimeTotal: 1,
        acceptedOnTimeTotal: 0,
        overdueOpenTotal: 0,
        submissionsInPeriodTotal: 1,
        progressUpdatesInPeriodTotal: 1,
      },
      sourceRefs: [
        { entity: "Task", id: "t1" },
        { entity: "ProgressUpdate", id: "pu1" },
        { entity: "Message", id: "msg1" },
        { entity: "Submission", id: "s1" },
        { entity: "Review", id: "r1" },
      ],
      summary: [
        {
          text: "Nhóm đã có 1 bài nộp trong kỳ; hướng dẫn sử dụng vẫn cần bổ sung bằng chứng theo nhận xét của Reviewer.",
          sourceRefs: [
            { entity: "Submission", id: "s1" },
            { entity: "Review", id: "r1" },
          ],
          metricKeys: ["submissionsInPeriodTotal"],
        },
        {
          text: "Công việc t1 đang trong trạng thái chờ nghiệm thu, chưa phát sinh quá hạn.",
          sourceRefs: [{ entity: "Task", id: "t1" }],
          metricKeys: ["dueInPeriodTotal", "overdueOpenTotal"],
        },
      ],
      aiMode: "mock",
      createdAt: nowIso,
    };
    this.reports.set(wr1.id, wr1);
    this.reportsByProject.set(p1, [wr1.id]);
  }

  async getTask(taskId: Id): Promise<Task | null> {
    return this.tasks.get(taskId) ?? null;
  }

  async listSubmissions(taskId: Id): Promise<Submission[]> {
    const ids = this.submissionsByTask.get(taskId) ?? [];
    return ids
      .map((id) => this.submissions.get(id))
      .filter((s): s is Submission => s !== undefined)
      .sort((a, b) => b.revision - a.revision); // Sắp xếp revision mới nhất lên đầu
  }

  async getSubmission(submissionId: Id): Promise<Submission | null> {
    return this.submissions.get(submissionId) ?? null;
  }

  async getReview(submissionId: Id): Promise<Review | null> {
    return this.reviews.get(submissionId) ?? null;
  }

  async commitSubmission(
    submission: Submission,
    task: Task,
    expectedVersion: number,
    idempotencyKey: string,
  ): Promise<void> {
    const currentTask = this.tasks.get(task.id);
    if (!currentTask) {
      throw new Error("Task không tồn tại.");
    }
    if (currentTask.version !== expectedVersion) {
      throw new Error("Xung đột phiên bản task (VERSION_CONFLICT).");
    }

    this.submissions.set(submission.id, submission);
    const existing = this.submissionsByTask.get(task.id) ?? [];
    this.submissionsByTask.set(task.id, [...existing, submission.id]);
    this.tasks.set(task.id, task);

    if (idempotencyKey) {
      this.idempotencyStore.set(idempotencyKey, { submission, task });
    }
  }

  async commitReview(
    review: Review,
    task: Task | null,
    expectedVersion: number,
    idempotencyKey: string,
  ): Promise<void> {
    this.reviews.set(review.submissionId, review);

    if (task) {
      const currentTask = this.tasks.get(task.id);
      if (currentTask && currentTask.version === expectedVersion) {
        this.tasks.set(task.id, task);
      }
    }

    if (idempotencyKey) {
      this.idempotencyStore.set(idempotencyKey, { review, task });
    }
  }

  async commitAcceptance(
    task: Task,
    expectedVersion: number,
    idempotencyKey: string,
  ): Promise<void> {
    const currentTask = this.tasks.get(task.id);
    if (!currentTask) {
      throw new Error("Task không tồn tại.");
    }
    if (currentTask.version !== expectedVersion) {
      throw new Error("Xung đột phiên bản task (VERSION_CONFLICT).");
    }

    this.tasks.set(task.id, task);

    if (idempotencyKey) {
      this.idempotencyStore.set(idempotencyKey, task);
    }
  }

  async readReportSources(projectId: Id, asOf: Instant): Promise<ReportAiInput["sources"]> {
    const asOfTime = new Date(asOf).getTime();

    const tasks = Array.from(this.tasks.values()).filter(
      (t) => t.projectId === projectId && new Date(t.createdAt).getTime() <= asOfTime,
    );

    const submissions = Array.from(this.submissions.values()).filter(
      (s) => s.projectId === projectId && new Date(s.submittedAt).getTime() <= asOfTime,
    );

    const reviews = Array.from(this.reviews.values()).filter(
      (r) => r.projectId === projectId && new Date(r.createdAt).getTime() <= asOfTime,
    );

    const messages = Array.from(this.messages.values()).filter(
      (m) => m.projectId === projectId && new Date(m.createdAt).getTime() <= asOfTime,
    );

    const progressUpdates = Array.from(this.progressUpdates.values()).filter(
      (p) => p.projectId === projectId && new Date(p.createdAt).getTime() <= asOfTime,
    );

    return { tasks, messages, progressUpdates, submissions, reviews };
  }

  async saveReport(report: WeeklyReport, idempotencyKey: string): Promise<void> {
    this.reports.set(report.id, report);
    const existing = this.reportsByProject.get(report.projectId) ?? [];
    this.reportsByProject.set(report.projectId, [...existing, report.id]);

    if (idempotencyKey) {
      this.idempotencyStore.set(idempotencyKey, report);
    }
  }

  async listReports(projectId: Id): Promise<WeeklyReport[]> {
    const ids = this.reportsByProject.get(projectId) ?? [];
    return ids
      .map((id) => this.reports.get(id))
      .filter((r): r is WeeklyReport => r !== undefined)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getReport(reportId: Id): Promise<WeeklyReport | null> {
    return this.reports.get(reportId) ?? null;
  }

  async getIdempotencyResult<T>(key: string): Promise<T | null> {
    return (this.idempotencyStore.get(key) as T) ?? null;
  }

  async saveIdempotencyResult<T>(key: string, result: T): Promise<void> {
    this.idempotencyStore.set(key, result);
  }
}

// Global singleton instance for server runtime
export const deliveryRepository: DeliveryRepository = new InMemoryDeliveryRepository();
