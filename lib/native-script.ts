import { LANGUAGES } from "./languages";

// Hear it buttons get a line in English letters (the only script a learner
// sees). A Sarvam voice reading English letters sounds like an outsider, so the
// line is written in its own script first, keeping every colloquial word
// exactly as spoken. Gemini does this carefully; Sarvam's own converter is the
// fallback because it sometimes swaps a spoken word for its formal or wrong
// form (nudistini became naadistini, 3-Nov-2026). No em dashes anywhere.

const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const SARVAM_KEY = process.env.SARVAM_API_KEY;
const MODEL = process.env.SCRIPT_MODEL || "gemini-3.5-flash";

const SCRIPT: Record<string, RegExp> = {
  kn: /[ಀ-೿]/u,
  hi: /[ऀ-ॿ]/u,
  ta: /[஀-௿]/u,
  ml: /[ഀ-ൿ]/u,
  te: /[ఀ-౿]/u,
};

// Lines repeat a lot (seeded sentences, the same correction), so a warm
// server keeps recent answers.
const cache = new Map<string, string>();
function remember(key: string, value: string) {
  if (cache.size > 800) cache.delete(cache.keys().next().value as string);
  cache.set(key, value);
}

// Right script, and no English letters left over.
function looksRight(text: string, lang: string) {
  return SCRIPT[lang]?.test(text) && !/[A-Za-z]/.test(text) && text.length < 600;
}

async function withGemini(text: string, lang: string): Promise<string | null> {
  if (!GEMINI_KEY) return null;
  const name = LANGUAGES[lang]?.name ?? "Kannada";
  const prompt =
    `This is everyday spoken ${name}, written in English letters: ${text}\n` +
    `Write the same sentence in ${name} script so a text-to-speech voice says exactly these sounds. ` +
    "Spell each word exactly as it is spoken here, colloquial forms included. Never change a word to its formal or written form, " +
    "never translate, never add or drop a word. Long vowels are written aa, ee, oo; doubled consonants are doubled. " +
    "Write English loan words (piano, guitar, coffee) in the script as they sound. Keep the punctuation. Reply with the sentence only.";
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0, thinkingConfig: { thinkingLevel: "minimal" } },
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const parts: { text?: string; thought?: boolean }[] = data?.candidates?.[0]?.content?.parts ?? [];
    const out = parts.filter((p) => !p.thought).map((p) => p.text ?? "").join("").trim();
    return looksRight(out, lang) ? out : null;
  } catch {
    return null;
  }
}

async function withSarvam(text: string, lang: string): Promise<string | null> {
  if (!SARVAM_KEY) return null;
  try {
    const res = await fetch("https://api.sarvam.ai/transliterate", {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-subscription-key": SARVAM_KEY },
      body: JSON.stringify({ input: text, source_language_code: "en-IN", target_language_code: LANGUAGES[lang].code }),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const out = typeof data.transliterated_text === "string" ? data.transliterated_text.trim() : "";
    return looksRight(out, lang) ? out : null;
  } catch {
    return null;
  }
}

// Native script for the voice, or null when neither converter gave a clean
// line (the caller then speaks the English-letter line as before).
export async function toNativeScript(text: string, lang: string): Promise<string | null> {
  if (!SCRIPT[lang]) return null;
  const key = `${lang}:${text}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const out = (await withGemini(text, lang)) ?? (await withSarvam(text, lang));
  if (out) remember(key, out);
  return out;
}
