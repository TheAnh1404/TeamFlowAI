import "server-only";
import ExcelJS from "exceljs";
import type { Task, WeeklyReport } from "@/contracts";

interface ExcelCompilerOptions {
  projectName: string;
  report: WeeklyReport;
  tasks: Task[];
}

/**
 * Biên dịch báo cáo tuần thành file Excel (.xlsx) đa tầng chuyên nghiệp
 */
export async function compileWeeklyReportExcel(options: ExcelCompilerOptions): Promise<Buffer> {
  const { projectName, report, tasks } = options;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "TeamFlow AI";
  workbook.lastModifiedBy = "TeamFlow AI";
  workbook.created = new Date(report.createdAt);
  workbook.modified = new Date();

  // 1. SHEET 1: TỔNG QUAN VÀ KPIS
  const summarySheet = workbook.addWorksheet("Tổng quan KPIs", {
    views: [{ showGridLines: true }],
  });

  summarySheet.columns = [
    { header: "Chỉ số", key: "metric", width: 35 },
    { header: "Giá trị", key: "value", width: 18 },
    { header: "Mô tả", key: "desc", width: 45 },
  ];

  // Header styling
  const headerRow = summarySheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2563EB" }, // Primary blue
  };
  headerRow.height = 28;
  headerRow.alignment = { vertical: "middle", horizontal: "center" };

  summarySheet.addRows([
    { metric: "Tên dự án", value: projectName, desc: "Dự án quản lý trên TeamFlow AI" },
    { metric: "Kỳ báo cáo bắt đầu", value: new Date(report.periodStart).toLocaleDateString("vi-VN"), desc: "Biên kỳ bắt đầu" },
    { metric: "Kỳ báo cáo kết thúc", value: new Date(report.periodEnd).toLocaleDateString("vi-VN"), desc: "Biên kỳ kết thúc" },
    { metric: "Thời điểm snapshot (asOf)", value: new Date(report.asOf).toLocaleString("vi-VN"), desc: "Mốc dữ liệu bất biến" },
    { metric: "Chế độ AI", value: report.aiMode === "real" ? "AI Thật (Gemini/OpenAI)" : "AI Mock Thông minh", desc: "Chữ ký minh bạch" },
    { metric: "---", value: "---", desc: "---" },
    { metric: "Công việc đã hoàn thành (Done)", value: report.metrics.statusCounts.done, desc: "Đạt 100% tiêu chí nghiệm thu" },
    { metric: "Công việc đang chờ duyệt (In Review)", value: report.metrics.statusCounts.in_review, desc: "Đã nộp bài, chờ xác nhận" },
    { metric: "Công việc cần chỉnh sửa", value: report.metrics.statusCounts.changes_requested, desc: "Cần nộp lại revision mới" },
    { metric: "Công việc đang làm (In Progress)", value: report.metrics.statusCounts.in_progress, desc: "Đang triển khai" },
    { metric: "Công việc chưa bắt đầu (Todo)", value: report.metrics.statusCounts.todo, desc: "Chưa triển khai" },
    { metric: "Công việc bị chặn (Blocked)", value: report.metrics.statusCounts.blocked, desc: "Có trở ngại cần tháo gỡ" },
    { metric: "---", value: "---", desc: "---" },
    { metric: "Đến hạn trong kỳ", value: report.metrics.dueInPeriodTotal, desc: "Các task có deadline trong kỳ báo cáo" },
    { metric: "Nộp bài đúng hạn", value: report.metrics.submittedOnTimeTotal, desc: "Lần nộp đầu tiên trước hoặc đúng deadline" },
    { metric: "Nghiệm thu đúng hạn", value: report.metrics.acceptedOnTimeTotal, desc: "Hoàn thành trước hoặc đúng hạn" },
    { metric: "Đang quá hạn tại mốc asOf", value: report.metrics.overdueOpenTotal, desc: "Chưa xong và đã quá hạn" },
    { metric: "Tổng lượt nộp bài trong kỳ", value: report.metrics.submissionsInPeriodTotal, desc: "Số revision nộp trong kỳ" },
    { metric: "Tổng lượt cập nhật tiến độ", value: report.metrics.progressUpdatesInPeriodTotal, desc: "Số tin cập nhật tiến độ" },
  ]);

  // Styling data rows
  summarySheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.alignment = { vertical: "middle" };
      row.getCell("value").alignment = { vertical: "middle", horizontal: "center" };
      row.border = {
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
      };
    }
  });

  // 2. SHEET 2: BẢNG CÔNG VIỆC DỰ ÁN
  const taskSheet = workbook.addWorksheet("Danh sách Công việc", {
    views: [{ showGridLines: true }],
  });

  taskSheet.columns = [
    { header: "Mã Task", key: "id", width: 14 },
    { header: "Tiêu đề công việc", key: "title", width: 35 },
    { header: "Người phụ trách", key: "assignee", width: 18 },
    { header: "Trạng thái", key: "status", width: 18 },
    { header: "Hạn chót", key: "deadline", width: 16 },
    { header: "Số tiêu chí", key: "criteriaCount", width: 14 },
    { header: "Nghiệm thu lúc", key: "acceptedAt", width: 20 },
  ];

  const taskHeader = taskSheet.getRow(1);
  taskHeader.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
  taskHeader.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF059669" }, // Emerald green
  };
  taskHeader.height = 28;
  taskHeader.alignment = { vertical: "middle", horizontal: "center" };

  tasks.forEach((task) => {
    taskSheet.addRow({
      id: task.id,
      title: task.title,
      assignee: task.assigneeMemberId,
      status: task.status.toUpperCase(),
      deadline: new Date(task.deadline).toLocaleDateString("vi-VN"),
      criteriaCount: task.criteria.length,
      acceptedAt: task.acceptedAt ? new Date(task.acceptedAt).toLocaleString("vi-VN") : "—",
    });
  });

  taskSheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.alignment = { vertical: "middle" };
      row.getCell("id").alignment = { vertical: "middle", horizontal: "center" };
      row.getCell("status").alignment = { vertical: "middle", horizontal: "center" };
      row.getCell("deadline").alignment = { vertical: "middle", horizontal: "center" };
      row.getCell("criteriaCount").alignment = { vertical: "middle", horizontal: "center" };
      row.border = {
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
      };
    }
  });

  // 3. SHEET 3: NHẬN ĐỊNH TỔNG QUAN TỪ AI
  const aiSheet = workbook.addWorksheet("Nhận định AI & Dẫn chứng", {
    views: [{ showGridLines: true }],
  });

  aiSheet.columns = [
    { header: "STT", key: "index", width: 8 },
    { header: "Nội dung nhận định từ AI", key: "text", width: 60 },
    { header: "Nguồn dẫn chứng (sourceRefs)", key: "sources", width: 30 },
    { header: "Chỉ số liên quan (metricKeys)", key: "metrics", width: 30 },
  ];

  const aiHeader = aiSheet.getRow(1);
  aiHeader.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
  aiHeader.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF7C3AED" }, // Purple
  };
  aiHeader.height = 28;
  aiHeader.alignment = { vertical: "middle", horizontal: "center" };

  report.summary.forEach((item, idx) => {
    aiSheet.addRow({
      index: idx + 1,
      text: item.text,
      sources: item.sourceRefs.map((r) => `${r.entity} #${r.id}`).join(", "),
      metrics: item.metricKeys.join(", "),
    });
  });

  aiSheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.alignment = { vertical: "middle", wrapText: true };
      row.getCell("index").alignment = { vertical: "middle", horizontal: "center" };
      row.border = {
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
      };
    }
  });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

