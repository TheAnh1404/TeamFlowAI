import { z } from "zod";

// Structural schemas only. Ownership: TV2. Business validation belongs to services.
export const idSchema = z.string().trim().min(1).max(128);
export const instantSchema = z.iso.datetime({ offset: true });
export const versionSchema = z.number().int().positive();

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(z.unknown()).optional(),
  }),
});

export type Id = z.infer<typeof idSchema>;
export type Instant = z.infer<typeof instantSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
export interface ApiResponse<T> { data: T }
export interface MutationOptions { idempotencyKey: string }
