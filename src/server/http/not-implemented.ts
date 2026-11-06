import "server-only";
import type { ApiError } from "@/contracts/common";

export function notImplementedResponse(): Response {
  const body: ApiError = {
    error: { code: "NOT_IMPLEMENTED", message: "Chức năng chưa được triển khai." },
  };
  return Response.json(body, { status: 501 });
}
