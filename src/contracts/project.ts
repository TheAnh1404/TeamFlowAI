import { z } from "zod";
import { idSchema, instantSchema } from "./common";
import { projectRoleSchema } from "./enums";
import { planStatusSchema } from "./enums";

export const userSchema = z.object({
  id: idSchema,
  displayName: z.string(),
  createdAt: instantSchema,
});

export const projectSchema = z.object({
  id: idSchema,
  name: z.string(),
  goal: z.string(),
  deliverables: z.array(z.string()),
  deadline: instantSchema,
  timeZone: z.string(),
  createdAt: instantSchema,
});

export const projectMemberSchema = z.object({
  id: idSchema,
  projectId: idSchema,
  userId: idSchema,
  role: projectRoleSchema,
  canAccept: z.boolean(),
  skills: z.array(z.string()),
  availableHoursPerWeek: z.number(),
});

export const createProjectInputSchema = projectSchema.omit({ id: true, createdAt: true });
export const updateProjectInputSchema = createProjectInputSchema.partial();
export const addProjectMemberInputSchema = projectMemberSchema.pick({
  userId: true, skills: true, availableHoursPerWeek: true, canAccept: true,
});
export const updateProjectMemberInputSchema = addProjectMemberInputSchema.omit({ userId: true }).partial();

export type User = z.infer<typeof userSchema>;
export type Project = z.infer<typeof projectSchema>;
export type ProjectMember = z.infer<typeof projectMemberSchema>;
export type CreateProjectInput = z.infer<typeof createProjectInputSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectInputSchema>;
export type AddProjectMemberInput = z.infer<typeof addProjectMemberInputSchema>;
export type UpdateProjectMemberInput = z.infer<typeof updateProjectMemberInputSchema>;
export interface ProjectDetails { project: Project; members: ProjectMember[] }
export interface CreateProjectResult { project: Project; member: ProjectMember }

// Read model for P02. Counts contain published tasks only; no draft task content.
export const projectSummarySchema = projectSchema.extend({
  planStatus: planStatusSchema.nullable(),
  memberCount: z.number().int(),
  taskCounts: z.object({ total: z.number().int(), done: z.number().int(), blocked: z.number().int() }),
});
export type ProjectSummary = z.infer<typeof projectSummarySchema>;
