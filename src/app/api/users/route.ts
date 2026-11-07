export const runtime = "nodejs";

import { inArray } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { requireSession } from "@/server/auth";
import { DEMO_ACCOUNTS } from "@/server/auth/session";
import { endpoint } from "@/server/http/errors";

export const GET = () =>
  endpoint(async () => {
    await requireSession();
    return getDb()
      .select()
      .from(users)
      .where(inArray(users.id, Object.values(DEMO_ACCOUNTS)));
  });
