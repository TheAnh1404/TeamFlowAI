"use client";

import React, { useState } from "react";
import type { Review } from "@/contracts/review";
import type { Submission } from "@/contracts/submission";
import type { Task } from "@/contracts/task";

interface AcceptanceActionsProps {
  task: Task;
  submission: Submission | null;
  review: Review | null;
  canAccept: boolean;
  onAccepted: (updatedTask: Task) => void;
}

export function AcceptanceActions({
  task,
  submission,
  review,
  canAccept,
  onAccepted,
}: AcceptanceActionsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (task.status === "done") {
    return null;
  }

  // Bất biến: All-met mới đủ điều kiện nghiệm thu
  const allCriteriaMet =
    review !== null &&
    review.results.length > 0 &&
    review.results.every((r) => r.verdict === "met");

  async function handleAccept() {
    if (!submission || !allCriteriaMet || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    const idempotencyKey = `accept_${task.id}_${task.version}_${Date.now()}`;

    try {
      const res = await fetch(`/api/tasks/${encodeURIComponent(task.id)}/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          submissionId: submission.id,
          expectedTaskVersion: task.version,
        }),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error?.message || "Nghiệm thu thất bại.");
      }

      onAccepted(body.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi khi nghiệm thu.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4 shadow-xs">
      <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-2">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
          Thao tác Nghiệm thu
        </h3>
        <span className="text-xs text-[var(--color-text-muted)]">
          {canAccept ? "Bạn có quyền phê duyệt" : "Chỉ trưởng nhóm hoặc người nghiệm thu"}
        </span>
      </div>

      {error && (
        <div className="rounded-md border border-[var(--color-destructive)] bg-[var(--color-overdue-soft)] p-3 text-xs text-[var(--color-destructive)]">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {!submission && (
            <p className="text-xs text-[var(--color-text-muted)]">
              Chưa có bài nộp nào để tiến hành nghiệm thu.
            </p>
          )}
          {submission && !review && (
            <p className="text-xs text-[var(--color-text-muted)]">
              Đang chờ kết quả đối chiếu từ Reviewer AI trước khi nghiệm thu.
            </p>
          )}
          {submission && review && !allCriteriaMet && (
            <p className="text-xs font-medium text-[var(--color-status-changes-requested-fg)]">
              ⚠ Vẫn còn tiêu chí chưa đạt hoặc chưa đủ bằng chứng. Chưa thể xác nhận hoàn thành.
            </p>
          )}
          {submission && review && allCriteriaMet && (
            <p className="text-xs font-medium text-[var(--color-status-done-fg)]">
              ✓ Toàn bộ tiêu chí đã được Reviewer xác nhận đạt yêu cầu.
            </p>
          )}
        </div>

        {canAccept && (
          <button
            type="button"
            onClick={handleAccept}
            disabled={!allCriteriaMet || isSubmitting}
            className="inline-flex items-center justify-center rounded-md bg-[var(--color-status-done-fg)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)] transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSubmitting ? "Đang nghiệm thu..." : "Xác nhận hoàn thành (Done)"}
          </button>
        )}
      </div>
    </div>
  );
}

