import { PERSONAS, type PersonaMeta } from "./personas.generated";

// The debrief coach. Runs the real conversation transcript through the brain to
// produce a structured report, then synthesizes a short spoken summary through
// Sarvam. Server side only. No em dashes anywhere.

const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";
const SARVAM_KEY = process.env.SARVAM_API_KEY;

export type Line = { who: "character" | "learner"; text: string };

export type CoachReport = {
  headline: string;
  strength: string;
  duration_min: number;
  takeaways: { you: string; native: string; why: string }[];
  words: [string, string][];
  transcript: [string, string][];
  coach_audio_b64?: string | null;
};

function buildPrompt(persona: PersonaMeta, transcript: Line[]): string {
  const convo = transcript
    .map((l) => `${l.who === "learner" ? "LEARNER" : persona.name.toUpperCase()}: ${l.text}`)
    .join("\n");
  const mode = persona.teachMode
    ? `This was a TEACH MODE session: the learner was TEACHING a music concept to ${persona.name}, a student, in ${persona.languageName}. Evaluate their TEACHING: clarity, whether they used ${persona.languageName} music vocabulary (flag every time they fell back to English for a concept word and give the ${persona.languageName} term), pacing, and whether the student's questions were truly answered.`
    : `This was a role play: the learner practiced spoken ${persona.languageName} with ${persona.name} (${persona.sceneLabel}). Evaluate their spoken ${persona.languageName}.`;
  return `You are the Maatu coach. Warm, direct, no flattery padding. ${mode}
Rubric to weigh: ${persona.rubric.join(", ")}.

Here is the transcript:
${convo}

Return STRICT JSON only, no markdown, matching exactly this shape:
{
  "headline": "3 to 5 word share-card title, second person, e.g. You held your ground",
  "strength": "one genuine specific strength you noticed, one sentence",
  "takeaways": [
    {"you": "what the learner actually said, romanized", "native": "what a native would say instead, romanized", "why": "one short line on why"}
  ],
  "words": [["useful word or phrase from the scene, romanized", "short English meaning"]],
  "summary_spoken": "a warm spoken coach summary under 90 words, English with a few ${persona.languageName} example phrases, exactly three takeaways, no lists just natural speech"
}
Rules: at most 3 takeaways, pick the highest-frequency issues. At most 4 words. Everything romanized in Latin script, never native script. No em dashes anywhere. If the learner barely spoke, still give one honest takeaway and an encouraging strength.`;
}

async function callGemini(prompt: string): Promise<Record<string, unknown> | null> {
  if (!GEMINI_KEY) return null;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.6, responseMimeType: "application/json" },
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : null;
  }
}

async function synthCoachAudio(text: string, languageCode: string): Promise<string | null> {
  if (!SARVAM_KEY || !text) return null;
  try {
    const res = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-subscription-key": SARVAM_KEY },
      body: JSON.stringify({
        text: text.slice(0, 900),
        target_language_code: languageCode,
        speaker: "shreya",
        model: "bulbul:v3",
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const audios = data?.audios;
    return Array.isArray(audios) && audios.length ? audios[0] : null;
  } catch {
    return null;
  }
}

export async function generateReport(
  personaId: string,
  transcript: Line[],
  durationSec: number,
): Promise<CoachReport | null> {
  const persona = PERSONAS[personaId];
  if (!persona) return null;

  const prompt = buildPrompt(persona, transcript);
  const raw = await callGemini(prompt);
  if (!raw) return null;

  const takeaways = Array.isArray(raw.takeaways)
    ? (raw.takeaways as { you: string; native: string; why: string }[]).slice(0, 3)
    : [];
  const words = Array.isArray(raw.words) ? (raw.words as [string, string][]).slice(0, 4) : [];
  const spoken = typeof raw.summary_spoken === "string" ? raw.summary_spoken : "";

  const coachAudio = await synthCoachAudio(spoken, persona.languageCode);

  return {
    headline: typeof raw.headline === "string" ? raw.headline : "Nicely done",
    strength: typeof raw.strength === "string" ? raw.strength : "",
    duration_min: Math.max(1, Math.round(durationSec / 60)),
    takeaways,
    words,
    transcript: transcript.map((l) => [l.who === "learner" ? "you" : "char", l.text] as [string, string]),
    coach_audio_b64: coachAudio,
  };
}
