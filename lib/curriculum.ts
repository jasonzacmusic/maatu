import curriculum from "@/curriculum.json";
import type { PersonaMeta } from "./personas.generated";
import type { Lang } from "./maatu-design";

// Classroom mode: structured lessons and a free-conversation tutor, taught by a
// teacher who leads and corrects. No em dashes anywhere.

export type Lesson = {
  id: string;
  title: string;
  objective: string;
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
    ? `${LANG_NAME[lang]} · free conversation`
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
    rubric: [],
  };
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
