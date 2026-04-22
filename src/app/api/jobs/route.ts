import { NextResponse } from "next/server";
import { listJobs } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const openOnly = url.searchParams.get("openOnly") !== "false";
  const jobs = listJobs({ openOnly });
  return NextResponse.json({ jobs });
}
