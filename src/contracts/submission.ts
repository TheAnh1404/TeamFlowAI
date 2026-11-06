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
export const submitWorkInputSchema = submissionSchema.pick({ contentType: true, content: true }).extend({
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
