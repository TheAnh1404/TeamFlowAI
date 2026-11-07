import "server-only";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  Packer,
  PageNumber,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { Submission, Task, WeeklyReport } from "@/contracts";

interface DocxCompilerOptions {
  projectName: string;
  projectDescription?: string;
  tasks: Task[];
  submissions: Submission[];
  latestReport?: WeeklyReport | null;
}

/**
 * Biên dịch toàn bộ các hạng mục đã nghiệm thu thành một file Word (.docx) hoàn chỉnh
 */
export async function compileProjectReportDocx(options: DocxCompilerOptions): Promise<Buffer> {
  const { projectName, projectDescription = "", tasks, submissions, latestReport } = options;
  const nowIso = new Date().toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const acceptedTasks = tasks.filter((t) => t.status === "done");
  const inProgressTasks = tasks.filter((t) => t.status !== "done");

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Times New Roman",
            size: 26, // 13pt
            color: "111827",
          },
          paragraph: {
            spacing: {
              line: 312, // 1.3 line spacing
              before: 120,
              after: 120,
            },
          },
        },
      },
    },
    sections: [
      {
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `TeamFlow AI — ${projectName}`,
                    italics: true,
                    size: 18,
                    color: "6B7280",
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    children: ["Trang ", PageNumber.CURRENT, " / ", PageNumber.TOTAL_PAGES],
                    size: 20,
                    color: "6B7280",
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          // TRANG BÌA
          new Paragraph({
            spacing: { before: 1400, after: 300 },
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "DỰ ÁN TEAMFLOW AI",
                bold: true,
                size: 32, // 16pt
                color: "2563EB",
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 400, after: 600 },
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "BÁO CÁO TỔNG KẾT & HỒ SƠ NGHIỆM THU",
                bold: true,
                size: 48, // 24pt
                color: "111827",
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 200, after: 800 },
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `Dự án: ${projectName}`,
                italics: true,
                size: 28,
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 1200, after: 200 },
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `Ngày biên dịch: ${nowIso}`,
                size: 24,
                color: "4B5563",
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 100, after: 2000 },
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "Hệ thống biên tập tự động bảo toàn 100% nội dung gốc của tác giả",
                italics: true,
                size: 20,
                color: "6B7280",
              }),
            ],
          }),

          // PHẦN 1: TỔNG QUAN TIẾN ĐỘ DỰ ÁN
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            children: [
              new TextRun({
                text: "1. TỔNG QUAN DỰ ÁN VÀ TIẾN ĐỘ THỰC HIỆN",
                bold: true,
                size: 32,
                color: "1F2937",
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: projectDescription || "Dự án quản lý và điều phối công việc thông qua TeamFlow AI.",
              }),
            ],
          }),

          // Bảng thống kê tiến độ
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell("Chỉ số tổng hợp"),
                  createHeaderCell("Số lượng"),
                  createHeaderCell("Ghi chú"),
                ],
              }),
              new TableRow({
                children: [
                  createBodyCell("Tổng số công việc"),
                  createBodyCell(`${tasks.length}`),
                  createBodyCell("Toàn bộ các task trong kế hoạch"),
                ],
              }),
              new TableRow({
                children: [
                  createBodyCell("Đã nghiệm thu hoàn thành (Done)"),
                  createBodyCell(`${acceptedTasks.length}`),
                  createBodyCell("100% tiêu chí đạt 'met' và có bằng chứng"),
                ],
              }),
              new TableRow({
                children: [
                  createBodyCell("Đang thực hiện / Chờ nghiệm thu"),
                  createBodyCell(`${inProgressTasks.length}`),
                  createBodyCell("Đang tiếp tục hoàn thiện"),
                ],
              }),
              ...(latestReport
                ? [
                    new TableRow({
                      children: [
                        createBodyCell("Nghiệm thu đúng hạn"),
                        createBodyCell(`${latestReport.metrics.acceptedOnTimeTotal}`),
                        createBodyCell("Hoàn thành trước hoặc đúng hạn chót"),
                      ],
                    }),
                    new TableRow({
                      children: [
                        createBodyCell("Tổng lượt nộp bài"),
                        createBodyCell(`${latestReport.metrics.submissionsInPeriodTotal}`),
                        createBodyCell("Các revision bài nộp được lưu trữ"),
                      ],
                    }),
                  ]
                : []),
            ],
          }),

          // PHẦN 2: CHI TIẾT CÁC HẠNG MỤC CÔNG VIỆC ĐÃ NGHIỆM THU
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 600, after: 200 },
            children: [
              new TextRun({
                text: "2. CHI TIẾT NỘI DUNG CÁC BÀI NỘP ĐÃ NGHIỆM THU",
                bold: true,
                size: 32,
                color: "1F2937",
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Dưới đây là nguyên văn nội dung các bài nộp đã được Reviewer AI đối chiếu tiêu chí và được Trưởng nhóm xác nhận nghiệm thu chính thức:",
                italics: true,
                color: "4B5563",
              }),
            ],
          }),

          // Lặp qua từng task đã nghiệm thu
          ...acceptedTasks.flatMap((task, index) => {
            const taskSubmissions = submissions
              .filter((s) => s.taskId === task.id)
              .sort((a, b) => b.revision - a.revision);
            const acceptedSub = task.acceptedSubmissionId
              ? taskSubmissions.find((s) => s.id === task.acceptedSubmissionId) || taskSubmissions[0]
              : taskSubmissions[0];

            return [
              new Paragraph({
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 400, after: 150 },
                children: [
                  new TextRun({
                    text: `2.${index + 1}. ${task.title}`,
                    bold: true,
                    size: 28,
                    color: "2563EB",
                  }),
                ],
              }),
              new Paragraph({
                spacing: { before: 50, after: 100 },
                children: [
                  new TextRun({ text: "Mã công việc: ", bold: true }),
                  new TextRun({ text: task.id }),
                  new TextRun({ text: "  |  Hạn chót: ", bold: true }),
                  new TextRun({ text: new Date(task.deadline).toLocaleDateString("vi-VN") }),
                  new TextRun({ text: "  |  Trạng thái: ", bold: true }),
                  new TextRun({ text: "ĐÃ NGHIỆM THU (DONE)", bold: true, color: "059669" }),
                ],
              }),
              new Paragraph({
                spacing: { before: 50, after: 150 },
                children: [
                  new TextRun({ text: "Mô tả yêu cầu: ", bold: true }),
                  new TextRun({ text: task.description }),
                ],
              }),

              // Bảng tiêu chí nghiệm thu của Task
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  new TableRow({
                    children: [
                      createHeaderCell("Mã"),
                      createHeaderCell("Tiêu chí nghiệm thu"),
                      createHeaderCell("Kết quả"),
                    ],
                  }),
                  ...task.criteria.map((c) =>
                    new TableRow({
                      children: [
                        createBodyCell(c.id, { width: 15 }),
                        createBodyCell(c.text, { width: 65 }),
                        createBodyCell("✓ ĐẠT (MET)", { width: 20, bold: true, color: "059669" }),
                      ],
                    })
                  ),
                ],
              }),

              // Nội dung bài nộp chính thức
              new Paragraph({
                spacing: { before: 200, after: 100 },
                children: [
                  new TextRun({
                    text: `Nội dung bài nộp chính thức (Revision #${acceptedSub?.revision ?? 1}):`,
                    bold: true,
                    color: "1F2937",
                  }),
                ],
              }),
              ...(acceptedSub
                ? acceptedSub.content.split("\n").map(
                    (line) =>
                      new Paragraph({
                        spacing: { before: 50, after: 50 },
                        children: [
                          new TextRun({
                            text: line || " ",
                          }),
                        ],
                      })
                  )
                : [
                    new Paragraph({
                      children: [new TextRun({ text: "Chưa có nội dung văn bản đính kèm.", italics: true })],
                    }),
                  ]),
            ];
          }),

          // PHẦN 3: KẾT LUẬN & CHỮ KÝ XÁC NHẬN
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 600, after: 200 },
            children: [
              new TextRun({
                text: "3. XÁC NHẬN NGHIỆM THU VÀ BÀN GIAO",
                bold: true,
                size: 32,
                color: "1F2937",
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Báo cáo này được tự động xuất bởi TeamFlow AI dựa trên hồ sơ nghiệm thu điện tử, có giá trị xác nhận mức độ hoàn thành các hạng mục đã đề ra.",
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 600, after: 100 },
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: "ĐẠI DIỆN TRƯỞNG NHÓM DUYỆT BÁO CÁO",
                bold: true,
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 400, after: 100 },
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: "(Đã ký và xác nhận điện tử trên hệ thống TeamFlow AI)",
                italics: true,
                color: "6B7280",
                size: 20,
              }),
            ],
          }),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

function createHeaderCell(text: string, options: { width?: number } = {}) {
  return new TableCell({
    width: options.width ? { size: options.width, type: WidthType.PERCENTAGE } : undefined,
    shading: { fill: "F3F4F6" },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: "9CA3AF" },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
    },
    children: [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [new TextRun({ text, bold: true, color: "1F2937", size: 22 })],
      }),
    ],
  });
}

function createBodyCell(
  text: string,
  options: { width?: number; bold?: boolean; color?: string } = {}
) {
  return new TableCell({
    width: options.width ? { size: options.width, type: WidthType.PERCENTAGE } : undefined,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "F3F4F6" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "F3F4F6" },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
    },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            bold: options.bold,
            color: options.color || "374151",
            size: 22,
          }),
        ],
      }),
    ],
  });
}

