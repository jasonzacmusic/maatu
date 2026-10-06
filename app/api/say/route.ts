import { NextResponse } from "next/server";
import { isLang } from "@/lib/languages";
import { synthesizeSpeech } from "@/lib/speech";

export const maxDuration = 60;

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  if (!isLang(body.lang) || typeof body.text !== "string" || !body.text.trim()) {
    return NextResponse.json({ error: "Choose a language and a phrase to hear." }, { status: 400 });
  }
  const pace = typeof body.pace === "number" ? Math.max(0.65, Math.min(1.2, body.pace)) : 0.9;
  try {
    return NextResponse.json(await synthesizeSpeech(body.text.trim().slice(0, 1200), body.lang, pace, body.role === "coach" && typeof body.persona === "string" && (body.persona.startsWith(`tutor-${body.lang}`) || body.persona.startsWith(`teacher-${body.lang}-`) || body.persona.startsWith(`${body.lang}-`)) ? body.persona.slice(0, 80) : ""));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The voice could not respond. Try again." }, { status: 502 });
  }
}
