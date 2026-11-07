import "server-only";
import type {
  Id, Message, MutationOptions, ProgressMessageResult, ProgressUpdate,
  ResolveTaskReferenceInput, SubmitProgressMessageInput, Task,
} from "@/contracts";
import type { Session } from "@/server/auth/contracts";

// Stable public server contract. Implementation: implementation.ts.
export interface TrackingService {
  listTasks(session: Session, projectId: Id): Promise<Task[]>;
  getTask(session: Session, taskId: Id): Promise<Task>;
  listMessages(session: Session, projectId: Id): Promise<Message[]>;
  listProgressUpdates(session: Session, taskId: Id): Promise<ProgressUpdate[]>;
  submitProgressMessage(session: Session, projectId: Id, input: SubmitProgressMessageInput, options: MutationOptions): Promise<ProgressMessageResult>;
  resolveTaskReference(session: Session, messageId: Id, input: ResolveTaskReferenceInput, options: MutationOptions): Promise<ProgressMessageResult>;
}
