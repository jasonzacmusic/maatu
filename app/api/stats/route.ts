import { NextResponse } from "next/server";
import { getStreetStats } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId")?.trim().slice(0, 80);
  if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

  try {
    return NextResponse.json(await getStreetStats(userId));
  } catch {
    return NextResponse.json({ error: "Could not load street stats" }, { status: 500 });
  }
}
