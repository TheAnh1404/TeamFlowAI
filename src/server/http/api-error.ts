import "server-only";
import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { FeatureNotImplementedError } from "./feature-not-implemented-error";
import { DrizzleQueryError } from "drizzle-orm";

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (request.headers.get("sec-fetch-site") === "cross-site" || (origin && origin !== new URL(request.url).origin)) {
    throw new ApiError(403, "FORBIDDEN", "Yêu cầu phải xuất phát từ cùng ứng dụng.");
  }
}

export async function readJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(422, "VALIDATION_ERROR", "Thiếu nội dung yêu cầu.");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > 32768) {
      await reader.cancel();
      throw new ApiError(413, "PAYLOAD_TOO_LARGE", "Nội dung yêu cầu vượt giới hạn 32 KB.");
    }
    chunks.push(value);
  }
  let body: unknown;
  try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new ApiError(422, "VALIDATION_ERROR", "Nội dung JSON không hợp lệ."); }
  const result = schema.safeParse(body);
  if (!result.success) throw new ApiError(422, "VALIDATION_ERROR", "Trường dữ liệu thiếu hoặc không hợp lệ.");
  return result.data;
}

export async function apiHandler<T>(work: () => Promise<T>): Promise<Response> {
  try {
    return NextResponse.json({ data: await work() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status, headers: { "Cache-Control": "no-store" } });
    }
    if (error instanceof FeatureNotImplementedError) {
      return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: 501 });
    }
    // Do not expose SQL, credentials, connection URLs, or stack traces.
    if (error instanceof DrizzleQueryError) {
      return NextResponse.json({ error: { code: "DATABASE_UNAVAILABLE", message: "Dữ liệu chưa sẵn sàng. Kiểm tra kết nối và migration phía server." } }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Không thể xử lý yêu cầu. Vui lòng thử lại." } }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
