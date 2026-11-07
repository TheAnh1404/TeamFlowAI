"use client";

import React, { useRef, useState } from "react";
import { requestKey } from "@/features/tracking/components/client-data";
import type { SubmissionContentType } from "@/contracts/enums";
import type { Task } from "@/contracts/task";
import type { SubmitWorkResult } from "@/contracts/submission";

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
  const retry = useRef<{ input: string; key: string } | null>(null);

  // Idempotency key thuần túy chuẩn React 19: giữ cố định khi retry, tự đổi khi task đổi version hoặc nộp thành công
  const [submitSeq, setSubmitSeq] = useState(1);
  const idempotencyKey = `sub_${task.id}_v${task.version}_seq_${submitSeq}`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    if (task.id.startsWith("task-demo")) {
      const mockResult: SubmitWorkResult = {
        submission: {
          id: `sub-demo-${Date.now()}`,
          projectId: task.projectId,
          taskId: task.id,
          authorMemberId: "member-tv2",
          revision: task.version + 1,
          contentType,
          content,
          criteriaSnapshot: task.criteria,
          submittedAt: new Date().toISOString(),
        },
        task: {
          ...task,
          status: "in_review",
          version: task.version + 1,
        },
      };
      setContent("");
      setIsSubmitting(false);
      onDirtyChange?.(false);
      onSubmitted(mockResult);
      return;
    }

    const idempotencyKey = requestKey(retry, { taskId: task.id, contentType, content, expectedTaskVersion: task.version });
    try {
      const res = await fetch(`/api/tasks/${encodeURIComponent(task.id)}/submissions`, {
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

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error?.message || "Nộp bài thất bại.");
      }

      setContent("");
      retry.current = null;
      onDirtyChange?.(false);
      // Đổi key mới cho lần nộp tiếp theo
      setSubmitSeq((seq) => seq + 1);
      onSubmitted(body.data);
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
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1">
          <label htmlFor="submission-content" className="block text-xs font-semibold text-[var(--color-text-secondary)]">
            Nội dung bài nộp (Văn bản, bảng tính Excel, slide hoặc link ảnh minh chứng)
          </label>
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => {
                const sample = "\n\n| Hạng mục dữ liệu / Test case | Số lượng | Kết quả kiểm thử |\n|---|:---:|---|\n| Chức năng thanh toán | 50 cases | Pass 100% |\n| Bảng dự toán chi phí | 12 mục | Đã khớp ngân sách |\n";
                const updated = content + sample;
                setContent(updated);
                onDirtyChange?.(updated.trim().length > 0);
              }}
              className="text-[var(--color-primary)] hover:underline"
            >
              + Bảng Excel/CSV
            </button>
            <button
              type="button"
              onClick={() => {
                const sample = "\n\n### Slide 1: Báo cáo Tiến độ Tuần\n- Mục tiêu: Hoàn tất kiểm thử cổng thanh toán\n- Kết quả: Đã xác thực thành công\n";
                const updated = content + sample;
                setContent(updated);
                onDirtyChange?.(updated.trim().length > 0);
              }}
              className="text-[var(--color-primary)] hover:underline"
            >
              + Mẫu Slide
            </button>
            <button
              type="button"
              onClick={() => {
                const sample = "\n\n![Ảnh chụp màn hình minh chứng nghiệm thu](https://images.unsplash.com/photo-1551288049-bebda4e38f71)\n";
                const updated = content + sample;
                setContent(updated);
                onDirtyChange?.(updated.trim().length > 0);
              }}
              className="text-[var(--color-primary)] hover:underline"
            >
              + Ảnh minh chứng
            </button>
          </div>
        </div>
        <textarea
          id="submission-content"
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
          {isSubmitting ? "Đang nộp bài..." : "Nộp bài"}
        </button>
      </div>
    </form>
  );
}

