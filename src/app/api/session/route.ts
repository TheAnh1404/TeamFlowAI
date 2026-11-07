export const runtime = "nodejs";

import { cookies } from "next/headers";
import { z } from "zod";
import { getDb } from "@/server/db/client";
import { requireSession } from "@/server/auth";
import { createDemoSession, revokeSession, SESSION_COOKIE } from "@/server/auth/session";
import { assert, assertSameOrigin, endpoint, readJson } from "@/server/http/errors";

export const GET = () => endpoint(requireSession);

export const POST = (request: Request) =>
  endpoint(async () => {
    const input = await readJson(
      request,
      z
        .object({
          account: z.enum(["TV1", "TV2", "TV3"]).optional(),
          demoAccount: z.enum(["TV1", "TV2", "TV3"]).optional(),
          accessCode: z.string().min(16).max(256),
        })
        .strict()
    );
    assert(process.env.ENABLE_DEMO_AUTH === "true", 403, "FORBIDDEN", "Đăng nhập demo chưa được bật trên server.");
    const account = input.account ?? input.demoAccount;
    assert(account !== undefined, 422, "VALIDATION_ERROR", "Thiếu tài khoản demo.");
    const jar = await cookies();
    const { token, expiresAt } = await createDemoSession(getDb(), account, input.accessCode, jar.get(SESSION_COOKIE)?.value);
    jar.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(expiresAt),
    });
    return requireSession();
  });

export const DELETE = (request: Request) =>
  endpoint(async () => {
    assertSameOrigin(request);
    const jar = await cookies();
    await revokeSession(getDb(), jar.get(SESSION_COOKIE)?.value);
    jar.delete(SESSION_COOKIE);
    return { signedOut: true };
  });
