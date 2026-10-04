import { NextResponse } from "next/server";
import { LANG_NAME } from "@/lib/curriculum";
import { referenceText } from "@/lib/grammar";
import { HOST, type Lang } from "@/lib/maatu-design";
import { hasNativeScript, romanizeText } from "@/lib/romanize";

// Sentence Studio checker. The learner types or speaks one line: English to
// translate, a romanized attempt to correct, or a sentence with a blank to fill.
// The brain answers against the vetted grammar reference and tags every fix by
// type (tense, gender, verb, word order, missing word) so the learner can
// generalize the rule, not just copy the sentence. No em dashes anywhere.

const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const MODEL = process.env.CHECK_MODEL || "gemini-flash-lite-latest";
const LANGS: Lang[] = ["kn", "hi", "ta", "fr"];
const CODE: Record<Lang, string> = { kn: "kn-IN", hi: "hi-IN", ta: "ta-IN", fr: "fr-FR" };
const TYPES = new Set(["tense", "gender", "verb", "word-order", "missing-word", "ending", "word-choice", "politeness", "spelling"]);

export type Correction = { type: string; was: string; now: string; why: string };
export type CheckResult = {
  heard_as: "english" | "target" | "mixed";
  target: string;
  english: string;
  ok: boolean;
  corrections: Correction[];
  words: { word: string; meaning: string }[];
  tip: string;
};

function prompt(lang: Lang, text: string, gender: "m" | "f", expected: string | null): string {
  const ln = LANG_NAME[lang];
  const city = HOST[lang].place.split(",").pop()?.trim() ?? "the city";
  return `You are the Maatu grammar checker for SPOKEN ${ln}, the way people talk in ${city} today.
The learner wrote or said ONE line. It may be:
(a) English: give the easiest natural colloquial ${ln} way to say it;
(b) romanized ${ln}: correct it;
(c) mixed, or with a blank like ___ or a bracketed English word the learner is searching for: fill the gap with the right ${ln} word.
The learner is ${gender === "f" ? "a woman" : "a man"}; apply speaker gender where ${ln} needs it.

Hard rules:
- Romanized Latin letters ONLY. Never one character of native script.
- Colloquial spoken forms only. Keep English loanwords where natives use them (piano, practice, class, music, bus). Never bookish words. No plural suffixes; keep nouns singular unless the meaning truly needs plural.
- Prefer the exact vetted forms in the REFERENCE below. If a needed word is not there, use the most common everyday spoken form.
- Be generous: if the attempt communicates the meaning and only the spelling differs (thini vs tini, ge vs gey), it is CORRECT: ok true, corrections empty or one spelling note.
- Tag every real fix with exactly one type from: tense, gender, verb, word-order, missing-word, ending, word-choice, politeness, spelling. At most 3 corrections, the ones that matter most for meaning.
- "why" must be a short plain-English rule the learner can reuse on other sentences, not just this one.
- No em dashes anywhere.

REFERENCE (vetted, ${ln}):
${lang === "fr" ? "Everyday French: je, tu, vous, il, elle, on, ils. Keep articles and gender agreement. Past uses avoir or être plus the participle. Everyday future uses aller plus infinitive. Natural spoken negation drops ne. Use tu with friends, vous with strangers." : referenceText(lang)}

${expected ? `THE LEARNER WAS ASKED TO SAY THIS EXACT LINE: ${JSON.stringify(expected)}. Judge the attempt against it: if the meaning is right and most words match, ok is true and target is that line. Hyphens, commas, full stops, capitals, spelling variants, and the order of two separate sentences never count as differences. Tag only real differences that change meaning or grammar, and mention any missing word by type missing-word.\n` : ""}
LEARNER LINE: ${JSON.stringify(text)}

Return STRICT JSON only, no markdown:
{
  "heard_as": "english" | "target" | "mixed",
  "target": "the best colloquial ${ln} sentence, romanized",
  "english": "plain English meaning of target",
  "ok": true or false (true when the learner's ${ln} was already right, or the input was English),
  "corrections": [{"type": "tense", "was": "what they said", "now": "the fixed piece", "why": "reusable one-line rule"}],
  "words": [{"word": "each word of target in order", "meaning": "short English gloss, note stem + ending for the verb"}],
  "tip": "one short grammar tip that generalizes from this sentence"
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
      generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
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
  const s = typeof value === "string" ? value.replace(/\u2014/gu, ",") : "";
  if (!hasNativeScript(s)) return s;
  const out = await romanizeText(s, code);
  if (out && out !== "Romanization unavailable" && !hasNativeScript(out)) return out;
  return s.replace(/[ऀ-ॿ஀-௿ಀ-೿]+/gu, "").replace(/\s+/g, " ").trim();
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text.replace(/\u2014/gu, ",").trim().slice(0, 300) : "";
  const lang: Lang = LANGS.includes(body.lang) ? body.lang : "kn";
  const gender: "m" | "f" = body.gender === "f" ? "f" : "m";
  const expected = typeof body.expected === "string" && body.expected.trim() ? body.expected.trim().slice(0, 200) : null;
  if (!text) return NextResponse.json({ error: "Type or say one sentence first." }, { status: 400 });
  if (!GEMINI_KEY) return NextResponse.json({ error: "The checker is not configured." }, { status: 500 });

  const raw = await callGemini(prompt(lang, text, gender, expected));
  if (!raw) return NextResponse.json({ error: "The checker did not answer. Try again." }, { status: 502 });
  const code = CODE[lang];
  const correctionsIn = Array.isArray(raw.corrections) ? (raw.corrections as Correction[]).slice(0, 3) : [];
  const corrections: Correction[] = [];
  for (const c of correctionsIn) {
    const type = typeof c?.type === "string" && TYPES.has(c.type) ? c.type : "word-choice";
    corrections.push({ type, was: await roman(c?.was, code), now: await roman(c?.now, code), why: await roman(c?.why, code) });
  }
  const wordsIn = Array.isArray(raw.words) ? (raw.words as { word: string; meaning: string }[]).slice(0, 14) : [];
  const words: { word: string; meaning: string }[] = [];
  for (const w of wordsIn) words.push({ word: await roman(w?.word, code), meaning: await roman(w?.meaning, code) });
  const heard = raw.heard_as === "english" || raw.heard_as === "target" || raw.heard_as === "mixed" ? raw.heard_as : "mixed";
  const result: CheckResult = {
    heard_as: heard,
    target: await roman(raw.target, code),
    english: await roman(raw.english, code),
    ok: heard === "english" ? true : Boolean(raw.ok) || corrections.length === 0,
    corrections,
    words: words.filter((w) => w.word),
    tip: await roman(raw.tip, code),
  };
  if (!result.target) return NextResponse.json({ error: "The checker did not answer. Try again." }, { status: 502 });
  return NextResponse.json(result);
}
