import "server-only";
import { reportSummaryV2Schema } from "@/contracts/coordinator";
import type { CoordinatorReportAiInput } from "./contracts";
import { AiInvalidOutputError } from "./errors";
export function validateReportV2(raw: unknown, input: CoordinatorReportAiInput) {
    const parsed = reportSummaryV2Schema.safeParse(raw);
    if (!parsed.success)
        throw new AiInvalidOutputError("Cấu trúc diễn giải V2 không hợp lệ.");
    for (const item of parsed.data) {
        if (!item.sourceRefs.length && !item.metricKeys.length)
            throw new AiInvalidOutputError("Nhận định thiếu nguồn.");
        const sources = item.sourceRefs.map(ref => {
            const source = input.snapshot.sources.find(s => s.entity === ref.entity && s.id === ref.id);
            if (!source)
                throw new AiInvalidOutputError("Nguồn nằm ngoài snapshot.");
            return source;
        });
        for (const key of item.metricKeys)
            if (!(key in input.metrics))
                throw new AiInvalidOutputError("Chỉ số không tồn tại.");
        for (const quote of item.quotes) {
            const source = sources.find(s => s.entity === quote.source.entity && s.id === quote.source.id);
            const strings = (value: unknown): string[] => typeof value === "string" ? [value] : Array.isArray(value) ? value.flatMap(strings) : value && typeof value === "object" ? Object.values(value).flatMap(strings) : [];
            if (!source || !strings(source.data).some(s => s.includes(quote.quote)))
                throw new AiInvalidOutputError("Trích dẫn không có trong nguồn được nêu.");
        }
        const allowed = JSON.stringify([...item.metricKeys.map(k => input.metrics[k]), ...sources.map(s => s.data)]);
        for (const number of item.text.match(/\d+(?:[.,]\d+)?/g) ?? []) {
            const numbers: string[] = allowed.match(/\d+(?:[.,]\d+)?/g) ?? [];
            if (!numbers.includes(number))
                throw new AiInvalidOutputError("Diễn giải có số không được nguồn hoặc metrics hỗ trợ.");
        }
    }
    return parsed.data;
}
