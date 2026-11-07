import { z } from "zod";
import { projectMemberSchema, userSchema } from "./project";

// Unicode length helper: count codepoints consistently across client and server
export function unicodeLength(str: string): number {
  return Array.from(str).length;
}

// Byte length helper (client and server compatible)
export function utf8ByteLength(str: string): number {
  if (typeof Buffer !== "undefined") {
    return Buffer.byteLength(str, "utf8");
  }
  return new TextEncoder().encode(str).length;
}

// Normalize email: trim and lowercase
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const emailSchema = z
  .string()
  .trim()
  .min(3, "Email quá ngắn.")
  .max(254, "Email không được vượt quá 254 ký tự.")
  .email("Địa chỉ email không đúng định dạng.")
  .transform(normalizeEmail);

export const displayNameSchema = z
  .string()
  .trim()
  .refine((val) => val.length > 0, "Tên hiển thị không được để trống.")
  .refine(
    (val) => {
      const len = unicodeLength(val);
      return len >= 2 && len <= 100;
    },
    { message: "Tên hiển thị phải từ 2 đến 100 ký tự." }
  );

export const registerPasswordSchema = z
  .string()
  .refine(
    (val) => {
      const len = unicodeLength(val);
      return len >= 8 && len <= 128;
    },
    { message: "Mật khẩu phải từ 8 đến 128 ký tự." }
  )
  .refine(
    (val) => utf8ByteLength(val) <= 512,
    { message: "Mật khẩu không được vượt quá 512 byte." }
  );

export const loginPasswordSchema = z
  .string()
  .min(1, "Mật khẩu không được để trống.")
  .refine(
    (val) => utf8ByteLength(val) <= 512,
    { message: "Mật khẩu không được vượt quá 512 byte." }
  );

export const registerInputSchema = z
  .object({
    displayName: displayNameSchema,
    email: emailSchema,
    password: registerPasswordSchema,
  })
  .strict();

export const loginInputSchema = z
  .object({
    email: emailSchema,
    password: loginPasswordSchema,
  })
  .strict();

export const registerResponseSchema = z.object({
  accepted: z.literal(true),
  message: z.string(),
});

export const logoutResponseSchema = z.object({
  signedOut: z.literal(true),
});

// Demo account selection for test/development
export const demoAccountSchema = z.enum(["TV1", "TV2", "TV3"]);
export const sessionSchema = z.object({ user: userSchema, memberships: z.array(projectMemberSchema) });
export const createDemoSessionInputSchema = z
  .object({
    demoAccount: demoAccountSchema,
  })
  .strict();

export type RegisterInput = z.infer<typeof registerInputSchema>;
export type LoginInput = z.infer<typeof loginInputSchema>;
export type RegisterResponse = z.infer<typeof registerResponseSchema>;
export type LogoutResponse = z.infer<typeof logoutResponseSchema>;
export type SessionData = z.infer<typeof sessionSchema>;
export type CreateDemoSessionInput = z.infer<typeof createDemoSessionInputSchema>;
