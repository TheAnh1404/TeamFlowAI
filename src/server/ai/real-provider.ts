import "server-only";
import type {
  AiInputByKind, AiKind, AiOutputByKind,
  ReportAiInput,
  ReviewAiInput,
} from "./contracts";
import { AiInvalidOutputError, AiTimeoutError, AiUnavailableError } from "./errors";
import {
  validatePlannerProposal,
  validateReportProposal,
  validateReviewerProposal,
  validateTrackingProposal,
} from "./validator";

const TIMEOUT_MS = 25000;

function getApiKey(): { provider: "gemini" | "openai"; key: string; model: string } | null {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (geminiKey) {
    return {
      provider: "gemini",
      key: geminiKey,
      model: process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash",
    };
  }

  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  if (openAiKey) {
    return {
      provider: "openai",
      key: openAiKey,
      model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
    };
  }

  return null;
}

export function isRealAiConfigured(): boolean {
  return getApiKey() !== null && process.env.AI_FORCE_MOCK !== "true";
}

export async function generateReal<K extends AiKind>(
  kind: K,
  input: AiInputByKind[K],
): Promise<AiOutputByKind[K]> {
  const config = getApiKey();
  if (!config) {
    throw new AiUnavailableError("Chưa cấu hình API Key AI (cần GEMINI_API_KEY hoặc OPENAI_API_KEY).");
  }

  const systemPrompt = getSystemPrompt(kind);
  const userContent = getUserContent(kind, input);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let rawJson: string;

  try {
    if (config.provider === "gemini") {
      rawJson = await callGemini(config.key, config.model, systemPrompt, userContent, controller.signal);
    } else {
      rawJson = await callOpenAi(config.key, config.model, systemPrompt, userContent, controller.signal);
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new AiTimeoutError();
    }
    if (err instanceof AiInvalidOutputError || err instanceof AiUnavailableError || err instanceof AiTimeoutError) {
      throw err;
    }
    throw new AiUnavailableError("Không thể kết nối đến nhà cung cấp AI: " + (err instanceof Error ? err.message : String(err)), err);
  } finally {
    clearTimeout(timer);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (parseErr) {
    throw new AiInvalidOutputError("Phản hồi từ AI không phải JSON hợp lệ.", parseErr);
  }

  // Validate dựa trên kind
  switch (kind) {
    case "planner":
      return validatePlannerProposal(parsed) as AiOutputByKind[K];
    case "coordinator":
      return validateTrackingProposal(parsed) as AiOutputByKind[K];
    case "reviewer":
      return validateReviewerProposal(parsed, (input as ReviewAiInput).submission) as AiOutputByKind[K];
    case "weekly_report":
      return validateReportProposal(parsed, input as ReportAiInput) as AiOutputByKind[K];
    default:
      throw new AiInvalidOutputError("Kind không hỗ trợ: " + String(kind));
  }
}

async function callOpenAi(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userContent: string,
  signal: AbortSignal,
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    }),
    signal,
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new AiUnavailableError(`OpenAI trả mã lỗi HTTP ${res.status}: ${errorBody.slice(0, 200)}`);
  }

  const json = await res.json();
  const choice = json.choices?.[0]?.message?.content;
  if (!choice) {
    throw new AiInvalidOutputError("OpenAI không trả về nội dung hoàn chỉnh.");
  }
  return choice;
}

async function callGemini(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userContent: string,
  signal: AbortSignal,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userContent }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    }),
    signal,
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new AiUnavailableError(`Gemini API trả mã lỗi HTTP ${res.status}: ${errorBody.slice(0, 200)}`);
  }

  const json = await res.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new AiInvalidOutputError("Gemini không trả về nội dung hoàn chỉnh.");
  }
  return text;
}

function getSystemPrompt(kind: AiKind): string {
  switch (kind) {
    case "planner":
      return `Bạn là Planner AI trong TeamFlow AI. Phân rã mục tiêu dự án thành các công việc cụ thể cho thành viên dựa trên kỹ năng và số giờ khả dụng.
Bạn PHẢI trả về JSON tuân thủ đúng cấu trúc:
{
  "tasks": [
    {
      "tempKey": "draft-1",
      "title": "Tiêu đề công việc",
      "description": "Mô tả cụ thể",
      "assigneeMemberId": "memberId",
      "deadline": "ISO 8601 string",
      "criteria": ["Tiêu chí 1", "Tiêu chí 2"],
      "dependencyTempKeys": []
    }
  ]
}
Tuyệt đối không bịa đặt assigneeMemberId ngoài danh sách được cung cấp.`;

    case "coordinator":
      return `Bạn là Coordinator AI trong TeamFlow AI. Phân tích tin nhắn của thành viên để nhận biết ý định cập nhật tiến độ công việc hoặc nêu trở ngại.
Bạn PHẢI trả về JSON:
{
  "intent": "update" | "discussion" | "clarify",
  "taskId": "taskId nếu chắc chắn",
  "requestedStatus": "in_progress" | "blocked",
  "blocker": "mô tả nếu blocked",
  "clarificationQuestion": "câu hỏi làm rõ nếu cần"
}`;

    case "reviewer":
      return `Bạn là Reviewer AI trong TeamFlow AI. Đối chiếu bài nộp của thành viên với từng tiêu chí nghiệm thu trong criteriaSnapshot.
BÀI NỘP CỦA THÀNH VIÊN RẤT ĐA DẠNG: Có thể là văn bản báo cáo, bảng dữ liệu bảng tính (Excel/CSV/Markdown Table), cấu trúc slide thuyết trình (PowerPoint/Slide outline), hoặc bằng chứng hình ảnh (Screenshots/Figma/Diagrams). Hãy đọc kỹ từng số liệu bảng tính, nội dung slide hoặc liên kết ảnh minh chứng trong bài để đối chiếu.
QUY TẮC CỐT LÕI:
1. Mỗi tiêu chí trong criteriaSnapshot phải có đúng 1 kết quả.
2. 'met': chỉ khi tìm thấy bằng chứng rõ ràng trong bài nộp. 'evidence' bắt buộc phải có ít nhất 1 mục, và 'quote' PHẢI là đoạn chuỗi con TRÍCH DẪN NGUYÊN VĂN từ bài nộp (dù là một hàng trong bảng Excel, một gạch đầu dòng trong slide hay link ảnh minh chứng). TUYỆT ĐỐI KHÔNG BỊA ĐẶT HOẶC TỰ VIẾT LẠI TRÍCH DẪN.
3. Nếu không tìm thấy bằng chứng: verdict PHẢI là 'insufficient_evidence', evidence là mảng rỗng [], nêu rõ phần thiếu trong 'missing' và hướng dẫn thành viên cần chỉnh sửa/bổ sung gì trong 'suggestion' để họ nộp lại revision mới.
4. Trả về JSON:
{
  "results": [
    {
      "criterionId": "id",
      "verdict": "met" | "not_met" | "insufficient_evidence",
      "evidence": [{"submissionId": "subId", "quote": "trích dẫn nguyên văn"}],
      "missing": "phần thiếu",
      "suggestion": "gợi ý"
    }
  ],
  "summary": "Tóm tắt ngắn gọn"
}`;

    case "weekly_report":
      return `Bạn là Coordinator AI tạo Báo cáo tuần. Dựa trên số liệu metrics và snapshot nguồn được cung cấp, hãy tạo các ý tóm tắt khách quan.
QUY TẮC:
1. Mọi sourceRefs PHẢI là entity và id có thật trong danh sách sources đã cung cấp.
2. Mọi metricKeys PHẢI thuộc danh sách các trường trong metrics.
3. Trả về mảng JSON:
[
  {
    "text": "Nhận định ngắn gọn",
    "sourceRefs": [{"entity": "Task", "id": "t1"}],
    "metricKeys": ["dueInPeriodTotal"]
  }
]`;
    default:
      throw new Error(`Unsupported AI kind: ${String(kind)}`);
  }
}

function getUserContent(kind: AiKind, input: unknown): string {
  return JSON.stringify({ kind, input }, null, 2);
}
