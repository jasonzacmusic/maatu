import { LANGUAGES } from "./languages";
import type { Lang } from "./maatu-design";

const KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const cache = new Map<string, { audio: string; mime: string }>();

async function voiceScript(text: string, lang: Lang) {
  if (lang === "fr") return text;
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent", {
    method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": KEY! },
    body: JSON.stringify({ contents: [{ parts: [{ text: `Convert ONLY this romanized spoken ${LANGUAGES[lang].name} into its native script for speech synthesis. Preserve exactly the colloquial words and meaning. Keep English loanwords in English. Do not translate, formalize, explain, or add a romanized copy. Return only the line.\n${text}` }] }], generationConfig: { temperature: 0 } }),
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error("Pronunciation preparation is unavailable.");
  const data = await response.json();
  const native = data.candidates?.[0]?.content?.parts?.find((p: { text?: string }) => p.text)?.text?.trim();
  if (!native) throw new Error("Pronunciation preparation is unavailable.");
  return native;
}

export async function synthesizeSpeech(text: string, lang: Lang, pace = 0.9) {
  const id = `${lang}:${pace}:${text}`;
  const cached = cache.get(id);
  if (cached) return cached;
  if (!KEY) throw new Error("Voice is not configured.");
  const native = await voiceScript(text, lang);
  const language = LANGUAGES[lang];
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": KEY },
    body: JSON.stringify({
      model: process.env.MAATU_TTS_MODEL || "gemini-3.8-flash-tts",
      input: [{ type: "user_input", content: [{ type: "text", text: native, annotations: [{ type: "speech_metadata", style: `A native speaker from ${language.city}, speaking natural colloquial ${language.name}. ${pace < 0.8 ? "Slow, clear speech with short pauses between phrases." : "Relaxed conversational pace."} Authentic vowel length, consonants, and phrase rhythm. Read the exact words.` }] }] }],
      response_format: { type: "audio" }, generation_config: { speech_config: [{ voice: lang === "kn" ? "Kore" : lang === "ta" ? "Leda" : "Aoede" }] },
    }), signal: AbortSignal.timeout(35000),
  });
  if (response.ok) {
    const data = await response.json();
    const blocks = (data.steps ?? []).flatMap((s: { content?: { type: string; data?: string; mime_type?: string }[] }) => s.content ?? []);
    const audio = blocks.filter((b: { type: string; data?: string }) => b.type === "audio" && b.data).at(-1);
    if (audio?.data) {
      const result = { audio: audio.data as string, mime: audio.mime_type || "audio/wav" };
      if (cache.size >= 100) cache.delete(cache.keys().next().value!);
      cache.set(id, result);
      return result;
    }
  }
  if (lang !== "fr" && process.env.SARVAM_API_KEY) {
    const speaker = { kn: "shreya", hi: "pooja", ta: "ishita" }[lang];
    const fallback = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST", headers: { "Content-Type": "application/json", "api-subscription-key": process.env.SARVAM_API_KEY },
      body: JSON.stringify({ text: native, target_language_code: language.code, speaker, model: "bulbul:v3", pace }),
      signal: AbortSignal.timeout(20000),
    });
    if (fallback.ok) {
      const data = await fallback.json();
      if (data.audios?.[0]) return { audio: data.audios[0] as string, mime: "audio/wav" };
    }
  }
  throw new Error("The pronunciation voice could not respond. Try again.");
}
