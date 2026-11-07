export const runtime = "nodejs";

import { requireSession } from "@/server/auth";
import { endpoint } from "@/server/http/errors";
import { trackingService } from "@/features/tracking/server/implementation";

export const GET = (_request: Request, context: { params: Promise<{ taskId: string }> }) =>
  endpoint(async () => {
    const session = await requireSession();
    return trackingService.listProgressUpdates(session, (await context.params).taskId);
  });
