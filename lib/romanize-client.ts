import Sanscript from "@indic-transliteration/sanscript";

export const NATIVE_SCRIPT = /[\u0900-\u097f\u0b80-\u0bff\u0c00-\u0d7f]/u;

// Transliterate the actual script, not a guessed language. Keep English and
// names unchanged. This runs locally for interim captions as well as finals.
export function romanizeDisplay(text: string) {
  return text
    .replace(
      /[\u0900-\u097f]+|[\u0b80-\u0bff]+|[\u0c80-\u0cff]+|[\u0c00-\u0c7f]+|[\u0d00-\u0d7f]+/gu,
      (run) => {
        const script = /[\u0c80-\u0cff]/u.test(run)
          ? "kannada"
          : /[\u0b80-\u0bff]/u.test(run)
            ? "tamil"
            : /[\u0c00-\u0c7f]/u.test(run)
              ? "telugu"
              : /[\u0d00-\u0d7f]/u.test(run)
                ? "malayalam"
                : "devanagari";
        let latin = Sanscript.t(
          run
            .replace(/ऑ/g, "ओ")
            .replace(/ऍ/g, "ए")
            .replace(/ॉ/g, "ो")
            .replace(/ॅ/g, "े"),
          script,
          "iast",
        );
        // Sanscript maps Tamil through aspirated Sanskrit consonants. Restore
        // Tamil phonemic spelling instead of displaying bh/gh/dh in every word.
        if (script === "tamil")
          latin = latin
            .replace(/ṅgh/g, "ng")
            .replace(/gh/g, "k")
            .replace(/bh/g, "p")
            .replace(/ḍh/g, "t")
            .replace(/dh/g, "t")
            .replace(/ṟṟ/g, "tr");
        latin = latin.replace(/[|]+/g, ".");
        if (script === "devanagari")
          latin = latin
            .replace(/[ṃṁ](?=[.!?]*$)/g, "n")
            .replace(/a(?=[.!?]*$)/g, "")
            .replace(/ch/g, "chh")
            .replace(/c(?!h)/g, "ch");
        latin = latin.replace(/[ṃṁ](?=[kgcjtdnsśṣḍṭ])/g, "n");
        return latin
          .replace(/ā/g, "aa")
          .replace(/ī/g, "ee")
          .replace(/ū/g, "oo")
          .replace(/ē/g, "e")
          .replace(/ō/g, "o")
          .replace(/[śṣ]/g, "sh")
          .replace(/[ṅñ]/g, "n")
          .replace(/[ṃṁ]/g, "m")
          .replace(/ṛ/g, "ru")
          .replace(/~/g, "n")
          .normalize("NFD")
          .replace(/\p{Mark}/gu, "")
          .replace(/[|]+/g, ".");
      },
    )
    .replace(/\u2014/gu, ",");
}
