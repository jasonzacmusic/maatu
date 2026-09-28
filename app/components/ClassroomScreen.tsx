import { ALL_LESSONS, courseStatus, getDone, LANG_NAME, UNITS } from "@/lib/curriculum";
import { C, DISPLAY, HOST, LINE, LINE_SOFT, type Lang } from "@/lib/maatu-design";
import { LanguageSelector } from "./LanguageSelector";

type ClassroomScreenProps = {
  lang: Lang;
  onLanguageChange: (lang: Lang) => void;
  onTutor: () => void;
  onLesson: (lessonId: string) => void;
  onBuild: () => void;
};

export function ClassroomScreen({ lang, onLanguageChange, onTutor, onLesson, onBuild }: ClassroomScreenProps) {
  const done = getDone(lang);
  const status = courseStatus(lang);
  const host = HOST[lang];
  const percent = Math.round((status.completed / status.total) * 100);
  let lessonIndex = 0;

  return (
    <div className="absolute inset-0 overflow-y-auto" style={{ background: C.night }}>
      <div className="relative mx-auto max-w-[760px] px-6 pb-28 pt-12 lg:pt-14">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold" style={{ color: C.sodium, letterSpacing: 1.4 }}>
              FOUNDATION COURSE
            </div>
            <h1 className="mt-1" style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: 30, lineHeight: 1.05, color: C.milk }}>
              Learn {LANG_NAME[lang]} with {host.name}
            </h1>
            <p className="mt-2 max-w-[520px] text-[13.5px] leading-relaxed" style={{ color: C.muted }}>
              Start from zero. Your teacher explains, listens, corrects one thing at a time, and checks what you can say.
            </p>
          </div>
          <div
            className="flex h-12 w-12 flex-none items-center justify-center rounded-full text-[13px] font-bold"
            style={{ background: "rgba(255,179,92,0.14)", color: C.sodium, border: "1px solid rgba(255,179,92,0.32)" }}
            aria-label={`${status.completed} of ${status.total} lessons complete`}
          >
            {status.completed}/{status.total}
          </div>
        </div>

        <div className="mt-5 rounded-[16px] p-4" style={{ background: C.tar, border: `1px solid ${LINE}` }}>
          <LanguageSelector lang={lang} onChange={onLanguageChange} />
        </div>

        <section className="mt-4 rounded-[18px] p-5" style={{ background: "linear-gradient(135deg,rgba(255,179,92,0.17),rgba(232,80,58,0.07))", border: "1px solid rgba(255,179,92,0.34)" }}>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold" style={{ color: C.sodium, letterSpacing: 1 }}>
              {status.finished ? "COURSE COMPLETE" : status.completed === 0 ? "START HERE" : "CONTINUE HERE"}
            </span>
            <span className="text-[11px]" style={{ color: C.muted }}>
              About 10 min
            </span>
          </div>
          <h2 className="mt-2 text-[20px] font-bold" style={{ color: C.milk }}>
            Lesson {status.nextNumber}: {status.next.title}
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed" style={{ color: C.muted }}>
            {status.next.objective}
          </p>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full" style={{ background: "rgba(242,237,226,0.09)" }} aria-hidden="true">
            <div className="h-full rounded-full" style={{ width: `${percent}%`, background: C.sodium }} />
          </div>
          <button
            onClick={() => onLesson(status.next.id)}
            className="mt-4 w-full rounded-[13px] py-3.5 text-[15px] font-bold focus-visible:outline focus-visible:outline-2"
            style={{ background: C.sodium, color: C.ink, outlineColor: C.milk }}
          >
            {status.completed === 0 ? "Preview your first lesson" : status.finished ? "Review Lesson 1" : "Continue the course"}
          </button>
        </section>

        {status.completed === 0 && (
          <section className="mt-4 rounded-[16px] p-4" style={{ background: C.base, border: `1px solid ${LINE_SOFT}` }}>
            <div className="text-[12px] font-bold" style={{ color: C.milk }}>
              Every lesson follows the same calm rhythm
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {["Listen and repeat", "Use it yourself", "Pass a speaking check"].map((step, index) => (
                <div key={step} className="rounded-[11px] p-2.5" style={{ background: "rgba(242,237,226,0.04)" }}>
                  <div className="text-[11px] font-bold" style={{ color: C.sodium }}>
                    {index + 1}
                  </div>
                  <div className="mt-1 text-[11.5px] leading-snug" style={{ color: C.muted }}>
                    {step}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <button
          onClick={onTutor}
          className="mt-4 flex w-full items-center gap-3.5 rounded-[16px] p-4 text-left focus-visible:outline focus-visible:outline-2"
          style={{ background: "linear-gradient(135deg, rgba(191,239,219,0.13), rgba(191,239,219,0.04))", border: "1px solid rgba(191,239,219,0.28)", outlineColor: C.tube }}
        >
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full text-[18px]" style={{ background: "rgba(191,239,219,0.12)" }} aria-hidden="true">
            ?
          </span>
          <span className="flex-1">
            <span className="block text-[15px] font-bold" style={{ color: C.milk }}>
              Just talk with {host.name}
            </span>
            <span className="mt-0.5 block text-[12.5px] leading-snug" style={{ color: "rgba(191,239,219,0.82)" }}>
              Chat about anything, ask her to teach any topic, or invent a scene to act out.
            </span>
          </span>
          <span className="text-[20px]" style={{ color: C.tube }} aria-hidden="true">
            ›
          </span>
        </button>

        <button
          onClick={onBuild}
          className="mt-3 flex w-full items-center gap-3.5 rounded-[16px] p-4 text-left focus-visible:outline focus-visible:outline-2"
          style={{ background: C.tar, border: `1px solid ${LINE}`, outlineColor: C.sodium }}
        >
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full text-[16px]" style={{ background: "rgba(255,179,92,0.10)" }} aria-hidden="true">
            🧩
          </span>
          <span className="flex-1">
            <span className="block text-[15px] font-bold" style={{ color: C.milk }}>
              Build a sentence
            </span>
            <span className="mt-0.5 block text-[12.5px] leading-snug" style={{ color: C.muted }}>
              Tap who, the action, what, and when. The spoken line appears with the beats to say it, in any tense.
            </span>
          </span>
          <span className="text-[20px]" style={{ color: C.sodium }} aria-hidden="true">
            ›
          </span>
        </button>

        <div className="mb-3 mt-7 flex items-end justify-between">
          <div>
            <div className="text-[16px] font-bold" style={{ color: C.milk }}>
              Course map
            </div>
            <div className="mt-0.5 text-[12px]" style={{ color: C.muted }}>
              {ALL_LESSONS.length} voice lessons, in order
            </div>
          </div>
          <div className="text-[12px] font-semibold" style={{ color: C.tube }}>
            {status.completed} complete
          </div>
        </div>

        <div className="flex flex-col gap-5">
          {UNITS.map((unit) => {
            const unitDone = unit.lessons.filter((lesson) => done.has(lesson.id)).length;
            return (
              <section key={unit.unit}>
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-[11px] font-bold" style={{ letterSpacing: 1.3, color: C.sodium }}>
                    {unit.unit.toUpperCase()}
                  </div>
                  <div className="text-[11px]" style={{ color: C.faint }}>
                    {unitDone}/{unit.lessons.length}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {unit.lessons.map((lesson) => {
                    lessonIndex += 1;
                    const isDone = done.has(lesson.id);
                    const isNext = lesson.id === status.next.id && !status.finished;
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => onLesson(lesson.id)}
                        className="flex items-center gap-3.5 rounded-[14px] p-3.5 text-left focus-visible:outline focus-visible:outline-2"
                        style={{
                          background: C.base,
                          border: isDone ? "1px solid rgba(191,239,219,0.20)" : isNext ? "1px solid rgba(255,179,92,0.34)" : `1px solid ${LINE_SOFT}`,
                          outlineColor: C.tube,
                        }}
                      >
                        <span
                          className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full text-[13px] font-bold"
                          style={{
                            background: isDone ? "rgba(191,239,219,0.14)" : isNext ? "rgba(255,179,92,0.16)" : C.elevated,
                            color: isDone ? C.tube : isNext ? C.sodium : C.faint,
                          }}
                        >
                          {isDone ? "✓" : lessonIndex}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[14.5px] font-semibold" style={{ color: C.milk }}>
                            {lesson.title}
                          </span>
                          <span className="mt-0.5 block overflow-hidden text-ellipsis whitespace-nowrap text-[12px]" style={{ color: C.muted }}>
                            {isDone ? "Completed, tap to review" : isNext ? "Recommended next" : lesson.objective}
                          </span>
                        </span>
                        <span className="text-[18px]" style={{ color: isNext ? C.sodium : C.faint }} aria-hidden="true">
                          ›
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
