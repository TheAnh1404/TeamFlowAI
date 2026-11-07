import { handleDeliveryApiError } from "@/features/delivery/server/api-response";
import { getDeliverySession } from "@/features/delivery/server/auth-helper";
import { compileProjectReportDocx } from "@/features/delivery/server/docx-compiler";
import { deliveryRepository } from "@/features/delivery/server/repository";
import { deliveryService } from "@/features/delivery/server/service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  try {
    const { projectId } = await params;
    const session = await getDeliverySession(request);

    // Lấy dữ liệu tasks và submissions từ repository
    const sources = await deliveryRepository.readReportSources(projectId, new Date().toISOString());
    const reports = await deliveryService.listReports(session, projectId);
    const latestReport = reports.length > 0 ? reports[0] : null;

    const buffer = await compileProjectReportDocx({
      projectName: `Dự án #${projectId.toUpperCase()}`,
      projectDescription: "Báo cáo tổng hợp các hạng mục công việc đã được nghiệm thu hoàn thành.",
      tasks: sources.tasks,
      submissions: sources.submissions,
      latestReport,
    });

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="Bao_Cao_Du_An_${projectId}.docx"`,
      },
    });
  } catch (err) {
    return handleDeliveryApiError(err);
  }
}

