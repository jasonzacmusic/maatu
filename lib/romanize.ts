const NATIVE_SCRIPT = /[\u0900-\u097f\u0b80-\u0bff\u0c80-\u0cff]/u;

export function hasNativeScript(text: string) {
  return NATIVE_SCRIPT.test(text);
}

export async function romanizeText(text: string, sourceLanguageCode: string) {
  const trimmed = text.trim();
  if (!trimmed || !hasNativeScript(trimmed)) return trimmed;

  const key = process.env.SARVAM_API_KEY;
  if (!key) return "Romanization unavailable";

  try {
    const response = await fetch("https://api.sarvam.ai/transliterate", {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-subscription-key": key },
      body: JSON.stringify({
        input: trimmed.slice(0, 1000),
        source_language_code: sourceLanguageCode,
        target_language_code: "en-IN",
        numerals_format: "international",
      }),
    });
    if (!response.ok) return "Romanization unavailable";
    const data = await response.json();
    const result = typeof data.transliterated_text === "string" ? data.transliterated_text.trim() : "";
    return result && !hasNativeScript(result) ? result : "Romanization unavailable";
  } catch {
    return "Romanization unavailable";
  }
}
