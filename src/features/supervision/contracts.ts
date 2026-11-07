import { z } from "zod";
import { idSchema, instantSchema } from "@/contracts/common";
import { userSchema } from "@/contracts/project";
export const mentorGrantSchema=z.object({id:idSchema,projectId:idSchema,userId:idSchema,grantedByMemberId:idSchema,createdAt:instantSchema});
export const mentorListSchema=z.array(z.object({grant:mentorGrantSchema,user:userSchema}));
export const notificationSchema=z.object({
  id:idSchema,projectId:idSchema,recipientUserId:idSchema,kind:z.literal("deadline_risk"),title:z.string(),message:z.string(),
  snapshot:z.object({asOf:instantSchema,deadline:instantSchema,accepted:z.number().int().nonnegative(),total:z.number().int().positive(),progressPercent:z.number().min(0).max(100),elapsedPercent:z.number().min(0).max(100)}),
  createdAt:instantSchema,readAt:instantSchema.nullable(),resolvedAt:instantSchema.nullable(),
});
export const notificationListSchema=z.array(notificationSchema);
export type Notification=z.infer<typeof notificationSchema>;
