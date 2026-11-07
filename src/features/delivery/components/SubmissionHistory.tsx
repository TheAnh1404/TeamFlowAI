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
      </div>
    </div>
  );
}

