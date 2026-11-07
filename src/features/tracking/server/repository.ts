import "server-only";
import type { Id, Message, ProgressUpdate, Task } from "@/contracts";

// Implemented by neon-repository.ts; mutation calls run inside idempotency.ts transactions.
export interface TrackingRepository {
  listTasks(projectId: Id): Promise<Task[]>;
  getTask(taskId: Id): Promise<Task | null>;
  listMessages(projectId: Id): Promise<Message[]>;
  getMessage(messageId: Id): Promise<Message | null>;
  listProgressUpdates(taskId: Id): Promise<ProgressUpdate[]>;
  insertMessage(message: Message, idempotencyKey: string): Promise<void>;
  commitProgressUpdate(message: Message, update: ProgressUpdate, task: Task, expectedVersion: number, idempotencyKey: string): Promise<void>;
}
