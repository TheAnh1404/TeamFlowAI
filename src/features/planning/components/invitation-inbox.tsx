"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { apiFetch } from "@/lib/api-client";
import { projectInvitationListSchema, projectInvitationSchema } from "../invitations";

type ProjectInvitation = z.infer<typeof projectInvitationSchema>;

export function InvitationInbox() {
  const [items, setItems] = useState<ProjectInvitation[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    apiFetch("/api/invitations", projectInvitationListSchema, { cache: "no-store" })
      .then(result => { if (active) { setItems(result.data); setError(""); } })
      .catch(() => { if (active) setError("Không tải được lời mời tham gia dự án."); });
    return () => { active = false; };
  }, []);

  async function respond(id: string, action: "accept" | "decline") {
    setBusy(id); setError("");
    try {
      await apiFetch(`/api/invitations/${encodeURIComponent(id)}/respond`, z.object({ status: z.enum(["accepted", "declined"]) }), {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }),
      });
      setItems(current => current.filter(item => item.id !== id));
      window.dispatchEvent(new Event("teamflow:invitations-changed"));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không phản hồi được lời mời."); }
    finally { setBusy(null); }
  }

  return <details className="tf-inbox"><summary aria-label={`Lời mời dự án, ${items.length} đang chờ`}>Lời mời <span aria-live="polite">({items.length})</span></summary><div className="tf-inbox-panel"><h2>Lời mời tham gia dự án</h2>{error && <p role="alert">{error}</p>}{!items.length && !error && <p>Không có lời mời đang chờ.</p>}<ul>{items.map(item => <li key={item.id}><strong>{item.projectName}</strong><p>{item.inviter.displayName} mời bạn tham gia nhóm.</p><p>Kỹ năng dự kiến: {item.skills.join(", ")} · {item.availableHoursPerWeek} giờ/tuần</p><div className="tf-actions"><button className="tf-button" type="button" disabled={busy === item.id} onClick={() => void respond(item.id, "accept")}>Chấp nhận</button><button className="tf-button secondary" type="button" disabled={busy === item.id} onClick={() => void respond(item.id, "decline")}>Từ chối</button></div></li>)}</ul></div></details>;
}
