import { NextResponse } from "next/server";
import { PERSONAS } from "@/lib/personas.generated";
import { generateReport, type Line } from "@/lib/coach";
import { getReport, saveReport } from "@/lib/db";

// The debrief coach endpoint.
// GET  /api/report?room=...  fetches a saved report.
// POST generates a report from a transcript (or returns the saved one), stores
// it in Neon, and returns it. No em dashes anywhere.

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const room = searchParams.get("room");
  if (!room) return NextResponse.json({ status: "none" }, { status: 400 });
  const stored = await getReport(room).catch(() => null);
  if (stored?.report) {
    return NextResponse.json({ status: "ready", report: stored.report });
  }
  return NextResponse.json({ status: "pending" });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const room: string | undefined = body.room;
  const personaId: string | undefined = body.personaId;
  const transcript: Line[] = Array.isArray(body.transcript) ? body.transcript : [];
  const durationSec: number = Number(body.durationSec) || 0;

  if (!room || !personaId || !PERSONAS[personaId]) {
    return NextResponse.json({ status: "none" }, { status: 400 });
  }

  // If we already have a report for this room, return it.
  const existing = await getReport(room).catch(() => null);
  if (existing?.report) {
    return NextResponse.json({ status: "ready", report: existing.report });
  }

  const learnerLines = transcript.filter((l) => l.who === "learner").length;
  if (learnerLines < 1) {
    return NextResponse.json({ status: "none" });
  }

  const report = await generateReport(personaId, transcript, durationSec);
  if (!report) {
    return NextResponse.json({ status: "none" });
  }

  const persona = PERSONAS[personaId];
  await saveReport({
    room,
    personaId,
    language: persona.language,
    scenario: persona.scenario,
    durationSec,
    report,
    transcript,
    coachAudioB64: report.coach_audio_b64 ?? null,
  }).catch(() => {});

  return NextResponse.json({ status: "ready", report });
}
