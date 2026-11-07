export const runtime = "nodejs";

import { cookies } from "next/headers";
import { loginInputSchema } from "@/contracts/auth";
import { SESSION_COOKIE } from "@/server/auth/session";
import { authService } from "@/server/auth/service";
import { assertSameOrigin, endpoint, readJson } from "@/server/http/errors";

export const POST = (request: Request) =>
  endpoint(async () => {
    assertSameOrigin(request);
    const input = await readJson(request, loginInputSchema);
    const jar = await cookies();
    const previousToken = jar.get(SESSION_COOKIE)?.value;

    const { token, expiresAt, sessionData } = await authService.login(request, input, previousToken);

    const isHttps = request.url.startsWith("https://") || request.headers.get("x-forwarded-proto") === "https";
    jar.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: isHttps,
      sameSite: "lax",
      path: "/",
      expires: new Date(expiresAt),
    });

    return new Response(JSON.stringify({ data: sessionData }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  });
