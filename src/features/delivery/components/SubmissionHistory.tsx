"use client";

import React from "react";
import type { Submission } from "@/contracts/submission";
import { formatIsoDate } from "@/lib/utils";

interface SubmissionHistoryProps {
  submissions: Submission[];
  selectedSubmissionId: string | null;
  onSelectSubmission: (submission: Submission) => void;
}

export function SubmissionHistory({
  submissions,
  selectedSubmissionId,
  onSelectSubmission,
}: SubmissionHistoryProps) {
  if (submissions.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-6 text-center text-sm text-[var(--color-text-muted)]">
        Chưa có bài nộp nào cho công việc này.
      </div>
    );
  }

  const selected = submissions.find((s) => s.id === selectedSubmissionId) || submissions[0];

  return (
    <div className="space-y-4 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border-subtle)] pb-3">
        <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
          Lịch sử bài nộp ({submissions.length} phiên bản)
        </h3>

        {/* Revision Selector */}
        <div className="flex flex-wrap gap-1.5">
          {submissions.map((sub, index) => {
            const isLatest = index === 0;
            const isSelected = sub.id === selected.id;

            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => onSelectSubmission(sub)}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                  isSelected
                    ? "bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-xs"
                    : "border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border-subtle)]"
                }`}
              >
                Bản #{sub.revision} {isLatest ? "(Mới nhất)" : ""}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Submission Details */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between text-xs text-[var(--color-text-muted)]">
          <div>
            Thời điểm nộp: <strong className="text-[var(--color-text-primary)]">{formatIsoDate(selected.submittedAt)}</strong>
          </div>
          <div>
            Định dạng: <span className="uppercase font-medium text-[var(--color-text-secondary)]">{selected.contentType}</span>
          </div>
        </div>

        {/* Content Box */}
        <div className="max-h-80 overflow-y-auto rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] p-4 text-sm font-mono leading-relaxed whitespace-pre-wrap text-[var(--color-text-primary)]">
          {selected.content}
        </div>

        {/* Image Evidence Gallery Preview nếu có ảnh đính kèm */}
        {(() => {
          const imageMatches = Array.from(
            selected.content.matchAll(/!\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g)
          );
          if (imageMatches.length === 0) return null;

          return (
            <div className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-3 space-y-2">
              <div className="text-xs font-semibold text-[var(--color-text-secondary)] flex items-center gap-1.5">
                <span>🖼️</span> Bằng chứng hình ảnh đính kèm ({imageMatches.length} ảnh):
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {imageMatches.map((m, idx) => (
                  <div key={idx} className="rounded-lg border border-[var(--color-border-subtle)] overflow-hidden bg-[var(--color-surface-subtle)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={m[2]}
                      alt={m[1] || `Bằng chứng ${idx + 1}`}
                      className="w-full h-40 object-cover hover:scale-105 transition-transform duration-200"
                      loading="lazy"
                    />
                    <div className="p-2 text-[11px] text-[var(--color-text-muted)] truncate">
                      {m[1] || `Ảnh minh chứng #${idx + 1}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

