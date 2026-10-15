"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Gender } from "@/lib/grammar";
import { C, LINE, LINE_SOFT, MONO, type Lang } from "@/lib/maatu-design";
import { syllables } from "@/lib/sentence-path";
import { LILAC, SKY } from "./studio-bits";

// The live coach that sits beside a scene call. The character keeps talking; a
// second, quiet brain reads every line the learner says and posts the fix, the
// rule and two scores on the right. Nothing here interrupts the conversation.
// No em dashes anywhere.

export type LiveSlip = { type: string; was: string; now: string };
export type CoachCard = {
  id: number;
  state: "thinking" | "done" | "failed";
  heard: string;
  heardAs?: "english" | "target" | "mixed";
  fixed?: string;
  english?: string;
  ok?: boolean;
  understood?: boolean;
  grammar?: number;
  pronunciation?: number | null;
  slips?: LiveSlip[];
  note?: string;
};

const GREEN = "#7FE3A8";
const AMBER = "#FFB35C";
const RED = "#FF8D7A";

function band(score: number): string {
  if (score >= 85) return GREEN;
  if (score >= 60) return AMBER;
  return RED;
}

// ............................................................ the hook
export function useLiveCoach(lang: Lang, gender: Gender, scene: string | null, enabled: boolean) {
  const [cards, setCards] = useState<CoachCard[]>([]);
  const next = useRef(1);
  const seen = useRef<Set<string>>(new Set());
  const queue = useRef<Promise<void>>(Promise.resolve());

  const push = useCallback(
    (text: string) => {
      if (!enabled) return;
      const clean = text.trim();
      // Short grunts and repeats of the same line are not worth a verdict.
      if (clean.length < 3 || seen.current.has(clean.toLowerCase())) return;
      seen.current.add(clean.toLowerCase());
      const id = next.current;
      next.current += 1;
      setCards((prev) => [{ id, state: "thinking" as const, heard: clean }, ...prev].slice(0, 30));
      // One at a time, so the rail reads in the order the learner spoke.
      queue.current = queue.current.then(async () => {
        try {
          const res = await fetch("/api/coach-live", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: clean, lang, gender, scene }),
          });
          if (!res.ok) throw new Error("no answer");
          const data = await res.json();
          setCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...data, state: "done" as const } : c)));
        } catch {
          setCards((prev) => prev.map((c) => (c.id === id ? { ...c, state: "failed" as const } : c)));
        }
      });
    },
    [enabled, lang, gender, scene],
  );

  const scored = cards.filter((c) => c.state === "done" && c.heardAs !== "english");
  const grammar = scored.length ? Math.round(scored.reduce((a, c) => a + (c.grammar ?? 0), 0) / scored.length) : null;
  const withSound = scored.filter((c) => typeof c.pronunciation === "number");
  const pronunciation = withSound.length ? Math.round(withSound.reduce((a, c) => a + (c.pronunciation ?? 0), 0) / withSound.length) : null;
  const understood = scored.filter((c) => c.understood).length;
  const englishTurns = cards.filter((c) => c.state === "done" && c.heardAs === "english").length;

  const reset = useCallback(() => {
    setCards([]);
    seen.current = new Set();
  }, []);

  return { cards, push, grammar, pronunciation, understood, spoken: scored.length, englishTurns, reset };
}
export type Coach = ReturnType<typeof useLiveCoach>;

// ............................................................ the meters
function Meter({ label, value, hint }: { label: string; value: number | null; hint: string }) {
  const color = value === null ? C.faint : band(value);
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-baseline justify-between gap-1">
        <span className="text-[9.5px] font-bold" style={{ color: C.mono, letterSpacing: 1.1 }}>
          {label}
        </span>
        <span className="text-[15px] font-bold tabular-nums" style={{ color, fontFamily: MONO }}>
          {value === null ? "--" : `${value}%`}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full" style={{ background: "rgba(242,237,226,0.10)" }}>
        <div
          className="h-full w-full rounded-full"
          style={{
            background: color,
            transformOrigin: "left center",
            transform: `scaleX(${(value ?? 0) / 100})`,
            transition: "transform 420ms cubic-bezier(.2,.8,.2,1), background 300ms ease",
          }}
        />
      </div>
      <div className="mt-1 text-[10px] leading-tight" style={{ color: C.faint }}>
        {hint}
      </div>
    </div>
  );
}

export function CoachScoreStrip({ coach }: { coach: Coach }) {
  return (
    <div className="flex gap-3">
      <Meter label="GRAMMAR" value={coach.grammar} hint="how you put the words together" />
      <Meter label="PRONUNCIATION" value={coach.pronunciation} hint="how your words came through" />
    </div>
  );
}

// A single number for the header, so the score is on screen even on a phone.
export function CoachBadge({ coach, onClick, open }: { coach: Coach; onClick: () => void; open: boolean }) {
  const value = coach.grammar;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-label={value === null ? "Open the coach" : `Coach: grammar ${value} percent. ${open ? "Hide" : "Show"} the corrections.`}
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] font-bold focus-visible:outline focus-visible:outline-2"
      style={{
        background: value === null ? "rgba(242,237,226,0.06)" : `${band(value)}1F`,
        color: value === null ? C.muted : band(value),
        border: `1px solid ${value === null ? LINE : `${band(value)}66`}`,
        outlineColor: C.milk,
      }}
    >
      <span aria-hidden="true">📝</span>
      <span style={{ fontFamily: MONO }}>{value === null ? "coach" : `${value}%`}</span>
    </button>
  );
}

// ............................................................ one card
function Slip({ slip }: { slip: LiveSlip }) {
  return (
    <div className="flex flex-wrap items-baseline gap-1.5 text-[12.5px]">
      <span className="rounded px-1.5 py-0.5 text-[9.5px] font-bold uppercase" style={{ background: "rgba(245,194,255,0.14)", color: LILAC, letterSpacing: 0.6 }}>
        {slip.type.replace("-", " ")}
      </span>
      {slip.was && (
        <span style={{ color: RED, fontFamily: MONO, textDecoration: "line-through", textDecorationColor: "rgba(255,141,122,0.6)" }}>{slip.was}</span>
      )}
      {slip.was && slip.now && <span style={{ color: C.faint }}>›</span>}
      {slip.now && <span style={{ color: GREEN, fontFamily: MONO, fontWeight: 600 }}>{slip.now}</span>}
    </div>
  );
}

function Card({ card, lang, onHear, playing }: { card: CoachCard; lang: Lang; onHear: (text: string) => void; playing: string | null }) {
  if (card.state === "thinking") {
    return (
      <div className="rounded-[14px] px-3.5 py-3" style={{ background: C.base, border: `1px solid ${LINE_SOFT}` }}>
        <div className="truncate text-[12.5px]" style={{ color: C.muted, fontFamily: MONO }}>
          {card.heard}
        </div>
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px]" style={{ color: C.faint }}>
          <span className="mt-dotflash inline-block rounded-full" style={{ width: 6, height: 6, background: C.sodium }} />
          looking at that line
        </div>
      </div>
    );
  }
  if (card.state === "failed") {
    return (
      <div className="rounded-[14px] px-3.5 py-3" style={{ background: C.base, border: `1px solid ${LINE_SOFT}` }}>
        <div className="truncate text-[12.5px]" style={{ color: C.muted, fontFamily: MONO }}>
          {card.heard}
        </div>
        <div className="mt-1 text-[11px]" style={{ color: C.faint }}>
          The coach could not reach the brain for this line. Keep talking.
        </div>
      </div>
    );
  }

  const english = card.heardAs === "english";
  const perfect = card.ok && (card.grammar ?? 0) >= 85;
  const edge = english ? SKY : perfect ? GREEN : band(card.grammar ?? 0);
  return (
    <div className="rounded-[14px] px-3.5 py-3" style={{ background: C.base, border: `1px solid ${edge}3D` }}>
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 flex-1">
          <span className="block text-[9.5px] font-bold" style={{ color: edge, letterSpacing: 1.1 }}>
            {english ? "YOU SPOKE ENGLISH" : perfect ? "YOU SAID IT RIGHT" : "YOU SAID"}
          </span>
          <span className="mt-0.5 block text-[12.5px] leading-snug" style={{ color: perfect ? C.milk : C.muted, fontFamily: MONO }}>
            {card.heard}
          </span>
        </span>
        <span className="flex flex-none items-center gap-1">
          {card.understood && (
            <span className="rounded-full px-1.5 py-0.5 text-[9.5px] font-bold" style={{ background: "rgba(127,227,168,0.14)", color: GREEN }} title="The person you were talking to would have understood you">
              ✓ got it
            </span>
          )}
        </span>
      </div>

      {!perfect && card.fixed && (
        <div className="mt-2 rounded-[10px] px-2.5 py-2" style={{ background: "rgba(127,227,168,0.07)", border: "1px solid rgba(127,227,168,0.26)" }}>
          <div className="flex items-start justify-between gap-2">
            <span className="min-w-0 flex-1">
              <span className="block text-[9.5px] font-bold" style={{ color: GREEN, letterSpacing: 1.1 }}>
                SAY IT LIKE THIS
              </span>
              <span className="mt-0.5 block text-[13.5px] font-semibold leading-snug" style={{ color: C.milk, fontFamily: MONO }}>
                {card.fixed}
              </span>
              <span className="mt-0.5 block text-[11px] leading-snug" style={{ color: C.faint, fontFamily: MONO }}>
                {syllables(card.fixed)}
              </span>
            </span>
            <button
              type="button"
              onClick={() => onHear(card.fixed!)}
              aria-label={`Hear: ${card.fixed}`}
              className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-[10px] font-bold focus-visible:outline focus-visible:outline-2"
              style={{ background: playing === card.fixed ? C.sodium : "rgba(255,179,92,0.12)", color: playing === card.fixed ? C.ink : C.sodium, border: "1px solid rgba(255,179,92,0.34)", outlineColor: C.milk }}
            >
              <span aria-hidden="true">{playing === card.fixed ? "◼" : "▶"}</span>
            </button>
          </div>
        </div>
      )}

      {card.slips && card.slips.length > 0 && (
        <div className="mt-2 flex flex-col gap-1">
          {card.slips.map((s, i) => (
            <Slip key={i} slip={s} />
          ))}
        </div>
      )}

      {card.note && (
        <p className="mt-2 text-[12px] leading-snug" style={{ color: english ? SKY : "rgba(255,179,92,0.92)" }}>
          {card.note}
        </p>
      )}

      {!english && (
        <div className="mt-2 flex items-center gap-3 border-t pt-2 text-[10.5px] font-bold" style={{ borderColor: LINE_SOFT, letterSpacing: 0.6 }}>
          <span style={{ color: band(card.grammar ?? 0), fontFamily: MONO }}>GRAMMAR {card.grammar}%</span>
          {typeof card.pronunciation === "number" && (
            <span style={{ color: band(card.pronunciation), fontFamily: MONO }}>SOUND {card.pronunciation}%</span>
          )}
        </div>
      )}
    </div>
  );
}

// ............................................................ the rail
export function CoachRail({ coach, lang, name, compact }: { coach: Coach; lang: Lang; name: string; compact?: boolean }) {
  const [playing, setPlaying] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const cache = useRef<Map<string, string>>(new Map());

  const hear = useCallback(
    async (text: string) => {
      audio.current?.pause();
      if (playing === text) {
        setPlaying(null);
        return;
      }
      let src = cache.current.get(text);
      if (!src) {
        try {
          const res = await fetch("/api/say", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, lang, pace: 0.82 }) });
          const data = await res.json();
          if (!res.ok || !data.audio) return;
          src = `data:${data.mime ?? "audio/wav"};base64,${data.audio}`;
          cache.current.set(text, src);
        } catch {
          return;
        }
      }
      const el = new Audio(src);
      audio.current = el;
      el.onended = () => setPlaying(null);
      el.onerror = () => setPlaying(null);
      setPlaying(text);
      try {
        await el.play();
      } catch {
        setPlaying(null);
      }
    },
    [lang, playing],
  );

  useEffect(() => {
    return () => {
      audio.current?.pause();
    };
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-none rounded-[16px] p-3.5" style={{ background: C.tar, border: `1px solid ${LINE}` }}>
        <div className="mb-2.5 flex items-baseline justify-between gap-2">
          <span className="text-[10.5px] font-bold" style={{ color: C.sodium, letterSpacing: 1.2 }}>
            QUIET COACH
          </span>
          <span className="text-[11px]" style={{ color: C.faint }}>
            {coach.spoken > 0 ? `${coach.understood} of ${coach.spoken} understood` : `${name} will not correct you`}
          </span>
        </div>
        <CoachScoreStrip coach={coach} />
        {coach.englishTurns > 2 && coach.spoken === 0 && (
          <p className="mt-2.5 text-[11.5px] leading-snug" style={{ color: SKY }}>
            Everything so far has been English. Try one short line in the language and the scores start moving.
          </p>
        )}
      </div>

      <div className={"mt-2.5 flex flex-col gap-2 overflow-y-auto pr-0.5" + (compact ? " max-h-[320px]" : " min-h-0 flex-1")} style={{ scrollbarWidth: "thin" }}>
        {coach.cards.length === 0 ? (
          <div className="rounded-[14px] px-3.5 py-5 text-center" style={{ background: C.base, border: `1px dashed ${LINE}` }}>
            <div className="text-[20px]" aria-hidden="true">🤫</div>
            <p className="mt-1.5 text-[12.5px] leading-snug" style={{ color: C.muted }}>
              Just talk. {name} stays in the scene; every line you say appears here, put right, with a score.
            </p>
          </div>
        ) : (
          coach.cards.map((c) => <Card key={c.id} card={c} lang={lang} onHear={hear} playing={playing} />)
        )}
      </div>
    </div>
  );
}

// A one-line summary for the debrief screen.
export function coachSummary(coach: Coach): string | null {
  if (!coach.spoken) return null;
  const parts = [`grammar ${coach.grammar}%`];
  if (coach.pronunciation !== null) parts.push(`pronunciation ${coach.pronunciation}%`);
  return `${coach.spoken} line${coach.spoken === 1 ? "" : "s"} scored: ${parts.join(", ")}, ${coach.understood} understood.`;
}

// Memo helper: the rail re-renders on every card, the meters on every score.
export function useCoachScene(brief: string | undefined): string | null {
  return useMemo(() => (brief ? brief.replace(/\s+/g, " ").trim().slice(0, 240) : null), [brief]);
}
