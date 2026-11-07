import { requireSession } from "@/server/auth";
import { endpoint } from "@/server/http/errors";
import { supervisionService } from "@/features/supervision/server/service";
export const GET=()=>endpoint(async()=>supervisionService().listNotifications(await requireSession()));
