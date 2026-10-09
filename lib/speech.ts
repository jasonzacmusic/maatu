import { LANGUAGES } from "./languages";
import { VOICE_PERSONAS } from "./voice-personas.generated";
import type { Lang } from "./maatu-design";
import { SAY_IT, isExtraLang, type ExtraLang, type SpeakLang } from "./say-it";

const KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const cache = new Map<string, { audio: string; mime: string }>();

// Same voice choice as the live calls (agent/providers.py): Kannada uses the
// Bulbul v4 conversational speakers, Hindi and Tamil stay on v3.
const V4_SPEAKERS: Partial<Record<Lang, { female: string; male: string }>> = {
  kn: { female: "chaitra_kn_conversation", male: "chetan_kn_conversation" },
};
function sarvamModel(lang: Lang) {
  const configured =
    process.env[`MAATU_SARVAM_TTS_MODEL_${lang.toUpperCase()}`] ||
    (lang === "kn" ? "bulbul:v4-flash" : "");
  if (configured.startsWith("bulbul:v4") && !V4_SPEAKERS[lang])
    return process.env.MAATU_SARVAM_TTS_MODEL || "bulbul:v3";
  return configured || process.env.MAATU_SARVAM_TTS_MODEL || "bulbul:v3";
}

async function convertScript(text: string, lang: Lang) {
  if (lang === "fr" || /[\u0900-\u097f\u0b80-\u0bff\u0c80-\u0cff]/u.test(text))
    return text;
  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": KEY! },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Convert ONLY this romanized spoken ${LANGUAGES[lang].name} into its native script for speech synthesis. Preserve exactly the colloquial words and meaning. Keep English loanwords in English. Do not translate, formalize, explain, or add a romanized copy. Return only the line.\n${text}`,
              },
            ],
          },
        ],
        generationConfig: { temperature: 0 },
      }),
      signal: AbortSignal.timeout(12000),
    },
  );
  if (!response.ok)
    throw new Error("Pronunciation preparation is unavailable.");
  const data = await response.json();
  const native = data.candidates?.[0]?.content?.parts
    ?.find((p: { text?: string }) => p.text)
    ?.text?.trim();
  if (!native) throw new Error("Pronunciation preparation is unavailable.");
  return native;
}

const scriptCache = new Map<string, string>();
const scriptRequests = new Map<string, Promise<string>>();
const audioRequests = new Map<
  string,
  Promise<{ audio: string; mime: string }>
>();

async function voiceScript(text: string, lang: Lang) {
  const id = `${lang}:${text}`;
  const saved = scriptCache.get(id);
  if (saved) return saved;
  const pending = scriptRequests.get(id);
  if (pending) return pending;
  const task = convertScript(text, lang);
  scriptRequests.set(id, task);
  try {
    const native = await task;
    if (scriptCache.size >= 100)
      scriptCache.delete(scriptCache.keys().next().value!);
    scriptCache.set(id, native);
    return native;
  } finally {
    scriptRequests.delete(id);
  }
}

export async function synthesizeSpeech(
  text: string,
  lang: SpeakLang,
  pace = 0.9,
  coachPersona = "",
) {
  const id = `${process.env.MAATU_TTS_PROVIDER || "auto"}:${process.env.MAATU_TTS_MODEL || "default"}:${isExtraLang(lang) ? "" : sarvamModel(lang)}:${lang}:${pace}:${coachPersona}:${text}`;
  const saved = cache.get(id);
  if (saved) return saved;
  const pending = audioRequests.get(id);
  if (pending) return pending;
  const task = isExtraLang(lang)
    ? createExtraSpeech(text, lang, pace)
    : createSpeech(text, lang, pace, coachPersona);
  audioRequests.set(id, task);
  try {
    const audio = await task;
    if (cache.size >= 100) cache.delete(cache.keys().next().value!);
    cache.set(id, audio);
    return audio;
  } finally {
    audioRequests.delete(id);
  }
}

// "Say it in…" languages outside the studio: native script in, one fixed
// Sarvam speaker, no silent provider fallback.
async function createExtraSpeech(text: string, lang: ExtraLang, pace: number) {
  const row = SAY_IT.find((l) => l.code === lang)!;
  if (!process.env.SARVAM_API_KEY)
    throw new Error("This language has no configured voice.");
  const response = await fetch("https://api.sarvam.ai/text-to-speech", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-subscription-key": process.env.SARVAM_API_KEY,
    },
    body: JSON.stringify({
      text,
      target_language_code: row.bcp,
      speaker: "kavya",
      model: process.env.MAATU_SARVAM_TTS_MODEL || "bulbul:v3",
      pace,
    }),
    signal: AbortSignal.timeout(12000),
  }).catch(() => null);
  const data = response?.ok ? await response.json() : null;
  if (data?.audios?.[0])
    return { audio: data.audios[0] as string, mime: "audio/wav" };
  throw new Error("This voice could not prepare the phrase. Try again.");
}

async function createSpeech(
  text: string,
  lang: Lang,
  pace = 0.9,
  coachPersona = "",
) {
  const coachMale =
    !!coachPersona && VOICE_PERSONAS[coachPersona]?.gender !== "male";
  const provider =
    process.env[`MAATU_TTS_PROVIDER_${lang.toUpperCase()}`] ||
    process.env.MAATU_TTS_PROVIDER ||
    (lang === "fr" ? "gemini" : "sarvam");
  if (!["gemini", "sarvam"].includes(provider))
    throw new Error("Unsupported voice adapter.");
  const native = await voiceScript(text, lang);
  const language = LANGUAGES[lang];
  if (provider === "sarvam") {
    if (lang === "fr" || !process.env.SARVAM_API_KEY)
      throw new Error("This language has no configured Sarvam voice.");
    try {
      const response = await fetch("https://api.sarvam.ai/text-to-speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-subscription-key": process.env.SARVAM_API_KEY,
        },
        body: JSON.stringify({
          text: native,
          target_language_code: language.code,
          speaker: (sarvamModel(lang).startsWith("bulbul:v4")
            ? V4_SPEAKERS[lang]
            : undefined)?.[coachMale ? "male" : "female"] ??
            (coachMale
              ? { kn: "kabir", hi: "amit", ta: "rohan" }[lang]
              : { kn: "shreya", hi: "pooja", ta: "ishita" }[lang]),
          model: sarvamModel(lang),
          pace,
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.audios?.[0])
          return { audio: data.audios[0] as string, mime: "audio/wav" };
      }
    } catch {
      /* Retry uses the same fixed speaker, never a different accent. */
    }
    throw new Error("This speaker could not prepare the phrase. Try again.");
  }
  if (!KEY) throw new Error("Voice is not configured.");
  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/interactions",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": KEY },
      body: JSON.stringify({
        model: process.env.MAATU_TTS_MODEL || "gemini-3.8-flash-tts",
        input: [
          {
            type: "user_input",
            content: [
              {
                type: "text",
                text: native,
                annotations: [
                  {
                    type: "speech_metadata",
                    style: `A native speaker from ${language.city}, speaking natural colloquial ${language.name}. ${pace < 0.8 ? "Slow, clear speech with short pauses between phrases." : "Relaxed conversational pace."} Authentic vowel length, consonants, and phrase rhythm. Read the exact words.`,
                  },
                ],
              },
            ],
          },
        ],
        response_format: { type: "audio" },
        generation_config: {
          speech_config: [
            {
              voice: coachMale
                ? "Charon"
                : lang === "kn"
                  ? "Kore"
                  : lang === "ta"
                    ? "Leda"
                    : "Aoede",
            },
          ],
        },
      }),
      signal: AbortSignal.timeout(35000),
    },
  );
  if (response.ok) {
    const data = await response.json();
    const blocks = (data.steps ?? []).flatMap(
      (s: {
        content?: { type: string; data?: string; mime_type?: string }[];
      }) => s.content ?? [],
    );
    const audio = blocks
      .filter(
        (b: { type: string; data?: string }) => b.type === "audio" && b.data,
      )
      .at(-1);
    if (audio?.data) {
      return {
        audio: audio.data as string,
        mime: audio.mime_type || "audio/wav",
      };
    }
  }
  throw new Error("The pronunciation voice could not respond. Try again.");
}
