import curriculum from "@/curriculum.json";
import { PERSONAS, type PersonaMeta } from "./personas.generated";
import type { Lang } from "./maatu-design";

// Classroom mode: structured lessons and a free-conversation tutor, taught by a
// teacher who leads and corrects. No em dashes anywhere.

export type Lesson = {
  id: string;
  title: string;
  objective: string;
  teach: string[];
  grammar: string;
  examples_en: string[];
  practice: string[];
  lexicon: Record<Lang, string[]>;
};
export type Unit = { unit: string; lessons: Lesson[] };

export const UNITS: Unit[] = curriculum.units as Unit[];
export const ALL_LESSONS: Lesson[] = UNITS.flatMap((u) => u.lessons);

export const LANG_NAME: Record<Lang, string> = { kn: "Kannada", hi: "Hindi", ta: "Tamil" };
export const LANG_CODE: Record<Lang, string> = { kn: "kn-IN", hi: "hi-IN", ta: "ta-IN" };
const TEACHER_NAME: Record<Lang, string> = { kn: "Meera", hi: "Anjali", ta: "Kavya" };

// A synthetic PersonaMeta so the Call screen can render a class or tutor session.
export function teacherMeta(lang: Lang, lessonId: string | null): PersonaMeta {
  const isTutor = lessonId === null;
  const lesson = lessonId ? ALL_LESSONS.find((l) => l.id === lessonId) : null;
  const label = isTutor
    ? `${LANG_NAME[lang]} · just talking`
    : `${LANG_NAME[lang]} class · ${lesson?.title ?? "lesson"}`;
  return {
    id: isTutor ? `tutor-${lang}` : `teacher-${lang}-${lessonId}`,
    language: lang,
    languageCode: LANG_CODE[lang],
    languageName: LANG_NAME[lang],
    scenario: isTutor ? "tutor" : "class",
    shop: "school",
    name: TEACHER_NAME[lang],
    level: 0,
    sceneLabel: label,
    teachMode: false,
    rubric: isTutor
      ? ["what the learner asked for", "meaning communicated", "one useful next step"]
      : ["lesson goal", "meaning communicated", "final speaking check"],
  };
}

export function personaMeta(personaId: string): PersonaMeta | null {
  if (PERSONAS[personaId]) return PERSONAS[personaId];
  const tutor = /^tutor-(kn|hi|ta)$/.exec(personaId);
  if (tutor) return teacherMeta(tutor[1] as Lang, null);
  const teacher = /^teacher-(kn|hi|ta)-(.+)$/.exec(personaId);
  if (!teacher || !ALL_LESSONS.some((lesson) => lesson.id === teacher[2])) return null;
  return teacherMeta(teacher[1] as Lang, teacher[2]);
}

// Per-device lesson completion, so the syllabus can show progress honestly
// without a backend.
export function doneKey(lang: Lang) {
  return `maatu-done-${lang}`;
}

export function getDone(lang: Lang): Set<string> {
  if (typeof localStorage === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(doneKey(lang)) || "[]"));
  } catch {
    return new Set();
  }
}

export function markDone(lang: Lang, lessonId: string) {
  if (typeof localStorage === "undefined") return;
  const s = getDone(lang);
  s.add(lessonId);
  localStorage.setItem(doneKey(lang), JSON.stringify([...s]));
}

export function lessonNumber(lessonId: string) {
  const index = ALL_LESSONS.findIndex((lesson) => lesson.id === lessonId);
  return index >= 0 ? index + 1 : 1;
}

export function lessonAfter(lessonId: string) {
  const index = ALL_LESSONS.findIndex((lesson) => lesson.id === lessonId);
  return index >= 0 ? ALL_LESSONS[index + 1] ?? null : null;
}

export function courseStatus(lang: Lang) {
  const done = getDone(lang);
  const completed = ALL_LESSONS.filter((lesson) => done.has(lesson.id)).length;
  const next = ALL_LESSONS.find((lesson) => !done.has(lesson.id)) ?? ALL_LESSONS[0];
  return {
    completed,
    total: ALL_LESSONS.length,
    next,
    nextNumber: lessonNumber(next.id),
    finished: completed >= ALL_LESSONS.length,
  };
}

export function lessonWasMastered(
  transcript: { who: "character" | "learner"; text: string }[],
  lesson: Lesson,
  lang: Lang,
) {
  const normalized = transcript.filter(
    (line, index, rows) =>
      index === 0 || line.who !== rows[index - 1].who || line.text !== rows[index - 1].text,
  );
  const checkStarted = normalized.findIndex(
    (line) => line.who === "character" && /\bfinal\s+speaking\s+check\b/i.test(line.text),
  );
  const completed = normalized.findIndex(
    (line, index) =>
      index > checkStarted && line.who === "character" && /\blesson\s+complete\b/i.test(line.text),
  );
  if (checkStarted < 0 || completed < 0) return false;

  const attempts = normalized
    .slice(checkStarted + 1, completed)
    .filter((line) => line.who === "learner" && line.text.trim().length >= 2);
  if (attempts.length < 3) return false;

  const targetTokens = new Set(
    lesson.lexicon[lang]
      .filter((entry) => !entry.startsWith("note:"))
      .flatMap((entry) => (entry.split("=", 2)[1] ?? "").split(/[(),\s]+/))
      .map((token) => token.toLowerCase().replace(/[^a-z]/g, ""))
      .filter((token) => token.length >= 3),
  );
  const meaningfulAttempts = attempts.filter((line) =>
    /[\u0900-\u097f\u0b80-\u0bff\u0c80-\u0cff]/u.test(line.text) ||
    line.text
      .toLowerCase()
      .split(/[^a-z]+/)
      .some((token) => targetTokens.has(token)),
  );
  return meaningfulAttempts.length >= 2;
}
