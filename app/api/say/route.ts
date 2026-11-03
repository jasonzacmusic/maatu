import { NextResponse } from "next/server";
import { INDIC, callVoice } from "@/lib/languages";
import { toNativeScript } from "@/lib/native-script";
import { hasNativeScript } from "@/lib/romanize";

// Sarvam runs in India, so these calls run from Mumbai rather than the US.
export const preferredRegion = "bom1";

// Hear it voice: speaks any romanized sentence the learner built or was given,
// in the same voice the teacher uses on a live call (languages.json). The line
// is written in its own script first so it sounds local. Returns base64 audio
// (wav). No em dashes anywhere.

const SARVAM_KEY = process.env.SARVAM_API_KEY;

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text.replace(/\u2014/gu, ",").trim().slice(0, 500) : "";
  const lang = INDIC.includes(body.lang) ? body.lang : "kn";
  const voice = callVoice(lang);
  const pace = typeof body.pace === "number" ? Math.min(1.2, Math.max(0.6, body.pace)) : 0.9;
  if (!text) return NextResponse.json({ error: "Nothing to say." }, { status: 400 });
  if (hasNativeScript(text)) return NextResponse.json({ error: "Romanized text only." }, { status: 400 });
  if (!SARVAM_KEY) return NextResponse.json({ error: "Voice is not configured." }, { status: 500 });

  try {
    const native = await toNativeScript(text, lang);
    const spoken = native ?? text;
    const res = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-subscription-key": SARVAM_KEY },
      body: JSON.stringify({
        text: spoken,
        target_language_code: voice.code,
        speaker: voice.speaker,
        model: voice.model,
        pace,
      }),
    });
    if (!res.ok) {
      return NextResponse.json({ error: "The voice did not answer." }, { status: 502 });
    }
    const data = await res.json();
    const audio = Array.isArray(data?.audios) && data.audios.length ? data.audios[0] : null;
    if (!audio) return NextResponse.json({ error: "No audio returned." }, { status: 502 });
    // script says whether the voice read native script or fell back to
    // English letters, so a probe can tell the two apart.
    return NextResponse.json({ audio, mime: "audio/wav", script: native ? "native" : "latin" });
  } catch {
    return NextResponse.json({ error: "The voice did not answer." }, { status: 502 });
  }
}
