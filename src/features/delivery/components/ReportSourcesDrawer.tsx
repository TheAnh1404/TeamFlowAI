"use client";

import React, { useEffect, useState } from "react";
import type { SourceRef } from "@/contracts/report";

interface ReportSourcesDrawerProps {
  reportId: string;
  sourceRef: SourceRef | null;
  onClose: () => void;
}

export function ReportSourcesDrawer({ reportId, sourceRef, onClose }: ReportSourcesDrawerProps) {
  const [content, setContent] = useState<{ key: string; text: string } | null>(null);
  const sourceKey = `${reportId}:${sourceRef?.entity}:${sourceRef?.id}`;
  useEffect(() => {
    if (!sourceRef) return;
    if (reportId.startsWith("report-demo")) {
      const demoEvidence = {
        entity: sourceRef.entity,
        id: sourceRef.id,
        snapshotAsOf: "2026-11-07T17:00:00.000Z",
        verified: true,
        summary:
          sourceRef.id === "task-demo-2"
            ? "Task bị chặn do sự cố SMTP rate limit 429 từ nhà cung cấp email."
            : "Bài nộp giao diện Landing Page đã hoàn thành và đang chờ nghiệm thu.",
      };
      queueMicrotask(() => {
        setContent({ key: sourceKey, text: JSON.stringify(demoEvidence, null, 2) });
      });
      return;
    }
    const abort = new AbortController();
    const query = new URLSearchParams({ entity: sourceRef.entity, sourceId: sourceRef.id });
    fetch(`/api/reports/${encodeURIComponent(reportId)}?${query}`, { signal: abort.signal })
      .then(async response => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error?.message ?? "Không thể đọc nguồn.");
        return JSON.stringify(body.data, null, 2);
      }).then(text => setContent({ key: sourceKey, text }))
      .catch(error => { if (!abort.signal.aborted) setContent({ key: sourceKey, text: error instanceof Error ? error.message : "Không thể đọc nguồn." }); });
    return () => abort.abort();
  }, [reportId, sourceRef, sourceKey]);
  if (!sourceRef) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <span className="rounded bg-[var(--color-primary-soft)] px-2 py-0.5 text-xs font-bold text-[var(--color-primary)]">
              {sourceRef.entity}
            </span>
            <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
              Chi tiết nguồn dẫn chứng #{sourceRef.id}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text-primary)]"
          >
            ✕
          </button>
        </div>

        <div className="my-4 space-y-3 text-sm text-[var(--color-text-secondary)]">
          <div className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] p-3">
            <div className="text-xs font-semibold text-[var(--color-text-muted)]">Loại thực thể:</div>
            <div className="font-medium text-[var(--color-text-primary)]">{sourceRef.entity}</div>
          </div>
          <div className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] p-3">
            <div className="text-xs font-semibold text-[var(--color-text-muted)]">Mã định danh (ID):</div>
            <div className="font-mono text-xs text-[var(--color-text-primary)]">{sourceRef.id}</div>
          </div>
          <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
            Chỉ số và danh sách nguồn thuộc mốc chụp báo cáo đã lưu. Nội dung dưới đây là bản ghi nguồn hiện tại; trạng thái task có thể thay đổi sau mốc chụp.
          </p>
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-all text-xs">{content?.key === sourceKey ? content.text : "Đang đọc nguồn..."}</pre>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)] transition-colors hover:bg-[var(--color-primary-hover)]"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

