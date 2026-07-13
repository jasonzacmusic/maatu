import { ALL_LESSONS, getDone, LANG_NAME, lessonNumber, type Lesson } from "@/lib/curriculum";
import { C, DISPLAY, HOST, LINE, LINE_SOFT, type Lang } from "@/lib/maatu-design";

type LessonPreviewScreenProps = {
  lang: Lang;
  lesson: Lesson;
  onBack: () => void;
  onStart: () => void;
};

export function LessonPreviewScreen({ lang, lesson, onBack, onStart }: LessonPreviewScreenProps) {
  const number = lessonNumber(lesson.id);
  const reviewing = getDone(lang).has(lesson.id);
  const host = HOST[lang];

  return (
    <div className="absolute inset-0 overflow-y-auto" style={{ background: C.night }}>
      <div className="absolute inset-x-0 top-0 h-[280px] pointer-events-none" style={{ background: "radial-gradient(190px 150px at 50% 0, rgba(255,179,92,0.22), transparent 72%)" }} aria-hidden="true" />
      <div className="relative mx-auto flex min-h-full max-w-[560px] flex-col px-6 pb-8 pt-12">
        <button
          type="button"
          onClick={onBack}
          className="flex w-fit items-center gap-2 rounded-full px-3 py-2 text-[13px] font-semibold focus-visible:outline focus-visible:outline-2"
          style={{ color: C.muted, background: "rgba(242,237,226,0.05)", border: `1px solid ${LINE}`, outlineColor: C.sodium }}
        >
          <span aria-hidden="true">‹</span> Course map
        </button>

        <div className="mt-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full text-[16px] font-bold" style={{ background: "rgba(255,179,92,0.15)", color: C.sodium, border: "1px solid rgba(255,179,92,0.32)" }}>
            {number}
          </div>
          <div className="mt-4 text-[11px] font-bold" style={{ color: C.sodium, letterSpacing: 1.3 }}>
            {LANG_NAME[lang].toUpperCase()} FOUNDATION · LESSON {number} OF {ALL_LESSONS.length}
          </div>
          <h1 className="mx-auto mt-2" style={{ fontFamily: DISPLAY, fontSize: 32, fontWeight: 500, lineHeight: 1.08, color: C.milk, maxWidth: 420 }}>
            {lesson.title}
          </h1>
          <p className="mx-auto mt-3 max-w-[430px] text-[14px] leading-relaxed" style={{ color: C.muted }}>
            {lesson.objective}
          </p>
        </div>

        <button
          type="button"
          onClick={onStart}
          className="mt-6 w-full rounded-[16px] py-4 text-[16px] font-bold focus-visible:outline focus-visible:outline-2"
          style={{ background: C.sodium, color: C.ink, boxShadow: "0 10px 30px rgba(255,179,92,0.23)", outlineColor: C.milk }}
        >
          {reviewing ? `Review with ${host.name}` : `Start lesson with ${host.name}`}
        </button>
        <div className="mt-2.5 text-center text-[11.5px]" style={{ color: C.faint }}>
          Voice only · Romanized captions available · Microphone required
        </div>

        <section className="mt-6 rounded-[17px] p-5" style={{ background: C.tar, border: `1px solid ${LINE}` }}>
          <div className="flex items-center justify-between">
            <div className="text-[12px] font-bold" style={{ color: C.milk }}>
              What {host.name} will teach
            </div>
            <div className="text-[11px]" style={{ color: C.faint }}>
              About 10 min
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {lesson.teach.map((item) => (
              <span key={item} className="rounded-full px-3 py-1.5 text-[12px]" style={{ background: "rgba(255,179,92,0.09)", color: C.milk, border: "1px solid rgba(255,179,92,0.16)" }}>
                {item}
              </span>
            ))}
          </div>
        </section>

        <section className="mt-3 rounded-[17px] p-5" style={{ background: C.base, border: `1px solid ${LINE_SOFT}` }}>
          <div className="text-[12px] font-bold" style={{ color: C.milk }}>
            Your class, step by step
          </div>
          <div className="mt-4 flex flex-col gap-4">
            {[
              ["1", "Listen", `${host.name} says one everyday phrase and explains it in simple English.`],
              ["2", "Speak", "You repeat, answer, and build your own short sentences."],
              ["3", "Get feedback", "Your teacher fixes one useful thing at a time, then lets you try again."],
              ["4", "Pass the check", "Three short speaking prompts show whether the lesson is complete."],
            ].map(([step, title, detail]) => (
              <div key={step} className="flex gap-3">
                <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-[11px] font-bold" style={{ background: "rgba(191,239,219,0.11)", color: C.tube }}>
                  {step}
                </span>
                <div>
                  <div className="text-[13px] font-semibold" style={{ color: C.milk }}>
                    {title}
                  </div>
                  <div className="mt-0.5 text-[12.5px] leading-relaxed" style={{ color: C.muted }}>
                    {detail}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-4 rounded-[13px] px-4 py-3 text-[12.5px] leading-relaxed" style={{ background: "rgba(191,239,219,0.08)", color: "rgba(191,239,219,0.88)", border: "1px solid rgba(191,239,219,0.18)" }}>
          Ask any question during class. {host.name} will answer it, help you use the answer, then continue the lesson.
        </div>

      </div>
    </div>
  );
}
