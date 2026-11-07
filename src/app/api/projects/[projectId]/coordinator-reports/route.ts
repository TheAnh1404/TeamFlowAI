import { projectHandler } from "@/server/automation/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = projectHandler("reports");
export const POST = projectHandler("reports");
