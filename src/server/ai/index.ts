import "server-only";
import type {
  AiInputByKind, AiKind, AiOutputByKind, AiProvider, AiResult,
  PlanningAiInput,
  ReportAiInput,
  ReviewAiInput,
  TrackingAiInput,
} from "./contracts";
import {
  generateMockCoordinator,
  generateMockPlanner,
  generateMockReport,
  generateMockReviewer,
} from "./mock-generators";
import { generateReal, isRealAiConfigured } from "./real-provider";
import {
  validatePlannerProposal,
  validateReportProposal,
  validateReviewerProposal,
  validateTrackingProposal,
} from "./validator";

export * from "./contracts";
export * from "./errors";
export { isRealAiConfigured } from "./real-provider";

export const aiProvider: AiProvider = {
  async generate<K extends AiKind>(kind: K, input: AiInputByKind[K]): Promise<AiResult<AiOutputByKind[K]>> {
    // Explicit real requests must fail visibly; never replace a failed provider with mock.
    if (process.env.AI_MODE === "real" || isRealAiConfigured()) {
      const proposal = await generateReal(kind, input);
      return { proposal, aiMode: "real" };
    }

    // 2. Chế độ Mock thông minh bám sát nghiệp vụ và hợp đồng
    switch (kind) {
      case "planner": {
        const raw = generateMockPlanner(input as PlanningAiInput);
        const proposal = validatePlannerProposal(raw) as AiOutputByKind[K];
        return { proposal, aiMode: "mock" };
      }
      case "coordinator": {
        const raw = generateMockCoordinator(input as TrackingAiInput);
        const proposal = validateTrackingProposal(raw) as AiOutputByKind[K];
        return { proposal, aiMode: "mock" };
      }
      case "reviewer": {
        const reviewInput = input as ReviewAiInput;
        const raw = generateMockReviewer(reviewInput);
        const proposal = validateReviewerProposal(raw, reviewInput.submission) as AiOutputByKind[K];
        return { proposal, aiMode: "mock" };
      }
      case "weekly_report": {
        const reportInput = input as ReportAiInput;
        const raw = generateMockReport(reportInput);
        const proposal = validateReportProposal(raw, reportInput) as AiOutputByKind[K];
        return { proposal, aiMode: "mock" };
      }
      default:
        throw new Error("Loại trợ lý AI không hợp lệ: " + String(kind));
    }
  },
};
