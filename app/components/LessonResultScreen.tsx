import { ALL_LESSONS, LANG_NAME, lessonAfter, lessonNumber, type Lesson } from "@/lib/curriculum";
import { C, DISPLAY, HOST, LINE, type Lang } from "@/lib/maatu-design";
import type { Line } from "./useMaatuCall";

type LessonResultScreenProps = {
  lang: Lang;
  lesson: Lesson;
  passed: boolean;
  transcript: Line[];
  onCourse: () => void;
  onOpenLesson: (lessonId: string) => void;
  onRetry: () => void;
};

export function LessonResultScreen({ lang, lesson, passed, transcript, onCourse, onOpenLesson, onRetry }: LessonResultScreenProps) {
  const host = HOST[lang];
  const next = lessonAfter(lesson.id);
  const feedback = transcript.filter((line) => line.who === "character").slice(-2);

  return (
    <div className="absolute inset-0 overflow-y-auto" style={{ background: C.night }}>
      <div className="absolute inset-x-0 top-0 h-[310px] pointer-events-none" style={{ background: passed ? "radial-gradient(200px 160px at 50% 0, rgba(191,239,219,0.23), transparent 72%)" : "radial-gradient(200px 160px at 50% 0, rgba(255,179,92,0.20), transparent 72%)" }} aria-hidden="true" />
      <div className="relative mx-auto flex min-h-full max-w-[540px] flex-col px-6 pb-8 pt-16">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full text-[25px] font-bold" style={{ background: passed ? "rgba(191,239,219,0.14)" : "rgba(255,179,92,0.14)", color: passed ? C.tube : C.sodium, border: `1px solid ${passed ? "rgba(191,239,219,0.34)" : "rgba(255,179,92,0.34)"}` }}>
            {passed ? "✓" : "↻"}
          </div>
          <div className="mt-4 text-[11px] font-bold" style={{ color: passed ? C.tube : C.sodium, letterSpacing: 1.2 }}>
            {passed ? "SPEAKING CHECK PASSED" : "LESSON PAUSED"}
          </div>
          <h1 className="mx-auto mt-2" style={{ fontFamily: DISPLAY, fontSize: 31, fontWeight: 500, lineHeight: 1.08, color: C.milk, maxWidth: 420 }}>
            {passed ? `You completed ${lesson.title}.` : "You are still learning this one."}
          </h1>
          <p className="mx-auto mt-3 max-w-[410px] text-[14px] leading-relaxed" style={{ color: C.muted }}>
            {passed
              ? `Lesson ${lessonNumber(lesson.id)} of ${ALL_LESSONS.length} is complete in your ${LANG_NAME[lang]} course.`
              : `A lesson only completes after ${host.name}'s speaking check. There is no penalty, and you can continue whenever you like.`}
          </p>
        </div>

        {feedback.length > 0 && (
          <section className="mt-7 rounded-[17px] p-5" style={{ background: C.tar, border: `1px solid ${LINE}` }}>
            <div className="text-[11px] font-bold" style={{ color: C.mono, letterSpacing: 1 }}>
              {host.name.toUpperCase()}'S LAST FEEDBACK
            </div>
            <div className="mt-3 flex flex-col gap-3">
              {feedback.map((line, index) => (
                <p key={`${line.text}-${index}`} className="text-[14px] leading-relaxed" style={{ color: index === feedback.length - 1 ? C.milk : C.muted }}>
                  {line.text}
                </p>
              ))}
            </div>
          </section>
        )}

        <section className="mt-3 rounded-[15px] p-4" style={{ background: passed ? "rgba(191,239,219,0.07)" : "rgba(255,179,92,0.07)", border: `1px solid ${passed ? "rgba(191,239,219,0.18)" : "rgba(255,179,92,0.18)"}` }}>
          <div className="text-[12px] font-bold" style={{ color: passed ? C.tube : C.sodium }}>
            {passed ? "What happens next" : "Best next step"}
          </div>
          <p className="mt-1 text-[12.5px] leading-relaxed" style={{ color: C.muted }}>
            {passed
              ? next
                ? `Preview Lesson ${lessonNumber(next.id)}, ${next.title}, or review this lesson any time from the course map.`
                : "You finished the foundation course. Keep using Ask Your Teacher and the practice conversations."
              : `Restart ${lesson.title}. ${host.name} will lead it from the beginning and give you another speaking check.`}
          </p>
        </section>

        <div className="mt-auto flex flex-col gap-3 pt-7">
          {passed && next ? (
            <button onClick={() => onOpenLesson(next.id)} className="rounded-[16px] py-3.5 text-[15px] font-bold focus-visible:outline focus-visible:outline-2" style={{ background: C.sodium, color: C.ink, outlineColor: C.milk }}>
              Preview Lesson {lessonNumber(next.id)}
            </button>
          ) : !passed ? (
            <button onClick={onRetry} className="rounded-[16px] py-3.5 text-[15px] font-bold focus-visible:outline focus-visible:outline-2" style={{ background: C.sodium, color: C.ink, outlineColor: C.milk }}>
              Restart this lesson
            </button>
          ) : null}
          <button onClick={onCourse} className="rounded-[16px] py-3.5 text-[15px] font-semibold focus-visible:outline focus-visible:outline-2" style={{ background: "transparent", color: C.milk, border: `1px solid ${LINE}`, outlineColor: C.tube }}>
            Back to the course
          </button>
        </div>
      </div>
    </div>
  );
}
