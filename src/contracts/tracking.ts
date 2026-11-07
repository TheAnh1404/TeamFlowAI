import { z } from "zod";
import { idSchema, instantSchema, versionSchema } from "./common";
import { aiModeSchema, messageResolutionSchema, taskStatusSchema } from "./enums";
import { taskSchema, type Task } from "./task";

export const messageSchema = z.object({
  id: idSchema,
  projectId: idSchema,
  authorMemberId: idSchema,
  content: z.string(),
  taskId: idSchema.nullable(),
  candidateTaskIds: z.array(idSchema),
  resolution: messageResolutionSchema,
  clarificationQuestion: z.string().nullable(),
  aiMode: aiModeSchema,
  createdAt: instantSchema,
});
export const progressUpdateSchema = z.object({
  id: idSchema,
  projectId: idSchema,
  taskId: idSchema,
  messageId: idSchema,
  authorMemberId: idSchema,
  statusBefore: taskStatusSchema,
  statusAfter: taskStatusSchema,
  note: z.string(),
  blocker: z.string().nullable(),
  createdAt: instantSchema,
});
export const submitProgressMessageInputSchema = z.object({
  content: z.string().trim().min(1).max(8000),
  taskId: idSchema.optional(),
}).strict();
export const resolveTaskReferenceInputSchema = z.object({
  taskId: idSchema,
  requestedStatus: z.enum(["in_progress", "blocked"]),
  blocker: z.string().trim().min(1).max(2000).optional(),
  expectedTaskVersion: versionSchema,
}).strict().refine((v) => v.requestedStatus !== "blocked" || !!v.blocker, { message: "Cần mô tả trở ngại.", path: ["blocker"] });

export type Message = z.infer<typeof messageSchema>;
export type ProgressUpdate = z.infer<typeof progressUpdateSchema>;
export type SubmitProgressMessageInput = z.infer<typeof submitProgressMessageInputSchema>;
export type ResolveTaskReferenceInput = z.infer<typeof resolveTaskReferenceInputSchema>;
export interface ProgressMessageResult {
  message: Message;
  progressUpdate: ProgressUpdate | null;
  task: Task | null;
}
export const progressMessageResultSchema = z.object({
  message: messageSchema,
  progressUpdate: progressUpdateSchema.nullable(),
  task: taskSchema.nullable(),
});
