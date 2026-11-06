import type { Id, ProjectMember, User } from "@/contracts";

export interface Session {
  user: User;
  memberships: ProjectMember[];
}

export interface SessionProvider {
  getCurrentSession(): Promise<Session | null>;
}

// Signatures only. TODO(TV2): authoritative server checks in implementation session.
export interface AuthorizationProvider {
  assertProjectMember(session: Session, projectId: Id): Promise<ProjectMember>;
  assertTaskUpdateAllowed(session: Session, taskId: Id): Promise<void>;
  assertPlanPublishAllowed(session: Session, planId: Id): Promise<void>;
  assertAcceptanceAllowed(session: Session, taskId: Id): Promise<void>;
  assertReportGenerationAllowed(session: Session, projectId: Id): Promise<void>;
}
