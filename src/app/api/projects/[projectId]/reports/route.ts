import { generateWeeklyReportInputSchema } from "@/contracts/report";
import { handleDeliveryApiError } from "@/features/delivery/server/api-response";
import { getDeliverySession } from "@/features/delivery/server/auth-helper";
import { deliveryService } from "@/features/delivery/server/service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
): Promise<Response> {
  try {
    const { projectId } = await params;
    const session = await getDeliverySession(request);
    const reports = await deliveryService.listReports(session, projectId);
    return Response.json({ data: reports });
  } catch (err) {
    return handleDeliveryApiError(err);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
): Promise<Response> {
  try {
    const { projectId } = await params;
    const session = await getDeliverySession(request);
    const body = await request.json();
    const input = generateWeeklyReportInputSchema.parse(body);
    const idempotencyKey = request.headers.get("Idempotency-Key") || "";

    const report = await deliveryService.generateWeeklyReport(session, projectId, input, { idempotencyKey });
    return Response.json({ data: report }, { status: 201 });
  } catch (err) {
    return handleDeliveryApiError(err);
  }
}
