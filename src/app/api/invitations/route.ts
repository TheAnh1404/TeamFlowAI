import { requireSession } from "@/server/auth";
import { endpoint } from "@/server/http/errors";
import { listProjectInvitations } from "@/features/planning/server/invitations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = () => endpoint(async () => listProjectInvitations(await requireSession()));
