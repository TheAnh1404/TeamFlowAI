import { z } from "zod";
import { idSchema, instantSchema } from "@/contracts/common";
import { userSchema } from "@/contracts/project";

export const inviteProjectMemberSchema = z.object({
  userId: idSchema,
  skills: z.array(z.string().trim().min(1).max(100)).max(20),
  availableHoursPerWeek: z.number().min(0.5).max(168),
}).strict();

export const projectInvitationSchema = z.object({
  id: idSchema,
  projectId: idSchema,
  projectName: z.string(),
  inviter: userSchema,
  skills: z.array(z.string()),
  availableHoursPerWeek: z.number(),
  createdAt: instantSchema,
  status: z.enum(["pending", "accepted", "declined"]),
});

export const respondInvitationSchema = z.object({ action: z.enum(["accept", "decline"]) }).strict();
export const projectInvitationListSchema = z.array(projectInvitationSchema);
export const invitationCandidateSchema = z.object({ id: idSchema, displayName: z.string(), createdAt: instantSchema });
export const outgoingInvitationSchema = z.object({ id: idSchema, displayName: z.string(), createdAt: instantSchema });
