import { handleDeliveryApiError } from "@/features/delivery/server/api-response";
import { getDeliverySession } from "@/features/delivery/server/auth-helper";
import { deliveryService } from "@/features/delivery/server/service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  try {
    const { projectId } = await params;
    const session = await getDeliverySession(request);

    const deliverable = await deliveryService.getProjectConsolidatedDeliverable(session, projectId);
    return Response.json({ data: deliverable });
  } catch (err) {
    return handleDeliveryApiError(err);
  }
}

