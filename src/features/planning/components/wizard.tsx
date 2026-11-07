"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import {
  projectSchema,
  projectMemberSchema,
  planSchema,
  type User,
  type CreateProjectResult,
} from "@/contracts";
import { apiFetch } from "@/lib/api-client";
import { apiRoutes, routes } from "@/lib/routes";
import { Alert, Button, Stepper } from "@/components/ui/primitives";
import { useUnsavedChanges } from "./use-unsaved-changes";

const api = apiRoutes.planning;

export function ProjectWizard({
  users,
  actorId,
}: {
  users: User[];
  actorId: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [outputs, setOutputs] = useState("");
  const [date, setDate] = useState("");
  const [members, setMembers] = useState(
    users.map((u) => ({
      userId: u.id,
      selected: true,
      skills: u.id === actorId ? "Quản lý dự án, Điều phối" : "Lập trình, Kiểm thử",
      hours: 15,
    }))
  );
  const [created, setCreated] = useState<CreateProjectResult | null>(null);

  const deliverables = outputs
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  useUnsavedChanges(Boolean(name) && !created && !busy);

  function next() {
    setError("");
    if (step === 1) {
      if (!name.trim() || !goal.trim() || !deliverables.length || !date) {
        setError("Vui lòng điền đầy đủ tên dự án, mục tiêu, ít nhất một đầu ra và hạn hoàn thành.");
        return;
      }
      const parsedDate = new Date(date + "T23:59:59+07:00");
      if (isNaN(parsedDate.getTime())) {
        setError("Định dạng hạn dự án không hợp lệ.");
        return;
      }
    }
    if (step === 2) {
      const selectedMembers = members.filter((m) => m.selected);
      if (selectedMembers.length === 0) {
        setError("Dự án phải có ít nhất 1 thành viên tham gia.");
        return;
      }
      if (
        selectedMembers.some(
          (m) => !m.skills.trim() || m.hours <= 0 || m.hours > 168
        )
      ) {
        setError(
          "Vui lòng bổ sung kỹ năng và giờ khả dụng hợp lệ (từ 0.5 đến 168 giờ/tuần) cho tất cả thành viên được chọn."
        );
        return;
      }
    }
    setStep(step + 1);
  }

  async function generate() {
    setBusy(true);
    setError("");
    try {
      let saved = created;
      if (!saved) {
        saved = (
          await apiFetch(
            api.projects,
            z.object({ project: projectSchema, member: projectMemberSchema }),
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: name.trim(),
                goal: goal.trim(),
                deliverables,
                deadline: new Date(date + "T23:59:59+07:00").toISOString(),
                timeZone: "Asia/Ho_Chi_Minh",
              }),
            }
          )
        ).data;
        setCreated(saved);
      }

      const prior = (
        await apiFetch(api.plan(saved.project.id), planSchema.nullable())
      ).data;
      if (prior) {
        router.push(routes.plan(saved.project.id));
        return;
      }

      const d = (
        await apiFetch(
          api.project(saved.project.id),
          z.object({
            project: projectSchema,
            members: z.array(projectMemberSchema),
          })
        )
      ).data;

      for (const m of members.filter((m) => m.selected)) {
        const existing = d.members.find((e) => e.userId === m.userId);
        await apiFetch(
          existing
            ? api.member(saved.project.id, existing.id)
            : api.members(saved.project.id),
          projectMemberSchema,
          {
            method: existing ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...(existing ? {} : { userId: m.userId }),
              skills: m.skills
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
              availableHoursPerWeek: m.hours,
              canAccept: m.userId === actorId,
            }),
          }
        );
      }

      await apiFetch(api.plan(saved.project.id), planSchema, {
        method: "POST",
      });
      router.push(routes.plan(saved.project.id));
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Không thể tạo kế hoạch nháp. Vui lòng thử lại."
      );
    } finally {
      setBusy(false);
    }
  }

  const selectedCount = members.filter((m) => m.selected).length;
  const totalHours = members
    .filter((m) => m.selected)
    .reduce((acc, m) => acc + (m.hours || 0), 0);

  return (
    <main className="tf-page">
      <Link href="/app" style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", textDecoration: "none" }}>
        ← Quay lại danh sách dự án
      </Link>

      <div style={{ margin: "16px 0 24px" }}>
        <p className="tf-eyebrow" style={{ margin: "0 0 6px" }}>KHỞI ĐẦU DỰ ÁN MỚI</p>
        <h1 style={{ margin: 0 }}>Tạo dự án & Lập kế hoạch</h1>
        <p style={{ color: "var(--color-text-secondary)", margin: "6px 0 0" }}>
          Cung cấp mục tiêu và năng lực nhóm để Planner AI đề xuất bản nháp công việc tối ưu.
        </p>
      </div>

      <Stepper
        step={step}
        labels={["1. Mục tiêu dự án", "2. Thiết lập nhóm", "3. Xác nhận & Tạo nháp"]}
      />

      {error && (
        <Alert>
          {error}{" "}
          {created && (
            <Link href={routes.plan(created.project.id)} style={{ fontWeight: 600, textDecoration: "underline" }}>
              Mở dự án đã lưu
            </Link>
          )}
        </Alert>
      )}

      <form
        className="tf-card"
        onSubmit={(e) => {
          e.preventDefault();
          if (step < 3) next();
          else void generate();
        }}
        style={{ padding: "32px", borderRadius: "16px", marginTop: "20px" }}
      >
        {/* STEP 1: MỤC TIÊU DỰ ÁN */}
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ borderBottom: "1px solid var(--color-border-subtle)", paddingBottom: "12px" }}>
              <h2 style={{ fontSize: "1.25rem", margin: "0 0 4px" }}>Bước 1: Mục tiêu và Phạm vi dự án</h2>
              <p style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
                Xác định rõ những gì nhóm cam kết đạt được để làm căn cứ chia nhỏ công việc.
              </p>
            </div>

            <label>
              <span>Tên dự án <strong style={{ color: "var(--color-destructive)" }}>*</strong></span>
              <input
                required
                maxLength={200}
                placeholder="Ví dụ: Website đăng ký sự kiện DevDay Da Nang"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={busy}
              />
            </label>

            <label>
              <span>Mục tiêu chính của dự án <strong style={{ color: "var(--color-destructive)" }}>*</strong></span>
              <textarea
                required
                maxLength={4000}
                rows={3}
                placeholder="Mô tả cụ thể kết quả dự án cần mang lại cho người dùng hoặc khách hàng..."
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                disabled={busy}
              />
            </label>

            <label>
              <span>Các đầu ra mong muốn (Deliverables) <strong style={{ color: "var(--color-destructive)" }}>*</strong></span>
              <small style={{ color: "var(--color-text-muted)", marginBottom: "4px" }}>
                Nhập mỗi đầu ra trên một dòng riêng biệt.
              </small>
              <textarea
                required
                rows={4}
                placeholder="Giao diện trang chủ và form đăng ký&#10;API sinh mã QR vé và gửi email tự động&#10;Ứng dụng quét mã QR check-in tại quầy"
                value={outputs}
                onChange={(e) => setOutputs(e.target.value)}
                disabled={busy}
              />
            </label>

            <label>
              <span>Thời hạn chót dự án (Giờ Việt Nam) <strong style={{ color: "var(--color-destructive)" }}>*</strong></span>
              <input
                required
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={busy}
              />
            </label>
          </div>
        )}

        {/* STEP 2: THÀNH VIÊN VÀ NĂNG LỰC */}
        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ borderBottom: "1px solid var(--color-border-subtle)", paddingBottom: "12px" }}>
              <h2 style={{ fontSize: "1.25rem", margin: "0 0 4px" }}>Bước 2: Phân công nhân sự & Năng lực</h2>
              <p style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
                Planner AI sẽ dùng kỹ năng và số giờ khả dụng để cân đối khối lượng công việc phù hợp.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {members.map((m, i) => {
                const userObj = users.find((u) => u.id === m.userId);
                const isLeader = m.userId === actorId;

                return (
                  <fieldset
                    key={m.userId}
                    style={{
                      border: "1px solid var(--color-border-subtle)",
                      borderRadius: "10px",
                      padding: "16px 20px",
                      background: m.selected ? "var(--color-surface)" : "var(--color-surface-subtle)",
                      transition: "background 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: m.selected ? "12px" : 0 }}>
                      <label className="tf-check" style={{ margin: 0, cursor: isLeader ? "default" : "pointer" }}>
                        <input
                          type="checkbox"
                          disabled={isLeader}
                          checked={m.selected}
                          onChange={(e) =>
                            setMembers((ms) =>
                              ms.map((v, n) => (n === i ? { ...v, selected: e.target.checked } : v))
                            )
                          }
                        />
                        <strong style={{ fontSize: "0.9375rem" }}>
                          {userObj?.displayName ?? m.userId}
                        </strong>
                        {isLeader && (
                          <span className="tf-badge" style={{ fontSize: "0.6875rem" }}>
                            Trưởng nhóm (Bạn)
                          </span>
                        )}
                      </label>
                    </div>

                    {m.selected && (
                      <div className="tf-two" style={{ marginTop: "12px" }}>
                        <label style={{ margin: 0 }}>
                          <span style={{ fontSize: "0.8125rem" }}>Kỹ năng chuyên môn (cách nhau dấu phẩy):</span>
                          <input
                            required
                            placeholder="Ví dụ: React, TypeScript, UI/UX"
                            value={m.skills}
                            onChange={(e) =>
                              setMembers((ms) =>
                                ms.map((v, n) => (n === i ? { ...v, skills: e.target.value } : v))
                              )
                            }
                            disabled={busy}
                          />
                        </label>
                        <label style={{ margin: 0 }}>
                          <span style={{ fontSize: "0.8125rem" }}>Giờ khả dụng / tuần:</span>
                          <input
                            required
                            type="number"
                            min="0.5"
                            max="168"
                            step="0.5"
                            value={m.hours}
                            onChange={(e) =>
                              setMembers((ms) =>
                                ms.map((v, n) => (n === i ? { ...v, hours: Number(e.target.value) } : v))
                              )
                            }
                            disabled={busy}
                          />
                        </label>
                      </div>
                    )}
                  </fieldset>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 3: XÁC NHẬN THÔNG TIN */}
        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div style={{ borderBottom: "1px solid var(--color-border-subtle)", paddingBottom: "12px" }}>
              <h2 style={{ fontSize: "1.25rem", margin: "0 0 4px" }}>Bước 3: Kiểm tra và Khởi tạo bản nháp</h2>
              <p style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
                Vui lòng kiểm tra lại thông tin. Sau khi bấm &ldquo;Tạo kế hoạch nháp&rdquo;, Planner AI sẽ phân rã công việc.
              </p>
            </div>

            {/* Project Info Card */}
            <div style={{ background: "var(--color-surface-subtle)", borderRadius: "10px", padding: "16px 20px", border: "1px solid var(--color-border-subtle)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <strong style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", textTransform: "uppercase" }}>
                  Mục tiêu dự án
                </strong>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  style={{ background: "transparent", border: "none", color: "var(--color-primary)", fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer" }}
                >
                  ✎ Chỉnh sửa
                </button>
              </div>

              <h3 style={{ margin: "0 0 8px", fontSize: "1.125rem", color: "var(--color-text-primary)" }}>
                {name}
              </h3>
              <p style={{ margin: "0 0 12px", fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
                {goal}
              </p>

              <div style={{ fontSize: "0.8125rem", color: "var(--color-text-primary)", marginBottom: "8px" }}>
                <strong>Đầu ra dự kiến ({deliverables.length}):</strong>
                <ul style={{ margin: "4px 0 0", paddingLeft: "20px", color: "var(--color-text-secondary)" }}>
                  {deliverables.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>

              <div style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
                Thời hạn hoàn thành: <strong>{date}</strong> (Asia/Ho_Chi_Minh)
              </div>
            </div>

            {/* Team Info Card */}
            <div style={{ background: "var(--color-surface-subtle)", borderRadius: "10px", padding: "16px 20px", border: "1px solid var(--color-border-subtle)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <strong style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", textTransform: "uppercase" }}>
                  Đội ngũ tham gia ({selectedCount} thành viên · Tổng {totalHours} giờ/tuần)
                </strong>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  style={{ background: "transparent", border: "none", color: "var(--color-primary)", fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer" }}
                >
                  ✎ Chỉnh sửa
                </button>
              </div>

              <div style={{ display: "grid", gap: "8px", marginTop: "10px" }}>
                {members
                  .filter((m) => m.selected)
                  .map((m) => {
                    const u = users.find((user) => user.id === m.userId);
                    return (
                      <div
                        key={m.userId}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          background: "var(--color-surface)",
                          padding: "8px 14px",
                          borderRadius: "6px",
                          fontSize: "0.8125rem",
                          border: "1px solid var(--color-border-subtle)",
                        }}
                      >
                        <div>
                          <strong>{u?.displayName ?? m.userId}</strong>
                          <span style={{ color: "var(--color-text-muted)", marginLeft: "8px" }}>
                            {m.skills}
                          </span>
                        </div>
                        <span style={{ fontWeight: 600, color: "var(--color-primary)" }}>
                          {m.hours}h/tuần
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Human in the loop reassurance banner */}
            <div
              style={{
                background: "var(--color-primary-soft)",
                border: "1px solid #CCFBF1",
                borderRadius: "8px",
                padding: "12px 16px",
                fontSize: "0.8125rem",
                color: "var(--color-primary)",
              }}
            >
              🔒 <strong>Quyền kiểm soát của Trưởng nhóm:</strong> Planner AI chỉ đề xuất bản nháp. Bạn sẽ trực tiếp kiểm tra, điều chỉnh và duyệt kế hoạch trước khi bất kỳ công việc nào được công bố.
            </div>
          </div>
        )}

        {/* ACTIONS */}
        <div className="tf-actions" style={{ marginTop: "28px", borderTop: "1px solid var(--color-border-subtle)", paddingTop: "20px" }}>
          {step > 1 && (
            <Button
              className="secondary"
              type="button"
              disabled={busy}
              onClick={() => setStep(step - 1)}
            >
              ← Quay lại bước trước
            </Button>
          )}

          <Button disabled={busy} type="submit">
            {busy ? (
              <span>Đang phân tích thông tin & tạo nháp…</span>
            ) : step < 3 ? (
              "Tiếp tục bước tiếp theo →"
            ) : (
              "Tạo kế hoạch nháp cùng Planner AI"
            )}
          </Button>
        </div>

        {busy && (
          <p role="status" style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginTop: "12px" }}>
            Trợ lý Planner đang đọc thông tin dự án và phân rã công việc. Quá trình này có thể mất 3–5 giây…
          </p>
        )}
      </form>
    </main>
  );
}
