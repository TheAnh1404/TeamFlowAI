"use client";

import React, { useState } from "react";
import type { SubmissionContentType } from "@/contracts/enums";
import type { Task } from "@/contracts/task";
import type { SubmitWorkResult } from "@/contracts/submission";
import { submissionSchema, taskSchema } from "@/contracts";
import { z } from "zod";
import { apiFetch } from "@/lib/api-client";
import { useMutationKey } from "./use-mutation-key";

interface SubmissionFormProps {
  task: Task;
  onSubmitted: (result: SubmitWorkResult) => void;
  disabled?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}

export function SubmissionForm({ task, onSubmitted, disabled = false, onDirtyChange }: SubmissionFormProps) {
  const [contentType, setContentType] = useState<SubmissionContentType>("markdown");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mutationKey = useMutationKey();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    const idempotencyKey = mutationKey({taskId: task.id, version: task.version, contentType, content});

    try {
      const result = await apiFetch(`/api/tasks/${encodeURIComponent(task.id)}/submissions`, z.object({submission: submissionSchema, task: taskSchema}), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          contentType,
          content,
          expectedTaskVersion: task.version,
        }),
      });

      setContent("");
      onDirtyChange?.(false);
      onSubmitted(result.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi khi nộp bài.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (task.status === "done") {
    return (
      <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] p-4 text-center">
        <p className="text-sm font-medium text-[var(--color-status-done-fg)]">
          ✓ Công việc này đã được nghiệm thu hoàn thành.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4 shadow-xs">
      <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-3">
        <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
          Nộp bài nghiệm thu
        </h3>
        <span className="text-xs text-[var(--color-text-muted)]">
          Dán trực tiếp văn bản, mã hoặc Markdown
        </span>
      </div>

      {error && (
        <div className="rounded-md border border-[var(--color-destructive)] bg-[var(--color-overdue-soft)] p-3 text-sm text-[var(--color-destructive)]">
          {error}
        </div>
      )}

      {/* Format Selector */}
      <div>
        <label className="mb-1 block text-xs font-semibold text-[var(--color-text-secondary)]">
          Định dạng nội dung
        </label>
        <div className="inline-flex rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] p-1 text-xs">
          {(["markdown", "text", "code"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setContentType(type)}
              disabled={disabled || isSubmitting}
              className={`rounded px-3 py-1 font-medium transition-colors ${
                contentType === type
                  ? "bg-[var(--color-surface)] text-[var(--color-primary)] shadow-xs"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {type === "markdown" ? "Markdown" : type === "text" ? "Văn bản" : "Mã nguồn"}
            </button>
          ))}
        </div>
      </div>

      {/* Content TextArea */}
      <div>
        <label htmlFor="submission-content" className="mb-1 block text-xs font-semibold text-[var(--color-text-secondary)]">
          Nội dung bài nộp (Bắt buộc)
        </label>
        <textarea
          id="submission-content"
          maxLength={24000}
          rows={6}
          value={content}
          onChange={(e) => {
            const val = e.target.value;
            setContent(val);
            onDirtyChange?.(val.trim().length > 0);
          }}
          disabled={disabled || isSubmitting}
          placeholder="Dán nội dung bài nộp tại đây. Hãy nêu rõ các căn cứ chứng minh cho từng tiêu chí nghiệm thu của công việc..."
          className="w-full rounded-md border border-[var(--color-control-border)] bg-[var(--color-surface)] p-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-focus-ring)] focus:outline-hidden"
          required
        />
      </div>

      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-[var(--color-text-muted)]">
          Nộp bài sẽ tạo Revision mới và giữ nguyên lịch sử các bài trước.
        </p>
        <button
          type="submit"
          disabled={disabled || isSubmitting || !content.trim()}
          className="inline-flex items-center justify-center rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary)] transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Đang nộp & chuyển trạng thái..." : "Nộp bài & Yêu cầu Review"}
        </button>
      </div>
    </form>
  );
}

