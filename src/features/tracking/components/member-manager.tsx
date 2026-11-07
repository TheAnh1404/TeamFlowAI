"use client";

import { useState } from "react";
import type { WorkspaceData } from "../model";

interface Candidate {
  userId: string;
  displayName: string;
  email: string | null;
}

export function MemberManager({ data, onChanged }: { data: WorkspaceData; onChanged: () => void }) {
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState(false);

  if (data.actor.role !== "leader") return null;

  async function search() {
    setError("");
    setSuccess("");
    setCandidates([]);
    if (query.trim().length < 2) {
      setError("Nhập ít nhất 2 ký tự để tìm tài khoản.");
      return;
    }
    setPending(true);
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(data.project.id)}/members?search=${encodeURIComponent(query.trim())}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? "Không thể tìm tài khoản.");
      setCandidates(result.data ?? []);
      if (!result.data || !result.data.length) setError("Không tìm thấy tài khoản chưa tham gia dự án.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tìm tài khoản.");
    } finally {
      setPending(false);
    }
  }

  async function add(candidate: Candidate) {
    setPending(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(data.project.id)}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: candidate.userId, skills: ["Thực thi"], availableHoursPerWeek: 10, canAccept: false }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? "Không thể thêm thành viên.");
      setCandidates((current) => current.filter((item) => item.userId !== candidate.userId));
      setQuery("");
      setSuccess(`Đã thêm thành viên ${candidate.displayName} vào nhóm thành công.`);
      onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể thêm thành viên.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      aria-labelledby="member-manager-title"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border-subtle)",
        borderRadius: 12,
        padding: 20,
        margin: "16px 0",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 id="member-manager-title" style={{ margin: 0, fontSize: "1.125rem", fontWeight: 600 }}>
          👥 Quản lý thành viên ({data.members.length}/8)
        </h2>
        <span style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>
          Chỉ trưởng nhóm có quyền thêm thành viên
        </span>
      </div>

      <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
        {data.members.map(({ member, user }) => (
          <div
            key={member.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "8px 12px",
              background: "var(--color-surface-subtle, #f8fafc)",
              borderRadius: 8,
              fontSize: "0.875rem",
            }}
          >
            <div>
              <strong>{user.displayName}</strong>
              <span style={{ color: "var(--color-text-secondary)", marginLeft: 8 }}>
                {member.role === "leader" ? "👑 Trưởng nhóm" : "👤 Thành viên"}
                {member.canAccept && member.role !== "leader" ? " · Có quyền nghiệm thu" : ""}
              </span>
            </div>
            {member.skills && member.skills.length > 0 && (
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                {member.skills.join(", ")}
              </span>
            )}
          </div>
        ))}
      </div>

      {data.members.length < 8 ? (
        <>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void search();
            }}
            style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}
          >
            <label style={{ flex: "1 1 240px", fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
              Thêm thành viên mới (tìm theo tên hoặc email):
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                maxLength={100}
                placeholder="Nhập tên tài khoản hoặc email..."
                autoComplete="off"
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: 4,
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: "1px solid var(--color-border-subtle)",
                  fontSize: "0.875rem",
                }}
              />
            </label>
            <button
              type="submit"
              disabled={pending}
              className="tf-button secondary"
              style={{ padding: "8px 16px", minHeight: 38 }}
            >
              {pending ? "Đang tìm..." : "Tìm tài khoản"}
            </button>
          </form>

          {error && (
            <p role="status" style={{ color: "var(--color-destructive, #dc2626)", fontSize: "0.875rem", marginTop: 8 }}>
              {error}
            </p>
          )}

          {success && (
            <p role="status" style={{ color: "var(--color-success, #16a34a)", fontSize: "0.875rem", marginTop: 8 }}>
              {success}
            </p>
          )}

          {candidates.length > 0 && (
            <div style={{ marginTop: 12, borderTop: "1px solid var(--color-border-subtle)", paddingTop: 12 }}>
              <p style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)", marginBottom: 8 }}>
                Kết quả tìm kiếm ({candidates.length}):
              </p>
              <div style={{ display: "grid", gap: 8 }}>
                {candidates.map((candidate) => (
                  <div
                    key={candidate.userId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "8px 12px",
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-border-subtle)",
                      borderRadius: 8,
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: "0.875rem" }}>{candidate.displayName}</strong>
                      {candidate.email && (
                        <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginLeft: 8 }}>
                          ({candidate.email})
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={pending || data.members.length >= 8}
                      className="tf-button"
                      style={{ padding: "6px 12px", fontSize: "0.8125rem" }}
                      onClick={() => void add(candidate)}
                    >
                      ＋ Thêm vào nhóm
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", margin: "8px 0" }}>
          Dự án đã đạt giới hạn tối đa 8 thành viên.
        </p>
      )}
    </section>
  );
}
