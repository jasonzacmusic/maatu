import { NextResponse } from "next/server";
import { runNightlyPersonaRewrite } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    return NextResponse.json({ ok: true, ...(await runNightlyPersonaRewrite()) });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Nightly rewrite failed" },
      { status: 500 },
    );
  }
}
