import "server-only";
import { z } from "zod";
import { aiProvider } from "@/server/ai";
import type { AiProvider, TrackingAiInput, TrackingAiProposal, AiResult } from "@/server/ai/contracts";
import { HttpError } from "@/server/http/errors";
import { FeatureNotImplementedError } from "@/server/http/feature-not-implemented-error";

const proposalSchema = z.object({
  intent: z.enum(["update", "discussion", "clarify"]),
  taskId: z.string().min(1).optional(),
  requestedStatus: z.enum(["in_progress", "blocked"]).optional(),
  blocker: z.string().trim().min(1).max(5000).optional(),
  clarificationQuestion: z.string().trim().min(1).max(2000).optional(),
}).strict();

export type Coordinator = (input: TrackingAiInput) => Promise<AiResult<TrackingAiProposal>>;

export function getCoordinatorMode(): "mock" | "real" {
  const mode = process.env.TRACKING_AI_MODE ?? process.env.COORDINATOR_MODE ?? "mock";
  if (mode !== "mock" && mode !== "real") {
    throw new HttpError(503, "CONFIGURATION_REQUIRED", "COORDINATOR_MODE phải là mock hoặc real.");
  }
  return mode;
}

export function createCoordinator(provider: AiProvider = aiProvider, timeoutMs = 20000): Coordinator {
  return async (input) => {
    const mode = process.env.TRACKING_AI_MODE ?? process.env.COORDINATOR_MODE;
    if (mode === "mock") return { proposal: mockProposal(input), aiMode: "mock" };
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([
        provider.generate("coordinator", input),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new HttpError(504, "AI_TIMEOUT", "Coordinator phản hồi quá lâu. Chưa lưu tin nhắn; bạn có thể thử lại.")), timeoutMs);
        }),
      ]);
      const parsed = proposalSchema.safeParse(result?.proposal);
      if (!parsed.success || !["real", "mock"].includes(result?.aiMode)) {
        throw new HttpError(502, "AI_INVALID_OUTPUT", "Coordinator trả dữ liệu không hợp lệ. Chưa lưu tin nhắn.");
      }
      return { proposal: parsed.data, aiMode: result.aiMode };
    } catch (error) {
      if (error instanceof HttpError || error instanceof FeatureNotImplementedError) throw error;
      throw new HttpError(502, "AI_UNAVAILABLE", "Chưa kết nối được Coordinator. Chưa lưu tin nhắn; bạn có thể thử lại.");
    } finally {
      if (timer) clearTimeout(timer);
    }
  };
}

export async function analyzeProgress(input: TrackingAiInput): Promise<AiResult<TrackingAiProposal>> {
  return createCoordinator()(input);
}

// Explicit opt-in fallback while TV3 implements the shared provider; never masquerades as AI.
export function mockProposal({ message, tasks }: TrackingAiInput): TrackingAiProposal {
  const content = message.content.toLocaleLowerCase("vi");
  if (/bỏ qua|ignore|system prompt|đổi hạn|deadline|đổi người|tiêu chí|xong rồi|hoàn thành/.test(content)) return { intent: "discussion" };
  const tokens: string[] = content.match(/[\p{L}\p{N}_-]+/gu) ?? [];
  const matches = tasks.filter((t) => tokens.includes(t.id.toLowerCase()));
  const taskId = message.taskId ?? (matches.length === 1 ? matches[0].id : undefined);
  const reason = /(?:^|\s)(?:vì|do)\s+(.+)|:\s*(.+)/iu.exec(message.content);
  const blocker = (reason?.[1] ?? reason?.[2])?.trim();
  if (/bị chặn|block|trở ngại/.test(content) && taskId && blocker) return { intent: "update", taskId, requestedStatus: "blocked", blocker };
  if (/bắt đầu|đang làm|tiếp tục/.test(content) && taskId) return { intent: "update", taskId, requestedStatus: "in_progress" };
  if (/bị chặn|block|trở ngại|bắt đầu|đang làm|tiếp tục|gần xong|phần đó/.test(content)) {
    return { intent: "clarify", clarificationQuestion: "Bạn muốn cập nhật công việc nào? Chọn trạng thái và nêu rõ trở ngại nếu đang bị chặn." };
  }
  return { intent: "discussion" };
}
