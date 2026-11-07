import { assertSameOrigin } from "@/server/http/errors";
import { handleDeliveryApiError } from "@/features/delivery/server/api-response";
import { getDeliverySession } from "@/features/delivery/server/auth-helper";
import { deliveryService } from "@/features/delivery/server/service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ submissionId: string }> },
): Promise<Response> {
  try {
    const { submissionId } = await params;
    const session = await getDeliverySession(request);
    const review = await deliveryService.getReview(session, submissionId);
    return Response.json({ data: review });
  } catch (err) {
    return handleDeliveryApiError(err);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ submissionId: string }> },
): Promise<Response> {
  try {
    assertSameOrigin(request);
    const { submissionId } = await params;
    const session = await getDeliverySession(request);
    const idempotencyKey = request.headers.get("Idempotency-Key") || "";

    const result = await deliveryService.requestReview(session, submissionId, { idempotencyKey });
    return Response.json({ data: result }, { status: 200 });
  } catch (err) {
    return handleDeliveryApiError(err);
  }
}
