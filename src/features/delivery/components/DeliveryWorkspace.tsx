"use client";

import React, { useEffect, useState } from "react";
import type { Review } from "@/contracts/review";
import type { Submission, SubmitWorkResult } from "@/contracts/submission";
import type { Task } from "@/contracts/task";
import { AcceptanceActions } from "./AcceptanceActions";
import { ReviewPanel } from "./ReviewPanel";
import { SubmissionForm } from "./SubmissionForm";
import { SubmissionHistory } from "./SubmissionHistory";

interface DeliveryWorkspaceProps {
  task: Task;
  canAccept?: boolean;
  canSubmit?: boolean;
  onTaskUpdated?: (updatedTask: Task) => void;
  onDirtyChange?: (dirty: boolean) => void;
}

export function DeliveryWorkspace({
  task: initialTask,
  canAccept = false,
  canSubmit = false,
  onTaskUpdated,
  onDirtyChange,
}: DeliveryWorkspaceProps) {
  const [task, setTask] = useState<Task>(initialTask);
  const [prevTaskId, setPrevTaskId] = useState(initialTask.id);
  const [prevTaskVersion, setPrevTaskVersion] = useState(initialTask.version);

  // Sync khi initialTask thay đổi từ parent (chuẩn React 19 không dùng useEffect)
  if (initialTask.id !== prevTaskId || initialTask.version !== prevTaskVersion) {
    setPrevTaskId(initialTask.id);
    setPrevTaskVersion(initialTask.version);
    setTask(initialTask);
  }

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load submissions cho task
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(`/api/tasks/${encodeURIComponent(task.id)}/submissions`);
        if (!res.ok) throw new Error("Không thể tải lịch sử bài nộp. Vui lòng tải lại công việc.");
        if (res.ok) {
          const body = await res.json();
          const subs: Submission[] = body.data || [];
          if (isMounted) {
            setSubmissions(subs);
            if (subs.length > 0) {
              setSelectedSubmission(subs[0]);
            }
          }
        }
      } catch (err) {
        if (isMounted) setLoadError(err instanceof Error ? err.message : "Không thể tải bài nộp.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [task.id, task.criteria]);

  // Load review khi chọn submission
  useEffect(() => {
    let isMounted = true;
    if (!selectedSubmission) {
      return;
    }

    async function loadReview() {
      try {
        const res = await fetch(`/api/submissions/${encodeURIComponent(selectedSubmission!.id)}/review`);
        if (!res.ok) throw new Error("Không thể tải nhận xét. Vui lòng tải lại công việc.");
        if (res.ok) {
          const body = await res.json();
          if (isMounted) setReview(body.data);
        }
      } catch (err) {
        if (isMounted) setLoadError(err instanceof Error ? err.message : "Không thể tải nhận xét.");
      }
    }

    loadReview();
    return () => {
      isMounted = false;
    };
  }, [selectedSubmission, task.id]);

  function handleSelectSubmission(sub: Submission) {
    setSelectedSubmission(sub);
    setReview(null);
  }

  function handleSubmitted(result: SubmitWorkResult) {
    setTask(result.task);
    setSubmissions((prev) => [result.submission, ...prev]);
    setSelectedSubmission(result.submission);
    setReview(null);
    onTaskUpdated?.(result.task);
  }

  function handleReviewUpdated(newReview: Review, updatedTask: Task) {
    setReview(newReview);
    setTask(updatedTask);
    onTaskUpdated?.(updatedTask);
  }

  function handleAccepted(updatedTask: Task) {
    setTask(updatedTask);
    onTaskUpdated?.(updatedTask);
  }

  return (
    <div className="space-y-6">
      {loadError && <p role="alert">{loadError}</p>}
      {/* Criteria Checklist Header */}
      <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4 shadow-xs">
        <h3 className="mb-2 text-base font-semibold text-[var(--color-text-primary)]">
          Tiêu chí nghiệm thu công việc ({task.criteria.length} tiêu chí)
        </h3>
        <ul className="space-y-2">
          {task.criteria.map((c) => (
            <li key={c.id} className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-subtle)] text-[10px] font-bold text-[var(--color-primary)]">
                •
              </span>
              <span>
                <strong className="text-[var(--color-text-primary)]">{c.text}</strong>
                <span className="ml-1 text-xs text-[var(--color-text-muted)]">({c.id})</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Lịch sử bài nộp */}
      {isLoading ? (
        <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-6 text-center text-sm text-[var(--color-text-muted)]">
          Đang nạp dữ liệu bài nộp...
        </div>
      ) : (
        <SubmissionHistory
          submissions={submissions}
          selectedSubmissionId={selectedSubmission?.id ?? null}
          onSelectSubmission={handleSelectSubmission}
        />
      )}

      {/* Khung nhận xét từ Reviewer AI */}
      {selectedSubmission && (
        <ReviewPanel
          task={task}
          submission={selectedSubmission}
          review={review}
          onReviewUpdated={handleReviewUpdated}
          canRequestReview={canSubmit}
        />
      )}

      {/* Thao tác Nghiệm thu dành cho Leader */}
      <AcceptanceActions
        task={task}
        submission={submissions.length > 0 ? submissions[0] : null}
        review={submissions.length > 0 && selectedSubmission?.id === submissions[0].id ? review : null}
        canAccept={canAccept}
        onAccepted={handleAccepted}
      />

      {/* Form Nộp bài mới */}
      {canSubmit && task.status !== "done" && (
        <SubmissionForm
          task={task}
          onSubmitted={handleSubmitted}
          onDirtyChange={onDirtyChange}
        />
      )}
    </div>
  );
}
