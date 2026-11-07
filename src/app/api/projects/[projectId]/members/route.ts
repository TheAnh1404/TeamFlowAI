import { notImplementedResponse } from "@/server/http/not-implemented";
import { getMembers } from "@/features/tracking/server/handlers";

// TODO(TV1): implement only in the assigned feature session; no DB/auth/AI here.
export const POST = notImplementedResponse;
// TV2 read model; TV1 retains POST.
export const GET = getMembers;
