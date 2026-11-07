import { handleDeliveryApiError } from "@/features/delivery/server/api-response";
import { getDeliverySession } from "@/features/delivery/server/auth-helper";
import { deliveryService } from "@/features/delivery/server/service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ reportId: string }> },
): Promise<Response> {
  try {
    const { reportId } = await params;
    const session = await getDeliverySession(request);
    const report = await deliveryService.getReport(session, reportId);
    return Response.json({ data: report });
  } catch (err) {
    return handleDeliveryApiError(err);
  }
}
