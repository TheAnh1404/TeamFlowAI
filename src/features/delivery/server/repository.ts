import "server-only";
import type { Id, Instant, Review, Submission, Task, WeeklyReport } from "@/contracts";
import type { ReportAiInput } from "@/server/ai/contracts";

// TODO(TV3 + TV2): storage signatures; metrics/acceptance remain unimplemented.
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
}
