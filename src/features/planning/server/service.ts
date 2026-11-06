import "server-only";
import type {
  AddProjectMemberInput, CreateProjectInput, CreateProjectResult, Id, MutationOptions,
  Plan, Project, ProjectDetails, ProjectMember, PublishPlanInput, PublishPlanResult,
  UpdatePlanDraftInput, UpdateProjectInput, UpdateProjectMemberInput,
} from "@/contracts";
import type { Session } from "@/server/auth/contracts";

// TODO(TV1): signatures only; no persistence, AI, publish or permission implementation.
export interface PlanningService {
  createProject(session: Session, input: CreateProjectInput): Promise<CreateProjectResult>;
  getProject(session: Session, projectId: Id): Promise<ProjectDetails>;
  updateProject(session: Session, projectId: Id, input: UpdateProjectInput): Promise<Project>;
  addProjectMember(session: Session, projectId: Id, input: AddProjectMemberInput): Promise<ProjectMember>;
  updateProjectMember(session: Session, projectId: Id, memberId: Id, input: UpdateProjectMemberInput): Promise<ProjectMember>;
  generatePlanDraft(session: Session, projectId: Id): Promise<Plan>;
  getPlan(session: Session, projectId: Id): Promise<Plan | null>;
  updatePlanDraft(session: Session, planId: Id, input: UpdatePlanDraftInput): Promise<Plan>;
  publishPlan(session: Session, planId: Id, input: PublishPlanInput, options: MutationOptions): Promise<PublishPlanResult>;
}
