import { z } from "zod";
import { idSchema, instantSchema, versionSchema } from "./common";
import { aiModeSchema, planStatusSchema } from "./enums";
import { criterionSchema, taskContentSchema, type Task } from "./task";

export const draftTaskSchema = taskContentSchema;
export const draftTaskInputSchema = taskContentSchema.extend({
  id: idSchema.nullable(),
  criteria: z.array(criterionSchema.extend({ id: idSchema.nullable() })),
});
export const planSchema = z.object({
  id: idSchema,
  projectId: idSchema,
  status: planStatusSchema,
  version: versionSchema,
  draftTasks: z.array(draftTaskSchema),
  aiMode: aiModeSchema,
  approvedByMemberId: idSchema.nullable(),
  publishedAt: instantSchema.nullable(),
  createdAt: instantSchema,
});
export const updatePlanDraftInputSchema = z.object({
  expectedVersion: versionSchema,
  draftTasks: z.array(draftTaskInputSchema),
});
export const publishPlanInputSchema = z.object({
  expectedVersion: versionSchema,
  approved: z.boolean(),
});

export type DraftTask = z.infer<typeof draftTaskSchema>;
export type DraftTaskInput = z.infer<typeof draftTaskInputSchema>;
export type Plan = z.infer<typeof planSchema>;
export type UpdatePlanDraftInput = z.infer<typeof updatePlanDraftInputSchema>;
export type PublishPlanInput = z.infer<typeof publishPlanInputSchema>;
export interface PublishPlanResult { plan: Plan; tasks: Task[] }
