"use client";

import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { apiFetch } from "@/lib/api-client";
import { Alert, Button } from "@/components/ui/primitives";
import { invitationCandidateSchema, outgoingInvitationSchema } from "../invitations";

const candidateListSchema = z.array(invitationCandidateSchema);
const outgoingListSchema = z.array(outgoingInvitationSchema);

export function ProjectInvitations({ projectId }: { projectId: string }) {
  const url = `/api/projects/${encodeURIComponent(projectId)}/invitations`;
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<z.infer<typeof candidateListSchema>>([]);
  const [pending, setPending] = useState<z.infer<typeof outgoingListSchema>>([]);
  const [selected, setSelected] = useState("");
  const [skills, setSkills] = useState("Phát triển, kiểm thử");
  const [hours, setHours] = useState(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadPending = useCallback(async () => {
    const result = await apiFetch(url, outgoingListSchema, { cache: "no-store" });
    setPending(result.data);
  }, [url]);

  useEffect(() => {
    let active = true;
    apiFetch(url, outgoingListSchema, { cache: "no-store" })
      .then(result => { if (active) setPending(result.data); })
      .catch(() => { if (active) setError("Không tải được lời mời đang chờ."); });
    return () => { active = false; };
  }, [url]);

  async function search(event: React.FormEvent) {
    event.preventDefault();
    setError(""); setNotice(""); setCandidates([]); setSelected(""); setBusy(true);
    try {
      const result = await apiFetch(`${url}?search=${encodeURIComponent(query.trim())}`, candidateListSchema, { cache: "no-store" });
      setCandidates(result.data);
      if (!result.data.length) setNotice("Không tìm thấy tài khoản phù hợp hoặc tài khoản đã được mời.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không tìm được tài khoản."); }
    finally { setBusy(false); }
  }

  async function invite() {
    const candidate = candidates.find(person => person.id === selected);
    if (!candidate) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await apiFetch(url, z.object({ id: z.string(), status: z.literal("pending") }), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: candidate.id, skills: skills.split(",").map(value => value.trim()).filter(Boolean), availableHoursPerWeek: hours }),
      });
      setCandidates(items => items.filter(item => item.id !== candidate.id)); setSelected(""); setNotice(`Đã gửi lời mời đến ${candidate.displayName}.`);
      await loadPending();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không gửi được lời mời."); }
    finally { setBusy(false); }
  }

  return <section className="tf-card" aria-labelledby="invite-members-heading" style={{ margin: "20px 0", padding: 20 }}>
    <h2 id="invite-members-heading">Mời thành viên trước khi lập kế hoạch</h2>
    <p>Người được mời sẽ nhận thông báo và cần chấp nhận trước khi Planner tạo bản nháp.</p>
    {error && <Alert>{error}</Alert>}{notice && <p role="status">{notice}</p>}
    <form onSubmit={search} className="tf-row">
      <label style={{ flex: "1 1 240px" }}>Nhập tên hoặc email tài khoản
        <input value={query} onChange={event => setQuery(event.target.value)} minLength={2} maxLength={100} autoComplete="off" />
      </label>
      <Button type="submit" disabled={busy || query.trim().length < 2}>Tìm thành viên</Button>
    </form>
    {!!candidates.length && <div className="tf-row" style={{ marginTop: 12 }}>
      <label style={{ flex: "1 1 200px" }}>Tài khoản<select value={selected} onChange={event => setSelected(event.target.value)}><option value="">Chọn thành viên</option>{candidates.map(person => <option key={person.id} value={person.id}>{person.displayName}</option>)}</select></label>
      <label>Kỹ năng<input value={skills} onChange={event => setSkills(event.target.value)} /></label>
      <label>Giờ/tuần<input type="number" min={0.5} max={168} step={0.5} value={hours} onChange={event => setHours(Number(event.target.value))} /></label>
      <Button type="button" disabled={busy || !selected || !skills.trim() || hours < 0.5 || hours > 168} onClick={() => void invite()}>Gửi lời mời</Button>
    </div>}
    <h3>Lời mời đang chờ ({pending.length})</h3>
    {pending.length ? <ul>{pending.map(item => <li key={item.id}>{item.displayName} · Đang chờ phản hồi</li>)}</ul> : <p>Chưa có lời mời đang chờ.</p>}
  </section>;
}
