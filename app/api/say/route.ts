import { NextResponse } from "next/server";
import { hasNativeScript } from "@/lib/romanize";

// Sentence Studio voice: speaks any romanized sentence the learner built or
// corrected, in the same Sarvam Bulbul V3 teacher voice the live calls use.
// Returns base64 audio (wav). No em dashes anywhere.

const SARVAM_KEY = process.env.SARVAM_API_KEY;
const VOICE: Record<string, { code: string; speaker: string }> = {
  kn: { code: "kn-IN", speaker: "shreya" },
  hi: { code: "hi-IN", speaker: "pooja" },
  ta: { code: "ta-IN", speaker: "ishita" },
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text.replace(/\u2014/gu, ",").trim().slice(0, 500) : "";
  const voice = VOICE[typeof body.lang === "string" ? body.lang : "kn"] ?? VOICE.kn;
  const pace = typeof body.pace === "number" ? Math.min(1.2, Math.max(0.6, body.pace)) : 0.9;
  if (!text) return NextResponse.json({ error: "Nothing to say." }, { status: 400 });
  if (hasNativeScript(text)) return NextResponse.json({ error: "Romanized text only." }, { status: 400 });
  if (!SARVAM_KEY) return NextResponse.json({ error: "Voice is not configured." }, { status: 500 });

  try {
    const res = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-subscription-key": SARVAM_KEY },
      body: JSON.stringify({
        text,
        target_language_code: voice.code,
        speaker: voice.speaker,
        model: "bulbul:v3",
        pace,
      }),
    });
    if (!res.ok) {
      return NextResponse.json({ error: "The voice did not answer." }, { status: 502 });
    }
    const data = await res.json();
    const audio = Array.isArray(data?.audios) && data.audios.length ? data.audios[0] : null;
    if (!audio) return NextResponse.json({ error: "No audio returned." }, { status: 502 });
    return NextResponse.json({ audio, mime: "audio/wav" });
  } catch {
    return NextResponse.json({ error: "The voice did not answer." }, { status: 502 });
  }
}
