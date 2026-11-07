import { z } from "zod";
import { idSchema, instantSchema, versionSchema } from "./common";
import { submissionContentTypeSchema } from "./enums";
import { criterionSchema, type Task } from "./task";

export const submissionSchema = z.object({
  id: idSchema,
  projectId: idSchema,
  taskId: idSchema,
  authorMemberId: idSchema,
  revision: versionSchema,
  contentType: submissionContentTypeSchema,
  content: z.string(),
  criteriaSnapshot: z.array(criterionSchema),
  submittedAt: instantSchema,
});
export const submitWorkInputSchema = z.object({
  contentType: submissionContentTypeSchema,
  content: z.string().min(1, "Nội dung bài nộp không được để trống").max(32768, "Nội dung bài nộp vượt quá 32KB"),
  expectedTaskVersion: versionSchema,
});
export const confirmAcceptanceInputSchema = z.object({
  submissionId: idSchema,
  expectedTaskVersion: versionSchema,
});

export type Submission = z.infer<typeof submissionSchema>;
export type SubmitWorkInput = z.infer<typeof submitWorkInputSchema>;
export type ConfirmAcceptanceInput = z.infer<typeof confirmAcceptanceInputSchema>;
export interface SubmitWorkResult { submission: Submission; task: Task }
