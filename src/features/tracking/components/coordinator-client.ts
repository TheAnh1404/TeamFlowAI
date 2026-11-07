"use client";
export async function coordinatorRequest<T>(url: string, method = "GET", body?: unknown, key?: string): Promise<T> {
    const response = await fetch(url, { method, cache: "no-store", headers: body === undefined ? undefined : { "Content-Type": "application/json", ...(key ? { "Idempotency-Key": key } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok)
        throw new Error(result.error?.message ?? "Không thể xử lý yêu cầu.");
    return result.data as T;
}
