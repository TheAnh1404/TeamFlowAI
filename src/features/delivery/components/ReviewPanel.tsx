"use client";

import React, { useState } from "react";
import type { Review } from "@/contracts/review";
import type { Submission } from "@/contracts/submission";
import type { Task } from "@/contracts/task";
import { reviewSchema, taskSchema } from "@/contracts";
import { z } from "zod";
import { apiFetch } from "@/lib/api-client";
import { useMutationKey } from "./use-mutation-key";

interface ReviewPanelProps {
  task?: Task;
  submission: Submission;
  review: Review | null;
  onReviewUpdated: (review: Review, task: Task) => void;
  canRequestReview?: boolean;
}

export function ReviewPanel({
  submission,
  review,
  onReviewUpdated,
  canRequestReview = true,
}: ReviewPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mutationKey = useMutationKey();

  async function handleRequestReview() {
    setIsLoading(true);
    setError(null);

    const idempotencyKey = mutationKey({submissionId: submission.id});

    try {
      const result = await apiFetch(`/api/submissions/${encodeURIComponent(submission.id)}/review`, z.object({review: reviewSchema, task: taskSchema}), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
      });

      onReviewUpdated(result.data.review, result.data.task);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi khi gọi Reviewer AI.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border-subtle)] pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-xs font-bold text-[var(--color-primary)]">
            🔍
          </span>
          <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
            Đánh giá từ Reviewer AI
          </h3>
        </div>

        {review && (
          <span className="inline-flex items-center rounded-full border border-[var(--color-border-subtle)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-text-secondary)]">
            Chế độ: <strong className="ml-1 uppercase text-[var(--color-primary)]">{review.aiMode}</strong>
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-[var(--color-destructive)] bg-[var(--color-overdue-soft)] p-3 text-sm text-[var(--color-destructive)]">
          {error}
        </div>
      )}

      {!review && (
        <div className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] p-6 text-center">
          <p className="mb-3 text-sm text-[var(--color-text-secondary)]">
            Bản nộp này chưa có nhận xét đối chiếu từ Reviewer AI.
          </p>
          {canRequestReview && (
            <button
              type="button"
              onClick={handleRequestReview}
              disabled={isLoading}
              className="inline-flex items-center justify-center rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)] transition-colors hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
            >
              {isLoading ? "Reviewer AI đang đối chiếu bài nộp..." : "Yêu cầu Reviewer AI đánh giá"}
            </button>
          )}
        </div>
      )}

      {review && (
        <div className="space-y-4">
          {/* Summary Box */}
          <div className="rounded-md bg-[var(--color-primary-soft)] p-3">
            <h4 className="mb-1 text-xs font-semibold text-[var(--color-primary)]">
              Tóm tắt nhận định chung:
            </h4>
            <p className="text-sm text-[var(--color-text-primary)]">{review.summary}</p>
          </div>

          {/* Criteria Breakdown Table */}
          <div className="overflow-x-auto rounded-md border border-[var(--color-border-subtle)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--color-surface-subtle)] text-xs font-semibold text-[var(--color-text-secondary)]">
                <tr>
                  <th className="p-3">Tiêu chí nghiệm thu</th>
                  <th className="p-3">Kết quả</th>
                  <th className="p-3">Dẫn chứng / Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-subtle)]">
                {submission.criteriaSnapshot.map((criterion) => {
                  const result = review.results.find((r) => r.criterionId === criterion.id);

                  let verdictBadge = (
                    <span className="inline-flex items-center rounded-full bg-[var(--color-surface-subtle)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-text-muted)]">
                      Chưa rõ
                    </span>
                  );

                  if (result?.verdict === "met") {
                    verdictBadge = (
                      <span className="inline-flex items-center rounded-full bg-[var(--color-status-done-bg)] px-2.5 py-0.5 text-xs font-semibold text-[var(--color-status-done-fg)]">
                        ✓ Đạt (met)
                      </span>
                    );
                  } else if (result?.verdict === "not_met") {
                    verdictBadge = (
                      <span className="inline-flex items-center rounded-full bg-[var(--color-status-changes-requested-bg)] px-2.5 py-0.5 text-xs font-semibold text-[var(--color-status-changes-requested-fg)]">
                        ✗ Chưa đạt
                      </span>
                    );
                  } else if (result?.verdict === "insufficient_evidence") {
                    verdictBadge = (
                      <span className="inline-flex items-center rounded-full bg-[var(--color-status-blocked-bg)] px-2.5 py-0.5 text-xs font-semibold text-[var(--color-status-blocked-fg)]">
                        ? Chưa đủ bằng chứng
                      </span>
                    );
                  }

                  return (
                    <tr key={criterion.id} className="hover:bg-[var(--color-surface-subtle)]">
                      <td className="p-3 align-top">
                        <span className="font-medium text-[var(--color-text-primary)]">
                          {criterion.text}
                        </span>
                        <div className="text-xs text-[var(--color-text-muted)]">Mã: {criterion.id}</div>
                      </td>
                      <td className="p-3 align-top">{verdictBadge}</td>
                      <td className="p-3 align-top space-y-1.5 text-xs">
                        {result?.evidence && result.evidence.length > 0 && (
                          <div className="rounded bg-[var(--color-surface-subtle)] p-2">
                            <span className="font-semibold text-[var(--color-text-secondary)]">Bằng chứng trích dẫn:</span>
                            <blockquote className="mt-1 border-l-2 border-[var(--color-primary)] pl-2 italic text-[var(--color-text-primary)]">
                              &ldquo;{result.evidence[0].quote}&rdquo;
                            </blockquote>
                          </div>
                        )}
                        {result?.missing && (
                          <div className="text-[var(--color-status-changes-requested-fg)]">
                            <span className="font-semibold">Còn thiếu:</span> {result.missing}
                          </div>
                        )}
                        {result?.suggestion && (
                          <div className="text-[var(--color-text-secondary)]">
                            <span className="font-semibold">Gợi ý:</span> {result.suggestion}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
