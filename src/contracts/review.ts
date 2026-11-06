import { z } from "zod";
import { idSchema, instantSchema } from "./common";
import { aiModeSchema, reviewCriterionStatusSchema } from "./enums";
import type { Task } from "./task";

export const evidenceSchema = z.object({ submissionId: idSchema, quote: z.string() });
export const criterionResultSchema = z.object({
  criterionId: idSchema,
  verdict: reviewCriterionStatusSchema,
  evidence: z.array(evidenceSchema),
  missing: z.string(),
  suggestion: z.string(),
});
export const reviewSchema = z.object({
  id: idSchema,
  projectId: idSchema,
  taskId: idSchema,
  submissionId: idSchema,
  results: z.array(criterionResultSchema),
  summary: z.string(),
  aiMode: aiModeSchema,
  createdAt: instantSchema,
});

export type Evidence = z.infer<typeof evidenceSchema>;
export type CriterionResult = z.infer<typeof criterionResultSchema>;
export type Review = z.infer<typeof reviewSchema>;
export interface RequestReviewResult { review: Review; task: Task }
