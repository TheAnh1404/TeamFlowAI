import "server-only";
import { ZodError } from "zod";
import { AiError } from "@/server/ai/errors";
import { DeliveryServiceError } from "./service";
import { HttpError } from "@/server/http/errors";

export function handleDeliveryApiError(err: unknown): Response {
  if (err instanceof DeliveryServiceError || err instanceof HttpError) {
    return Response.json(
      { error: { code: err.code, message: err.message } },
      { status: err.status },
    );
  }

  if (err instanceof AiError) {
    const status = err.code === "AI_TIMEOUT" ? 504 : 502;
    return Response.json(
      { error: { code: err.code, message: err.message } },
      { status },
    );
  }

  if (err instanceof ZodError) {
    return Response.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Dữ liệu yêu cầu không hợp lệ.",
          details: err.issues,
        },
      },
      { status: 422 },
    );
  }

  const message = "Không thể xử lý yêu cầu. Hãy thử lại hoặc kiểm tra cấu hình máy chủ.";
  return Response.json(
    { error: { code: "INTERNAL_ERROR", message } },
    { status: 500 },
  );
}

