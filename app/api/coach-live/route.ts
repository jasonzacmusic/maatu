import { NextResponse } from "next/server";
import { LANG_NAME } from "@/lib/curriculum";
import { referenceCompact } from "@/lib/grammar";
import { HOST, type Lang } from "@/lib/maatu-design";
import { hasNativeScript, romanizeText } from "@/lib/romanize";

// The live coach. While a scene call is running, every finished thing the
// learner says is sent here. It comes back with the line put right, a short
// reusable rule, and two honest scores. The character in the call never sees
// any of this and never stops talking: the coaching happens beside the scene,
// on the right of the screen. No em dashes anywhere.
//
// What the two scores actually mean:
// - grammar is the model's judgement of the learner's words against the vetted
//   spoken forms in grammar.json.
// - pronunciation is measured, not guessed: the speech recognizer wrote down
//   what it heard, so the distance between that spelling and the correct
//   spelling is evidence of how the words came out. Pure English gets no
//   pronunciation score at all, because there was nothing to pronounce.

const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const MODEL = process.env.COACH_MODEL || "gemini-flash-lite-latest";
const LANGS: Lang[] = ["kn", "hi", "ta", "ml"];
const CODE: Record<Lang, string> = { kn: "kn-IN", hi: "hi-IN", ta: "ta-IN", ml: "ml-IN" };
const TYPES = new Set(["tense", "gender", "verb", "word-order", "missing-word", "ending", "word-choice", "politeness", "sound"]);

export type LiveSlip = { type: string; was: string; now: string };
export type LiveCoach = {
  heard: string;
  heardAs: "english" | "target" | "mixed";
  fixed: string;
  english: string;
  ok: boolean;
  understood: boolean;
  grammar: number;
  pronunciation: number | null;
  slips: LiveSlip[];
  note: string;
};

// ............................................................ pronunciation
// Compare what the recognizer wrote against the correct spelling, sound group
// by sound group. Long and short vowels count as near misses, not as different
// letters, because that is what a beginner's mouth is actually doing.
function fold(word: string): string {
  return word
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .replace(/aa|ae/g, "a")
    .replace(/ee|ii/g, "i")
    .replace(/oo|uu/g, "u")
    .replace(/([a-z])\1+/g, "$1")
    .replace(/zh/g, "l")
    .replace(/th|dh/g, "t")
    .replace(/kh|gh|bh|ph|jh/g, (m) => m[0])
    .replace(/v/g, "w")
    .replace(/nj/g, "n");
}

function similar(a: string, b: string): number {
  const x = fold(a);
  const y = fold(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  // Levenshtein over the folded spellings.
  const prev = new Array(y.length + 1).fill(0).map((_, i) => i);
  for (let i = 1; i <= x.length; i += 1) {
    const row = [i];
    for (let j = 1; j <= y.length; j += 1) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
    }
    for (let j = 0; j <= y.length; j += 1) prev[j] = row[j];
  }
  return Math.max(0, 1 - prev[y.length] / Math.max(x.length, y.length));
}

// Each word of the correct line is matched to its best candidate in what was
// heard, so a dropped or added word costs a little and a mangled word costs a
// lot. The result is a percentage the learner can watch move.
function pronunciationScore(heard: string, fixed: string): number | null {
  const want = fixed.toLowerCase().replace(/[?.,!]/g, "").split(/\s+/).filter(Boolean);
  const got = heard.toLowerCase().replace(/[?.,!]/g, "").split(/\s+/).filter(Boolean);
  if (!want.length || !got.length) return null;
  let total = 0;
  for (const w of want) {
    let best = 0;
    for (const g of got) best = Math.max(best, similar(w, g));
    total += best;
  }
  const extra = Math.max(0, got.length - want.length) * 0.25;
  const score = (total - extra) / want.length;
  return Math.max(0, Math.min(100, Math.round(score * 100)));
}

function prompt(lang: Lang, text: string, gender: "m" | "f", scene: string | null): string {
  const ln = LANG_NAME[lang];
  const city = HOST[lang].place.split(",").pop()?.trim() ?? "the city";
  return `You are the Maatu live coach, listening in on a real spoken ${ln} conversation in ${city}.
${scene ? `The learner is in this scene: ${scene}\n` : ""}The learner is ${gender === "f" ? "a woman" : "a man"}. They just said ONE thing out loud. What follows is a speech-recognition transcript of it, so the spelling may be off even when the speaking was fine.

Your job, in this order:
1. Work out what they were TRYING to say.
2. Write the easiest natural colloquial ${ln} way to say it, romanized Latin only.
3. Decide whether the person they are talking to would have understood them.
4. Score the GRAMMAR of what they said out of 100. Be fair, not generous and not harsh: 100 means a native would say it exactly that way; 85 means right but slightly bookish or one ending off; 60 means the meaning lands but the grammar is visibly wrong; 30 means barely holding together; 0 means no ${ln} was attempted.
5. Name at most 2 slips, the ones that matter for meaning.

Hard rules:
- Romanized Latin letters ONLY, never one character of native script.
- Colloquial spoken forms only. Keep English loanwords where natives use them (piano, practice, class, bus, meter, OTP). Never bookish words. No plural suffixes.
- If the attempt communicates the meaning and only the spelling differs, the grammar is CORRECT: ok true, high score, slips empty.
- If the learner spoke English, heard_as is "english", grammar is 0, ok is false, and the note tells them warmly how to say that same thing in ${ln}.
- "note" is ONE short sentence: a reusable rule when something was wrong, a specific compliment when it was right. Never generic praise.
- A slip "type" is exactly one of: tense, gender, verb, word-order, missing-word, ending, word-choice, politeness, sound.
- No em dashes anywhere.

REFERENCE, vetted spoken ${ln}:
${referenceCompact(lang)}

WHAT THE LEARNER SAID: ${JSON.stringify(text)}

Return STRICT JSON only, no markdown:
{
  "heard_as": "english" | "target" | "mixed",
  "fixed": "the best colloquial ${ln} sentence for what they meant, romanized",
  "english": "plain English meaning",
  "ok": true or false,
  "understood": true or false,
  "grammar": 0 to 100,
  "slips": [{"type": "tense", "was": "what they said", "now": "the fix"}],
  "note": "one short sentence"
}`;
}

async function callGemini(text: string): Promise<Record<string, unknown> | null> {
  if (!GEMINI_KEY) return null;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text }] }],
      generationConfig: { temperature: 0.15, responseMimeType: "application/json" },
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const out: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!out) return null;
  try {
    return JSON.parse(out);
  } catch {
    const m = out.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : null;
  }
}

async function roman(value: unknown, code: string): Promise<string> {
  const s = typeof value === "string" ? value.replace(/—/gu, ",") : "";
  if (!hasNativeScript(s)) return s;
  const out = await romanizeText(s, code);
  if (out && out !== "Romanization unavailable" && !hasNativeScript(out)) return out;
  return s.replace(/[ऀ-ॿ஀-௿ಀ-೿ഀ-ൿ]+/gu, "").replace(/\s+/g, " ").trim();
}

function clampScore(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text.replace(/—/gu, ",").trim().slice(0, 300) : "";
  const lang: Lang = LANGS.includes(body.lang) ? body.lang : "kn";
  const gender: "m" | "f" = body.gender === "f" ? "f" : "m";
  const scene = typeof body.scene === "string" && body.scene.trim() ? body.scene.trim().slice(0, 240) : null;
  if (!text) return NextResponse.json({ error: "Nothing was heard." }, { status: 400 });
  if (!GEMINI_KEY) return NextResponse.json({ error: "The coach is not configured." }, { status: 500 });

  const raw = await callGemini(prompt(lang, text, gender, scene));
  if (!raw) return NextResponse.json({ error: "The coach did not answer." }, { status: 502 });

  const code = CODE[lang];
  const heardAs = raw.heard_as === "english" || raw.heard_as === "target" || raw.heard_as === "mixed" ? raw.heard_as : "mixed";
  const fixed = await roman(raw.fixed, code);
  const slipsIn = Array.isArray(raw.slips) ? (raw.slips as LiveSlip[]).slice(0, 2) : [];
  const slips: LiveSlip[] = [];
  for (const s of slipsIn) {
    const type = typeof s?.type === "string" && TYPES.has(s.type) ? s.type : "word-choice";
    slips.push({ type, was: await roman(s?.was, code), now: await roman(s?.now, code) });
  }
  const heard = await roman(text, code);
  const result: LiveCoach = {
    heard,
    heardAs,
    fixed,
    english: await roman(raw.english, code),
    ok: heardAs === "english" ? false : Boolean(raw.ok),
    understood: Boolean(raw.understood),
    grammar: heardAs === "english" ? 0 : clampScore(raw.grammar),
    // English carries no pronunciation score: there was no target word to say.
    pronunciation: heardAs === "english" ? null : pronunciationScore(heard, fixed),
    slips,
    note: await roman(raw.note, code),
  };
  if (!result.fixed) return NextResponse.json({ error: "The coach did not answer." }, { status: 502 });
  return NextResponse.json(result);
}
