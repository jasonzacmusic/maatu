import type { Lang } from "./maatu-design";

// Languages a learner can see any phrase in ("Say it in…"). The four studio
// languages plus languages that only need translation and a voice today.
// Adding a future language is one row here; a full studio language also needs
// its course, sentence lab grammar and scene personas.
export type ExtraLang = "ml" | "te";
export type SpeakLang = Lang | ExtraLang;

export const SAY_IT: {
  code: SpeakLang;
  name: string;
  bcp: string;
  city: string;
  studio: boolean;
}[] = [
  { code: "ta", name: "Tamil", bcp: "ta-IN", city: "Chennai", studio: true },
  { code: "kn", name: "Kannada", bcp: "kn-IN", city: "Bengaluru", studio: true },
  { code: "hi", name: "Hindi", bcp: "hi-IN", city: "Delhi", studio: true },
  { code: "ml", name: "Malayalam", bcp: "ml-IN", city: "Kochi", studio: false },
  { code: "te", name: "Telugu", bcp: "te-IN", city: "Hyderabad", studio: false },
  { code: "fr", name: "French", bcp: "fr-FR", city: "Paris", studio: true },
];

export const EXTRA_LANGS = SAY_IT.filter((l) => !l.studio).map(
  (l) => l.code as ExtraLang,
);

export function isSpeakLang(value: unknown): value is SpeakLang {
  return SAY_IT.some((l) => l.code === value);
}

export function isExtraLang(value: unknown): value is ExtraLang {
  return EXTRA_LANGS.includes(value as ExtraLang);
}

export function sayItName(code: SpeakLang) {
  return SAY_IT.find((l) => l.code === code)?.name ?? code;
}
