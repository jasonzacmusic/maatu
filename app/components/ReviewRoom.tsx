"use client";

import { useEffect, useState } from "react";
import { countFor, dueNow, grade, loadReview, type ReviewItem } from "@/lib/review";
import { C, LINE, LINE_SOFT, MONO, type Lang } from "@/lib/maatu-design";
import { Section, SpeakButton, type Speaker } from "./studio-bits";

// The Review room: saved lines come back on a schedule. English first, reveal,
// hear, then Got it or Again. No em dashes anywhere.

export function ReviewRoom({ lang, speaker, anchor, version, onChange }: { lang: Lang; speaker: Speaker; anchor: (id: string, el: HTMLElement | null) => void; version: number; onChange: () => void }) {
  const [queue, setQueue] = useState<ReviewItem[]>([]);
  const [counts, setCounts] = useState({ saved: 0, due: 0 });
  const [revealed, setRevealed] = useState(false);
  const [doneToday, setDoneToday] = useState(0);

  useEffect(() => {
    setQueue(dueNow(lang));
    setCounts(countFor(lang));
    setRevealed(false);
  }, [lang, version]);

  const current = queue[0] ?? null;
  const answer = (ok: boolean) => {
    if (!current) return;
    grade(current.id, ok);
    setQueue((q) => q.slice(1));
    setRevealed(false);
    setDoneToday((n) => n + 1);
    setCounts(countFor(lang));
    onChange();
  };

  const all = loadReview().filter((i) => i.lang === lang);

  return (
    <Section id="review" anchor={anchor} kicker="REVIEW" title={current ? `${queue.length} to review` : counts.saved ? "All caught up" : "Nothing saved yet"} blurb={counts.saved ? `${counts.saved} saved lines. Each one comes back the same day, then after 1, 3, 7, and 14 days. Miss one and it returns in ten minutes.` : "Tap the bookmark on any sentence, scene line, or frame and it will come back here on a schedule until it sticks."} tone="tube">
      {current && (
        <div key={current.id} className="mt-4 rounded-[18px] p-5" style={{ background: "linear-gradient(135deg,rgba(191,239,219,0.14),rgba(255,179,92,0.04))", border: "1px solid rgba(191,239,219,0.34)", animation: "mtFade 260ms ease both" }}>
          <div className="text-[10.5px] font-bold" style={{ color: C.tube, letterSpacing: 1.2 }}>
            SAY THIS IN {lang === "kn" ? "KANNADA" : lang === "hi" ? "HINDI" : "TAMIL"} · BOX {current.box + 1}
          </div>
          <div className="mt-1.5 text-[22px] font-semibold leading-snug" style={{ color: C.milk }}>{current.en}</div>
          {revealed ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <span className="text-[20px] font-semibold" style={{ color: C.tube, fontFamily: MONO }}>{current.target}</span>
              <SpeakButton text={current.target} speaker={speaker} />
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => setRevealed(true)} className="rounded-full px-4 py-2 text-[13px] font-bold focus-visible:outline focus-visible:outline-2" style={{ background: C.tube, color: C.ink, outlineColor: C.milk }}>
                Say it, then reveal
              </button>
              <SpeakButton text={current.target} speaker={speaker} label="Just hear it" />
            </div>
          )}
          {revealed && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => answer(false)} className="rounded-[13px] py-3 text-[14px] font-bold focus-visible:outline focus-visible:outline-2" style={{ background: "rgba(232,80,58,0.14)", color: "#FF8A75", border: "1px solid rgba(232,80,58,0.4)", outlineColor: C.milk }}>
                Again
              </button>
              <button type="button" onClick={() => answer(true)} className="rounded-[13px] py-3 text-[14px] font-bold focus-visible:outline focus-visible:outline-2" style={{ background: C.sodium, color: C.ink, outlineColor: C.milk }}>
                Got it
              </button>
            </div>
          )}
        </div>
      )}
      {!current && doneToday > 0 && (
        <div className="mt-4 rounded-[14px] px-4 py-3 text-[13px]" style={{ background: "rgba(191,239,219,0.08)", color: "rgba(191,239,219,0.9)", border: "1px solid rgba(191,239,219,0.2)" }}>
          {doneToday} reviewed. Come back tomorrow; the ones you got will wait longer each time.
        </div>
      )}
      {all.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-[12px] font-semibold" style={{ color: C.muted }}>
            Everything saved ({all.length})
          </summary>
          <div className="mt-2 flex flex-col">
            {all
              .slice()
              .sort((a, b) => a.due - b.due)
              .map((item) => (
                <button key={item.id} type="button" onClick={() => void speaker.speak(item.target)} className="flex items-baseline justify-between gap-3 py-2 text-left focus-visible:outline focus-visible:outline-2" style={{ borderTop: `1px solid ${LINE_SOFT}`, outlineColor: C.tube }}>
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-semibold" style={{ color: speaker.playing === item.target ? C.tube : C.milk, fontFamily: MONO }}>{item.target}</span>
                    <span className="block text-[11.5px]" style={{ color: C.muted }}>{item.en}</span>
                  </span>
                  <span className="flex-none text-[10.5px]" style={{ color: C.faint, border: `1px solid ${LINE}`, borderRadius: 999, padding: "2px 8px" }}>
                    box {item.box + 1}
                  </span>
                </button>
              ))}
          </div>
        </details>
      )}
    </Section>
  );
}
