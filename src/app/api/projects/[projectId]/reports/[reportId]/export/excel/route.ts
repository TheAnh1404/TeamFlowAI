import { handleDeliveryApiError } from "@/features/delivery/server/api-response";
import { getDeliverySession } from "@/features/delivery/server/auth-helper";
import { compileWeeklyReportExcel } from "@/features/delivery/server/excel-compiler";
import { deliveryRepository } from "@/features/delivery/server/repository";
import { deliveryService } from "@/features/delivery/server/service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string; reportId: string }> }
): Promise<Response> {
  try {
    const { projectId, reportId } = await params;
    const session = await getDeliverySession(request);

    const report = await deliveryService.getReport(session, reportId);
    const sources = await deliveryRepository.readReportSources(projectId, report.asOf);

    const buffer = await compileWeeklyReportExcel({
      projectName: `Dự án #${projectId.toUpperCase()}`,
      report,
      tasks: sources.tasks,
    });

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Bao_Cao_Tuan_${reportId}.xlsx"`,
      },
    });
  } catch (err) {
    return handleDeliveryApiError(err);
  }
}

