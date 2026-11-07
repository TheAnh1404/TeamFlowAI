"use client";

import React, { useEffect } from "react";
import type { SourceRef } from "@/contracts/report";

interface ReportSourcesDrawerProps {
  sourceRef: SourceRef | null;
  onClose: () => void;
}

export function ReportSourcesDrawer({ sourceRef, onClose }: ReportSourcesDrawerProps) {
  useEffect(() => {
    if (!sourceRef) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sourceRef, onClose]);

  if (!sourceRef) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-source-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <span className="rounded bg-[var(--color-primary-soft)] px-2 py-0.5 text-xs font-bold text-[var(--color-primary)]">
              {sourceRef.entity}
            </span>
            <h3 id="drawer-source-title" className="text-base font-semibold text-[var(--color-text-primary)]">
              Chi tiết nguồn dẫn chứng #{sourceRef.id}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ dẫn chứng"
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
            Dữ liệu nguồn được chụp lại tại mốc asOf của báo cáo tuần để đảm bảo tính nhất quán lịch sử và không bị sai lệch khi công việc thay đổi trạng thái sau đó.
          </p>
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

