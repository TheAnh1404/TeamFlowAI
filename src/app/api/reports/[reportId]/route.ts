import { handleDeliveryApiError } from "@/features/delivery/server/api-response";
import { getDeliverySession } from "@/features/delivery/server/auth-helper";
import { deliveryService } from "@/features/delivery/server/service";
import { sourceRefSchema } from "@/contracts";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ reportId: string }> },
): Promise<Response> {
  try {
    const { reportId } = await params;
    const session = await getDeliverySession(request);
    const query = new URL(request.url).searchParams;
    if (query.has("entity") || query.has("sourceId")) {
      const ref = sourceRefSchema.parse({ entity: query.get("entity"), id: query.get("sourceId") });
      const source = await deliveryService.getReportSource(session, reportId, ref);
      return Response.json({ data: source }, { headers: { "Cache-Control": "no-store" } });
    }
    const report = await deliveryService.getReport(session, reportId);
    return Response.json({ data: report });
  } catch (err) {
    return handleDeliveryApiError(err);
  }
}
