import "server-only";

export type AiErrorCode = "AI_TIMEOUT" | "AI_INVALID_OUTPUT" | "AI_UNAVAILABLE";

export class AiError extends Error {
  constructor(
    public readonly code: AiErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AiError";
  }
}

export class AiTimeoutError extends AiError {
  constructor(message = "AI phản hồi quá thời gian quy định.") {
    super("AI_TIMEOUT", message);
  }
}

export class AiInvalidOutputError extends AiError {
  constructor(message = "Dữ liệu AI trả về không đúng cấu trúc yêu cầu.", cause?: unknown) {
    super("AI_INVALID_OUTPUT", message, cause);
  }
}

export class AiUnavailableError extends AiError {
  constructor(message = "Dịch vụ AI hiện không khả dụng. Vui lòng thử lại sau.", cause?: unknown, public readonly upstreamStatus?:number) {
    super("AI_UNAVAILABLE", message, cause);
  }
}

