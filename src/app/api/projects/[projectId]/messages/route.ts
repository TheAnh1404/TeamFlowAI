import { requireSession } from "@/server/auth";
import { endpoint, readJson } from "@/server/http/errors";
import { submitProgressMessageInputSchema } from "@/contracts";
import { trackingService } from "@/features/tracking/server/implementation";
type Context = { params: Promise<{ projectId: string }> };
export const GET = (_request: Request, context: Context) => endpoint(async () => {
  return trackingService.listMessages(await requireSession(), (await context.params).projectId);
});
export const POST = (request: Request, context: Context) => endpoint(async () => {
  const session = await requireSession();
  const input = await readJson(request, submitProgressMessageInputSchema);
  return trackingService.submitProgressMessage(session, (await context.params).projectId, input, { idempotencyKey: request.headers.get("Idempotency-Key") ?? "" });
});
