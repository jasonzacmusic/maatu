import { NextResponse } from "next/server";
import { generateReport, type Line } from "@/lib/coach";
import { getReport, saveReport } from "@/lib/db";
import { romanizeText } from "@/lib/romanize";
import { personaMeta } from "@/lib/curriculum";

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
  const userId: string = typeof body.userId === "string" && body.userId.trim() ? body.userId.slice(0, 80) : "legacy";
  const personaId: string | undefined = body.personaId;
  const transcript: Line[] = Array.isArray(body.transcript) ? body.transcript : [];
  const durationSec: number = Number(body.durationSec) || 0;

  const persona = personaId ? personaMeta(personaId) : null;
  if (!room || !personaId || !persona) {
    return NextResponse.json({ status: "none" }, { status: 400 });
  }

  // If we already have a report for this room, return it.
  const existing = await getReport(room).catch(() => null);
  if (existing?.report) {
    return NextResponse.json({ status: "ready", report: existing.report });
  }

  const romanizedTranscript = await Promise.all(
    transcript.map(async (line) => ({ ...line, text: await romanizeText(line.text, persona.languageCode) })),
  );
  const learnerLines = romanizedTranscript.filter((l) => l.who === "learner").length;
  if (learnerLines < 1) {
    return NextResponse.json({ status: "none" });
  }

  const report = await generateReport(personaId, romanizedTranscript, durationSec);
  if (!report) {
    return NextResponse.json({ status: "none" });
  }

  let persisted = true;
  try {
    await saveReport({
      room,
      userId,
      personaId,
      language: persona.language,
      scenario: persona.scenario,
      durationSec,
      report,
      transcript: romanizedTranscript,
      coachAudioB64: report.coach_audio_b64 ?? null,
    });
  } catch (error) {
    persisted = false;
    console.error("Could not save Maatu report", error);
  }

  return NextResponse.json({ status: "ready", report, persisted });
}
