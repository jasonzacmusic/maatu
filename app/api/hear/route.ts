import { NextResponse } from "next/server";
import { hasNativeScript, romanizeText } from "@/lib/romanize";

// Sentence Studio ears: takes one short browser recording, transcribes it with
// Sarvam Saarika (auto-detect, so English and code-mixed speech survive), and
// returns the romanized text ready for the checker. No em dashes anywhere.

const SARVAM_KEY = process.env.SARVAM_API_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const MODEL = process.env.CHECK_MODEL || "gemini-flash-lite-latest";
const CODE: Record<string, string> = { kn: "kn-IN", hi: "hi-IN", ta: "ta-IN" };
const NAME: Record<string, string> = { kn: "Kannada", hi: "Hindi", ta: "Tamil" };
const SAMPLE: Record<string, string> = {
  kn: "naanu, neenu, neevu, avanu, avalu, naavu, avru, nudistini, nudiside, maadtini, hogtini, hesaru, enu, beku, illa, howdu, nenne, naale, swalpa, chennaagide",
  hi: "main, tum, aap, voh, hum, bajaata hoon, bajaayi, karta, jaata, kya, nahin, chaahiye, kal, roz, thoda, achha",
  ta: "naan, nee, neenga, avan, ava, naanga, avanga, vaasikkiren, vaasichen, pannuren, poren, enna, illa, venum, nethu, naalaikku, konjam, nalla irukku",
};

// Sarvam's transliterator is built for names and addresses and drifts on
// sentences (it once turned hesaru into naam). The brain romanizes a whole
// line far better when shown the spelling style the app uses everywhere.
async function romanizeWithBrain(native: string, lang: string): Promise<string | null> {
  if (!GEMINI_KEY) return null;
  const ln = NAME[lang] ?? "Kannada";
  const prompt = `Romanize this spoken ${ln} transcript into Latin letters using simple everyday spelling like these examples: ${SAMPLE[lang] ?? SAMPLE.kn}. Keep English words as English. Do not translate, do not correct grammar, do not add words. Output ONLY the romanized line, nothing else.\n\nTranscript: ${native}`;
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0 } }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const out: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    const line = out?.trim().split("\n")[0]?.replace(/^["'`]+|["'`]+$/g, "").trim();
    return line && !hasNativeScript(line) ? line : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  if (!SARVAM_KEY) return NextResponse.json({ error: "Hearing is not configured." }, { status: 500 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("audio");
  const lang = typeof form?.get("lang") === "string" ? String(form?.get("lang")) : "kn";
  if (!(file instanceof Blob) || file.size < 200) {
    return NextResponse.json({ error: "I did not catch any audio. Hold the button and speak." }, { status: 400 });
  }
  if (file.size > 6_000_000) return NextResponse.json({ error: "That recording is too long. Keep it to one sentence." }, { status: 413 });

  const ext = file.type.includes("mp4") || file.type.includes("m4a") ? "m4a" : file.type.includes("ogg") ? "ogg" : file.type.includes("wav") ? "wav" : "webm";
  const upstream = new FormData();
  upstream.append("file", file, `speech.${ext}`);
  upstream.append("model", "saarika:v2.5");
  upstream.append("language_code", "unknown");

  try {
    const res = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: { "api-subscription-key": SARVAM_KEY },
      body: upstream,
    });
    if (!res.ok) return NextResponse.json({ error: "The transcriber did not answer." }, { status: 502 });
    const data = await res.json();
    const raw = typeof data?.transcript === "string" ? data.transcript.trim() : "";
    const detected = typeof data?.language_code === "string" ? data.language_code : null;
    if (!raw) return NextResponse.json({ error: "I heard silence. Try once more, a little louder." }, { status: 422 });
    const sourceCode = detected && detected !== "unknown" ? detected : CODE[lang] ?? "kn-IN";
    const roman = hasNativeScript(raw) ? (await romanizeWithBrain(raw, lang)) ?? (await romanizeText(raw, sourceCode)) : raw;
    const text = roman && roman !== "Romanization unavailable" && !hasNativeScript(roman) ? roman : "";
    if (!text) return NextResponse.json({ error: "I heard you but could not romanize it. Try again." }, { status: 502 });
    return NextResponse.json({ text: text.replace(/^"+|"+$/g, ""), detected });
  } catch {
    return NextResponse.json({ error: "The transcriber did not answer." }, { status: 502 });
  }
}
