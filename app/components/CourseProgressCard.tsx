import { courseStatus, LANG_NAME } from "@/lib/curriculum";
import { C, LINE, type Lang } from "@/lib/maatu-design";

const LANGS: Lang[] = ["kn", "hi", "ta"];

type CourseProgressCardProps = {
  activeLanguage: Lang;
  onOpenCourse: () => void;
};

export function CourseProgressCard({ activeLanguage, onOpenCourse }: CourseProgressCardProps) {
  return (
    <section className="mt-6 rounded-[17px] p-5" style={{ background: C.tar, border: `1px solid ${LINE}` }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold" style={{ color: C.sodium, letterSpacing: 1 }}>
            FOUNDATION COURSES
          </div>
          <div className="mt-1 text-[15px] font-semibold" style={{ color: C.milk }}>
            Lessons completed on this device
          </div>
        </div>
        <button onClick={onOpenCourse} className="rounded-full px-3 py-1.5 text-[11.5px] font-semibold focus-visible:outline focus-visible:outline-2" style={{ background: "rgba(255,179,92,0.11)", color: C.sodium, outlineColor: C.milk }}>
          Open course
        </button>
      </div>
      <div className="mt-4 flex flex-col gap-3">
        {LANGS.map((lang) => {
          const status = courseStatus(lang);
          const percent = Math.round((status.completed / status.total) * 100);
          return (
            <div key={lang}>
              <div className="mb-1.5 flex items-center justify-between text-[12.5px]">
                <span className="font-semibold" style={{ color: lang === activeLanguage ? C.milk : C.muted }}>
                  {LANG_NAME[lang]}
                </span>
                <span style={{ color: status.completed > 0 ? C.tube : C.faint }}>
                  {status.completed}/{status.total}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "rgba(242,237,226,0.08)" }}>
                <div className="h-full rounded-full" style={{ width: `${percent}%`, background: lang === activeLanguage ? C.sodium : C.tube }} />
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-[11.5px] leading-relaxed" style={{ color: C.faint }}>
        Course completion is saved in this browser. Conversation history below is saved after real calls.
      </p>
    </section>
  );
}
