import { reportHandler } from "@/server/automation/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = reportHandler("get");
export const PATCH = reportHandler("revise");
