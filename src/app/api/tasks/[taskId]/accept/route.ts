import { confirmAcceptanceInputSchema } from "@/contracts/submission";
import { handleDeliveryApiError } from "@/features/delivery/server/api-response";
import { getDeliverySession } from "@/features/delivery/server/auth-helper";
import { deliveryService } from "@/features/delivery/server/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> },
): Promise<Response> {
  try {
    const { taskId } = await params;
    const session = await getDeliverySession(request);
    const body = await request.json();
    const input = confirmAcceptanceInputSchema.parse(body);
    const idempotencyKey = request.headers.get("Idempotency-Key") || "";

    const task = await deliveryService.confirmAcceptance(session, taskId, input, { idempotencyKey });
    return Response.json({ data: task }, { status: 200 });
  } catch (err) {
    return handleDeliveryApiError(err);
  }
}
