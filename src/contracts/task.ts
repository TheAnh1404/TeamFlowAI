import { z } from "zod";
import { idSchema, instantSchema, versionSchema } from "./common";
import { taskStatusSchema } from "./enums";

export const criterionSchema = z.object({ id: idSchema, text: z.string() });
export const taskContentSchema = z.object({
  id: idSchema,
  title: z.string(),
  description: z.string(),
  assigneeMemberId: idSchema,
  deadline: instantSchema,
  criteria: z.array(criterionSchema),
  dependencyTaskIds: z.array(idSchema),
});

export const taskSchema = taskContentSchema.extend({
  projectId: idSchema,
  planId: idSchema,
  status: taskStatusSchema,
  version: versionSchema,
  acceptedSubmissionId: idSchema.nullable(),
  acceptedByMemberId: idSchema.nullable(),
  acceptedAt: instantSchema.nullable(),
  createdAt: instantSchema,
});

export type Criterion = z.infer<typeof criterionSchema>;
export type TaskContent = z.infer<typeof taskContentSchema>;
export type Task = z.infer<typeof taskSchema>;
