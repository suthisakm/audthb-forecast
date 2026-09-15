import { NextResponse } from "next/server";
import { getGrowthData } from "@/lib/growth-data";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const growth = await getGrowthData();
  return NextResponse.json(growth, {
    status: growth.status === "UNAVAILABLE" ? 502 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}
