import "server-only";
import { AiError } from "@/server/ai/errors";
import { ApiError, apiHandler } from "@/server/http/api-error";
import { HttpError } from "@/server/http/errors";
import { ZodError } from "zod";

export function handleDeliveryApiError(err: unknown): Promise<Response> {
  return apiHandler(async () => {
    if (err instanceof HttpError) throw new ApiError(err.status, err.code, err.message);
    if (err instanceof AiError) throw new ApiError(err.code === "AI_TIMEOUT" ? 504 : 502, err.code, "Không thể tạo kết quả AI hợp lệ. Vui lòng thử lại.");
    if (err instanceof ZodError) throw new ApiError(422, "VALIDATION_ERROR", "Dữ liệu yêu cầu không hợp lệ.");
    throw err;
  });
}
