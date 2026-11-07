"use client";

import React, { useEffect, useState } from "react";
import type { ProjectConsolidatedDeliverable } from "../server/service";
import { formatIsoDate } from "@/lib/utils";

interface Props {
  projectId: string;
}

export function ProjectConsolidatedDeliverableView({ projectId }: Props) {
  const [data, setData] = useState<ProjectConsolidatedDeliverable | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchDeliverable() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/consolidated-deliverable`);
        if (!res.ok) throw new Error("Không thể tải trạng thái bản tổng hợp hoàn chỉnh.");
        const json = await res.json();
        if (isMounted) setData(json.data);
      } catch (err: unknown) {
        if (isMounted) setError(err instanceof Error ? err.message : "Đã xảy ra lỗi.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    fetchDeliverable();
    return () => {
      isMounted = false;
    };
  }, [projectId]);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-8 text-center text-sm text-[var(--color-text-muted)]">
        Đang kiểm tra trạng thái nghiệm thu toàn bộ công việc của dự án...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-[var(--color-destructive)] bg-[var(--color-overdue-soft)] p-4 text-sm text-[var(--color-destructive)]">
        {error || "Chưa tải được dữ liệu."}
      </div>
    );
  }

  const percent = data.totalTasks > 0 ? Math.round((data.acceptedTasksCount / data.totalTasks) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* TRƯỜNG HỢP 1: CHƯA ĐẠT 100% CÔNG VIỆC ĐƯỢC LEADER DUYỆT -> KHÓA BẢN HOÀN CHỈNH */}
      {!data.isAllTasksAccepted ? (
        <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-subtle)] pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-surface-subtle)] text-lg">
                🔒
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                  Bản Tổng Hợp Hoàn Chỉnh: Đang Tạm Khóa
                </h3>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Chỉ kích hoạt khi 100% công việc trong dự án đã được Leader phê duyệt hoàn thành
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold text-[var(--color-primary)]">
                {data.acceptedTasksCount} / {data.totalTasks} việc đã nghiệm thu ({percent}%)
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2.5 w-full rounded-full bg-[var(--color-surface-subtle)] overflow-hidden">
            <div
              className="h-full bg-[var(--color-primary)] transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>

          <div className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] p-4 text-xs text-[var(--color-text-secondary)] space-y-2">
            <p className="font-semibold text-[var(--color-text-primary)]">
              ⚠️ Điều kiện xuất bản hoàn chỉnh:
            </p>
            <p>
              Tất cả các bài làm (văn bản, bảng tính Excel, slide PowerPoint, ảnh minh chứng) phải được Reviewer AI đánh giá đạt tiêu chí ban đầu của Kế hoạch (TV1), và phải được <strong>Trưởng nhóm (Leader) xác nhận đồng ý</strong>.
            </p>
          </div>

          {/* Danh sách các việc còn chờ duyệt */}
          {data.pendingTasks.length > 0 && (
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                Danh sách {data.pendingTasks.length} công việc cần Leader nghiệm thu để mở khóa:
              </h4>
              <div className="divide-y divide-[var(--color-border-subtle)] rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-surface)]">
                {data.pendingTasks.map((t) => (
                  <div key={t.id} className="flex flex-wrap items-center justify-between p-3 text-xs gap-2">
                    <div>
                      <span className="font-semibold text-[var(--color-text-primary)]">{t.title}</span>
                      <span className="ml-2 font-mono text-[var(--color-text-muted)]">#{t.id}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--color-text-secondary)]">Người làm: <strong>{t.assigneeMemberId}</strong></span>
                      <span className="rounded bg-[var(--color-surface-subtle)] px-2 py-0.5 font-medium uppercase text-[11px] text-[var(--color-text-primary)] border border-[var(--color-border-subtle)]">
                        {t.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* TRƯỜNG HỢP 2: TẤT CẢ ĐÃ ĐƯỢC LEADER ĐỒNG Ý -> MỞ KHÓA BẢN HOÀN CHỈNH DUY NHẤT */
        <div className="space-y-6">
          {/* Success Banner */}
          <div className="rounded-xl border border-[var(--color-status-done-fg)] bg-[var(--color-primary-soft)] p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-status-done-fg)] text-white text-xl font-bold">
                ✓
              </div>
              <div>
                <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                  Bản Tổng Hợp Hoàn Chỉnh Của Dự Án Đã Sẵn Sàng!
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Toàn bộ {data.totalTasks}/{data.totalTasks} công việc đã được Reviewer AI thẩm định và Trưởng nhóm (Leader) xác nhận nghiệm thu.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-[var(--color-on-primary)] transition-colors hover:bg-[var(--color-primary-hover)] shadow-xs"
            >
              <span>🖨️</span> In / Lưu Hồ Sơ Hoàn Chỉnh
            </button>
          </div>

          {/* Tập hợp toàn bộ các phần bài làm chính thức của các thành viên */}
          <div className="space-y-6">
            <h4 className="text-base font-bold text-[var(--color-text-primary)] border-b border-[var(--color-border-subtle)] pb-2">
              Nội Dung Hồ Sơ Đóng Gói Toàn Diện Các Hạng Mục:
            </h4>

            {data.completedSections.map((sec, idx) => (
              <div key={sec.task.id} className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-6 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border-subtle)] pb-3">
                  <div>
                    <h5 className="text-base font-bold text-[var(--color-primary)]">
                      Chương {idx + 1}: {sec.task.title}
                    </h5>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      Yêu cầu ban đầu từ Kế hoạch: {sec.task.description}
                    </p>
                  </div>
                  <div className="text-right text-xs">
                    <span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-0.5 font-bold text-[var(--color-status-done-fg)]">
                      ✓ Đã Nghiệm Thu (Done)
                    </span>
                    <div className="text-[11px] text-[var(--color-text-muted)] mt-1">
                      Người làm: <strong>{sec.task.assigneeMemberId}</strong>
                      {sec.task.acceptedAt ? ` · Duyệt lúc: ${formatIsoDate(sec.task.acceptedAt)}` : ""}
                    </div>
                  </div>
                </div>

                {/* Tiêu chí nghiệm thu đã đạt */}
                <div className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] p-3 text-xs space-y-1.5">
                  <span className="font-semibold text-[var(--color-text-primary)]">
                    Tiêu chí nghiệm thu ban đầu (TV1):
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-[var(--color-text-secondary)]">
                    {sec.task.criteria.map((c) => (
                      <li key={c.id}>
                        <strong>{c.id}:</strong> {c.text} — <span className="font-semibold text-[var(--color-status-done-fg)]">Đạt (met)</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Nội dung bài nộp chính thức của tác giả */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-[var(--color-text-secondary)]">
                    Bài làm chính thức đã được Leader duyệt (Bản #{sec.acceptedSubmission?.revision ?? 1}):
                  </div>
                  <div className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] p-4 text-sm font-mono whitespace-pre-wrap leading-relaxed text-[var(--color-text-primary)]">
                    {sec.acceptedSubmission?.content || "Chưa có nội dung văn bản."}
                  </div>
                </div>

                {/* Hiển thị ảnh nếu có trong bài nộp */}
                {sec.acceptedSubmission && (() => {
                  const imageMatches = Array.from(
                    sec.acceptedSubmission.content.matchAll(/!\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g)
                  );
                  if (imageMatches.length === 0) return null;

                  return (
                    <div className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-3 space-y-2">
                      <div className="text-xs font-semibold text-[var(--color-text-secondary)]">
                        🖼️ Bằng chứng hình ảnh trong bài nộp:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {imageMatches.map((m, mIdx) => (
                          <div key={mIdx} className="rounded-lg border border-[var(--color-border-subtle)] overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={m[2]} alt={m[1] || "Bằng chứng"} className="w-full h-36 object-cover" />
                            <div className="p-1.5 text-[11px] text-[var(--color-text-muted)] truncate">{m[1]}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
