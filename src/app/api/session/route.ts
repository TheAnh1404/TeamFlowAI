export const runtime = "nodejs";

import { cookies } from "next/headers";
import { z } from "zod";
import { getDb } from "@/server/db/client";
import { requireSession } from "@/server/auth";
import { createDemoSession, revokeSession, SESSION_COOKIE } from "@/server/auth/session";
import { assert, assertSameOrigin, endpoint, readJson } from "@/server/http/errors";

export const GET = () =>
  endpoint(async () => {
    const session = await requireSession();
    return new Response(JSON.stringify({ data: session }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  });

export const POST = (request: Request) =>
  endpoint(async () => {
    assert(
      (process.env.NODE_ENV as string) !== "production" && process.env.ENABLE_DEMO_AUTH === "true",
      403,
      "FORBIDDEN",
      "Đăng nhập demo chưa được bật trên server hoặc bị từ chối ở môi trường production."
    );

    const input = await readJson(
      request,
      z
        .object({
          account: z.enum(["TV1", "TV2", "TV3"]).optional(),
          demoAccount: z.enum(["TV1", "TV2", "TV3"]).optional(),
        })
        .strict()
    );

    const account = input.account ?? input.demoAccount;
    assert(account !== undefined, 422, "VALIDATION_ERROR", "Thiếu tài khoản demo.");

    const jar = await cookies();
    const { token, expiresAt } = await createDemoSession(getDb(), account, jar.get(SESSION_COOKIE)?.value);
    const isHttps = request.url.startsWith("https://") || request.headers.get("x-forwarded-proto") === "https";
    jar.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: isHttps,
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
