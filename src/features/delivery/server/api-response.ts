import "server-only";
import { ZodError } from "zod";
import { AiError } from "@/server/ai/errors";
import { DeliveryServiceError } from "./service";

export function handleDeliveryApiError(err: unknown): Response {
  if (err instanceof DeliveryServiceError) {
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

  const message = err instanceof Error ? err.message : "Đã xảy ra lỗi máy chủ.";
  return Response.json(
    { error: { code: "INTERNAL_ERROR", message } },
    { status: 500 },
  );
}

