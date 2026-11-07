import { z } from "zod";
import { projectMemberSchema, userSchema } from "./project";

// Demo account selection is not a global role or a client-supplied user identity.
export const demoAccountSchema = z.enum(["TV1", "TV2", "TV3"]);
export const sessionSchema = z.object({ user: userSchema, memberships: z.array(projectMemberSchema) });
export const createDemoSessionInputSchema = z.object({
  demoAccount: demoAccountSchema,
}).strict();

export type SessionData = z.infer<typeof sessionSchema>;
export type CreateDemoSessionInput = z.infer<typeof createDemoSessionInputSchema>;
