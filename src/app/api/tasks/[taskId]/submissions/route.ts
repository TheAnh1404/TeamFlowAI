import {readJson} from "@/server/http/errors";
import { submitWorkInputSchema } from "@/contracts/submission";
import { handleDeliveryApiError } from "@/features/delivery/server/api-response";
import { getDeliverySession } from "@/features/delivery/server/auth-helper";
import { deliveryService } from "@/features/delivery/server/service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> },
): Promise<Response> {
  try {
    const { taskId } = await params;
    const session = await getDeliverySession(request);
    const submissions = await deliveryService.listSubmissions(session, taskId);
    return Response.json({ data: submissions });
  } catch (err) {
    return handleDeliveryApiError(err);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> },
): Promise<Response> {
  try {
    const { taskId } = await params;
    const session = await getDeliverySession(request);
    const input = await readJson(request, submitWorkInputSchema);
    const idempotencyKey = request.headers.get("Idempotency-Key") || "";

    const result = await deliveryService.submitWork(session, taskId, input, { idempotencyKey });
    return Response.json({ data: result }, { status: 201 });
  } catch (err) {
    return handleDeliveryApiError(err);
  }
}
