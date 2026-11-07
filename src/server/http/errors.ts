import "server-only";
import { ZodError, type ZodType } from "zod";
import { FeatureNotImplementedError } from "./feature-not-implemented-error";

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export function assert(condition: unknown, status: number, code: string, message: string): asserts condition {
  if (!condition) throw new HttpError(status, code, message);
}
export const notFound = () => new HttpError(404, "NOT_FOUND", "Không tìm thấy dữ liệu hoặc bạn không có quyền truy cập.");
export const conflict = () => new HttpError(409, "VERSION_CONFLICT", "Dữ liệu đã thay đổi. Hãy tải lại và kiểm tra trước khi thử lại.");
export async function endpoint(action: () => Promise<unknown>): Promise<Response> {
  try { return Response.json({ data: await action() }, { headers: { "Cache-Control": "no-store" } }); }
  catch (error) {
    if (error instanceof ZodError) return Response.json({ error: { code: "VALIDATION_ERROR", message: "Dữ liệu nhập không hợp lệ.", details: error.issues.map(({ path, message }) => ({ path, message })) } }, { status: 422 });
    if (error instanceof HttpError) return Response.json({ error: { code: error.code, message: error.message } }, { status: error.status });
    if (error instanceof FeatureNotImplementedError) return Response.json({ error: { code: "NOT_IMPLEMENTED", message: "Dependency chưa được triển khai. Không có dữ liệu mới được lưu." } }, { status: 501 });
    return Response.json({ error: { code: "INTERNAL_ERROR", message: "Không thể xử lý yêu cầu. Kiểm tra cấu hình server hoặc thử lại." } }, { status: 500 });
  }
}
export function assertSameOrigin(request: Request) {
  assert(request.headers.get("origin") === new URL(request.url).origin, 403, "FORBIDDEN", "Yêu cầu phải được gửi từ ứng dụng này.");
}
export async function readJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  assertSameOrigin(request);
  assert(request.headers.get("content-type")?.split(";")[0] === "application/json", 422, "VALIDATION_ERROR", "Cần gửi dữ liệu JSON.");
  const reader = request.body?.getReader();
  assert(reader, 422, "VALIDATION_ERROR", "Thiếu dữ liệu.");
  const parts: Uint8Array[] = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.length;
    if (size > 32768) { await reader.cancel(); throw new HttpError(413, "PAYLOAD_TOO_LARGE", "Nội dung vượt quá giới hạn 32 KB."); }
    parts.push(value);
  }
  let body: unknown;
  try { body = JSON.parse(Buffer.concat(parts).toString("utf8")); }
  catch { throw new HttpError(422, "VALIDATION_ERROR", "JSON không hợp lệ."); }
  return schema.parse(body);
}
