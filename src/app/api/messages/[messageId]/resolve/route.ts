export const runtime = "nodejs";

import { requireSession } from "@/server/auth";
import { endpoint, readJson } from "@/server/http/errors";
import { resolveTaskReferenceInputSchema } from "@/contracts";
import { trackingService } from "@/features/tracking/server/implementation";

export const POST = (request: Request, context: { params: Promise<{ messageId: string }> }) =>
  endpoint(async () => {
    const session = await requireSession();
    const input = await readJson(request, resolveTaskReferenceInputSchema);
    return trackingService.resolveTaskReference(session, (await context.params).messageId, input, {
      idempotencyKey: request.headers.get("Idempotency-Key") ?? "",
    });
  });
