import config from "../languages.json";

// One place for every language: languages.json at the repo root, shared with
// the voice agent (agent/languages.py). Change a voice or a language code
// there and every call, Hear it button and coach check follows.
// No em dashes anywhere.

type LanguageConfig = {
  name: string;
  code: string;
  city: string;
  teacher: { name: string; gender: string; voice: string };
  engine: string;
  voiceModel: string;
  speakers: Record<string, string>;
  hearingHints: string;
};

export const LANGUAGES = config.languages as Record<string, LanguageConfig>;

// The Indian languages: the ones with Sarvam voices, scenes and the course.
export const INDIC = Object.keys(LANGUAGES).filter((k) => LANGUAGES[k].code.endsWith("-IN"));

export function languageCode(lang: string): string {
  return (LANGUAGES[lang] ?? LANGUAGES.kn).code;
}

export function teacherVoice(lang: string): { code: string; speaker: string } {
  const cfg = LANGUAGES[lang] ?? LANGUAGES.kn;
  return { code: cfg.code, speaker: cfg.teacher.voice };
}

// The voice a learner hears on a live call, for Hear it buttons too, so a
// line sounds the same in Build as it does when the teacher says it.
export function callVoice(lang: string): { code: string; model: string; speaker: string } {
  const cfg = LANGUAGES[lang] ?? LANGUAGES.kn;
  const listed = cfg.speakers?.[cfg.teacher.gender];
  return listed
    ? { code: cfg.code, model: cfg.voiceModel, speaker: listed }
    : { code: cfg.code, model: "bulbul:v3", speaker: cfg.teacher.voice };
}
