"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { SourceRef, WeeklyReport } from "@/contracts/report";
import { loadContext } from "@/features/tracking/components/client-data";
import { routes } from "@/lib/routes";
import { formatIsoDate } from "@/lib/utils";
import { ReportSourcesDrawer } from "./ReportSourcesDrawer";
import { ProjectConsolidatedDeliverableView } from "./ProjectConsolidatedDeliverableView";

interface WeeklyReportViewProps {
  projectId: string;
}

export function WeeklyReportView({ projectId }: WeeklyReportViewProps) {
  const snapshotEnd = useRef(new Date().toISOString());
  const [canGenerate, setCanGenerate] = useState(false);
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSourceRef, setActiveSourceRef] = useState<SourceRef | null>(null);
  const [subTab, setSubTab] = useState<"weekly" | "consolidated">("weekly");

  // Modal tạo báo cáo
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [periodStart, setPeriodStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [periodEnd, setPeriodEnd] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    let isMounted = true;
    async function loadReports() {
      setIsLoading(true);
      setError(null);
      try {
        const context = await loadContext(projectId);
        if (isMounted) setCanGenerate(context.members.some(m => m.userId === context.session.user.id && m.role === "leader"));
        const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/reports`);
        if (!res.ok) throw new Error("Không thể tải danh sách báo cáo tuần.");
        const body = await res.json();
        const list: WeeklyReport[] = body.data || [];
        if (isMounted) {
          setReports(list);
          if (list.length > 0) {
            setSelectedReportId(list[0].id);
          }
        }
      } catch (err: unknown) {
        if (isMounted) setError(err instanceof Error ? err.message : "Đã xảy ra lỗi.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadReports();
    return () => {
      isMounted = false;
    };
  }, [projectId]);

  const selectedReport = reports.find((r) => r.id === selectedReportId) || reports[0] || null;

  // Idempotency key thuần túy chuẩn React 19: giữ cố định khi retry, tự đổi khi tạo thành công
  const [reportSeq, setReportSeq] = useState(1);
  const reportIdempotencyKey = `rep_${projectId}_seq_${reportSeq}`;

  async function handleCreateReport(e: React.FormEvent) {
    e.preventDefault();
    setIsGenerating(true);
    setError(null);

    try {
      // Chuyển đổi chính xác 00:00:00 và 23:59:59.999 từ giờ địa phương sang UTC ISO string
      const startIso = new Date(`${periodStart}T00:00:00`).toISOString();
      const endCandidate = new Date(`${periodEnd}T23:59:59.999`).getTime();
      const endMax = snapshotEnd.current ? Date.parse(snapshotEnd.current) : Date.now();
      const endIso = new Date(Math.min(endCandidate, endMax)).toISOString();

      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": reportIdempotencyKey,
        },
        body: JSON.stringify({
          periodStart: startIso,
          periodEnd: endIso,
        }),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error?.message || "Tạo báo cáo tuần thất bại.");
      }

      const newReport: WeeklyReport = body.data;
      setReports((prev) => [newReport, ...prev]);
      setSelectedReportId(newReport.id);
      setShowCreateModal(false);
      // Đổi key mới cho lần tạo báo cáo kế tiếp
      setReportSeq((seq) => seq + 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi khi tạo báo cáo.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      {/* 1. Project Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-border-subtle)] pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
            Báo cáo tiến độ tuần
          </h1>
          <p className="text-xs text-[var(--color-text-muted)]">
            Dữ liệu snapshot minh bạch do Backend tính toán và AI tóm tắt có nguồn dẫn chứng
          </p>
        </div>

        <nav aria-label="Project Navigation" className="flex items-center gap-2">
          <Link
            href={routes.tasks(projectId)}
            className="rounded-md px-3 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)]"
          >
            Công việc
          </Link>
          <Link
            href={routes.plan(projectId)}
            className="rounded-md px-3 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)]"
          >
            Kế hoạch
          </Link>
          <Link
            href={routes.chat(projectId)}
            className="rounded-md px-3 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)]"
          >
            Chat
          </Link>
          <span className="rounded-md bg-[var(--color-primary-soft)] px-3 py-1.5 text-xs font-bold text-[var(--color-primary)]">
            Báo cáo
          </span>
        </nav>
      </div>

      {error && (
        <div className="rounded-lg border border-[var(--color-destructive)] bg-[var(--color-overdue-soft)] p-4 text-sm text-[var(--color-destructive)]">
          {error}
        </div>
      )}

      {/* Sub Tabs: Weekly Report vs Final Consolidated Deliverable */}
      <div className="flex border-b border-[var(--color-border-subtle)] gap-6 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setSubTab("weekly")}
          className={`pb-2.5 transition-colors ${
            subTab === "weekly"
              ? "border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
          }`}
        >
          📊 Báo cáo tiến độ tuần
        </button>
        <button
          type="button"
          onClick={() => setSubTab("consolidated")}
          className={`pb-2.5 transition-colors flex items-center gap-1.5 ${
            subTab === "consolidated"
              ? "border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
          }`}
        >
          <span>🏆</span> Bản Hoàn Chỉnh Toàn Dự Án (Chỉ mở khi 100% duyệt)
        </button>
      </div>

      {subTab === "consolidated" && (
        <ProjectConsolidatedDeliverableView projectId={projectId} />
      )}

      {subTab === "weekly" && (
        <>
          {/* 2. Report Selector & Create Button */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-[var(--color-text-secondary)]">Chọn kỳ báo cáo:</span>
          {reports.length === 0 ? (
            <span className="text-xs italic text-[var(--color-text-muted)]">Chưa có báo cáo nào</span>
          ) : (
            <select
              value={selectedReport?.id || ""}
              onChange={(e) => setSelectedReportId(e.target.value)}
              className="rounded-md border border-[var(--color-control-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-hidden"
            >
              {reports.map((rep) => (
                <option key={rep.id} value={rep.id}>
                  Kỳ {formatIsoDate(rep.periodStart)} – {formatIsoDate(rep.periodEnd)} (Chụp lúc {formatIsoDate(rep.asOf)})
                </option>
              ))}
            </select>
          )}
        </div>

        <button
          type="button"
          disabled={!canGenerate || isLoading}
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center rounded-md bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-[var(--color-on-primary)] transition-colors hover:bg-[var(--color-primary-hover)] shadow-xs"
        >
          + Tạo báo cáo tuần mới
        </button>
      </div>

      {/* 3. Empty State */}
      {!isLoading && !selectedReport && (
        <div className="rounded-xl border border-dashed border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-xl font-bold text-[var(--color-primary)]">
            📊
          </div>
          <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
            Chưa có báo cáo tuần nào được tạo
          </h3>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Trưởng nhóm có thể bấm nút &ldquo;+ Tạo báo cáo tuần mới&rdquo; phía trên để chụp snapshot tiến độ đầu tiên.
          </p>
        </div>
      )}

      {/* 4. Selected Report Content */}
      {selectedReport && (
        <div className="space-y-6">
          {/* Snapshot Metadata Box */}
          <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-primary-soft)] p-4 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border-subtle)] pb-2">
              <span className="font-semibold text-[var(--color-primary)]">
                📸 Mốc chụp dữ liệu máy chủ (asOf): {formatIsoDate(selectedReport.asOf)} (Giờ Việt Nam)
              </span>
              <span className="rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-2.5 py-0.5 font-medium text-[var(--color-text-secondary)]">
                AI Mode: <strong className="uppercase text-[var(--color-primary)]">{selectedReport.aiMode}</strong>
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-[var(--color-text-secondary)]">
              <div>
                Khoảng xét duyệt: <strong>{formatIsoDate(selectedReport.periodStart)}</strong> đến <strong>{formatIsoDate(selectedReport.periodEnd)}</strong>
              </div>
              <div>
                Người tạo: <strong>{selectedReport.generatedByMemberId}</strong>
              </div>
              <div>
                Mã báo cáo: <code className="font-mono">{selectedReport.id}</code>
              </div>
            </div>
          </div>

          {/* Backend Metrics Grid */}
          <div>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
              1. Số liệu khách quan (Backend tính toán)
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4 shadow-xs">
                <div className="text-xs font-semibold text-[var(--color-text-muted)]">Đến hạn trong kỳ</div>
                <div className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">
                  {selectedReport.metrics.dueInPeriodTotal}
                </div>
                <div className="mt-1 text-[11px] text-[var(--color-text-muted)]">công việc</div>
              </div>

              <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4 shadow-xs">
                <div className="text-xs font-semibold text-[var(--color-status-done-fg)]">Nộp bài đúng hạn</div>
                <div className="mt-1 text-2xl font-bold text-[var(--color-status-done-fg)]">
                  {selectedReport.metrics.submittedOnTimeTotal}
                </div>
                <div className="mt-1 text-[11px] text-[var(--color-text-muted)]">lần nộp đầu tiên ≤ hạn</div>
              </div>

              <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4 shadow-xs">
                <div className="text-xs font-semibold text-[var(--color-primary)]">Nghiệm thu đúng hạn</div>
                <div className="mt-1 text-2xl font-bold text-[var(--color-primary)]">
                  {selectedReport.metrics.acceptedOnTimeTotal}
                </div>
                <div className="mt-1 text-[11px] text-[var(--color-text-muted)]">đã hoàn thành ≤ hạn</div>
              </div>

              <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4 shadow-xs">
                <div className="text-xs font-semibold text-[var(--color-overdue)]">Đang quá hạn</div>
                <div className="mt-1 text-2xl font-bold text-[var(--color-overdue)]">
                  {selectedReport.metrics.overdueOpenTotal}
                </div>
                <div className="mt-1 text-[11px] text-[var(--color-text-muted)]">tại mốc snapshot asOf</div>
              </div>
            </div>
          </div>

          {/* AI Summary with Sources */}
          <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-6 shadow-xs">
            <div className="mb-4 flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-3">
              <h2 className="text-base font-bold text-[var(--color-text-primary)]">
                2. Nhận định tổng quan từ Coordinator AI
              </h2>
              <span className="text-xs text-[var(--color-text-muted)]">
                Mỗi nhận định bắt buộc kèm nguồn dẫn chứng minh bạch
              </span>
            </div>

            <div className="space-y-4">
              {selectedReport.summary.map((item, idx) => (
                <div key={idx} className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] p-4">
                  <p className="text-sm font-medium leading-relaxed text-[var(--color-text-primary)]">
                    {item.text}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-[var(--color-text-muted)]">Nguồn dẫn chứng:</span>
                    {item.sourceRefs.map((ref, rIdx) => (
                      <button
                        key={rIdx}
                        type="button"
                        onClick={() => setActiveSourceRef(ref)}
                        className="inline-flex items-center gap-1 rounded-full border border-[var(--color-primary)] bg-[var(--color-surface)] px-2.5 py-0.5 text-xs font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary-soft)]"
                      >
                        🔗 {ref.entity} #{ref.id}
                      </button>
                    ))}
                    {item.metricKeys.map((k, kIdx) => (
                      <span
                        key={kIdx}
                        className="inline-flex items-center rounded-full bg-[var(--color-surface)] px-2 py-0.5 text-[11px] font-mono text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)]"
                      >
                        📊 {k}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>


        </div>
      )}
        </>
      )}

      {/* Drawer xem chi tiết nguồn dẫn chứng */}
      <ReportSourcesDrawer
        reportId={selectedReport?.id ?? ""}
        sourceRef={activeSourceRef}
        onClose={() => setActiveSourceRef(null)}
      />

      {/* Modal Tạo Báo Cáo */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleCreateReport}
            className="w-full max-w-md rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-6 shadow-xl animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-3">
              <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                Tạo báo cáo tuần mới
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              >
                ✕
              </button>
            </div>

            <div className="my-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--color-text-secondary)]">
                  Ngày bắt đầu kỳ (periodStart)
                </label>
                <input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className="w-full rounded-md border border-[var(--color-control-border)] p-2 text-xs focus:border-[var(--color-primary)] focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--color-text-secondary)]">
                  Ngày kết thúc kỳ (periodEnd)
                </label>
                <input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  className="w-full rounded-md border border-[var(--color-control-border)] p-2 text-xs focus:border-[var(--color-primary)] focus:outline-hidden"
                  required
                />
              </div>

              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                Khi bấm tạo, hệ thống sẽ khóa mốc asOf tại thời điểm này, chụp toàn bộ dữ liệu nguồn, tính toán 100% metrics và gọi Coordinator AI tóm tắt.
              </p>
            </div>

            <div className="flex justify-end gap-2 border-t border-[var(--color-border-subtle)] pt-3">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                disabled={isGenerating}
                className="rounded-md border border-[var(--color-border-subtle)] px-4 py-2 text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)]"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isGenerating}
                className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-[var(--color-on-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
              >
                {isGenerating ? "Đang tổng hợp báo cáo..." : "Tạo báo cáo ngay"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

