import { z } from "zod";

export const projectRoleSchema = z.enum(["leader", "member"]);
export const planStatusSchema = z.enum(["draft", "published"]);
export const taskStatusSchema = z.enum(["todo", "in_progress", "blocked", "in_review", "changes_requested", "done"]);
export const reviewCriterionStatusSchema = z.enum(["met", "not_met", "insufficient_evidence"]);
export const messageResolutionSchema = z.enum(["clarification_required", "applied", "no_change"]);
export const submissionContentTypeSchema = z.enum(["text", "markdown", "code"]);
export const aiModeSchema = z.enum(["real", "mock"]);

export type ProjectRole = z.infer<typeof projectRoleSchema>;
export type PlanStatus = z.infer<typeof planStatusSchema>;
export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type ReviewCriterionStatus = z.infer<typeof reviewCriterionStatusSchema>;
export type MessageResolution = z.infer<typeof messageResolutionSchema>;
export type SubmissionContentType = z.infer<typeof submissionContentTypeSchema>;
export type AiMode = z.infer<typeof aiModeSchema>;
