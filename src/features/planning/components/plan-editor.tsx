"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import {
  planSchema,
  taskSchema,
  type Plan,
  type ProjectDetails,
  type User,
  type DraftTask,
} from "@/contracts";
import { apiFetch } from "@/lib/api-client";
import { apiRoutes, routes } from "@/lib/routes";
import { Alert, Button } from "@/components/ui/primitives";
import { draftProblems } from "../validation";
import { useUnsavedChanges } from "./use-unsaved-changes";

const api = apiRoutes.planning;

export function PlanEditor({
  details,
  initialPlan,
  users,
  leader,
}: {
  details: ProjectDetails;
  initialPlan: Plan | null;
  users: User[];
  leader: boolean;
}) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const publishKey = useRef("");

  const [plan, setPlan] = useState(initialPlan);
  const [draft, setDraft] = useState(initialPlan?.draftTasks ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const dirty = JSON.stringify(draft) !== JSON.stringify(plan?.draftTasks ?? []);
  const problems = draftProblems(draft, details.project, details.members);
  const editable = leader && plan?.status === "draft";

  useUnsavedChanges(dirty && !busy);

  const memberName = (id: string) => {
    const m = details.members.find((item) => item.id === id);
    return users.find((u) => u.id === m?.userId)?.displayName ?? id;
  };

  function change(id: string, p: Partial<DraftTask>) {
    setDraft((ds) => ds.map((t) => (t.id === id ? { ...t, ...p } : t)));
    setNotice("");
  }

  async function action(kind: "generate" | "save" | "publish") {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (details.project.id === "demo-event-website") {
        if (kind === "save") {
          setNotice("Đã lưu thành công bản nháp kế hoạch (Chế độ minh họa).");
        }
        if (kind === "publish") {
          router.push(routes.tasks(details.project.id));
        }
        return;
      }
      if (kind === "generate") {
        const p = (
          await apiFetch(api.plan(details.project.id), planSchema, {
            method: "POST",
          })
        ).data;
        setPlan(p);
        setDraft(p.draftTasks);
      }
      if (kind === "save" && plan) {
        const p = (
          await apiFetch(api.draft(plan.id), planSchema, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              expectedVersion: plan.version,
              draftTasks: draft,
            }),
          })
        ).data;
        setPlan(p);
        setDraft(p.draftTasks);
        publishKey.current = "";
        setNotice("Đã lưu thành công bản nháp kế hoạch.");
      }
      if (kind === "publish" && plan) {
        publishKey.current ||= crypto.randomUUID();
        await apiFetch(
          api.publish(plan.id),
          z.object({ plan: planSchema, tasks: z.array(taskSchema) }),
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Idempotency-Key": publishKey.current,
            },
            body: JSON.stringify({
              expectedVersion: plan.version,
              approved: true,
            }),
          }
        );
        router.push(routes.tasks(details.project.id));
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Thao tác chưa thành công. Vui lòng thử lại."
      );
    } finally {
      setBusy(false);
    }
  }

  async function reload() {
    if (dirty && !window.confirm("Tải bản mới sẽ bỏ các thay đổi chưa lưu. Tiếp tục?"))
      return;
    setBusy(true);
    try {
      const p = (
        await apiFetch(api.plan(details.project.id), planSchema.nullable())
      ).data;
      setPlan(p);
      setDraft(p?.draftTasks ?? []);
      publishKey.current = "";
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chưa tải được dữ liệu.");
    } finally {
      setBusy(false);
    }
  }

  const assignedMemberIds = new Set(draft.map((t) => t.assigneeMemberId));

  return (
    <main className="tf-page">
      <Link href="/app" style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", textDecoration: "none" }}>
        ← Quay lại danh sách dự án
      </Link>

      <div className="tf-row" style={{ margin: "16px 0 8px" }}>
        <div>
          <p className="tf-eyebrow" style={{ margin: "0 0 4px" }}>KẾ HOẠCH DỰ ÁN</p>
          <h1 style={{ margin: 0 }}>{details.project.name}</h1>
        </div>
        {plan && (
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                padding: "4px 10px",
                borderRadius: "6px",
                background: plan.status === "draft" ? "#FEF3C7" : "var(--color-status-done-bg)",
                color: plan.status === "draft" ? "#92400E" : "var(--color-status-done-fg)",
              }}
            >
              {plan.status === "draft" ? "Bản nháp — Chỉ trưởng nhóm xem" : "Đã công bố"}
            </span>
            <span
              style={{
                fontSize: "0.75rem",
                padding: "4px 8px",
                borderRadius: "6px",
                background: "var(--color-surface-subtle)",
                color: "var(--color-text-secondary)",
                border: "1px solid var(--color-border-subtle)",
              }}
            >
              AI Mode: {plan.aiMode === "real" ? "AI thật" : "Mô phỏng"}
            </span>
          </div>
        )}
      </div>

      <nav className="tf-tabs" aria-label="Điều hướng dự án">
        {[
          ["Công việc", routes.tasks],
          ["Kế hoạch", routes.plan],
          ["Chat", routes.chat],
          ["Báo cáo", routes.reports],
        ].map(([label, fn]) => (
          <Link
            key={String(label)}
            href={(fn as typeof routes.plan)(details.project.id)}
            aria-current={label === "Kế hoạch" ? "page" : undefined}
          >
            {String(label)}
          </Link>
        ))}
      </nav>

      <div
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border-subtle)",
          borderRadius: "10px",
          padding: "16px 20px",
          marginBottom: "20px",
        }}
      >
        <p style={{ margin: "0 0 8px", fontSize: "0.9375rem" }}>
          <strong>Mục tiêu:</strong> {details.project.goal}
        </p>
        <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>
          Thời hạn hoàn thành: <strong>{new Date(details.project.deadline).toLocaleString("vi-VN", { timeZone: details.project.timeZone })}</strong> ({details.project.timeZone})
        </p>
      </div>

      {error && (
        <Alert>
          {error}{" "}
          <Button className="secondary" disabled={busy} onClick={() => void reload()}>
            Tải lại bản mới nhất
          </Button>
        </Alert>
      )}

      {notice && (
        <div
          role="status"
          style={{
            background: "var(--color-status-done-bg)",
            color: "var(--color-status-done-fg)",
            padding: "10px 16px",
            borderRadius: "8px",
            fontSize: "0.875rem",
            marginBottom: "16px",
            fontWeight: 500,
          }}
        >
          ✓ {notice}
        </div>
      )}

      {!plan ? (
        <section className="tf-card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <span style={{ fontSize: "2.5rem", display: "block", marginBottom: "8px" }}>📝</span>
          <h2 style={{ margin: "0 0 8px", fontSize: "1.25rem" }}>Chưa có kế hoạch cho dự án này</h2>
          <p style={{ color: "var(--color-text-secondary)", maxWidth: "480px", margin: "0 auto 20px", fontSize: "0.875rem" }}>
            Khởi tạo bản nháp đầu tiên bằng cách để Planner AI phân tích mục tiêu và phân công công việc.
          </p>
          {leader && (
            <Button disabled={busy} onClick={() => void action("generate")}>
              {busy ? "Đang tạo bản nháp…" : "Tạo kế hoạch nháp cùng Planner AI"}
            </Button>
          )}
        </section>
      ) : (
        <>
          <div className="tf-row" style={{ marginBottom: "16px" }}>
            <h2 style={{ fontSize: "1.25rem", margin: 0 }}>
              {draft.length} công việc {editable ? "đề xuất" : "đã công bố"}
            </h2>
            <span style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
              Phiên bản {plan.version}
              {dirty ? " · (Có thay đổi chưa lưu)" : ""}
            </span>
          </div>

          <div style={{ display: "grid", gap: "16px", marginBottom: "24px" }}>
            {draft.map((t, i) => (
              <section
                key={t.id}
                className="tf-card"
                style={{
                  padding: "20px 24px",
                  borderRadius: "12px",
                  border: "1px solid var(--color-border-subtle)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <span
                    style={{
                      background: "var(--color-primary-soft)",
                      color: "var(--color-primary)",
                      fontWeight: 700,
                      fontSize: "0.75rem",
                      padding: "3px 8px",
                      borderRadius: "6px",
                    }}
                  >
                    Công việc #{i + 1}
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontFamily: "monospace" }}>
                    ID: {t.id}
                  </span>
                </div>

                <fieldset disabled={!editable || busy} style={{ border: 0, padding: 0, margin: 0, display: "grid", gap: "12px" }}>
                  <label style={{ margin: 0 }}>
                    <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>Tên công việc:</span>
                    <input
                      maxLength={200}
                      value={t.title}
                      onChange={(e) => change(t.id, { title: e.target.value })}
                      style={{ marginTop: "4px" }}
                    />
                  </label>

                  <label style={{ margin: 0 }}>
                    <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>Mô tả chi tiết:</span>
                    <textarea
                      maxLength={4000}
                      rows={2}
                      value={t.description}
                      onChange={(e) => change(t.id, { description: e.target.value })}
                      style={{ marginTop: "4px" }}
                    />
                  </label>

                  <div className="tf-two">
                    <label style={{ margin: 0 }}>
                      <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>Người phụ trách:</span>
                      <select
                        value={t.assigneeMemberId}
                        onChange={(e) => change(t.id, { assigneeMemberId: e.target.value })}
                        style={{ marginTop: "4px" }}
                      >
                        {details.members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {memberName(m.id)} ({m.availableHoursPerWeek}h/tuần)
                          </option>
                        ))}
                      </select>
                    </label>

                    <label style={{ margin: 0 }}>
                      <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>Hạn chót hoàn thành (Giờ VN):</span>
                      <input
                        type="datetime-local"
                        value={new Date(Date.parse(t.deadline) + 7 * 3600000).toISOString().slice(0, 16)}
                        onChange={(e) => {
                          if (e.target.value) {
                            change(t.id, { deadline: new Date(e.target.value + ":00+07:00").toISOString() });
                          }
                        }}
                        style={{ marginTop: "4px" }}
                      />
                    </label>
                  </div>

                  {/* Criteria */}
                  <div style={{ marginTop: "6px" }}>
                    <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                      Tiêu chí nghiệm thu ({t.criteria.length}):
                    </span>
                    <div style={{ display: "grid", gap: "6px", marginTop: "4px" }}>
                      {t.criteria.map((c) => (
                        <div key={c.id} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                          <span style={{ fontSize: "0.6875rem", fontFamily: "monospace", padding: "4px 6px", background: "var(--color-surface-subtle)", borderRadius: "4px", color: "var(--color-text-muted)" }}>
                            {c.id}
                          </span>
                          <textarea
                            rows={1}
                            maxLength={1000}
                            value={c.text}
                            disabled={!editable || busy}
                            onChange={(e) =>
                              change(t.id, {
                                criteria: t.criteria.map((x) =>
                                  x.id === c.id ? { ...x, text: e.target.value } : x
                                ),
                              })
                            }
                            style={{ flex: 1, minHeight: "36px", fontSize: "0.8125rem" }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Dependencies */}
                  {draft.length > 1 && (
                    <div style={{ marginTop: "6px" }}>
                      <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                        Phụ thuộc công việc:
                      </span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "4px" }}>
                        {draft
                          .filter((d) => d.id !== t.id)
                          .map((d) => (
                            <label
                              key={d.id}
                              className="tf-check"
                              style={{
                                fontSize: "0.8125rem",
                                background: "var(--color-surface-subtle)",
                                padding: "4px 10px",
                                borderRadius: "6px",
                                border: "1px solid var(--color-border-subtle)",
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={t.dependencyTaskIds.includes(d.id)}
                                disabled={!editable || busy}
                                onChange={(e) =>
                                  change(t.id, {
                                    dependencyTaskIds: e.target.checked
                                      ? [...t.dependencyTaskIds, d.id]
                                      : t.dependencyTaskIds.filter((id) => id !== d.id),
                                  })
                                }
                              />
                              <span>{d.title}</span>
                            </label>
                          ))}
                      </div>
                    </div>
                  )}
                </fieldset>
              </section>
            ))}
          </div>

          {/* EDITABLE ACTIONS FOR LEADER */}
          {editable && (
            <div
              style={{
                position: "sticky",
                bottom: 16,
                background: "var(--color-surface)",
                border: "1px solid var(--color-border-subtle)",
                borderRadius: "12px",
                padding: "16px 20px",
                boxShadow: "0 4px 16px rgba(15, 23, 42, 0.08)",
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
                zIndex: 40,
              }}
            >
              <div>
                <p style={{ margin: 0, fontSize: "0.875rem", fontWeight: 600 }}>
                  Trưởng nhóm kiểm tra tính khả thi trước khi công bố
                </p>
                <small style={{ color: "var(--color-text-muted)" }}>
                  Giờ khả dụng: {details.members.map((m) => `${memberName(m.id)}: ${m.availableHoursPerWeek}h/tuần`).join(" · ")}
                </small>
                {problems.length > 0 && (
                  <p style={{ color: "var(--color-destructive)", margin: "4px 0 0", fontSize: "0.8125rem" }}>
                    ⚠️ {problems.join(" ")}
                  </p>
                )}
              </div>

              <div className="tf-actions" style={{ margin: 0 }}>
                <Button
                  className="secondary"
                  disabled={busy || !dirty || Boolean(problems.length)}
                  onClick={() => void action("save")}
                >
                  Lưu bản nháp
                </Button>
                <Button
                  disabled={busy || dirty || Boolean(problems.length)}
                  onClick={() => dialog.current?.showModal()}
                >
                  Duyệt và công bố kế hoạch →
                </Button>
              </div>
            </div>
          )}

          {plan.status === "published" && (
            <div style={{ marginTop: "24px" }}>
              <Link className="tf-button" href={routes.tasks(details.project.id)}>
                Chuyển đến Bảng công việc chính thức →
              </Link>
            </div>
          )}
        </>
      )}

      {/* CONFIRMATION DIALOG FOR PUBLISHING */}
      <dialog
        ref={dialog}
        aria-labelledby="publish-title"
        style={{
          borderRadius: "16px",
          border: "1px solid var(--color-border-subtle)",
          padding: "24px",
          maxWidth: "480px",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
        }}
      >
        <h2 id="publish-title" style={{ margin: "0 0 12px", fontSize: "1.25rem", color: "var(--color-text-primary)" }}>
          Xác nhận Duyệt & Công bố Kế hoạch?
        </h2>
        <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", lineHeight: 1.5, margin: "0 0 16px" }}>
          Bạn đang chuẩn bị duyệt chính thức <strong>{draft.length} công việc</strong> và phân công cho <strong>{assignedMemberIds.size} thành viên</strong>.
        </p>
        <div
          style={{
            background: "var(--color-status-blocked-bg)",
            border: "1px solid #FDE68A",
            padding: "10px 14px",
            borderRadius: "8px",
            fontSize: "0.8125rem",
            color: "var(--color-status-blocked-fg)",
            marginBottom: "20px",
          }}
        >
          ⚠️ Sau khi công bố, các công việc sẽ xuất hiện trên Bảng công việc. Bản nháp sẽ được khóa và việc cập nhật tiến độ sẽ đi qua kênh Chat hoặc Nộp bài.
        </div>

        <div className="tf-actions" style={{ justifyContent: "flex-end", margin: 0 }}>
          <Button
            className="secondary"
            autoFocus
            disabled={busy}
            onClick={() => dialog.current?.close()}
          >
            Quay lại kiểm tra
          </Button>
          <Button
            disabled={busy}
            onClick={() => {
              dialog.current?.close();
              void action("publish");
            }}
          >
            {busy ? "Đang công bố…" : "Xác nhận duyệt & công bố ngay"}
          </Button>
        </div>
      </dialog>

      {busy && (
        <p role="status" style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginTop: "12px" }}>
          Đang xử lý yêu cầu, vui lòng chờ…
        </p>
      )}
    </main>
  );
}
