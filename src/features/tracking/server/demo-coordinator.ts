import type { TrackingAiInput, TrackingAiProposal } from "@/server/ai/contracts";
import { mentionedTaskIds, normalize } from "./policy.ts";

// Explicit demo rules, never described as a real model and never used as an AI-error fallback.
export function demoCoordinator(input: TrackingAiInput): TrackingAiProposal {
  const text = normalize(input.message.content);
  const ids = mentionedTaskIds(input.message.content, input.tasks);
  const taskId = input.message.taskId ?? (ids.length === 1 ? ids[0] : undefined);
  const common = taskId ? { taskId } : {};
  if (/\b(doi|chuyen|sua)\b.*\b(deadline|han chot|nguoi phu trach|tieu chi)\b/.test(text)) return { intent: "discussion", ...common };
  if (/\b(khong|chua)\s+(bi chan|bat dau|dang lam|tiep tuc)\b/.test(text)) return { intent: "clarify", ...common };
  if (/\b(hoan thanh|xong|gan xong)\b/.test(text)) return { intent: "clarify", ...common, clarificationQuestion: "Chat không tự nghiệm thu hoàn thành. Bạn muốn cập nhật đang làm/bị chặn, hay chuyển sang nộp bài?" };
  const blocked = /\b(bi chan|vuong|khong the tiep tuc)\b/.test(text);
  const started = /\b(bat dau|dang lam|tiep tuc|da go chan)\b/.test(text);
  if (blocked && started) return { intent: "clarify", ...common };
  if (blocked) {
    const marker = /\b(vì|vi|do|bởi|boi)\s+(.+)/iu.exec(input.message.content);
    return { intent: "update", ...common, requestedStatus: "blocked", ...(marker ? { blocker: marker[2].trim() } : {}) };
  }
  if (started) return { intent: "update", ...common, requestedStatus: "in_progress" };
  return { intent: "discussion", ...common };
}
