import { LANG_NAME } from "@/lib/curriculum";
import { C, LINE, type Lang } from "@/lib/maatu-design";

const LANGS: Lang[] = ["kn", "hi", "ta"];

type LanguageSelectorProps = {
  lang: Lang;
  onChange: (lang: Lang) => void;
  label?: string;
};

export function LanguageSelector({ lang, onChange, label = "Course language" }: LanguageSelectorProps) {
  return (
    <div>
      <div className="mb-2 text-[11px] font-bold" style={{ color: C.mono, letterSpacing: 1 }}>
        {label.toUpperCase()}
      </div>
      <div className="grid grid-cols-3 gap-2" role="group" aria-label={label}>
        {LANGS.map((option) => {
          const selected = lang === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              aria-pressed={selected}
              className="rounded-[11px] px-2 py-2.5 text-[13px] font-semibold focus-visible:outline focus-visible:outline-2"
              style={{
                background: selected ? "rgba(255,179,92,0.14)" : C.base,
                color: selected ? C.sodium : C.muted,
                border: selected ? "1px solid rgba(255,179,92,0.42)" : `1px solid ${LINE}`,
                outlineColor: C.sodium,
              }}
            >
              {LANG_NAME[option]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
