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
  const [pending, setPending] = useState(false);

  if (data.actor.role !== "leader") return null;

  async function search() {
    setError("");
    setCandidates([]);
    if (query.trim().length < 2) {
      setError("Nháº­p Ã­t nháº¥t 2 kÃ½ tá»± Ä‘á»ƒ tÃ¬m tÃ i khoáº£n.");
      return;
    }
    setPending(true);
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(data.project.id)}/members?search=${encodeURIComponent(query.trim())}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? "KhÃ´ng thá»ƒ tÃ¬m tÃ i khoáº£n.");
      setCandidates(result.data);
      if (!result.data.length) setError("KhÃ´ng tÃ¬m tháº¥y tÃ i khoáº£n chÆ°a tham gia dá»± Ã¡n.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "KhÃ´ng thá»ƒ tÃ¬m tÃ i khoáº£n.");
    } finally {
      setPending(false);
    }
  }

  async function add(candidate: Candidate) {
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(data.project.id)}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: candidate.userId, skills: [], availableHoursPerWeek: 0, canAccept: false }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? "KhÃ´ng thá»ƒ thÃªm thÃ nh viÃªn.");
      setCandidates((current) => current.filter((item) => item.userId !== candidate.userId));
      setQuery("");
      onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "KhÃ´ng thá»ƒ thÃªm thÃ nh viÃªn.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section aria-labelledby="member-manager-title" style={{ border: "1px solid var(--color-border-subtle)", borderRadius: 8, padding: 16, margin: "16px 0" }}>
      <h2 id="member-manager-title" style={{ marginTop: 0 }}>ThÃ nh viÃªn dá»± Ã¡n ({data.members.length})</h2>
      <form onSubmit={(event) => { event.preventDefault(); void search(); }} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <label style={{ flex: "1 1 260px" }}>TÃ¬m tÃ i khoáº£n theo tÃªn hoáº·c email
          <input value={query} onChange={(event) => setQuery(event.target.value)} maxLength={100} autoComplete="off" />
        </label>
        <button type="submit" disabled={pending}>TÃ¬m</button>
      </form>
      {error && <p role="status">{error}</p>}
      {candidates.map((candidate) => (
        <div key={candidate.userId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "8px 0" }}>
          <span>{candidate.displayName}{candidate.email ? ` · ${candidate.email}` : ""}</span>
          <button type="button" disabled={pending || data.members.length >= 8} onClick={() => void add(candidate)}>ThÃªm vÃ o dá»± Ã¡n</button>
        </div>
      ))}
      {data.members.map(({ member, user }) => <p key={member.id} style={{ margin: "8px 0" }}>{user.displayName}{member.role === "leader" ? " · TrÆ°á»Ÿng nhÃ³m" : " · ThÃ nh viÃªn"}</p>)}
      {data.members.length >= 8 && <p>Dá»± Ã¡n Ä‘Ã£ Ä‘áº¡t giá»›i háº¡n 8 thÃ nh viÃªn.</p>}
    </section>
  );
}
