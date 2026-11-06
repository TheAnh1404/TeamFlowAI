import "server-only";
import type { Id, Plan, Project, ProjectMember, Task } from "@/contracts";

// TODO(TV1 + TV2): agree data adapter/transaction boundaries; no queries here.
export interface PlanningRepository {
  getProject(projectId: Id): Promise<Project | null>;
  listMembers(projectId: Id): Promise<ProjectMember[]>;
  getPlan(projectId: Id): Promise<Plan | null>;
  insertProjectWithLeader(project: Project, leader: ProjectMember): Promise<void>;
  saveProject(project: Project): Promise<void>;
  saveMember(member: ProjectMember): Promise<void>;
  saveDraft(plan: Plan, expectedVersion: number | null): Promise<void>;
  commitPublication(plan: Plan, tasks: Task[], expectedVersion: number, idempotencyKey: string): Promise<void>;
}
