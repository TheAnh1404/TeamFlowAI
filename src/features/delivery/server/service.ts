import "server-only";
import type {ConfirmAcceptanceInput, GenerateWeeklyReportInput, Id, MutationOptions, RequestReviewResult, Review, Submission, SubmitWorkInput, SubmitWorkResult, Task, WeeklyReport} from "@/contracts";
import type {Session} from "@/server/auth/contracts";
export {HttpError as DeliveryServiceError} from "@/server/http/errors";
export {createDeliveryService, deliveryService} from "./implementation";

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
