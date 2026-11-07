import "server-only";
import type { Session } from "@/server/auth/contracts";
import { requireSession } from "@/server/auth";

// Integrated runtime shares TV2's session; client demo-role headers grant no access.
export async function getDeliverySession(_request: Request): Promise<Session> {
  void _request;
  return requireSession();
}
