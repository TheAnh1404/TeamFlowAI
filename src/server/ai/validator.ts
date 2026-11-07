import "server-only";
import { z } from "zod";
import type { CriterionResult, Submission, SummaryItem } from "@/contracts";
import type { PlanningAiProposal, ReportAiInput, TrackingAiProposal } from "./contracts";
import { AiInvalidOutputError } from "./errors";

const planningProposalSchema = z.object({
  tasks: z.array(z.object({
    tempKey: z.string().min(1),
    title: z.string().min(1),
    description: z.string(),
    assigneeMemberId: z.string().min(1),
    deadline: z.string().min(1),
    criteria: z.array(z.string().min(1)).min(1),
    dependencyTempKeys: z.array(z.string()),
  })),
});

const trackingProposalSchema = z.object({
  intent: z.enum(["update", "discussion", "clarify"]),
  taskId: z.string().optional(),
  requestedStatus: z.enum(["in_progress", "blocked"]).optional(),
  blocker: z.string().optional(),
  clarificationQuestion: z.string().optional(),
});

const reviewProposalSchema = z.object({
  results: z.array(z.object({
    criterionId: z.string().min(1),
    verdict: z.enum(["met", "not_met", "insufficient_evidence"]),
    evidence: z.array(z.object({
      submissionId: z.string().min(1),
      quote: z.string().min(1, "Trích dẫn không được để trống"),
    })),
    missing: z.string(),
    suggestion: z.string(),
  })),
  summary: z.string().min(1),
});

const summaryItemSchema = z.object({
  text: z.string().min(1),
  sourceRefs: z.array(z.object({
    entity: z.enum(["Task", "Message", "ProgressUpdate", "Submission", "Review"]),
    id: z.string().min(1),
  })),
  metricKeys: z.array(z.string()),
});

const reportProposalSchema = z.array(summaryItemSchema);

export function validatePlannerProposal(raw: unknown): PlanningAiProposal {
  const result = planningProposalSchema.safeParse(raw);
  if (!result.success) {
    throw new AiInvalidOutputError("Cấu trúc kế hoạch từ AI không hợp lệ: " + result.error.message, result.error);
  }
  return result.data;
}

export function validateTrackingProposal(raw: unknown): TrackingAiProposal {
  const result = trackingProposalSchema.safeParse(raw);
  if (!result.success) {
    throw new AiInvalidOutputError("Cấu trúc theo dõi từ AI không hợp lệ: " + result.error.message, result.error);
  }
  return result.data;
}

export function validateReviewerProposal(raw: unknown, submission: Submission): { results: CriterionResult[]; summary: string } {
  const result = reviewProposalSchema.safeParse(raw);
  if (!result.success) {
    throw new AiInvalidOutputError("Cấu trúc nhận xét từ AI không hợp lệ: " + result.error.message, result.error);
  }

  const { results, summary } = result.data;
  const snapshotCriterionIds = new Set(submission.criteriaSnapshot.map((c) => c.id));

  // Kiểm tra mỗi criterion trong snapshot phải có đúng 1 result
  const coveredIds = new Set<string>();
  for (const r of results) {
    if (!snapshotCriterionIds.has(r.criterionId)) {
      throw new AiInvalidOutputError(`Review trỏ tới criterionId không tồn tại: ${r.criterionId}`);
    }
    if (coveredIds.has(r.criterionId)) {
      throw new AiInvalidOutputError(`CriterionId bị lặp lại trong kết quả review: ${r.criterionId}`);
    }
    coveredIds.add(r.criterionId);

    // Bất biến: quote phải là substring có thật trong submission.content
    for (const ev of r.evidence) {
      if (ev.quote && !submission.content.includes(ev.quote)) {
        throw new AiInvalidOutputError(
          `Bằng chứng trích dẫn không tồn tại trong bài nộp (Hallucination detection): "${ev.quote.slice(0, 50)}..."`
        );
      }
    }

    // Bất biến: verdict 'met' bắt buộc phải có ít nhất 1 evidence có quote thực
    if (r.verdict === "met") {
      const validEvidence = r.evidence.filter((ev) => ev.quote && ev.quote.trim().length > 0);
      if (validEvidence.length === 0) {
        throw new AiInvalidOutputError(
          `Tiêu chí ${r.criterionId} được đánh giá 'met' nhưng không có trích dẫn bằng chứng hợp lệ.`
        );
      }
    }
  }

  if (coveredIds.size !== snapshotCriterionIds.size) {
    throw new AiInvalidOutputError("Review chưa đánh giá đầy đủ tất cả tiêu chí của bài nộp.");
  }

  return { results, summary };
}

export function validateReportProposal(raw: unknown, input: ReportAiInput): SummaryItem[] {
  const result = reportProposalSchema.safeParse(raw);
  if (!result.success) {
    throw new AiInvalidOutputError("Cấu trúc báo cáo từ AI không hợp lệ: " + result.error.message, result.error);
  }

  // Thu thập tất cả id và metric keys hợp lệ
  const validRefMap = new Set(input.sourceRefs.map((r) => `${r.entity}:${r.id}`));
  const validMetricKeys = new Set(Object.keys(input.metrics));

  for (const item of result.data) {
    // Phải có ít nhất nguồn hoặc metric
    if (item.sourceRefs.length === 0 && item.metricKeys.length === 0) {
      throw new AiInvalidOutputError("Mỗi nhận định trong báo cáo phải có ít nhất một nguồn dẫn chứng hoặc chỉ số.");
    }

    // Kiểm tra sourceRefs
    for (const ref of item.sourceRefs) {
      if (!validRefMap.has(`${ref.entity}:${ref.id}`)) {
        throw new AiInvalidOutputError(`Nguồn dẫn chứng '${ref.entity}:${ref.id}' không thuộc snapshot hợp lệ của kỳ báo cáo.`);
      }
    }

    // Kiểm tra metricKeys
    for (const key of item.metricKeys) {
      if (!validMetricKeys.has(key)) {
        throw new AiInvalidOutputError(`Chỉ số '${key}' không tồn tại trong dữ liệu tính toán của hệ thống.`);
      }
    }
  }

  return result.data;
}

