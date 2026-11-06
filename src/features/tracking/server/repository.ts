import "server-only";
import type { Id, Message, ProgressUpdate, Task } from "@/contracts";

// TODO(TV2): data adapter and atomic/idempotent commits in implementation session.
export interface TrackingRepository {
  listTasks(projectId: Id): Promise<Task[]>;
  getTask(taskId: Id): Promise<Task | null>;
  listMessages(projectId: Id): Promise<Message[]>;
  getMessage(messageId: Id): Promise<Message | null>;
  listProgressUpdates(taskId: Id): Promise<ProgressUpdate[]>;
  insertMessage(message: Message, idempotencyKey: string): Promise<void>;
  commitProgressUpdate(message: Message, update: ProgressUpdate, task: Task, expectedVersion: number, idempotencyKey: string): Promise<void>;
}
