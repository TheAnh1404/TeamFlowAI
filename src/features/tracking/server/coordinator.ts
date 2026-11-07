import "server-only";
import { z } from "zod";
import { aiProvider } from "@/server/ai";
import type { AiResult, TrackingAiInput, TrackingAiProposal } from "@/server/ai/contracts";
import { ApiError } from "@/server/http/api-error";
import { FeatureNotImplementedError } from "@/server/http/feature-not-implemented-error";
import { demoCoordinator } from "./demo-coordinator";

const proposalSchema = z.object({
  intent: z.enum(["update", "discussion", "clarify"]),
  taskId: z.string().optional(),
  requestedStatus: z.enum(["in_progress", "blocked"]).optional(),
  blocker: z.string().max(5000).optional(),
  clarificationQuestion: z.string().max(1000).optional(),
}).strict();

export function getCoordinatorMode(): "mock" | "real" {
  const mode = process.env.COORDINATOR_MODE ?? "mock";
  if (mode !== "mock" && mode !== "real") throw new ApiError(503, "CONFIGURATION_REQUIRED", "COORDINATOR_MODE phải là mock hoặc real.");
  return mode;
}

export async function analyzeProgress(input: TrackingAiInput): Promise<AiResult<TrackingAiProposal>> {
  if (getCoordinatorMode() === "mock") return { proposal: demoCoordinator(input), aiMode: "mock" };
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      aiProvider.generate("coordinator", input),
      new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new ApiError(504, "AI_TIMEOUT", "Coordinator chưa phản hồi. Nội dung chưa được lưu.")), 15000); }),
    ]);
    const parsed = proposalSchema.safeParse(result.proposal);
    if (!parsed.success || !["real", "mock"].includes(result.aiMode)) throw new ApiError(502, "AI_INVALID_OUTPUT", "Coordinator trả dữ liệu không hợp lệ. Nội dung chưa được lưu.");
    return { proposal: parsed.data, aiMode: result.aiMode };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof FeatureNotImplementedError) throw new ApiError(502, "AI_UNAVAILABLE", "Lớp AI chưa sẵn sàng. Nội dung chưa được lưu.");
    throw new ApiError(502, "AI_UNAVAILABLE", "Không thể gọi Coordinator. Nội dung chưa được lưu.");
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
