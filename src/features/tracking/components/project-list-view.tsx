"use client";

import { useState } from "react";
import Link from "next/link";
import { routes } from "@/lib/routes";
import { formatTime } from "../model";
import styles from "./tracking.module.css";

export interface ProjectItem {
  project: {
    id: string;
    name: string;
    goal: string;
    deliverables: string[];
    deadline: string;
    timeZone: string;
    createdAt: string;
  };
  member: {
    id: string;
    projectId: string;
    userId: string;
    role: "leader" | "member" | "mentor";
    canAccept: boolean;
  };
  planStatus: "draft" | "published" | null;
  taskTotal: number;
  doneTotal: number;
  myTaskTotal?: number;
  myDoneTotal?: number;
}

interface ProjectListViewProps {
  projects: ProjectItem[];
  userName?: string;
}

export function ProjectListView({ projects, userName }: ProjectListViewProps) {
  const [filter, setFilter] = useState<"all" | "leader" | "member" | "mentor">("all");
  const [search, setSearch] = useState("");

  const leaderCount = projects.filter((p) => p.member.role === "leader").length;
  const memberCount = projects.filter((p) => p.member.role === "member").length;
  const mentorCount = projects.filter((p) => p.member.role === "mentor").length;

  const filtered = projects.filter((p) => {
    if (filter === "leader" && p.member.role !== "leader") return false;
    if (filter === "member" && p.member.role !== "member") return false;
    if (filter === "mentor" && p.member.role !== "mentor") return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return p.project.name.toLowerCase().includes(q) || p.project.goal.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* Thẻ tóm tắt vai trò người dùng */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          background: "var(--color-surface)",
          border: "1px solid var(--color-border-subtle)",
          borderRadius: 12,
          padding: "16px 20px",
        }}
      >
        <div>
          <span style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Tài khoản hiện tại
          </span>
          <h2 style={{ margin: "2px 0 0", fontSize: "1.25rem", color: "var(--color-text-primary)" }}>
            👤 {userName ?? "Thành viên TeamFlow"}
          </h2>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div
            style={{
              padding: "8px 14px",
              background: "var(--color-primary-soft, #f0fdfa)",
              border: "1px solid var(--color-primary, #0f766e)",
              borderRadius: 8,
              fontSize: "0.875rem",
              color: "var(--color-primary, #0f766e)",
              fontWeight: 600,
            }}
          >
            👑 {leaderCount} nhóm làm Trưởng nhóm
          </div>
          <div
            style={{
              padding: "8px 14px",
              background: "var(--color-surface-subtle, #f1f5f9)",
              border: "1px solid var(--color-border-subtle)",
              borderRadius: 8,
              fontSize: "0.875rem",
              color: "var(--color-text-secondary)",
              fontWeight: 600,
            }}
          >
            👥 {memberCount} nhóm làm Thành viên
          </div>
          {mentorCount > 0 && (
            <div
              style={{
                padding: "8px 14px",
                background: "#faf5ff",
                border: "1px solid #d8b4fe",
                borderRadius: 8,
                fontSize: "0.875rem",
                color: "#7e22ce",
                fontWeight: 600,
              }}
            >
              🎓 {mentorCount} nhóm làm Mentor
            </div>
          )}
        </div>
      </div>

      {/* Thanh lọc tab và tìm kiếm */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          borderBottom: "1px solid var(--color-border-subtle)",
          paddingBottom: 8,
        }}
      >
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setFilter("all")}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid",
              borderColor: filter === "all" ? "var(--color-primary)" : "var(--color-border-subtle)",
              background: filter === "all" ? "var(--color-primary-soft)" : "var(--color-surface)",
              color: filter === "all" ? "var(--color-primary)" : "var(--color-text-secondary)",
              fontWeight: filter === "all" ? 600 : 500,
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            Tất cả ({projects.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("leader")}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid",
              borderColor: filter === "leader" ? "var(--color-primary)" : "var(--color-border-subtle)",
              background: filter === "leader" ? "var(--color-primary-soft)" : "var(--color-surface)",
              color: filter === "leader" ? "var(--color-primary)" : "var(--color-text-secondary)",
              fontWeight: filter === "leader" ? 600 : 500,
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            👑 Nhóm tôi quản lý ({leaderCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("member")}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid",
              borderColor: filter === "member" ? "var(--color-primary)" : "var(--color-border-subtle)",
              background: filter === "member" ? "var(--color-primary-soft)" : "var(--color-surface)",
              color: filter === "member" ? "var(--color-primary)" : "var(--color-text-secondary)",
              fontWeight: filter === "member" ? 600 : 500,
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            👥 Nhóm tôi tham gia ({memberCount})
          </button>
          {mentorCount > 0 && (
            <button
              type="button"
              onClick={() => setFilter("mentor")}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "1px solid",
                borderColor: filter === "mentor" ? "#7e22ce" : "var(--color-border-subtle)",
                background: filter === "mentor" ? "#faf5ff" : "var(--color-surface)",
                color: filter === "mentor" ? "#7e22ce" : "var(--color-text-secondary)",
                fontWeight: filter === "mentor" ? 600 : 500,
                cursor: "pointer",
                fontSize: "0.875rem",
              }}
            >
              🎓 Mentor ({mentorCount})
            </button>
          )}
        </div>

        <input
          type="search"
          placeholder="Tìm theo tên dự án hoặc mục tiêu..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            border: "1px solid var(--color-border-subtle)",
            background: "var(--color-surface)",
            fontSize: "0.875rem",
            minWidth: 260,
          }}
        />
      </div>

      {/* Danh sách thẻ dự án */}
      {filtered.length === 0 ? (
        <div className={styles.empty} style={{ padding: "40px 20px", textAlign: "center" }}>
          <h3>Không tìm thấy dự án nào trong mục này</h3>
          <p style={{ color: "var(--color-text-secondary)" }}>
            {filter === "leader"
              ? "Bạn chưa tạo nhóm nào làm Trưởng nhóm. Hãy bấm 'Tạo dự án mới' ở trên để khởi tạo nhóm của bạn!"
              : filter === "member"
              ? "Bạn chưa được thêm vào nhóm nào khác dưới vai trò Thành viên."
              : "Thử tìm kiếm với từ khóa khác."}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {filtered.map(({ project, member, planStatus, taskTotal, doneTotal, myTaskTotal, myDoneTotal }) => {
            const isLeader = member.role === "leader";
            const isMentor = member.role === "mentor";
            const isDraft = planStatus === "draft";
            const mainHref = isMentor
              ? `/app/projects/${project.id}/supervision`
              : isDraft && isLeader
              ? routes.plan(project.id)
              : routes.tasks(project.id);

            return (
              <article
                key={project.id}
                style={{
                  background: "var(--color-surface)",
                  border: isLeader
                    ? "1px solid rgba(15, 118, 110, 0.35)"
                    : "1px solid var(--color-border-subtle)",
                  borderRadius: 12,
                  padding: 24,
                  boxShadow: isLeader ? "0 1px 3px rgba(15, 118, 110, 0.08)" : undefined,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                  <div style={{ flex: "1 1 300px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                      {/* Badge vai trò của tôi trong dự án */}
                      {isLeader ? (
                        <span
                          style={{
                            background: "var(--color-primary-soft, #f0fdfa)",
                            color: "var(--color-primary, #0f766e)",
                            border: "1px solid var(--color-primary, #0f766e)",
                            borderRadius: 6,
                            padding: "3px 8px",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            letterSpacing: "0.02em",
                          }}
                        >
                          👑 BẠN LÀ TRƯỞNG NHÓM
                        </span>
                      ) : isMentor ? (
                        <span
                          style={{
                            background: "#faf5ff",
                            color: "#7e22ce",
                            border: "1px solid #d8b4fe",
                            borderRadius: 6,
                            padding: "3px 8px",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                          }}
                        >
                          🎓 BẠN LÀ MENTOR
                        </span>
                      ) : (
                        <span
                          style={{
                            background: "var(--color-surface-subtle, #f1f5f9)",
                            color: "var(--color-text-secondary, #475569)",
                            border: "1px solid var(--color-border-subtle)",
                            borderRadius: 6,
                            padding: "3px 8px",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                          }}
                        >
                          👤 BẠN LÀ THÀNH VIÊN
                        </span>
                      )}

                      {/* Trạng thái kế hoạch */}
                      <span
                        style={{
                          background: isDraft ? "#fffbeb" : "#f0fdf4",
                          color: isDraft ? "#b45309" : "#15803d",
                          borderRadius: 6,
                          padding: "3px 8px",
                          fontSize: "0.75rem",
                          fontWeight: 500,
                        }}
                      >
                        {isDraft ? "⏳ Bản nháp kế hoạch" : "🚀 Đã công bố"}
                      </span>
                    </div>

                    <h3 style={{ margin: "4px 0 8px", fontSize: "1.25rem" }}>
                      <Link
                        href={mainHref}
                        style={{ color: "var(--color-text-primary)", textDecoration: "none", fontWeight: 600 }}
                      >
                        {project.name}
                      </Link>
                    </h3>
                    <p style={{ color: "var(--color-text-secondary)", margin: 0, fontSize: "0.9375rem", lineHeight: 1.5 }}>
                      {project.goal}
                    </p>
                  </div>

                  {/* Nút hành động chính */}
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <Link href={mainHref} className="tf-button" style={{ minWidth: 120, textAlign: "center" }}>
                      {isMentor
                        ? "Xem giám sát →"
                        : isDraft && isLeader
                        ? "Duyệt kế hoạch →"
                        : isLeader
                        ? "Quản lý nhóm →"
                        : "Vào công việc →"}
                    </Link>
                  </div>
                </div>

                {/* Thanh tiến độ và thông tin phụ */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 12,
                    marginTop: 18,
                    paddingTop: 14,
                    borderTop: "1px solid var(--color-border-subtle)",
                    fontSize: "0.875rem",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
                    <span>
                      📅 Hạn chót: <strong>{formatTime(project.deadline, project.timeZone)}</strong>
                    </span>
                    <span>
                      📊 Tiến độ nhóm: <strong>{doneTotal} / {taskTotal}</strong> công việc hoàn thành
                    </span>
                    {!isLeader && !isMentor && myTaskTotal !== undefined && myTaskTotal > 0 && (
                      <span style={{ color: "var(--color-primary, #0f766e)", fontWeight: 600 }}>
                        🎯 Việc của bạn: {myDoneTotal ?? 0} / {myTaskTotal} xong
                      </span>
                    )}
                  </div>

                  {/* Links điều hướng nhanh */}
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    {!isMentor && (
                      <Link
                        href={routes.chat(project.id)}
                        style={{ color: "var(--color-primary)", textDecoration: "none", fontSize: "0.8125rem", fontWeight: 500 }}
                      >
                        💬 Chat nhóm
                      </Link>
                    )}
                    {isLeader && !isDraft && (
                      <Link
                        href={routes.reports(project.id)}
                        style={{ color: "var(--color-primary)", textDecoration: "none", fontSize: "0.8125rem", fontWeight: 500 }}
                      >
                        📋 Báo cáo tuần
                      </Link>
                    )}
                    <Link
                      href={`/app/projects/${project.id}/supervision`}
                      style={{ color: "var(--color-text-secondary)", textDecoration: "none", fontSize: "0.8125rem" }}
                    >
                      🔭 Timeline & Giám sát
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
