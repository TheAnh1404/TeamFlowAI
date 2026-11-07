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
  content: z.string(),
  taskId: idSchema.optional(),
});
// Additive read model: existing Task consumers may ignore this metadata.
export const taskListItemSchema = taskSchema.extend({ latestProgressUpdate: progressUpdateSchema.nullable() });
export type TaskListItem = z.infer<typeof taskListItemSchema>;
export const resolveTaskReferenceInputSchema = z.object({
  taskId: idSchema,
  requestedStatus: z.enum(["in_progress", "blocked"]),
  blocker: z.string().optional(),
  expectedTaskVersion: versionSchema,
});

export type Message = z.infer<typeof messageSchema>;
export type ProgressUpdate = z.infer<typeof progressUpdateSchema>;
export type SubmitProgressMessageInput = z.infer<typeof submitProgressMessageInputSchema>;
export type ResolveTaskReferenceInput = z.infer<typeof resolveTaskReferenceInputSchema>;
export interface ProgressMessageResult {
  message: Message;
  progressUpdate: ProgressUpdate | null;
  task: Task | null;
}
