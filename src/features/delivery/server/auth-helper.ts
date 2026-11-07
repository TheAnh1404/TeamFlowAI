import "server-only";
import { requireSession } from "@/server/auth";

// Same opaque server session as tracking; no client-supplied role fallback.
export function getDeliverySession(request: Request) {
  void request;
  return requireSession();
}
