import { apiErrorSchema, type ApiResponse } from "@/contracts/common";
import type { ZodType } from "zod";

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

// One request only: no automatic mutation retries or business decisions.
// Supply the data schema to avoid unchecked generic casts on HTTP responses.
export async function apiFetch<T>(
  url: string,
  dataSchema: ZodType<T>,
  init?: RequestInit,
): Promise<ApiResponse<T>> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    throw new ApiClientError(0, "NETWORK_ERROR", "Không thể gửi yêu cầu.");
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ApiClientError(response.status, "INVALID_RESPONSE", "Phản hồi không đúng định dạng JSON.");
  }

  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(body);
    throw new ApiClientError(
      response.status,
      parsed.success ? parsed.data.error.code : "HTTP_ERROR",
      parsed.success ? parsed.data.error.message : "Yêu cầu không thành công.",
    );
  }

  if (typeof body !== "object" || body === null || !("data" in body)) {
    throw new ApiClientError(response.status, "INVALID_RESPONSE", "Phản hồi thiếu dữ liệu.");
  }
  const parsed = dataSchema.safeParse(body.data);
  if (!parsed.success) {
    throw new ApiClientError(response.status, "INVALID_RESPONSE", "Cấu trúc dữ liệu phản hồi không hợp lệ.");
  }
  return { data: parsed.data };
}
