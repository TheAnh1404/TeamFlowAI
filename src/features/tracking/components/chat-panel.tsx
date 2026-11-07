"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { progressMessageResultSchema, type Message, type ProgressMessageResult, type Task } from "@/contracts";
import { apiFetch } from "@/lib/api-client";
import { apiRoutes } from "@/lib/routes";
import type { WorkspaceData } from "../model";
import styles from "./chat-messenger.module.css";

const AVATAR_COLORS = [
  "#0D9488", // teal
  "#0284C7", // light blue
  "#4F46E5", // indigo
  "#7C3AED", // violet
  "#DB2777", // pink
  "#EA580C", // orange
  "#16A34A", // green
  "#D97706", // amber
];

function getAvatarColor(idOrName: string) {
  let hash = 0;
  for (let i = 0; i < idOrName.length; i++) {
    hash = (hash << 5) - hash + idOrName.charCodeAt(i);
    hash |= 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (name[0] || "?").toUpperCase();
}

function formatMessageTime(isoString: string, timeZone: string) {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone,
    }).format(new Date(isoString));
  } catch {
    return new Date(isoString).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  }
}

function formatMessageDate(isoString: string, timeZone: string) {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone,
    }).format(new Date(isoString));
  } catch {
    return new Date(isoString).toLocaleDateString("vi-VN");
  }
}

async function mutate(url: string, body: unknown, key: string): Promise<ProgressMessageResult> {
  const result = await apiFetch(url, progressMessageResultSchema, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": key },
    body: JSON.stringify(body),
  });
  return result.data;
}

export function ChatPanel({
  data,
  onOpenTask,
}: {
  data: WorkspaceData;
  onOpenTask: (task: Task, element: HTMLElement) => void;
}) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [taskId, setTaskId] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "clarify" | "has_task">("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const attempt = useRef<{ fingerprint: string; key: string } | null>(null);

  const feedRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const atBottom = useRef(true);
  const [newMessages, setNewMessages] = useState(false);
  const pending = useRef(false);

  // Auto-scroll logic
  useEffect(() => {
    if (atBottom.current) {
      feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
    } else {
      setNewMessages(true);
    }
  }, [data.messages]);

  // Real-time polling: Refresh every 6 seconds if tab is active
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden && !pending.current) {
        router.refresh();
      }
    }, 6000);
    return () => clearInterval(timer);
  }, [router]);

  // Auto-resize textarea as user types
  function handleTextareaInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setContent(e.target.value);
    const target = e.target;
    target.style.height = "auto";
    target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
  }

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (pending.current || !content.trim()) return;

    pending.current = true;
    setBusy(true);
    setError("");

    const body = { content: content.trim(), ...(taskId ? { taskId } : {}) };
    const fingerprint = JSON.stringify(body);
    if (attempt.current?.fingerprint !== fingerprint) {
      attempt.current = { fingerprint, key: crypto.randomUUID() };
    }

    try {
      await mutate(apiRoutes.tracking.messages(data.project.id), body, attempt.current.key);
      setContent("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
      attempt.current = null;
      router.refresh();
      atBottom.current = true;
      setTimeout(() => {
        feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
      }, 50);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể gửi tin nhắn. Hãy thử lại.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Send on Enter (without Shift), but respect IME composition (Telex/VNI)
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
      e.preventDefault();
      void submit();
    }
  }

  function applyPromptSuggestion(template: string) {
    setContent(template);
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = "auto";
    }
  }

  // Filter messages based on header filter mode
  const allMessages = data.messages;
  const filteredMessages = allMessages.filter((msg) => {
    if (filterMode === "clarify") return msg.resolution === "clarification_required";
    if (filterMode === "has_task") return Boolean(msg.taskId);
    return true;
  });

  const selectedTask = data.tasks.find((t) => t.id === taskId);

  return (
    <section className={styles.messengerContainer} aria-label="Khung trò chuyện dự án">
      {/* Messenger Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.projectAvatar} aria-hidden="true">
            {getInitials(data.project.name)}
          </div>
          <div className={styles.headerInfo}>
            <h2 className={styles.headerTitle}>{data.project.name}</h2>
            <div className={styles.headerSubtitle}>
              <span className={styles.onlineDot} aria-hidden="true" />
              <span>{data.members.length} thành viên tham gia · Coordinator hỗ trợ</span>
            </div>
          </div>
        </div>

        <div className={styles.headerActions}>
          <div className={styles.memberAvatars} title="Thành viên trong kênh">
            {data.members.slice(0, 4).map(({ member, user }) => (
              <div
                key={member.id}
                className={styles.stackedAvatar}
                style={{ backgroundColor: getAvatarColor(user.displayName) }}
                title={user.displayName}
              >
                {getInitials(user.displayName)}
              </div>
            ))}
          </div>

          <select
            className={styles.filterSelect}
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value as typeof filterMode)}
            aria-label="Lọc tin nhắn"
          >
            <option value="all">Tất cả tin ({data.messages.length})</option>
            <option value="clarify">Cần làm rõ</option>
            <option value="has_task">Có gắn task</option>
          </select>
        </div>
      </header>

      {/* Message Feed Stream */}
      <div
        className={styles.feed}
        ref={feedRef}
        role="log"
        aria-live="polite"
        aria-label="Lịch sử chat"
        onScroll={(e) => {
          const el = e.currentTarget;
          atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
          if (atBottom.current) setNewMessages(false);
        }}
      >
        {filteredMessages.length === 0 ? (
          <div className={styles.emptyNotice}>
            <span className={styles.emptyIcon} aria-hidden="true">💬</span>
            <p><strong>Chưa có trao đổi nào trong mục này</strong></p>
            <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
              Hãy gửi tin nhắn đầu tiên để cập nhật tiến độ công việc hoặc chia sẻ thông tin với nhóm.
            </p>
          </div>
        ) : (
          filteredMessages.map((message, index) => {
            const isMe = message.authorMemberId === data.actor.id;
            const authorData = data.members.find((m) => m.member.id === message.authorMemberId);
            const authorName = authorData?.user.displayName ?? "Thành viên";
            const linkedTask = data.tasks.find((t) => t.id === message.taskId);

            // Date divider logic
            const prevMsg = filteredMessages[index - 1];
            const isNewDay =
              !prevMsg ||
              new Date(prevMsg.createdAt).toDateString() !== new Date(message.createdAt).toDateString();

            return (
              <div key={message.id}>
                {isNewDay && (
                  <div className={styles.dateDivider}>
                    <span className={styles.dateBadge}>
                      {formatMessageDate(message.createdAt, data.project.timeZone)}
                    </span>
                  </div>
                )}

                <div className={`${styles.msgRow} ${isMe ? styles.outgoing : styles.incoming}`}>
                  {/* Incoming: Left aligned with Avatar */}
                  {!isMe ? (
                    <div className={styles.incomingGroup}>
                      <div
                        className={styles.avatar}
                        style={{ backgroundColor: getAvatarColor(authorName) }}
                        title={authorName}
                      >
                        {getInitials(authorName)}
                      </div>
                      <div className={styles.incomingContent}>
                        <span className={styles.senderName}>{authorName}</span>

                        {linkedTask && (
                          <button
                            type="button"
                            className={styles.taskChipIncoming}
                            onClick={(e) => onOpenTask(linkedTask, e.currentTarget)}
                            title="Xem chi tiết công việc"
                          >
                            <span>🏷️</span>
                            <span>{linkedTask.title}</span>
                          </button>
                        )}

                        <div className={styles.bubbleIncoming}>
                          {message.content}
                        </div>

                        <div className={`${styles.metaRow} ${styles.metaRowIncoming}`}>
                          <time dateTime={message.createdAt}>
                            {formatMessageTime(message.createdAt, data.project.timeZone)}
                          </time>
                        </div>

                        {/* Coordinator AI response for this message */}
                        <CoordinatorStatusCard
                          message={message}
                          linkedTask={linkedTask}
                          data={data}
                          isMe={isMe}
                        />
                      </div>
                    </div>
                  ) : (
                    /* Outgoing: Right aligned */
                    <div className={styles.outgoingGroup}>
                      {linkedTask && (
                        <button
                          type="button"
                          className={styles.taskChipOutgoing}
                          onClick={(e) => onOpenTask(linkedTask, e.currentTarget)}
                          title="Xem chi tiết công việc"
                        >
                          <span>🏷️</span>
                          <span>{linkedTask.title}</span>
                        </button>
                      )}

                      <div className={styles.bubbleOutgoing}>
                        {message.content}
                      </div>

                      <div className={`${styles.metaRow} ${styles.metaRowOutgoing}`}>
                        <time dateTime={message.createdAt}>
                          {formatMessageTime(message.createdAt, data.project.timeZone)}
                        </time>
                        <span>· Đã gửi</span>
                      </div>

                      {/* Coordinator AI response for this message */}
                      <CoordinatorStatusCard
                        message={message}
                        linkedTask={linkedTask}
                        data={data}
                        isMe={isMe}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Pill: Có tin nhắn mới */}
      {newMessages && (
        <button
          type="button"
          className={styles.floatingNewMsg}
          onClick={() => {
            atBottom.current = true;
            feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
            setNewMessages(false);
          }}
        >
          <span>↓ Có tin nhắn mới</span>
        </button>
      )}

      {/* Messenger Composer */}
      <footer className={styles.composerSection}>
        {/* Quick prompt templates */}
        <div className={styles.promptChips} aria-label="Mẫu tin nhắn nhanh">
          <button
            type="button"
            className={styles.chip}
            onClick={() => applyPromptSuggestion("Hôm nay tôi đã hoàn thành: ")}
          >
            ✅ Đã hoàn thành...
          </button>
          <button
            type="button"
            className={styles.chip}
            onClick={() => applyPromptSuggestion("Tôi đang tiến hành làm: ")}
          >
            🚀 Đang tiến hành...
          </button>
          <button
            type="button"
            className={styles.chip}
            onClick={() => applyPromptSuggestion("Đang gặp trở ngại cần hỗ trợ: ")}
          >
            ⚠️ Gặp trở ngại...
          </button>
          <button
            type="button"
            className={styles.chip}
            onClick={() => applyPromptSuggestion("Cần trao đổi thêm về: ")}
          >
            💬 Thảo luận...
          </button>
        </div>

        {/* Task picker bar */}
        <div className={styles.taskPickerBar}>
          <span className={styles.taskPickerLabel}>Gắn với task:</span>
          {selectedTask ? (
            <span className={styles.taskSelectedChip}>
              <span>🏷️ {selectedTask.title}</span>
              <button
                type="button"
                className={styles.clearTaskBtn}
                onClick={() => setTaskId("")}
                title="Bỏ chọn task"
                aria-label="Bỏ chọn task"
              >
                ×
              </button>
            </span>
          ) : (
            <select
              className={styles.taskSelect}
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              disabled={busy}
              aria-label="Chọn công việc liên quan"
            >
              <option value="">Để Coordinator tự nhận diện (tùy chọn)</option>
              {data.tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Text Input Row */}
        <form onSubmit={submit} className={styles.inputRow}>
          <div className={styles.inputPill}>
            <textarea
              ref={textareaRef}
              rows={1}
              maxLength={8000}
              value={content}
              disabled={busy}
              required
              placeholder="Nhập tin nhắn cập nhật tiến độ, trở ngại... (Enter để gửi, Shift+Enter xuống dòng)"
              className={styles.textarea}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyDown}
              aria-label="Nội dung tin nhắn"
            />
          </div>

          <button
            type="submit"
            className={styles.sendBtn}
            disabled={busy || !content.trim()}
            title="Gửi tin nhắn (Enter)"
            aria-label="Gửi tin nhắn"
          >
            {busy ? (
              <span style={{ fontSize: "0.8125rem" }}>•••</span>
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m22 2-7 20-4-9-9-4Z" />
                <path d="M22 2 11 13" />
              </svg>
            )}
          </button>
        </form>

        {error && (
          <div role="alert" className={styles.errorBanner}>
            <span>{error}</span>
            <button
              type="button"
              onClick={() => void submit()}
              style={{
                background: "transparent",
                border: "none",
                color: "inherit",
                textDecoration: "underline",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Thử lại
            </button>
          </div>
        )}

        <div className={styles.composerFooter}>
          <span>Enter để gửi · Shift + Enter để xuống dòng</span>
          <span>Chat chỉ cập nhật tiến độ, không tự nghiệm thu hoàn thành</span>
        </div>
      </footer>
    </section>
  );
}

function CoordinatorStatusCard({
  message,
  linkedTask,
  data,
  isMe,
}: {
  message: Message;
  linkedTask?: Task;
  data: WorkspaceData;
  isMe: boolean;
}) {
  const isClarify = message.resolution === "clarification_required";
  const isApplied = message.resolution === "applied";

  const cardTheme = isApplied
    ? styles.assistantApplied
    : isClarify
    ? styles.assistantClarify
    : styles.assistantNoChange;

  return (
    <div className={`${styles.assistantCard} ${cardTheme}`} role="status">
      <div className={styles.assistantHeader}>
        <div className={styles.assistantHeaderLeft}>
          <span aria-hidden="true">{isApplied ? "✅" : isClarify ? "🤖" : "💬"}</span>
          <span>Coordinator AI</span>
        </div>
        <span className={styles.aiModeBadge}>
          {message.aiMode === "real" ? "AI thật" : "Mô phỏng"}
        </span>
      </div>

      <div>
        {isApplied && (
          <p style={{ margin: 0 }}>
            Đã ghi nhận tiến độ cho: <strong>{linkedTask?.title ?? message.taskId}</strong>
          </p>
        )}
        {message.resolution === "no_change" && (
          <p style={{ margin: 0 }}>
            Đã lưu trao đổi. Trạng thái task không đổi (chỉ người phụ trách hoặc leader cập nhật).
          </p>
        )}
        {isClarify && (
          <p style={{ margin: 0, fontWeight: 500 }}>
            {message.clarificationQuestion || "Cần làm rõ công việc hoặc trạng thái cập nhật."}
          </p>
        )}
      </div>

      {/* If current user is author and clarification is needed, show interactive resolution form */}
      {isClarify && isMe && (
        <ResolveForm message={message} data={data} />
      )}
    </div>
  );
}

function ResolveForm({ message, data }: { message: Message; data: WorkspaceData }) {
  const router = useRouter();
  const candidates = data.tasks.filter(
    (t) =>
      ["todo", "in_progress", "blocked"].includes(t.status) &&
      (data.actor.role === "leader" || t.assigneeMemberId === data.actor.id)
  );

  const [id, setId] = useState("");
  const [status, setStatus] = useState<"in_progress" | "blocked">("blocked");
  const [blocker, setBlocker] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const attempt = useRef<{ fingerprint: string; key: string } | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending.current) return;
    const task = candidates.find((t) => t.id === id);
    if (!task) return;

    pending.current = true;
    setBusy(true);
    setError("");

    const body = {
      taskId: id,
      requestedStatus: status,
      ...(status === "blocked" ? { blocker: blocker.trim() } : {}),
      expectedTaskVersion: task.version,
    };

    const fingerprint = JSON.stringify(body);
    if (attempt.current?.fingerprint !== fingerprint) {
      attempt.current = { fingerprint, key: crypto.randomUUID() };
    }

    try {
      await mutate(apiRoutes.tracking.resolve(message.id), body, attempt.current.key);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể cập nhật.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <form className={styles.resolveForm} onSubmit={submit}>
      <div className={styles.resolveField}>
        <label className={styles.resolveLabel}>Chọn công việc cần cập nhật:</label>
        <select
          className={styles.resolveSelect}
          value={id}
          onChange={(e) => setId(e.target.value)}
          required
          disabled={busy}
        >
          <option value="">-- Chọn công việc --</option>
          {candidates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.resolveField}>
        <label className={styles.resolveLabel}>Trạng thái xác nhận:</label>
        <select
          className={styles.resolveSelect}
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          disabled={busy}
        >
          <option value="in_progress">Đang làm / Tiếp tục</option>
          <option value="blocked">Bị chặn (Gặp trở ngại)</option>
        </select>
      </div>

      {status === "blocked" && (
        <div className={styles.resolveField}>
          <label className={styles.resolveLabel}>Mô tả trở ngại cụ thể:</label>
          <input
            type="text"
            className={styles.resolveInput}
            value={blocker}
            required
            maxLength={2000}
            placeholder="Nêu vướng mắc cần giải quyết..."
            onChange={(e) => setBlocker(e.target.value)}
            disabled={busy}
          />
        </div>
      )}

      <button
        type="submit"
        className={styles.resolveBtn}
        disabled={busy || !id || (status === "blocked" && !blocker.trim())}
      >
        {busy ? "Đang ghi nhận…" : "Xác nhận cập nhật"}
      </button>

      {error && (
        <div role="alert" style={{ color: "var(--color-destructive)", fontSize: "0.75rem" }}>
          {error}
        </div>
      )}
    </form>
  );
}
