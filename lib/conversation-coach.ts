import { romanizeDisplay } from "./romanize-client";
import type { Lang } from "./maatu-design";

export const WORD_ROLES = [
  "pronoun",
  "proper noun",
  "verb",
  "noun",
  "adjective",
  "time",
  "place",
  "adverb",
  "particle",
  "article",
  "preposition",
  "conjunction",
] as const;
export type WordRole = (typeof WORD_ROLES)[number];
export type CoachWord = {
  text: string;
  role: WordRole;
  slot: "who" | "action" | "what" | "describe" | "when" | "detail";
  meaning: string;
  note: string;
};
export type CoachVariant = {
  label: string;
  text: string;
  speech: string;
  meaning: string;
  note: string;
};
export type ConversationCoach = {
  phrase: string;
  speech: string;
  meaning: string;
  rule: string;
  words: CoachWord[];
  alternatives: CoachVariant[];
  tenses: CoachVariant[];
  timeNote: string;
};

const letters = (text: string) =>
  text
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}]/gu, "")
    .toLowerCase();
const short = (v: unknown, n = 300) =>
  typeof v === "string"
    ? v
        .trim()
        .slice(0, n)
        .replace(/\u2014/gu, ",")
    : "";

// A coach may annotate a phrase, but cannot silently replace the spoken words.
export function validateCoach(
  raw: Record<string, unknown>,
  spoken: string,
  _lang: Lang,
): ConversationCoach {
  const phrase = short(raw.phrase, 600);
  if (!phrase || !spoken.normalize("NFC").includes(phrase.normalize("NFC")))
    throw new Error("The breakdown did not match the spoken phrase.");
  if (!Array.isArray(raw.words) || !raw.words.length || raw.words.length > 28)
    throw new Error("No word breakdown was available.");
  const words = raw.words.map((value: Record<string, unknown>) => {
    const text = short(value.text, 100);
    if (
      !text ||
      !["who", "action", "what", "describe", "when", "detail"].includes(
        value.slot as string,
      ) ||
      !WORD_ROLES.includes(value.role as WordRole)
    )
      throw new Error("Invalid word role.");
    return {
      text: romanizeDisplay(text),
      role: value.role as WordRole,
      slot:
        value.slot === "who" &&
        /vocative|honorific address|respectful.*address/i.test(
          String(value.note),
        )
          ? ("detail" as const)
          : (value.slot as CoachWord["slot"]),
      meaning: romanizeDisplay(short(value.meaning, 140)),
      note: romanizeDisplay(short(value.note, 220)),
    };
  });
  if (
    letters(words.map((w) => w.text).join(" ")) !==
    letters(romanizeDisplay(phrase))
  )
    throw new Error("The words did not match what was said.");
  function variants(value: unknown, max: number): CoachVariant[] {
    if (!Array.isArray(value)) return [];
    return value
      .slice(0, max)
      .map((v: Record<string, unknown>) => ({
        label: short(v.label, 70),
        text: romanizeDisplay(short(v.text, 500)),
        speech: short(v.text, 500),
        meaning: romanizeDisplay(short(v.meaning, 300)),
        note: romanizeDisplay(short(v.note, 240)),
      }))
      .filter((v) => v.text && v.meaning);
  }
  const meaning = romanizeDisplay(short(raw.meaning, 400)),
    rule = romanizeDisplay(short(raw.rule, 400));
  if (!meaning || !rule) throw new Error("The explanation was incomplete.");
  return {
    phrase: romanizeDisplay(phrase),
    speech: phrase,
    meaning,
    rule,
    words,
    alternatives: variants(raw.alternatives, 3),
    tenses: words.some((w) => w.role === "verb" && /imperative/i.test(w.note))
      ? []
      : variants(raw.tenses, 7).filter(
          (v) =>
            !(
              /come back|came back|return(?:ed)?/i.test(v.meaning) &&
              !/come back|came back|return(?:ed)?/i.test(meaning)
            ) && !/(?:am|is|are|will).*yesterday/i.test(v.meaning),
        ),
    timeNote: words.some((w) => w.role === "verb" && /imperative/i.test(w.note))
      ? "This is a request addressed to your listener. A tense change needs an explicit doer and a statement first; try that in the sentence lab."
      : romanizeDisplay(short(raw.timeNote, 400)),
  };
}
