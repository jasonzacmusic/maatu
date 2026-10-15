"use client";

import { useMemo, useState } from "react";
import {
  ADJECTIVES,
  ADJ_CATS,
  OBJECTS,
  QUANTITIES,
  QUESTION_WORDS,
  SUBJECT_EXTRAS,
  objectLabel,
  type Adjective,
  type ObjectWord,
} from "@/lib/grammar";
import { SHAPES, type Shape, type ShapeId, type Slot } from "@/lib/shapes";
import { C, LINE, LINE_SOFT, MONO, type Lang } from "@/lib/maatu-design";
import { OBJECT_EMOJI, type PathLang } from "@/lib/sentence-path";
import { LILAC, SKY } from "./studio-bits";

// The palettes the builder picks words from, and the rail that picks the shape
// of the sentence itself. A shape is drawn as the skeleton it makes, not as a
// card with a heading, so choosing one shows you the pattern you are about to
// build. No em dashes anywhere.

const ROLE_COLOR = { who: C.tube, action: C.sodium, what: LILAC, when: SKY } as const;

// The real colour of the colour words, so the swatch is the meaning.
const SWATCH: Record<string, string> = {
  red: "#E8503A", white: "#F2EDE2", black: "#2A3046",
  green: "#7FE3A8", blue: "#6FA8FF", yellow: "#FFCF5C",
};

// ............................................................ the shape rail
// Each shape is drawn as its own skeleton: coloured blocks in the order the
// sentence will come out, so the pattern is visible before a word is chosen.
const SKELETON: Record<ShapeId, { w: number; role: keyof typeof ROLE_COLOR }[]> = {
  does: [{ w: 22, role: "who" }, { w: 30, role: "what" }, { w: 34, role: "action" }],
  whQuestion: [{ w: 22, role: "who" }, { w: 24, role: "when" }, { w: 34, role: "action" }],
  isAdj: [{ w: 24, role: "who" }, { w: 42, role: "action" }],
  isNoun: [{ w: 24, role: "who" }, { w: 34, role: "what" }, { w: 16, role: "action" }],
  have: [{ w: 30, role: "who" }, { w: 32, role: "what" }, { w: 18, role: "action" }],
  want: [{ w: 28, role: "who" }, { w: 32, role: "what" }, { w: 22, role: "action" }],
  like: [{ w: 28, role: "who" }, { w: 34, role: "what" }, { w: 22, role: "action" }],
  thereIs: [{ w: 26, role: "when" }, { w: 34, role: "what" }, { w: 18, role: "action" }],
  whereIs: [{ w: 20, role: "who" }, { w: 32, role: "what" }, { w: 28, role: "action" }],
  howMuch: [{ w: 24, role: "when" }, { w: 32, role: "what" }, { w: 22, role: "action" }],
  request: [{ w: 22, role: "when" }, { w: 36, role: "what" }, { w: 22, role: "action" }],
  goingTo: [{ w: 18, role: "who" }, { w: 26, role: "what" }, { w: 22, role: "action" }, { w: 24, role: "when" }],
  lets: [{ w: 34, role: "what" }, { w: 32, role: "action" }],
};

export function ShapeRail({ shape, onPick, rm }: { shape: ShapeId; onPick: (s: ShapeId) => void; rm: boolean }) {
  return (
    <div>
      <div className="mb-2 text-[9.5px] font-bold" style={{ color: C.mono, letterSpacing: 1.2 }}>
        WHAT KIND OF SENTENCE
      </div>
      <div
        className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1.5 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0 lg:grid-cols-4"
        style={{ scrollbarWidth: "none" }}
        role="tablist"
        aria-label="Sentence shape"
      >
        {SHAPES.map((s) => {
          const on = shape === s.id;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => onPick(s.id)}
              className="flex w-[186px] flex-none flex-col gap-2 rounded-[15px] px-3 py-2.5 text-left focus-visible:outline focus-visible:outline-2 sm:w-auto"
              style={{
                background: on ? "rgba(255,179,92,0.12)" : C.base,
                border: `1px solid ${on ? "rgba(255,179,92,0.52)" : LINE}`,
                outlineColor: C.sodium,
                transition: rm ? undefined : "background 160ms ease, border-color 160ms ease",
              }}
            >
              {/* the shape of the sentence this makes */}
              <span className="flex items-center gap-[3px]" aria-hidden="true">
                {SKELETON[s.id].map((b, i) => (
                  <span
                    key={i}
                    style={{
                      width: b.w, height: 7, borderRadius: 4,
                      background: ROLE_COLOR[b.role],
                      opacity: on ? 0.95 : 0.42,
                      transition: rm ? undefined : "opacity 160ms ease",
                    }}
                  />
                ))}
              </span>
              <span className="block text-[12.5px] font-semibold leading-tight" style={{ color: on ? C.milk : C.muted }}>
                {s.label}
              </span>
              <span className="block text-[11px] leading-snug" style={{ color: on ? C.sodium : C.faint }}>
                {s.example}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ............................................................ shared chrome
function PaletteFrame({ label, title, children, right }: { label: string; title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="rounded-[16px] p-3.5" style={{ background: C.tar, border: `1px solid ${LINE}` }}>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="min-w-0">
          <span className="block text-[9.5px] font-bold" style={{ color: C.mono, letterSpacing: 1.2 }}>{label}</span>
          <span className="block text-[12.5px] font-semibold" style={{ color: C.milk }}>{title}</span>
        </span>
        {right}
      </div>
      {children}
    </section>
  );
}

function WordChip({ on, onClick, label, sub, swatch, emoji, tone = "what" }: {
  on: boolean; onClick: () => void; label: string; sub?: string; swatch?: string; emoji?: string;
  tone?: keyof typeof ROLE_COLOR;
}) {
  const c = ROLE_COLOR[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className="flex min-w-0 items-center gap-1.5 rounded-full py-1.5 pl-2 pr-3 text-left focus-visible:outline focus-visible:outline-2"
      style={{
        background: on ? `${c}26` : C.base,
        border: `1px solid ${on ? c : LINE}`,
        outlineColor: c,
      }}
    >
      {swatch ? (
        <span className="flex-none rounded-full" style={{ width: 14, height: 14, background: swatch, border: "1px solid rgba(242,237,226,0.25)" }} aria-hidden="true" />
      ) : emoji ? (
        <span className="flex-none text-[15px] leading-none" aria-hidden="true">{emoji}</span>
      ) : null}
      <span className="min-w-0">
        <span className="block truncate text-[12.5px] font-semibold leading-tight" style={{ color: on ? C.milk : C.muted }}>{label}</span>
        {sub && <span className="block truncate text-[10.5px] leading-tight" style={{ color: on ? c : C.faint, fontFamily: MONO }}>{sub}</span>}
      </span>
    </button>
  );
}

// ............................................................ adjectives
export function AdjectivePalette({ value, onPick, lang, allowNone }: {
  value: string | null; onPick: (id: string | null) => void; lang: PathLang; allowNone: boolean;
}) {
  const [cat, setCat] = useState<string | null>(null);
  const shown = cat ? ADJECTIVES.filter((a) => a.cat === cat) : ADJECTIVES;
  const word = (a: Adjective) => (lang === "fr" ? "" : (lang === "hi" ? a.hi.m : (a as unknown as Record<Lang, { attr: string }>)[lang as Lang].attr));
  return (
    <PaletteFrame label="DESCRIBE IT" title={`${ADJECTIVES.length} describing words`}>
      <div className="-mx-1 mb-2 flex gap-1.5 overflow-x-auto px-1 pb-1" style={{ scrollbarWidth: "none" }}>
        <button
          type="button" onClick={() => setCat(null)} aria-pressed={cat === null}
          className="flex-none rounded-full px-2.5 py-1 text-[11px] font-semibold"
          style={{ background: cat === null ? `${LILAC}26` : C.base, color: cat === null ? LILAC : C.muted, border: `1px solid ${cat === null ? LILAC : LINE}` }}
        >All</button>
        {ADJ_CATS.map((c) => (
          <button
            key={c.id} type="button" onClick={() => setCat(c.id)} aria-pressed={cat === c.id}
            className="flex-none rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{ background: cat === c.id ? `${LILAC}26` : C.base, color: cat === c.id ? LILAC : C.muted, border: `1px solid ${cat === c.id ? LILAC : LINE}` }}
          >{c.emoji} {c.label}</button>
        ))}
      </div>
      <div className="flex max-h-[188px] flex-wrap gap-1.5 overflow-y-auto pr-0.5" style={{ scrollbarWidth: "thin" }}>
        {allowNone && <WordChip on={value === null} onClick={() => onPick(null)} label="no describing word" />}
        {shown.map((a) => (
          <WordChip
            key={a.id} on={value === a.id} onClick={() => onPick(a.id)}
            label={a.en} sub={word(a)} swatch={a.cat === "colour" ? SWATCH[a.id] : undefined}
          />
        ))}
      </div>
    </PaletteFrame>
  );
}

// ............................................................ quantities
export function QuantityPalette({ value, onPick, lang }: { value: string | null; onPick: (id: string | null) => void; lang: PathLang }) {
  return (
    <PaletteFrame label="HOW MUCH" title="A little, a lot, one kilo">
      <div className="flex flex-wrap gap-1.5">
        <WordChip on={value === null} onClick={() => onPick(null)} label="no amount" tone="when" />
        {QUANTITIES.map((q) => (
          <WordChip
            key={q.id} on={value === q.id} onClick={() => onPick(q.id)} tone="when"
            label={q.en} sub={lang === "fr" ? "" : q[lang as Lang]}
          />
        ))}
      </div>
    </PaletteFrame>
  );
}

// ............................................................ question words
export function QuestionWordPalette({ value, onPick, lang }: { value: string; onPick: (id: string) => void; lang: PathLang }) {
  return (
    <PaletteFrame label="ASK" title="Where, what, why">
      <div className="flex flex-wrap gap-1.5">
        {QUESTION_WORDS.map((q) => (
          <WordChip
            key={q.id} on={value === q.id} onClick={() => onPick(q.id)} tone="when"
            label={q.en} sub={lang === "fr" ? "" : q[lang as Lang]}
          />
        ))}
      </div>
    </PaletteFrame>
  );
}

// ............................................................ the subject
// For the describing shapes the subject can be a bare this or that, or any
// noun in the bank: "this is hot", "the tea is hot".
export function SubjectPalette({ value, onPick, lang }: { value: string; onPick: (id: string) => void; lang: PathLang }) {
  const [query, setQuery] = useState("");
  const nouns = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = OBJECTS.filter((o) => o.kind !== "place");
    return q ? pool.filter((o) => o.en.toLowerCase().includes(q)).slice(0, 24) : pool.slice(0, 18);
  }, [query]);
  const word = (o: ObjectWord) => (lang === "fr" ? "" : o[lang as Lang]);
  return (
    <PaletteFrame label="WHAT IS IT ABOUT" title="This, that, or any thing">
      <div className="mb-2 flex flex-wrap gap-1.5">
        {SUBJECT_EXTRAS.map((s) => (
          <WordChip key={s.id} on={value === s.id} onClick={() => onPick(s.id)} tone="who" label={s.en} sub={lang === "fr" ? "" : s[lang as Lang]} />
        ))}
      </div>
      <input
        value={query} onChange={(e) => setQuery(e.target.value)}
        placeholder="or search a thing: tea, bus, rent"
        aria-label="Search a thing to talk about"
        className="mb-2 w-full rounded-full px-3.5 py-1.5 text-[12.5px] focus-visible:outline focus-visible:outline-2"
        style={{ background: C.base, color: C.milk, border: `1px solid ${LINE}`, outlineColor: C.tube }}
      />
      <div className="flex max-h-[120px] flex-wrap gap-1.5 overflow-y-auto pr-0.5" style={{ scrollbarWidth: "thin" }}>
        {nouns.map((o) => (
          <WordChip
            key={o.id} on={value === o.id} onClick={() => onPick(o.id)} tone="who"
            label={(lang === "fr" ? o.en : objectLabel(o, lang as Lang)).replace(/^(the|a|an) /, "")} sub={word(o)} emoji={OBJECT_EMOJI[o.id]}
          />
        ))}
      </div>
    </PaletteFrame>
  );
}

// ............................................................ places
export function PlacePalette({ value, onPick, lang, mode }: {
  value: string | null; onPick: (id: string | null) => void; lang: PathLang; mode: "at" | "to";
}) {
  const places = OBJECTS.filter((o) => o.kind === "place");
  const word = (o: ObjectWord) => {
    if (lang === "fr") return "";
    if (mode === "at") return o.at ? o.at[lang as Lang] : "";
    return o[lang as Lang];
  };
  return (
    <PaletteFrame label={mode === "at" ? "WHERE IT IS" : "WHERE TO"} title={mode === "at" ? "At home, in the shop" : "To the market, to class"}>
      <div className="flex max-h-[150px] flex-wrap gap-1.5 overflow-y-auto pr-0.5" style={{ scrollbarWidth: "thin" }}>
        <WordChip on={value === null} onClick={() => onPick(null)} label="anywhere" tone="when" />
        {places.map((o) => (
          <WordChip
            key={o.id} on={value === o.id} onClick={() => onPick(o.id)} tone="when"
            label={o.en.replace(/^to (the )?/, "")} sub={word(o)} emoji={OBJECT_EMOJI[o.id]}
          />
        ))}
      </div>
    </PaletteFrame>
  );
}

export function slotsOf(shape: Shape): Set<Slot> {
  return new Set(shape.slots);
}
export { SHAPES };
export type { Shape, ShapeId };
