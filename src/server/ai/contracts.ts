import type {
  AiMode, CriterionResult, Id, Message, ProgressUpdate, Project, ProjectMember,
  ReportMetrics, Review, SourceRef, Submission, SummaryItem, Task,
} from "@/contracts";
import type { SnapshotV2 } from "@/features/delivery/server/coordinator-reports";
import type { ReportSummaryV2 } from "@/contracts/coordinator";
export interface CoordinatorReportAiInput { snapshot: SnapshotV2; metrics: Record<string, unknown> }

export interface PlanningAiInput { project: Project; members: ProjectMember[] }
export interface PlanningTaskProposal {
  tempKey: string;
  title: string;
  description: string;
  assigneeMemberId: Id;
  deadline: string;
  criteria: string[];
  dependencyTempKeys: string[];
}
export interface PlanningAiProposal { tasks: PlanningTaskProposal[] }

export interface TrackingAiInput {
  message: Pick<Message, "content" | "taskId">;
  tasks: Task[];
}
export interface TrackingAiProposal {
  intent: "update" | "discussion" | "clarify";
  taskId?: Id;
  requestedStatus?: "in_progress" | "blocked";
  blocker?: string;
  clarificationQuestion?: string;
}
export interface ReviewAiInput { submission: Submission }
export interface ReviewAiProposal { results: CriterionResult[]; summary: string }
export interface ReportAiInput {
  metrics: ReportMetrics;
  sourceRefs: SourceRef[];
  periodStart: string;
  periodEnd: string;
  asOf: string;
  sources: {
    tasks: Task[];
    messages: Message[];
    progressUpdates: ProgressUpdate[];
    submissions: Submission[];
    reviews: Review[];
  };
}
export interface AiInputByKind {
  coordinator_report_v2: CoordinatorReportAiInput;
  planner: PlanningAiInput;
  coordinator: TrackingAiInput;
  reviewer: ReviewAiInput;
  weekly_report: ReportAiInput;
}
export interface AiOutputByKind {
  coordinator_report_v2: ReportSummaryV2;
  planner: PlanningAiProposal;
  coordinator: TrackingAiProposal;
  reviewer: ReviewAiProposal;
  weekly_report: SummaryItem[];
}
export type AiKind = keyof AiInputByKind;
export interface AiResult<T> { proposal: T; aiMode: AiMode }

// Keeps the generate(kind, input) interface described in docs/CONTRACTS.md.
export interface AiProvider {
  generate<K extends AiKind>(kind: K, input: AiInputByKind[K]): Promise<AiResult<AiOutputByKind[K]>>;
}
