export const runtime = "nodejs";

import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/server/auth/session";
import { authService } from "@/server/auth/service";
import { assertSameOrigin, endpoint } from "@/server/http/errors";

export const POST = (request: Request) =>
  endpoint(async () => {
    assertSameOrigin(request);
    const jar = await cookies();
    const token = jar.get(SESSION_COOKIE)?.value;

    const result = await authService.logout(token);
    jar.delete(SESSION_COOKIE);

    return new Response(JSON.stringify({ data: result }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  });
