export const runtime = "nodejs";

import { registerInputSchema } from "@/contracts/auth";
import { authService } from "@/server/auth/service";
import { assertSameOrigin, endpoint, readJson } from "@/server/http/errors";

export const POST = (request: Request) =>
  endpoint(async () => {
    assertSameOrigin(request);
    const input = await readJson(request, registerInputSchema);
    const result = await authService.register(request, input);
    return new Response(JSON.stringify({ data: result }), {
      status: 202,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  });
