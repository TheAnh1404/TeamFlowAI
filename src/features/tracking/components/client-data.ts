"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { projectMemberSchema, projectSummarySchema, sessionSchema, userSchema } from "@/contracts";
import { apiFetch } from "@/lib/api-client";
import { apiRoutes } from "@/lib/routes";
import type { ProjectMember, User } from "@/contracts";

export async function loadContext(projectId: string) {
  const [session, members, users, projects] = await Promise.all([
    apiFetch(apiRoutes.tracking.session, sessionSchema),
    apiFetch(apiRoutes.planning.members(projectId), z.array(projectMemberSchema)),
    apiFetch(apiRoutes.tracking.users, z.array(userSchema)),
    apiFetch(apiRoutes.planning.projects, z.array(projectSummarySchema)),
  ]);
  const project = projects.data.find(item => item.id === projectId);
  if (!project) throw new Error("Không tìm thấy dự án hoặc bạn không có quyền truy cập.");
  return { session: session.data, members: members.data, users: users.data, project };
}
export type TrackingContext = Awaited<ReturnType<typeof loadContext>>;

export function memberName(memberId: string, members: ProjectMember[], users: User[]): string {
  const member = members.find(item => item.id === memberId);
  return users.find(user => user.id === member?.userId)?.displayName ?? memberId;
}
export function useRemoteData<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    loader().then(value => { if (active) { setData(value); setError(null); } })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "Không thể tải dữ liệu."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [loader, revision]);
  function reload() { setLoading(true); setRevision(value => value + 1); }
  return { data: loading || error ? null : data, error, loading, reload };
}

export function requestKey(ref: { current: { input: string; key: string } | null }, body: unknown): string {
  const input = JSON.stringify(body);
  if (!ref.current || ref.current.input !== input) ref.current = { input, key: crypto.randomUUID() };
  return ref.current.key;
}
