"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { OBJECTS, objectById, verbById, type Gender, type ObjectWord } from "@/lib/grammar";
import { C, DISPLAY, HOST, LINE, LINE_SOFT, MONO, type Lang } from "@/lib/maatu-design";
import {
  buildPath,
  CAT_ORDER,
  HOW_TO_SAY,
  LADDER,
  OBJECT_EMOJI,
  objectEnglish,
  objectsFor,
  PATH_LANGS,
  randomChoice,
  searchVerbs,
  searchWords,
  VERB_TILES,
  verbInLang,
  WHEN_TILES,
  VERB_GROUPS,
  whenAllowed,
  WHO_TILES,
  wordBank,
  wordInLang,
  type Part,
  type PathChoice,
  type PathLang,
  type PathResult,
  type Role,
  type When,
  type Who,
} from "@/lib/sentence-path";
import { LILAC, Lit, SaveButton, SKY } from "./studio-bits";
import { shapeById, type ShapeChoice, type ShapeId } from "@/lib/shapes";
import { AdjectivePalette, DirectionPalette, PlacePalette, QuantityPalette, QuestionWordPalette, ShapeRail, SubjectPalette } from "./WordPalettes";
import { SITUATIONS, situationById, situationWords, type Line, type LineSpec } from "@/lib/situations";
import { buildLine, conversationAround, fullChoice, relatedTo, surpriseLine } from "@/lib/related";

// Build: the sentence is the control. One card at the top always shows the line
// you are making in English and in the target language. Under it three visual
// switches (yes or no, telling or asking, say the time word), a timeline for
// when, and three open pickers for who, the action and the word. Nothing is
// behind a step, so you can change any part at any moment and never get stuck
// inside one sentence. No em dashes anywhere.

const ROLE: Record<Role, { color: string; rgb: string; label: string }> = {
  who: { color: C.tube, rgb: "191,239,219", label: "who" },
  action: { color: C.sodium, rgb: "255,179,92", label: "action" },
  what: { color: LILAC, rgb: "245,194,255", label: "what" },
  when: { color: SKY, rgb: "159,211,255", label: "when" },
  helper: { color: C.muted, rgb: "154,164,192", label: "helper" },
};

const GREEN = "#7FE3A8";
const RED = "#FF8D7A";

// ............................................................ voice
// Indian languages speak through the Sarvam teacher voices (/api/say). French
// uses the device's own French voice; if there is none, say so plainly.
function useVoice(slow: boolean) {
  const cache = useRef<Map<string, string>>(new Map());
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    audio.current?.pause();
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setPlaying(null);
  }, []);

  const speak = useCallback(
    async (text: string, lang: PathLang, slowNow: boolean = slow) => {
      const clean = text.replace(/\s+\?$/, "?").trim();
      if (!clean) return;
      const id = `${lang}:${clean}:${slowNow ? "slow" : "normal"}`;
      setError(null);
      stop();
      if (lang === "fr") {
        if (typeof window === "undefined" || !("speechSynthesis" in window)) {
          setError("This device has no voice for French. The sounds-like line shows how to say it.");
          return;
        }
        const voices = window.speechSynthesis.getVoices();
        const fr = voices.filter((v) => v.lang === "fr-FR");
        const voice = ["Thomas", "Marie", "Audrey", "Aurélie", "Google français", "Amélie"].map((n) => fr.find((v) => v.name.startsWith(n))).find(Boolean) ?? fr[0] ?? voices.find((v) => v.lang.startsWith("fr"));
        if (!voice && voices.length) {
          setError("No French voice is installed on this device. The sounds-like line shows how to say it.");
          return;
        }
        const u = new SpeechSynthesisUtterance(clean);
        u.lang = "fr-FR";
        if (voice) u.voice = voice;
        u.rate = slowNow ? 0.72 : 0.92;
        u.onend = () => setPlaying(null);
        u.onerror = () => setPlaying(null);
        setPlaying(id);
        window.speechSynthesis.speak(u);
        return;
      }
      const pace = slowNow ? 0.72 : 0.9;
      const key = id;
      let src = cache.current.get(key);
      if (!src) {
        setLoading(id);
        try {
          const res = await fetch("/api/say", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: clean, lang, pace }) });
          const data = await res.json();
          if (!res.ok || !data.audio) throw new Error(data.error ?? "The voice did not answer.");
          src = `data:${data.mime ?? "audio/wav"};base64,${data.audio}`;
          cache.current.set(key, src);
        } catch (e) {
          setError(e instanceof Error ? e.message : "The voice did not answer.");
          setLoading(null);
          return;
        }
        setLoading(null);
      }
      const el = new Audio(src);
      audio.current = el;
      el.onended = () => setPlaying(null);
      el.onerror = () => setPlaying(null);
      setPlaying(id);
      try {
        await el.play();
      } catch {
        setPlaying(null);
        setError("Tap again to allow sound.");
      }
    },
    [slow, stop],
  );

  // Some browsers load their voice list late; touching it early warms it up.
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.getVoices();
    return () => {
      audio.current?.pause();
    };
  }, []);

  return { speak, stop, playing, loading, error };
}
type Voice = ReturnType<typeof useVoice>;

function PlayButton({ voice, text, lang, big, label, slow, ghost }: { voice: Voice; text: string; lang: PathLang; big?: boolean; label?: string; slow?: boolean; ghost?: boolean }) {
  const pace = slow ?? false;
  const id = `${lang}:${text.replace(/\s+\?$/, "?").trim()}:${pace ? "slow" : "normal"}`;
  const active = voice.playing === id;
  const busy = voice.loading === id;
  return (
    <button
      type="button"
      onClick={() => (active ? voice.stop() : void voice.speak(text, lang, pace))}
      aria-label={`${active ? "Stop" : pace ? "Hear slowly" : "Hear"}: ${text}`}
      className={`inline-flex flex-none items-center justify-center gap-2 rounded-full font-bold focus-visible:outline focus-visible:outline-2 ${big ? "h-11 px-4 text-[14px]" : "h-8 w-8 text-[11px]"}`}
      style={{
        background: active ? C.sodium : big && !ghost ? C.sodium : "rgba(255,179,92,0.12)",
        color: active || (big && !ghost) ? C.ink : C.sodium,
        border: big && !ghost ? "none" : "1px solid rgba(255,179,92,0.34)",
        boxShadow: big && !ghost ? "0 8px 26px -8px rgba(255,179,92,0.55)" : undefined,
        outlineColor: C.milk,
        opacity: busy ? 0.7 : 1,
      }}
    >
      <span aria-hidden="true">{busy ? "…" : active ? "◼" : pace && big ? "🐢" : "▶"}</span>
      {big && (label ?? (pace ? "Slowly" : "Hear it"))}
    </button>
  );
}

// ............................................................ words
function Words({ parts, size, lit = true, onPick }: { parts: Part[]; size: number; lit?: boolean; onPick?: (role: Role) => void }) {
  return (
    <span className="flex flex-wrap items-baseline" style={{ columnGap: size * 0.42, rowGap: size * 0.3 }}>
      {parts.map((p, i) => {
        const inner =
          p.role === "action" && lit && p.stem ? (
            <Lit word={p.word} stem={p.stem} size={size} />
          ) : (
            <span style={{ fontFamily: MONO, fontSize: size, fontWeight: 600, color: p.role === "helper" ? C.muted : p.role === "action" ? C.sodium : ROLE[p.role].color }}>{p.word}</span>
          );
        if (!onPick || p.role === "helper") return <span key={i}>{inner}</span>;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onPick(p.role)}
            aria-label={`Change the ${ROLE[p.role].label} word: ${p.word}`}
            className="rounded-[6px] focus-visible:outline focus-visible:outline-2"
            style={{ borderBottom: `1.5px dashed rgba(${ROLE[p.role].rgb},0.45)`, outlineColor: ROLE[p.role].color, paddingBottom: 1 }}
          >
            {inner}
          </button>
        );
      })}
    </span>
  );
}

function EnglishWords({ parts, question }: { parts: Part[]; question: boolean }) {
  return (
    <span>
      {parts.map((p, i) => (
        <span key={i} style={{ color: ROLE[p.role].color }}>
          {i === 0 ? p.word.charAt(0).toUpperCase() + p.word.slice(1) : p.word}
          {i < parts.length - 1 ? " " : ""}
        </span>
      ))}
      <span style={{ color: C.muted }}>{question ? "?" : "."}</span>
    </span>
  );
}

// The question mark belongs to the last word, so it never wraps on its own.
function withMark(parts: Part[], question: boolean, lang: PathLang): Part[] {
  if (!question || parts.length === 0) return parts;
  const last = parts[parts.length - 1];
  return [...parts.slice(0, -1), { ...last, word: last.word + (lang === "fr" ? " ?" : "?") }];
}

// ............................................................ change one thing
type Chip = { role: Role; emoji: string; text: string };
function QuickChips({ chips, onPick }: { chips: Chip[]; onPick: (r: Role) => void }) {
  if (!chips.length) return null;
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-1.5" role="group" aria-label="Change one part">
      <span className="mr-0.5 text-[9.5px] font-bold" style={{ color: C.faint, letterSpacing: 1.1 }}>CHANGE</span>
      {chips.map((c) => (
        <button
          key={c.role}
          type="button"
          onClick={() => onPick(c.role)}
          className="inline-flex max-w-[180px] items-center gap-1.5 rounded-full py-1 pl-1.5 pr-2.5 text-[12px] font-semibold focus-visible:outline focus-visible:outline-2"
          style={{ background: `rgba(${ROLE[c.role].rgb},0.12)`, color: ROLE[c.role].color, border: `1px solid rgba(${ROLE[c.role].rgb},0.45)`, outlineColor: ROLE[c.role].color }}
          aria-label={`Change ${ROLE[c.role].label}: ${c.text}`}
        >
          <span className="text-[15px] leading-none" aria-hidden="true">{c.emoji}</span>
          <span className="truncate">{c.text}</span>
          <span aria-hidden="true" style={{ opacity: 0.7 }}>▾</span>
        </button>
      ))}
    </div>
  );
}

// ............................................................ the two switches
// One control, two sides, a thumb that slides. Green and a tick on one side,
// red and a cross on the other, so positive and negative read at a glance.
function Switch2({
  on,
  onChange,
  left,
  right,
  label,
  compact = false,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
  left: { icon: string; text: string; color: string };
  right: { icon: string; text: string; color: string };
  label: string;
  compact?: boolean;
}) {
  const side = on ? right : left;
  return (
    <div className="min-w-0 flex-1">
      <div className={"mb-1 text-[9.5px] font-bold" + (compact ? " sr-only" : "")} style={{ color: C.mono, letterSpacing: 1.2 }}>
        {label}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={`${label}: ${side.text}. Tap to change.`}
        onClick={() => onChange(!on)}
        className="relative flex w-full items-center rounded-full p-1 focus-visible:outline focus-visible:outline-2"
        style={{
          height: compact ? 38 : 50,
          background: `linear-gradient(90deg, rgba(127,227,168,0.10), rgba(255,141,122,0.10))`,
          border: `1px solid ${side.color}66`,
          outlineColor: side.color,
          transition: "border-color 160ms ease",
        }}
      >
        <span
          className="absolute rounded-full"
          style={{
            left: 4,
            width: "calc(50% - 4px)",
            height: 42,
            background: `${side.color}26`,
            border: `1.5px solid ${side.color}`,
            transform: on ? "translateX(100%)" : "translateX(0)",
            transition: "transform 180ms cubic-bezier(.2,.8,.2,1), background 180ms ease, border-color 180ms ease",
          }}
          aria-hidden="true"
        />
        {[left, right].map((s, i) => {
          const active = (i === 1) === on;
          return (
            <span key={s.text} className="relative z-10 flex min-w-0 flex-1 items-center justify-center gap-1.5">
              <span className="text-[15px] leading-none" aria-hidden="true" style={{ opacity: active ? 1 : 0.4 }}>
                {s.icon}
              </span>
              <span className="truncate text-[12.5px] font-bold" style={{ color: active ? s.color : C.faint }}>
                {s.text}
              </span>
            </span>
          );
        })}
      </button>
    </div>
  );
}

// ............................................................ the timeline
// Four stops on one rail from past to future, plus the two that are not times
// at all (a wish and a skill) sitting below it where they belong.
const RAIL: When[] = ["past", "cont", "present", "future"];
const MOOD: When[] = ["want", "can", "must"];

function Timeline({ when, setWhen, verb, object, timeWord, setTimeWord, rm }: { when: When; setWhen: (w: When) => void; verb: string; object: string | null; timeWord: boolean; setTimeWord: (v: boolean) => void; rm: boolean }) {
  const onRail = RAIL.includes(when);
  const idx = RAIL.indexOf(when);
  const tile = WHEN_TILES.find((t) => t.id === when);
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[9.5px] font-bold" style={{ color: SKY, letterSpacing: 1.2 }}>
          WHEN
        </span>
        {tile?.time && (
          <button
            type="button"
            aria-pressed={timeWord}
            onClick={() => setTimeWord(!timeWord)}
            className="rounded-full px-2.5 py-1 text-[11px] font-semibold focus-visible:outline focus-visible:outline-2"
            style={{ background: timeWord ? "rgba(159,211,255,0.16)" : C.base, color: timeWord ? SKY : C.faint, border: `1px solid ${timeWord ? "rgba(159,211,255,0.5)" : LINE}`, outlineColor: SKY }}
          >
            🕰️ {timeWord ? `saying "${tile.time === "everyday" ? "every day" : tile.time}"` : "add the time word"}
          </button>
        )}
      </div>
      <div className="relative rounded-[18px] px-2 pb-2.5 pt-3" style={{ background: C.tar, border: `1px solid ${LINE}` }}>
        {/* the rail */}
        <div className="relative mx-2 mb-1" style={{ height: 2 }} aria-hidden="true">
          <div className="absolute inset-0 rounded-full" style={{ background: "linear-gradient(90deg,rgba(159,211,255,0.18),rgba(159,211,255,0.6),rgba(159,211,255,0.18))" }} />
          {onRail && (
            <div
              className="absolute rounded-full"
              style={{
                left: `calc(${(idx + 0.5) * 25}% - 5px)`,
                top: -4,
                width: 10,
                height: 10,
                background: SKY,
                boxShadow: `0 0 12px ${SKY}`,
                transition: rm ? undefined : "left 220ms cubic-bezier(.2,.8,.2,1)",
              }}
            />
          )}
        </div>
        <div className="grid grid-cols-4 gap-1">
          {RAIL.map((id) => {
            const t = WHEN_TILES.find((x) => x.id === id)!;
            const sel = when === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={sel}
                onClick={() => setWhen(id)}
                className="flex flex-col items-center gap-0.5 rounded-[12px] px-1 py-2 focus-visible:outline focus-visible:outline-2"
                style={{ background: sel ? "rgba(159,211,255,0.14)" : "transparent", border: `1px solid ${sel ? "rgba(159,211,255,0.5)" : "transparent"}`, outlineColor: SKY }}
              >
                <span className="text-[17px] leading-none" aria-hidden="true">
                  {t.emoji}
                </span>
                <span className="text-[11.5px] font-bold leading-tight" style={{ color: sel ? C.milk : C.muted }}>
                  {t.en}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-1.5 flex gap-1.5 border-t pt-2" style={{ borderColor: LINE_SOFT }}>
          {MOOD.map((id) => {
            const t = WHEN_TILES.find((x) => x.id === id)!;
            const ok = whenAllowed(verb, id, object);
            const sel = when === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={sel}
                disabled={!ok}
                onClick={() => setWhen(id)}
                className="inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-2 text-[12px] font-semibold focus-visible:outline focus-visible:outline-2"
                style={{
                  background: sel ? "rgba(245,194,255,0.16)" : C.base,
                  color: sel ? LILAC : ok ? C.muted : C.faint,
                  border: `1px solid ${sel ? "rgba(245,194,255,0.5)" : LINE}`,
                  outlineColor: LILAC,
                  opacity: ok ? 1 : 0.45,
                }}
                title={ok ? t.blurb : "Only for things you can have a skill in"}
              >
                <span aria-hidden="true">{t.emoji}</span>
                <span className="truncate">{t.en}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ............................................................ pickers
function Tile({ on, onClick, emoji, title, sub, tone, badge, disabled, dim }: { on: boolean; onClick: () => void; emoji: string; title: string; sub?: string; tone: Role; badge?: string; disabled?: boolean; dim?: boolean }) {
  const r = ROLE[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
      className="relative flex min-h-[70px] flex-col items-center justify-center gap-0.5 rounded-[14px] px-1.5 py-2 text-center focus-visible:outline focus-visible:outline-2"
      style={{
        background: on ? `rgba(${r.rgb},0.16)` : C.base,
        border: `1px solid ${on ? `rgba(${r.rgb},0.6)` : LINE}`,
        outlineColor: r.color,
        transform: on ? "translateY(-1px)" : undefined,
        boxShadow: on ? `0 10px 24px -14px rgba(${r.rgb},0.8)` : undefined,
        opacity: disabled ? 0.32 : dim ? 0.55 : 1,
        transition: "background 140ms ease, border-color 140ms ease, transform 140ms ease",
      }}
    >
      {badge && (
        <span className="absolute -top-2 right-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold" style={{ background: r.color, color: C.ink, letterSpacing: 0.6 }}>
          {badge}
        </span>
      )}
      <span className="text-[22px] leading-none" aria-hidden="true">
        {emoji}
      </span>
      <span className="text-[12px] font-semibold leading-tight" style={{ color: on ? C.milk : C.muted }}>
        {title}
      </span>
      {sub && (
        <span className="w-full truncate text-[10.5px] leading-tight" style={{ color: on ? r.color : C.faint, fontFamily: MONO }}>
          {sub}
        </span>
      )}
    </button>
  );
}

function Panel({ tone, label, title, children, right, at, glow }: { tone: Role; label: string; title: string; children: React.ReactNode; right?: React.ReactNode; at?: React.Ref<HTMLElement>; glow?: boolean }) {
  const r = ROLE[tone];
  return (
    <section
      ref={at}
      className="min-w-0 scroll-mt-[220px] rounded-[18px] p-3.5"
      style={{ background: C.tar, border: `1px solid ${glow ? r.color : LINE}`, boxShadow: glow ? `0 0 0 3px ${r.color}33` : undefined, transition: "border-color 300ms ease, box-shadow 300ms ease" }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="min-w-0">
          <span className="block text-[9.5px] font-bold" style={{ color: r.color, letterSpacing: 1.2 }}>
            {label}
          </span>
          <span className="block text-[13px] font-semibold" style={{ color: C.milk }}>
            {title}
          </span>
        </span>
        {right}
      </div>
      {children}
    </section>
  );
}

function Search({ value, onChange, placeholder, tone }: { value: string; onChange: (v: string) => void; placeholder: string; tone: Role }) {
  return (
    <div className="relative mb-2">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[12px]" aria-hidden="true">
        🔎
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-full py-2 pl-8 pr-8 text-[13px] focus-visible:outline focus-visible:outline-2"
        style={{ background: C.base, color: C.milk, border: `1px solid ${LINE}`, outlineColor: ROLE[tone].color }}
        aria-label={placeholder}
      />
      {value && (
        <button type="button" onClick={() => onChange("")} aria-label="Clear the search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-1.5 text-[13px]" style={{ color: C.faint }}>
          ✕
        </button>
      )}
    </div>
  );
}

// ............................................................ word order map
function merge(parts: Part[]): Part[] {
  const out: Part[] = [];
  for (const p of parts) {
    const last = out[out.length - 1];
    if (last && last.role === p.role) last.word = last.word.endsWith("'") ? last.word + p.word : `${last.word} ${p.word}`;
    else out.push({ ...p });
  }
  return out;
}

function OrderMap({ en, target, langLabel }: { en: Part[]; target: Part[]; langLabel: string }) {
  const top = merge(en).filter((p) => p.role !== "helper");
  const bottom = merge(target.map((p) => (p.role === "helper" ? { ...p, role: "action" as Role } : p)));
  const CH = 8.4;
  const PAD = 12;
  const GAP = 10;
  const lay = (row: Part[]) => {
    let x = 0;
    return row.map((p) => {
      const w = p.word.length * CH + PAD * 2;
      const box = { ...p, x, w };
      x += w + GAP;
      return box;
    });
  };
  const a = lay(top);
  const b = lay(bottom);
  const width = Math.max(a.length ? a[a.length - 1].x + a[a.length - 1].w : 0, b.length ? b[b.length - 1].x + b[b.length - 1].w : 0, 200);
  const H = 190;
  const box = (p: Part & { x: number; w: number }, y: number, key: string) => (
    <g key={key}>
      <rect x={p.x} y={y} width={p.w} height={34} rx={10} fill={`rgba(${ROLE[p.role].rgb},0.14)`} stroke={ROLE[p.role].color} strokeOpacity={0.6} />
      <text x={p.x + p.w / 2} y={y + 22} textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize={14} fontWeight={600} fill={C.milk}>
        {p.word}
      </text>
    </g>
  );
  return (
    <div className="overflow-x-auto" style={{ scrollbarWidth: "none" }}>
      <svg viewBox={`-2 0 ${width + 4} ${H}`} width={width + 4} style={{ maxWidth: "none", display: "block" }} role="img" aria-label={`Word order: English ${top.map((p) => p.word).join(" ")}, ${langLabel} ${bottom.map((p) => p.word).join(" ")}`}>
        <text x={0} y={11} fontSize={10} fontWeight={700} fill={C.mono} letterSpacing={1.2}>ENGLISH</text>
        {a.map((p, i) => box(p, 18, `a${i}`))}
        {a.map((p, i) => {
          const match = b.find((q) => q.role === p.role);
          if (!match) return null;
          const x1 = p.x + p.w / 2;
          const x2 = match.x + match.w / 2;
          return <path key={`c${i}`} d={`M${x1} 52 C${x1} 95, ${x2} 95, ${x2} 138`} fill="none" stroke={ROLE[p.role].color} strokeWidth={2} strokeOpacity={0.75} />;
        })}
        {b.map((p, i) => box(p, 138, `b${i}`))}
        <text x={0} y={186} fontSize={10} fontWeight={700} fill={C.mono} letterSpacing={1.2}>{langLabel.toUpperCase()}</text>
      </svg>
    </div>
  );
}

function Venn() {
  const left = ["The action goes last", "No words for the or a", "English word + maadu, karna, pannu, cheyyuka", "Often drop I: the ending already says it (Kannada, Tamil)"];
  const both = ["A friendly you and a polite you", "Loanwords stay: piano, football", "Time words: yesterday, now, tomorrow"];
  const right = ["The action sits in the middle", "Needs le, la, un, une", "Each action is its own verb", "French: tu for friends, vous to be polite"];
  return (
    <div>
      <svg viewBox="0 0 360 170" width="100%" style={{ maxWidth: 460, display: "block", margin: "0 auto" }} role="img" aria-label="Venn diagram: Kannada, Hindi, Tamil, Malayalam and Telugu on the left, English and French on the right, shared ideas in the middle">
        <circle cx="130" cy="85" r="78" fill="rgba(255,179,92,0.13)" stroke={C.sodium} strokeOpacity="0.6" />
        <circle cx="230" cy="85" r="78" fill="rgba(159,211,255,0.12)" stroke={SKY} strokeOpacity="0.6" />
        <text x="90" y="74" textAnchor="middle" fontSize="12" fontWeight="700" fill={C.sodium}>Kannada · Hindi</text>
        <text x="90" y="90" textAnchor="middle" fontSize="12" fontWeight="700" fill={C.sodium}>Tamil · Malayalam</text>
        <text x="268" y="80" textAnchor="middle" fontSize="13" fontWeight="700" fill={SKY}>English</text>
        <text x="268" y="96" textAnchor="middle" fontSize="13" fontWeight="700" fill={SKY}>French</text>
        <text x="180" y="82" textAnchor="middle" fontSize="11" fontWeight="700" fill={C.milk}>both</text>
        <text x="180" y="97" textAnchor="middle" fontSize="16" aria-hidden="true">🤝</text>
      </svg>
      <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
        {[
          { title: "Indian languages", color: C.sodium, rgb: "255,179,92", items: left },
          { title: "Shared", color: C.milk, rgb: "242,237,226", items: both },
          { title: "English and French", color: SKY, rgb: "159,211,255", items: right },
        ].map((g) => (
          <div key={g.title} className="rounded-[14px] p-3.5" style={{ background: `rgba(${g.rgb},0.06)`, border: `1px solid rgba(${g.rgb},0.22)` }}>
            <div className="text-[10.5px] font-bold" style={{ color: g.color, letterSpacing: 1.1 }}>
              {g.title.toUpperCase()}
            </div>
            <ul className="mt-1.5 flex flex-col gap-1">
              {g.items.map((it) => (
                <li key={it} className="text-[12.5px] leading-snug" style={{ color: C.muted }}>
                  {it}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

// ............................................................ the screen
type Props = {
  lang: Lang;
  onLanguageChange: (lang: Lang) => void;
  gender: Gender;
  setGender: (g: Gender) => void;
  slow: boolean;
  setSlow: (v: boolean) => void;
  onSaved: () => void;
  rm: boolean;
  onTalk?: (line: { target: string; en: string }, french?: boolean) => void;
};

const DEFAULT_OBJECT: Record<string, string | null> = {
  play: "piano", sing: "song", practise: "piano", listen: "music", learn: "language", teach: "piano", do: "shopping", go: "home", come: "home",
  eat: "rice", drink: "tea", playgame: "football", speak: "language", see: "movie", read: "book", write: "song", buy: "coffee", give: "money", take: "key",
  tune: "guitar", record: "song", count: "swara", explain: "scale", repeat: "thissong", open: "door", close: "door", bring: "water", send: "message",
  show: "photo", put: "key", wash: "clothes", cut: "vegetables", ask: "name", start: "song", stop: "music", finish: "lunch",
  try: "dosa", search: "key", change: "clothes", repair: "phone", clean: "room", pay: "bill", sell: "guitar", order: "dosa", book: "ticket",
  cancel: "ticket", drive: "car", wear: "shirt", cook: "rice", sit: "chair", travel: "city", call: "cab",
};

export function SentenceLab({ lang, onLanguageChange, gender, setGender, slow, setSlow, onSaved, rm, onTalk }: Props) {
  const [plang, setPlang] = useState<PathLang>(lang);
  useEffect(() => {
    setPlang((cur) => (cur === "fr" ? cur : lang));
  }, [lang]);

  const [who, setWho] = useState<Who>("i");
  const [name, setName] = useState("");
  const [nameG, setNameG] = useState<Gender>("m");
  const [verb, setVerb] = useState("play");
  const [object, setObject] = useState<string | null>("piano");
  const [when, setWhen] = useState<When>("present");
  const [timeWord, setTimeWord] = useState(true);
  const [negative, setNegative] = useState(false);
  const [question, setQuestion] = useState(false);
  // The shape of the sentence, and the slots only some shapes use.
  const [shape, setShape] = useState<ShapeId>("does");
  const [subject, setSubject] = useState("this");
  const [adj, setAdj] = useState<string | null>(null);
  const [quant, setQuant] = useState<string | null>(null);
  const [place, setPlace] = useState<string | null>(null);
  const [verb2, setVerb2] = useState("buy");
  const [qword, setQword] = useState("where");
  const [polite, setPolite] = useState(true);
  const [direction, setDirection] = useState<string | null>(null);
  const [the, setThe] = useState(false);
  const [need, setNeed] = useState(false);
  // Where the learner is: an auto, the passport office, the doctor. Remembered.
  const [situationId, setSituationIdState] = useState<string | null>(null);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("maatu-build-situation");
      if (saved && situationById(saved)) setSituationIdState(saved);
    } catch {}
  }, []);
  const situation = situationById(situationId);
  const sitWords = useMemo(() => (situation ? situationWords(situation) : { objects: [], verbs: [] }), [situation]);
  const [flash, setFlash] = useState<Role | null>(null);
  const whoRef = useRef<HTMLDivElement | null>(null);
  const actionRef = useRef<HTMLDivElement | null>(null);
  const whatRef = useRef<HTMLDivElement | null>(null);
  const whenRef = useRef<HTMLDivElement | null>(null);
  const pickersRef = useRef<HTMLDivElement | null>(null);
  const [verbQuery, setVerbQuery] = useState("");
  const [verbCat, setVerbCat] = useState<string | null>(null);
  const [wordQuery, setWordQuery] = useState("");
  const [bankOpen, setBankOpen] = useState(false);
  const [bankCat, setBankCat] = useState<string | null>(null);
  const [view, setView] = useState<"order" | "all" | "venn" | "ladder">("order");
  const [showKey, setShowKey] = useState(false);
  const [stuck, setStuck] = useState(false);
  const sentinel = useRef<HTMLDivElement | null>(null);
  const voice = useVoice(slow);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setStuck(!e.isIntersecting), { threshold: 1 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const choice: PathChoice = { who, name, nameG, verb, object, when, timeWord, negative, question, gender };
  const shapeChoice: ShapeChoice = { ...choice, shape, subject, adj, quant, place, verb2, qword, polite, direction, the, need };
  const key = JSON.stringify(shapeChoice);
  const info = shapeById(shape);
  const uses = (slot: string) => info.slots.includes(slot as never);
  const can = (t: string) => info.toggles.includes(t as never);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const result = useMemo(() => buildLine(plang, shapeChoice), [plang, key]);
  // Only show the man or woman switch when it changes this very line.
  const genderAlt = useMemo(() => buildLine(plang, { ...shapeChoice, gender: gender === "m" ? "f" : "m" }), [plang, key]); // eslint-disable-line react-hooks/exhaustive-deps
  const genderMatters = Boolean(result && genderAlt && !result.unsupported && genderAlt.sentence !== result.sentence);
  const ladder = useMemo(() => LADDER.map((w) => ({ w, r: buildPath(plang, { ...choice, when: w }) })), [plang, who, name, nameG, verb, object, timeWord, negative, question, gender]); // eslint-disable-line react-hooks/exhaustive-deps
  const people = useMemo(
    () => WHO_TILES.filter((t) => t.id !== "name").map((t) => ({ t, r: buildPath(plang, { ...choice, who: t.id, timeWord: false, question: false }) })),
    [plang, verb, object, when, negative, gender], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const everyLang = useMemo(() => PATH_LANGS.map((l) => ({ l, r: buildPath(l.id, choice) })), [who, name, nameG, verb, object, when, timeWord, negative, question, gender]); // eslint-disable-line react-hooks/exhaustive-deps

  // Put any line into the builder: a situation line, a related line, a dice roll.
  const loadSpec = useCallback((spec: LineSpec) => {
    const c = fullChoice(spec, gender);
    setShape(c.shape);
    setWho(c.who);
    setName(c.name ?? "");
    setNameG(c.nameG ?? "m");
    setVerb(c.verb);
    setObject(c.object);
    setWhen(c.when);
    setTimeWord(c.timeWord);
    setNegative(c.negative);
    setQuestion(c.question);
    setSubject(c.subject);
    setAdj(c.adj);
    setQuant(c.quant);
    setPlace(c.place);
    setVerb2(c.verb2);
    setQword(c.qword);
    setPolite(c.polite);
    setDirection(c.direction ?? null);
    setThe(Boolean(c.the));
    setNeed(Boolean(c.need));
  }, [gender]);

  const pickSituation = (id: string | null) => {
    setSituationIdState(id);
    try {
      if (id) window.localStorage.setItem("maatu-build-situation", id);
      else window.localStorage.removeItem("maatu-build-situation");
    } catch {}
    const s = situationById(id);
    if (s) loadSpec(s.lines[0].c);
  };

  // Surprise me: a real line from the place you are in (or any place), so the
  // related lines and the conversation underneath have a real world to grow from.
  const surprise = () => {
    if (!situation && Math.random() < 0.35) {
      const r = randomChoice(gender, plang);
      loadSpec({ shape: "does", ...r });
      return;
    }
    for (let i = 0; i < 6; i += 1) {
      const { line } = surpriseLine(situation);
      const r = buildLine(plang, fullChoice(line.c, gender));
      if (r && !r.unsupported) {
        loadSpec(line.c);
        return;
      }
    }
    loadSpec({ shape: "does", ...randomChoice(gender, plang) });
  };

  const jumpTo = (role: Role) => {
    const target = ({ who: whoRef, action: actionRef, what: whatRef, when: whenRef } as Partial<Record<Role, typeof whoRef>>)[role];
    const el = target?.current ?? pickersRef.current;
    el?.scrollIntoView({ behavior: rm ? "auto" : "smooth", block: "start" });
    setFlash(role);
    window.setTimeout(() => setFlash(null), 1400);
  };

  const related = useMemo(() => {
    const seen = new Set<string>([result?.sentence ?? ""]);
    return relatedTo(shapeChoice, situation)
      .map((r) => ({ ...r, res: buildLine(plang, fullChoice(r.c, gender)) }))
      .filter((r) => {
        if (!r.res || r.res.unsupported || !r.res.sentence || seen.has(r.res.sentence)) return false;
        seen.add(r.res.sentence);
        return true;
      })
      .slice(0, 12);
  }, [plang, key, situationId]); // eslint-disable-line react-hooks/exhaustive-deps

  // The conversation under the sentence: the place's own script, or one grown
  // from the everyday sentence on the card.
  const talk = useMemo(() => {
    const lines: Line[] = situation ? situation.lines : conversationAround(shapeChoice);
    return lines.map((l) => ({ l, res: buildLine(plang, fullChoice(l.c, gender)) })).filter((x) => x.res && !x.res.unsupported && x.res.sentence);
  }, [plang, situationId, gender, situation ? "" : key]); // eslint-disable-line react-hooks/exhaustive-deps

  // Switching language must never leave the learner on a word that language
  // does not have yet: move to the nearest thing that works and say nothing.
  const pickLang = (l: PathLang) => {
    setPlang(l);
    if (l !== "fr") onLanguageChange(l);
    if (!verbInLang(verb, l)) {
      const next = VERB_TILES.find((v) => verbInLang(v.id, l)) ?? VERB_TILES[0];
      setVerb(next.id);
      setObject(next.objects.find((o) => wordInLang(o, l)) ?? null);
      return;
    }
    if (!wordInLang(object, l)) setObject(objectsFor(verb).find((o) => wordInLang(o, l)) ?? null);
  };

  // Every shape opens on a sentence that already works; a blank card teaches
  // nothing and makes the shape look broken.
  const pickShape = (next: ShapeId) => {
    setShape(next);
    setThe(false);
    setNeed(false);
    const seed: Partial<Record<ShapeId, () => void>> = {
      isAdj: () => { setSubject("tea"); setAdj("hot"); },
      isNoun: () => { setSubject("this"); setObject("mango"); setAdj(null); setQuant(null); },
      have: () => { setObject("change"); setAdj(null); setQuant(null); setWho("i"); },
      want: () => { setObject("water"); setAdj("hot"); setQuant("alittle"); setWho("i"); },
      like: () => { setObject("thissong"); setAdj(null); setWho("i"); },
      thereIs: () => { setObject("milk"); setAdj(null); setQuant(null); setPlace(null); },
      whereIs: () => { setObject("phone"); setAdj(null); setWho("i"); },
      howMuch: () => { setObject("tomato"); setQuant("onekilo"); setAdj(null); },
      request: () => { setObject("water"); setQuant("alittle"); setAdj(null); },
      lets: () => { setVerb("drink"); setObject("tea"); setAdj(null); },
      goingTo: () => { setPlace("market"); setVerb2("buy"); setObject("vegetables"); setAdj(null); },
      whQuestion: () => { setQword("where"); setVerb("go"); setObject(null); setWhen("cont"); },
      does: () => { setVerb("play"); setObject("piano"); setWhen("present"); setAdj(null); setQuant(null); },
      tell: () => { setVerb("stop"); setObject(null); setDirection("here"); setAdj(null); setQuant(null); setNegative(false); setPolite(true); },
      feel: () => { setObject("fever"); setWho("i"); setAdj(null); setQuant(null); },
    };
    seed[next]?.();
  };

  const res: PathResult | null = result;
  const langInfo = PATH_LANGS.find((l) => l.id === plang)!;
  const suggested = objectsFor(verb);
  const verbTiles = verbQuery ? searchVerbs(verbQuery) : VERB_TILES;
  const sitVerbIds = new Set(situation ? situationWords(situation).verbs : []);
  const catIds = verbCat && !verbQuery ? new Set(VERB_GROUPS.find((g) => g.id === verbCat)?.ids ?? []) : null;
  const shown = catIds ? verbTiles.filter((v) => catIds.has(v.id)) : verbTiles;
  const musicVerbs = catIds ? shown : shown.filter((v) => (situation ? sitVerbIds.has(v.id) : v.music));
  const otherVerbs = catIds ? [] : shown.filter((v) => !(situation ? sitVerbIds.has(v.id) : v.music));

  const pickVerb = (id: string) => {
    setVerb(id);
    const list = objectsFor(id).filter((o) => wordInLang(o, plang));
    const want = DEFAULT_OBJECT[id] ?? null;
    const obj = want && list.includes(want) ? want : list[0] ?? null;
    setObject(obj);
    if (!whenAllowed(id, when, obj)) setWhen("present");
  };

  const pickObject = (id: string | null) => {
    setObject(id);
    if (!whenAllowed(verb, when, id)) setWhen("present");
    setBankOpen(false);
    setWordQuery("");
  };

  const targetWord = (id: string) => {
    if (plang === "fr") return "";
    const v = verbById(id);
    return v ? v[plang].dict : "";
  };
  const whoWord = (id: Who) => {
    if (id === "name") return "";
    const r = buildPath(plang, { ...choice, who: id, timeWord: false, question: false, when: "present", negative: false });
    return r?.parts.find((p) => p.role === "who")?.word ?? "";
  };
  const objectWord = (id: string) => {
    if (plang === "fr") return "";
    const r = buildPath(plang, { ...choice, object: id, when: "present", negative: false, question: false, timeWord: false });
    return r?.parts.find((p) => p.role === "what")?.word ?? "";
  };

  const bank = useMemo(() => wordBank(), []);
  const genderPick = (
    <span className="flex flex-none gap-1" role="group" aria-label="Who is speaking">
      {(["m", "f"] as Gender[]).map((g) => (
        <button
          key={g}
          type="button"
          aria-pressed={gender === g}
          onClick={() => setGender(g)}
          className="rounded-full px-2.5 py-1 text-[11.5px] font-semibold focus-visible:outline focus-visible:outline-2"
          style={{ background: gender === g ? "rgba(191,239,219,0.16)" : C.base, color: gender === g ? C.tube : C.muted, border: `1px solid ${gender === g ? "rgba(191,239,219,0.5)" : LINE}`, outlineColor: C.tube }}
        >
          {g === "m" ? "🙋‍♂️ I'm a man" : "🙋‍♀️ I'm a woman"}
        </button>
      ))}
    </span>
  );

  // The place you are in puts its own words first, so the right word is one tap away.
  const firstOf = <T extends { id: string }>(list: T[], ids: string[]) => {
    if (!ids.length) return list;
    const rank = new Map(ids.map((id, i) => [id, i]));
    return [...list].sort((a, b) => (rank.get(a.id) ?? 1e4) - (rank.get(b.id) ?? 1e4));
  };
  const sitVerbTiles = firstOf(VERB_TILES, sitWords.verbs);
  const shapeWords: ObjectWord[] = useMemo(() => {
    const all = bank.flatMap((g) => g.words);
    if (shape === "feel") return all.filter((o) => objectById(o.id)?.ill);
    return firstOf(all, sitWords.objects);
  }, [shape, situationId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Change one thing: a chip for every part this sentence has, with its picture.
  const strip = (t: string) => t.replace(/^(the|a|an|to the|to) /, "");
  const quick: Chip[] = [];
  const whoTile = WHO_TILES.find((t) => t.id === who);
  if (uses("who") || shape === "does") quick.push({ role: "who", emoji: whoTile?.emoji ?? "🙋", text: who === "name" ? name || "a name" : whoTile ? (whoTile.hint ? `${whoTile.en}, ${whoTile.hint}` : whoTile.en) : "who" });
  if (uses("verb") || uses("verb2") || shape === "does") {
    const vt = VERB_TILES.find((v) => v.id === (uses("verb2") ? verb2 : verb));
    if (vt) quick.push({ role: "action", emoji: vt.emoji, text: vt.short ?? vt.en.replace(/ \(.*\)$/, "") });
  }
  if ((uses("object") || shape === "does") && object) quick.push({ role: "what", emoji: OBJECT_EMOJI[object] ?? "•", text: strip(objectEnglish(object, plang)) });
  if (can("tense")) {
    const wt = WHEN_TILES.find((w) => w.id === when);
    if (wt) quick.push({ role: "when", emoji: wt.emoji, text: wt.en });
  }

  const found = wordQuery ? searchWords(wordQuery, plang) : [];
  const bankWords: ObjectWord[] = wordQuery ? found : bankCat ? (bank.find((g) => g.id === bankCat)?.words ?? []) : bank.flatMap((g) => g.words);

  return (
    <div>
      {/* ................................................. which language: its own bar, its own colour */}
      <div className="grid grid-cols-5 gap-1 rounded-[18px] p-1" style={{ background: C.tar, border: `1px solid ${LINE}` }} role="group" aria-label="Language you are learning">
        {PATH_LANGS.map((l) => {
          const on = plang === l.id;
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => pickLang(l.id)}
              aria-pressed={on}
              className="flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-[14px] px-0.5 py-2 focus-visible:outline focus-visible:outline-2"
              style={{ background: on ? l.accent : "transparent", color: on ? C.ink : C.muted, outlineColor: l.accent, transition: "background 160ms ease, color 160ms ease" }}
            >
              <span className="text-[17px] leading-none" aria-hidden="true">{l.flag}</span>
              <span className="w-full truncate text-center text-[11.5px] font-bold sm:text-[13px]">{l.label}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[12.5px]" style={{ color: langInfo.accent }}>
        Learning {langInfo.label}, the way people speak it in {langInfo.city}.
      </p>

      {/* ................................................. where are you */}
      <div className="mt-4">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <span className="text-[9.5px] font-bold" style={{ color: C.mono, letterSpacing: 1.2 }}>WHERE ARE YOU?</span>
          <span className="text-[11.5px]" style={{ color: C.faint }}>Pick a place, get the whole conversation</span>
        </div>
        <div className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" style={{ scrollbarWidth: "none" }} role="group" aria-label="Situations">
          {[{ id: null as string | null, emoji: "✨", title: "Anything" }, ...SITUATIONS].map((t) => {
            const on = situationId === t.id;
            return (
              <button
                key={t.id ?? "any"}
                type="button"
                onClick={() => pickSituation(t.id)}
                aria-pressed={on}
                className="inline-flex flex-none items-center gap-1.5 rounded-full px-3 py-2 text-[12.5px] font-semibold focus-visible:outline focus-visible:outline-2"
                style={{ background: on ? C.milk : C.base, color: on ? C.ink : C.muted, border: `1px solid ${on ? C.milk : LINE}`, outlineColor: C.milk }}
              >
                <span aria-hidden="true">{t.emoji}</span>
                {t.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* ................................................. what do you want to say: the first choice */}
      <div className="mt-4">
        <ShapeRail shape={shape} onPick={pickShape} rm={rm} />
      </div>

      {/* ................................................. the sentence, always in view */}
      <div ref={sentinel} aria-hidden="true" style={{ height: 1 }} />
      <div className="sticky top-0 z-20 -mx-5 mt-3 px-5 pb-2 pt-3 sm:mx-0 sm:px-0" style={{ background: `linear-gradient(${C.night} calc(100% - 12px), rgba(10,13,22,0))` }}>
        <div
          className={"rounded-[20px]" + (stuck ? " p-3" : " p-4")}
          style={{ background: `linear-gradient(150deg,${langInfo.accent}26,rgba(232,80,58,0.05) 55%,rgba(191,239,219,0.05))`, border: `1px solid ${langInfo.accent}66` }}
          aria-live="polite"
        >
          <div className="flex items-start justify-between gap-3">
            <span className="min-w-0 flex-1">
              <span className={"items-center gap-1.5 text-[9.5px] font-bold" + (stuck ? " hidden" : " flex")} style={{ color: C.mono, letterSpacing: 1.2 }}>
                <span className="rounded-full px-1.5" style={{ background: "rgba(242,237,226,0.1)", color: C.milk }}>A</span>
                YOUR IDEA
              </span>
              <span className={"block font-semibold leading-snug" + (stuck ? " text-[13.5px]" : " mt-1 text-[16px]")} style={{ color: C.milk }}>
                {res && (shape === "does" ? <EnglishWords parts={res.enParts} question={question} /> : res.english)}
              </span>
            </span>
            <button
              type="button"
              onClick={surprise}
              className="inline-flex flex-none items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold focus-visible:outline focus-visible:outline-2"
              style={{ background: "rgba(245,194,255,0.14)", color: LILAC, border: "1px solid rgba(245,194,255,0.45)", outlineColor: LILAC }}
            >
              <span aria-hidden="true">🎲</span>
              <span className={stuck ? "sr-only" : undefined}>Surprise me</span>
            </button>
          </div>

          <div className={"items-center gap-2" + (stuck ? " hidden" : " my-3 flex")} aria-hidden="true">
            <span className="h-px flex-1" style={{ background: `linear-gradient(90deg,rgba(191,239,219,0.4),${langInfo.accent}88)` }} />
            <span className="text-[13px]">{langInfo.flag}</span>
            <span className="h-px flex-1" style={{ background: `linear-gradient(90deg,${langInfo.accent}88,rgba(245,194,255,0.4))` }} />
          </div>

          <div className={"items-center justify-between gap-2" + (stuck ? " hidden" : " flex")}>
            <span className="flex items-center gap-1.5 text-[9.5px] font-bold" style={{ color: langInfo.accent, letterSpacing: 1.2 }}>
              <span className="rounded-full px-1.5" style={{ background: langInfo.accent, color: C.ink }}>B</span>
              SAY IT IN {langInfo.label.toUpperCase()}
            </span>
            {!stuck && res && !res.unsupported && <span className="text-[10.5px]" style={{ color: C.faint }}>tap a coloured word to change it</span>}
          </div>

          {res?.unsupported ? (
            <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: "#FFC2B6" }} role="alert">
              {res.unsupported}
            </p>
          ) : res ? (
            <div key={res.sentence} style={{ animation: rm ? undefined : "mtFade 280ms ease both" }}>
              <div className="mt-2">
                <Words parts={withMark(res.parts, (can("question") && question) || /\?$/.test(res.english), plang)} size={stuck ? 19 : 22} onPick={jumpTo} />
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <PlayButton voice={voice} text={res.sentence} lang={plang} big />
                <PlayButton voice={voice} text={res.sentence} lang={plang} big slow ghost />
                {genderMatters && (
                  <button
                    type="button"
                    onClick={() => setGender(gender === "f" ? "m" : "f")}
                    aria-label={`Said by a ${gender === "f" ? "woman" : "man"}. Tap to switch.`}
                    className="inline-flex h-11 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-semibold focus-visible:outline focus-visible:outline-2"
                    style={{ background: "rgba(191,239,219,0.10)", color: C.tube, border: "1px solid rgba(191,239,219,0.4)", outlineColor: C.tube }}
                  >
                    {gender === "f" ? "🙋‍♀️ Said by a woman" : "🙋‍♂️ Said by a man"}
                  </button>
                )}
              </div>
              {!stuck && <QuickChips chips={quick} onPick={jumpTo} />}
              <div className={"mt-2.5 rounded-[12px] px-3 py-2" + (stuck ? " hidden" : "")} style={{ background: "rgba(10,13,22,0.45)", border: `1px solid ${LINE_SOFT}` }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold" style={{ color: C.faint, letterSpacing: 1.1 }}>
                    {plang === "fr" ? "SOUNDS LIKE" : "SAY IT IN BEATS"}
                  </span>
                  <button type="button" onClick={() => setShowKey(!showKey)} className="text-[11px] font-semibold" style={{ color: C.faint }} aria-expanded={showKey}>
                    {showKey ? "hide the key" : "how to read this"}
                  </button>
                </div>
                <div className="mt-1 text-[14.5px] leading-relaxed" style={{ color: C.milk, fontFamily: MONO, wordSpacing: 4 }}>
                  {res.say}
                </div>
                {showKey && (
                  <div className="mt-2 grid gap-1 border-t pt-2" style={{ borderColor: LINE_SOFT }}>
                    {HOW_TO_SAY[plang].map((row) => (
                      <div key={row.k} className="flex gap-3 text-[12px]">
                        <span className="w-[92px] flex-none font-semibold" style={{ color: C.sodium, fontFamily: MONO }}>{row.k}</span>
                        <span style={{ color: C.muted }}>{row.v}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className={"mt-2.5 flex flex-wrap items-center gap-2" + (stuck ? " hidden" : "")}>
                {plang !== "fr" && <SaveButton lang={plang} en={res.english} target={res.sentence} onChange={onSaved} />}
                {onTalk && (
                  <button
                    type="button"
                    onClick={() => onTalk({ target: res.sentence, en: res.english }, plang === "fr")}
                    className="inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[12.5px] font-semibold focus-visible:outline focus-visible:outline-2"
                    style={{ background: "rgba(191,239,219,0.10)", color: C.tube, border: "1px solid rgba(191,239,219,0.38)", outlineColor: C.tube }}
                  >
                    🗣️ Say it to {plang === "fr" ? "Camille" : HOST[plang].name}
                  </button>
                )}
              </div>
              {voice.error && (
                <div className="mt-2 text-[12px]" style={{ color: "#FFB3A6" }} role="alert">
                  {voice.error}
                </div>
              )}
              {res.note && !stuck && (
                <p className="mt-2.5 text-[12.5px] leading-relaxed" style={{ color: `${langInfo.accent}EE` }}>
                  {res.note}
                </p>
              )}
            </div>
          ) : null}

          {/* yes or no, telling or asking: always with the sentence, when the shape has them */}
          {(can("negative") || can("question") || can("register")) && (
            <div className={"flex gap-2 border-t" + (stuck ? " mt-2 pt-2" : " mt-3 pt-2.5")} style={{ borderColor: "rgba(242,237,226,0.10)" }}>
              {can("negative") && (
                <Switch2
                  compact={stuck}
                  label={shape === "tell" ? "DO IT, OR DO NOT" : "IS IT, OR IS IT NOT"} on={negative} onChange={setNegative}
                  left={{ icon: "✓", text: shape === "tell" ? "Do it" : "Yes, it is", color: GREEN }}
                  right={{ icon: "✗", text: shape === "tell" ? "Do not" : "No, it is not", color: RED }}
                />
              )}
              {can("question") && (
                <Switch2
                  compact={stuck}
                  label="TELLING, OR ASKING" on={question} onChange={setQuestion}
                  left={{ icon: "💬", text: "Telling", color: C.tube }}
                  right={{ icon: "❓", text: "Asking", color: SKY }}
                />
              )}
              {can("register") && (
                <Switch2
                  compact={stuck}
                  label="WHO YOU ARE TALKING TO" on={!polite} onChange={(v) => setPolite(!v)}
                  left={{ icon: "🙏", text: "Politely", color: C.tube }}
                  right={{ icon: "👋", text: "A friend", color: SKY }}
                />
              )}
            </div>
          )}
        </div>
      </div>


      {can("tense") && (
        <div ref={whenRef} className="mt-3 scroll-mt-[220px] rounded-[18px]" style={{ boxShadow: flash === "when" ? `0 0 0 3px ${ROLE.when.color}55` : undefined, transition: "box-shadow 300ms ease" }}>
          <Timeline when={when} setWhen={setWhen} verb={verb} object={object} timeWord={timeWord} setTimeWord={setTimeWord} rm={rm} />
        </div>
      )}

      {/* ................................................. the words this shape needs */}
      {shape !== "does" && (
        <div ref={pickersRef} className="mt-3 grid scroll-mt-[220px] gap-3 lg:grid-cols-2 lg:items-start">
          {uses("subject") && <SubjectPalette value={subject} onPick={setSubject} lang={plang} />}
          {uses("who") && (
            <Panel tone="who" label="WHO" title="Who is it about?" right={genderPick} at={whoRef} glow={flash === "who"}>
              <div className="grid grid-cols-4 gap-1.5">
                {WHO_TILES.filter((t) => t.id !== "name").map((t) => (
                  <Tile key={t.id} tone="who" on={who === t.id} onClick={() => setWho(t.id)} emoji={t.emoji} title={t.hint ? `${t.en}, ${t.hint}` : t.en} />
                ))}
              </div>
            </Panel>
          )}
          {uses("object") && (
            <Panel tone="what" label="WHICH THING" at={whatRef} title={shape === "feel" ? "What is wrong?" : situation ? `Words for ${situation.title.toLowerCase()} come first` : "Any word in the bank"} glow={flash === "what"}>
              <Search value={wordQuery} onChange={setWordQuery} placeholder={shape === "feel" ? "Search: fever, cough, pain" : "Search any word: dosa, rent, bus"} tone="what" />
              <div className="grid max-h-[220px] grid-cols-4 gap-1.5 overflow-y-auto pr-0.5" style={{ scrollbarWidth: "thin" }}>
                {(wordQuery ? searchWords(wordQuery, plang).filter((o) => shape !== "feel" || objectById(o.id)?.ill) : shapeWords).map((o) => (
                  <Tile
                    key={o.id} tone="what" on={object === o.id} onClick={() => setObject(o.id)}
                    emoji={OBJECT_EMOJI[o.id] ?? "•"} title={objectEnglish(o.id, plang).replace(/^(the|a|an|to the|to) /, "")}
                    sub={plang === "fr" ? "" : o[plang as Lang]}
                  />
                ))}
              </div>
            </Panel>
          )}
          {uses("adj") && <AdjectivePalette value={adj} onPick={setAdj} lang={plang} allowNone={shape !== "isAdj"} />}
          {uses("quant") && <QuantityPalette value={quant} onPick={setQuant} lang={plang} />}
          {uses("qword") && <QuestionWordPalette value={qword} onPick={setQword} lang={plang} />}
          {uses("direction") && <DirectionPalette value={direction} onPick={setDirection} lang={plang} />}
          {shape === "whereIs" && (
            <Panel tone="who" label="WHOSE" title="Mine, or just the one here?">
              <div className="grid grid-cols-2 gap-1.5">
                <Tile tone="who" on={!the} onClick={() => setThe(false)} emoji="🙋" title={who === "i" ? "my" : "whose"} />
                <Tile tone="who" on={the} onClick={() => setThe(true)} emoji="👉" title="the" />
              </div>
            </Panel>
          )}
          {shape === "want" && (
            <Panel tone="action" label="HOW MUCH YOU MEAN IT" title="Want it, or need it?">
              <div className="grid grid-cols-2 gap-1.5">
                <Tile tone="action" on={!need} onClick={() => setNeed(false)} emoji="🙂" title="I want" />
                <Tile tone="action" on={need} onClick={() => setNeed(true)} emoji="❗" title="I need" />
              </div>
            </Panel>
          )}
          {uses("placeAt") && <PlacePalette value={place} onPick={setPlace} lang={plang} mode="at" />}
          {uses("place") && <PlacePalette value={place} onPick={setPlace} lang={plang} mode="to" />}
          {(uses("verb") || uses("verb2")) && (
            <Panel tone="action" label="ACTION" title={`${VERB_TILES.length} actions`} at={actionRef} glow={flash === "action"}>
              <Search value={verbQuery} onChange={setVerbQuery} placeholder="Search an action: buy, drink, go" tone="action" />
              <div className="grid max-h-[220px] grid-cols-4 gap-1.5 overflow-y-auto pr-0.5" style={{ scrollbarWidth: "thin" }}>
                {(verbQuery ? searchVerbs(verbQuery) : sitVerbTiles).map((v) => {
                  const picked = uses("verb2") ? verb2 : verb;
                  return (
                    <Tile
                      key={v.id} tone="action" on={picked === v.id}
                      onClick={() => (uses("verb2") ? setVerb2(v.id) : pickVerb(v.id))}
                      emoji={v.emoji} title={v.en} sub={targetWord(v.id)} dim={!verbInLang(v.id, plang)}
                    />
                  );
                })}
              </div>
            </Panel>
          )}
        </div>
      )}

      {/* ................................................. the three pickers, all open */}
      {shape === "does" && (
      <div className="mt-3 grid gap-3 lg:grid-cols-3 lg:items-start">
        <Panel tone="who" label="WHO" title="Who is doing it?" right={genderPick} at={whoRef} glow={flash === "who"}>
          <div className="grid grid-cols-4 gap-1.5">
            {WHO_TILES.map((t) => (
              <Tile key={t.id} tone="who" on={who === t.id} onClick={() => setWho(t.id)} emoji={t.emoji} title={t.hint && t.id !== "name" ? `${t.en}, ${t.hint}` : t.en} sub={whoWord(t.id)} />
            ))}
          </div>
          {who === "name" && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Type a name: Ravi, Meera, Jason"
                maxLength={24}
                className="min-w-0 flex-1 rounded-full px-4 py-2.5 text-[14px] focus-visible:outline focus-visible:outline-2"
                style={{ background: C.base, color: C.milk, border: `1px solid ${LINE}`, outlineColor: C.tube }}
                aria-label="A name"
              />
              {(["m", "f"] as Gender[]).map((g) => (
                <button
                  key={g}
                  type="button"
                  aria-pressed={nameG === g}
                  onClick={() => setNameG(g)}
                  className="rounded-full px-3 py-2 text-[12.5px] font-semibold focus-visible:outline focus-visible:outline-2"
                  style={{ background: nameG === g ? "rgba(191,239,219,0.16)" : C.base, color: nameG === g ? C.tube : C.muted, border: `1px solid ${nameG === g ? "rgba(191,239,219,0.5)" : LINE}`, outlineColor: C.tube }}
                >
                  {g === "m" ? "👨 he" : "👩 she"}
                </button>
              ))}
            </div>
          )}
        </Panel>

        <Panel
          tone="action"
          label="ACTION"
          title={`${VERB_TILES.length} actions`}
          right={<span className="flex-none text-[11px]" style={{ color: C.sodium }}>{situation ? `${situation.emoji} first` : "music first"}</span>}
          at={actionRef}
          glow={flash === "action"}
        >
          <Search value={verbQuery} onChange={setVerbQuery} placeholder="Search an action: cook, pay, open" tone="action" />
          {!verbQuery && (
            <div className="-mx-1 mb-2 flex gap-1.5 overflow-x-auto px-1 pb-1" style={{ scrollbarWidth: "none" }} role="group" aria-label="Kinds of action">
              {[{ id: null as string | null, emoji: situation ? situation.emoji : "✨", label: situation ? "This place" : "All" }, ...VERB_GROUPS].map((g) => {
                const on = verbCat === g.id;
                return (
                  <button
                    key={g.id ?? "all"}
                    type="button"
                    onClick={() => setVerbCat(g.id)}
                    aria-pressed={on}
                    className="flex-none rounded-full px-3 py-1.5 text-[11.5px] font-semibold focus-visible:outline focus-visible:outline-2"
                    style={{ background: on ? "rgba(255,179,92,0.16)" : C.base, color: on ? C.sodium : C.muted, border: `1px solid ${on ? "rgba(255,179,92,0.5)" : LINE}`, outlineColor: C.sodium }}
                  >
                    <span aria-hidden="true">{g.emoji}</span> {g.label}
                  </button>
                );
              })}
            </div>
          )}
          <div className="max-h-[332px] overflow-y-auto pr-0.5" style={{ scrollbarWidth: "thin" }}>
            {musicVerbs.length > 0 && (
              <div className="grid grid-cols-4 gap-1.5">
                {musicVerbs.map((v) => (
                  <Tile key={v.id} tone="action" on={verb === v.id} onClick={() => pickVerb(v.id)} emoji={v.emoji} title={v.en} sub={targetWord(v.id)} dim={!verbInLang(v.id, plang)} />
                ))}
              </div>
            )}
            {otherVerbs.length > 0 && (
              <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                {otherVerbs.map((v) => (
                  <Tile key={v.id} tone="action" on={verb === v.id} onClick={() => pickVerb(v.id)} emoji={v.emoji} title={v.id === "do" ? "do" : v.en} sub={targetWord(v.id)} badge={v.trick ? "MAGIC" : undefined} dim={!verbInLang(v.id, plang)} />
                ))}
              </div>
            )}
            {verbTiles.length === 0 && (
              <p className="py-6 text-center text-[12.5px]" style={{ color: C.faint }}>
                No action matches that. Try cook, pay, open, send.
              </p>
            )}
          </div>
        </Panel>

        <Panel
          tone="what"
          label="WHAT"
          at={whatRef}
          glow={flash === "what"}
          title={suggested.length ? (verb === "go" || verb === "come" ? "Where to?" : verb === "do" ? "Which English word?" : "What?") : "This action needs nothing after it"}
          right={
            <button
              type="button"
              onClick={() => setBankOpen(!bankOpen)}
              aria-expanded={bankOpen}
              className="flex-none rounded-full px-3 py-1.5 text-[11.5px] font-bold focus-visible:outline focus-visible:outline-2"
              style={{ background: bankOpen ? "rgba(245,194,255,0.18)" : C.base, color: LILAC, border: "1px solid rgba(245,194,255,0.45)", outlineColor: LILAC }}
            >
              🗂️ {bankOpen ? "Close" : "All words"}
            </button>
          }
        >
          {!bankOpen ? (
            <div className="grid grid-cols-4 gap-1.5">
              {suggested.map((id) => (
                <Tile key={id} tone="what" on={object === id} onClick={() => pickObject(id)} emoji={OBJECT_EMOJI[id] ?? "•"} title={objectEnglish(id, plang).replace(/^(the|a|an|to the|to) /, "")} sub={objectWord(id)} dim={!wordInLang(id, plang)} />
              ))}
              <Tile tone="what" on={object === null} onClick={() => pickObject(null)} emoji="○" title="nothing" />
              {object && !suggested.includes(object) && (
                <Tile tone="what" on onClick={() => pickObject(object)} emoji={OBJECT_EMOJI[object] ?? "•"} title={objectEnglish(object, plang).replace(/^(the|a|an|to the|to) /, "")} sub={objectWord(object)} badge="YOURS" />
              )}
            </div>
          ) : (
            <div>
              <Search value={wordQuery} onChange={setWordQuery} placeholder="Search any word: dosa, train, rent" tone="what" />
              {!wordQuery && (
                <div className="-mx-1 mb-2 flex gap-1.5 overflow-x-auto px-1 pb-1" style={{ scrollbarWidth: "none" }}>
                  <button
                    type="button"
                    onClick={() => setBankCat(null)}
                    aria-pressed={bankCat === null}
                    className="flex-none rounded-full px-3 py-1.5 text-[11.5px] font-semibold"
                    style={{ background: bankCat === null ? "rgba(245,194,255,0.16)" : C.base, color: bankCat === null ? LILAC : C.muted, border: `1px solid ${bankCat === null ? "rgba(245,194,255,0.5)" : LINE}` }}
                  >
                    Everything
                  </button>
                  {bank.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setBankCat(g.id)}
                      aria-pressed={bankCat === g.id}
                      className="flex-none rounded-full px-3 py-1.5 text-[11.5px] font-semibold"
                      style={{ background: bankCat === g.id ? "rgba(245,194,255,0.16)" : C.base, color: bankCat === g.id ? LILAC : C.muted, border: `1px solid ${bankCat === g.id ? "rgba(245,194,255,0.5)" : LINE}` }}
                    >
                      <span aria-hidden="true">{g.emoji}</span> {g.label}
                    </button>
                  ))}
                </div>
              )}
              <div className="max-h-[300px] overflow-y-auto pr-0.5" style={{ scrollbarWidth: "thin" }}>
                <div className="grid grid-cols-4 gap-1.5">
                  {bankWords.map((o) => (
                    <Tile key={o.id} tone="what" on={object === o.id} onClick={() => pickObject(o.id)} emoji={OBJECT_EMOJI[o.id] ?? "•"} title={objectEnglish(o.id, plang).replace(/^(the|a|an|to the|to) /, "")} sub={plang === "fr" ? "" : o[plang as Lang]} dim={!wordInLang(o.id, plang)} />
                  ))}
                </div>
                {bankWords.length === 0 && (
                  <p className="py-6 text-center text-[12.5px]" style={{ color: C.faint }}>
                    No word matches that yet. Try dosa, train, rent, saree.
                  </p>
                )}
              </div>
              <p className="mt-2 text-[11.5px] leading-snug" style={{ color: C.faint }}>
                Any word works with any action. Some pairs are strange on purpose: that is how you find out what a sentence can hold.
              </p>
            </div>
          )}
        </Panel>
      </div>
      )}

      {/* ................................................. say more: the lines around this one */}
      {related.length > 0 && (
        <div className="mt-5">
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <span className="text-[9.5px] font-bold" style={{ color: LILAC, letterSpacing: 1.2 }}>SAY MORE</span>
            <span className="text-[11.5px]" style={{ color: C.faint }}>Lines that go with this one. Tap to make it yours.</span>
          </div>
          <div className="-mx-5 flex snap-x gap-2 overflow-x-auto px-5 pb-1.5 sm:mx-0 sm:px-0" style={{ scrollbarWidth: "none" }}>
            {related.map((r) => (
              <button
                key={r.label + r.res!.sentence}
                type="button"
                onClick={() => loadSpec(r.c)}
                className="flex w-[196px] flex-none snap-start flex-col gap-1 rounded-[14px] px-3 py-2.5 text-left focus-visible:outline focus-visible:outline-2"
                style={{ background: C.tar, border: `1px solid ${LINE}`, outlineColor: LILAC }}
              >
                <span className="text-[9.5px] font-bold" style={{ color: LILAC, letterSpacing: 1.1 }}>{r.label.toUpperCase()}</span>
                <span className="text-[13.5px] font-semibold leading-snug" style={{ color: langInfo.accent, fontFamily: MONO }}>{r.res!.sentence}</span>
                <span className="text-[11.5px] leading-snug" style={{ color: C.muted }}>{r.res!.english}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ................................................. the conversation */}
      {talk.length > 0 && (
        <section className="mt-3 rounded-[18px] p-3.5 sm:p-4" style={{ background: C.tar, border: `1px solid ${LINE}` }}>
          <div className="flex items-baseline justify-between gap-2">
            <span className="min-w-0">
              <span className="block text-[9.5px] font-bold" style={{ color: C.tube, letterSpacing: 1.2 }}>
                {situation ? `${situation.emoji} ${situation.title.toUpperCase()}` : "A LITTLE CONVERSATION AROUND IT"}
              </span>
              <span className="block text-[13px] font-semibold" style={{ color: C.milk }}>
                {situation ? situation.blurb : "Someone asks, you answer, and it carries on."}
              </span>
            </span>
          </div>
          <ol className="mt-2.5 flex flex-col gap-1.5">
            {talk.map(({ l, res: r }, i) => {
              const mine = l.by === "you";
              const current = r!.sentence === res?.sentence;
              return (
                <li key={i} className={"flex items-center gap-2" + (mine ? " flex-row-reverse" : "")}>
                  <button
                    type="button"
                    onClick={() => loadSpec(l.c)}
                    aria-pressed={current}
                    className="min-w-0 max-w-[86%] rounded-[14px] px-3 py-2 text-left focus-visible:outline focus-visible:outline-2"
                    style={{
                      background: current ? `${langInfo.accent}22` : mine ? "rgba(191,239,219,0.07)" : C.base,
                      border: `1px solid ${current ? langInfo.accent : mine ? "rgba(191,239,219,0.22)" : LINE}`,
                      outlineColor: langInfo.accent,
                    }}
                  >
                    <span className="block text-[9.5px] font-bold" style={{ color: mine ? C.tube : C.mono, letterSpacing: 1.1 }}>
                      {mine ? "YOU" : (situation?.them ?? "FRIEND").toUpperCase()}
                    </span>
                    <span className="block text-[14px] font-semibold leading-snug" style={{ color: langInfo.accent, fontFamily: MONO }}>{r!.sentence}</span>
                    <span className="block text-[11.5px] leading-snug" style={{ color: C.muted }}>{r!.english}</span>
                  </button>
                  <PlayButton voice={voice} text={r!.sentence} lang={plang} />
                </li>
              );
            })}
          </ol>
          {situation && plang === "fr" && talk.length < situation.lines.length && (
            <p className="mt-2 text-[11.5px]" style={{ color: C.faint }}>French has the everyday lines and the commands. The rest of this conversation is in the five Indian languages.</p>
          )}
        </section>
      )}

      {/* ................................................. see how it is built */}
      {shape === "does" && (
      <div className="mt-5 rounded-[18px] p-4 sm:p-5" style={{ background: C.tar, border: `1px solid ${LINE}` }}>
        <div className="text-[10.5px] font-bold" style={{ color: LILAC, letterSpacing: 1.3 }}>SEE HOW IT&apos;S BUILT</div>
        <div className="mt-2.5 flex flex-wrap gap-2" role="tablist" aria-label="How it is built">
          {([
            { id: "ladder", label: "⏱️ Change the time" },
            { id: "order", label: "🔀 Word order" },
            { id: "all", label: "🌏 Every language" },
            { id: "venn", label: "⭕ What they share" },
          ] as const).map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={view === t.id}
              onClick={() => setView(t.id)}
              className="rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold focus-visible:outline focus-visible:outline-2"
              style={{ background: view === t.id ? "rgba(245,194,255,0.16)" : C.base, color: view === t.id ? LILAC : C.muted, border: `1px solid ${view === t.id ? "rgba(245,194,255,0.5)" : LINE}`, outlineColor: LILAC }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {view === "ladder" && (
            <div>
              <p className="text-[12.5px]" style={{ color: C.muted }}>
                The same sentence in all four times. Tap one to keep it; only the lit ending moves.
              </p>
              <div className="-mx-5 mt-3 flex snap-x gap-2.5 overflow-x-auto px-5 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 lg:grid-cols-4" style={{ scrollbarWidth: "none" }}>
                {ladder.map(({ w, r }) => {
                  const t = WHEN_TILES.find((x) => x.id === w)!;
                  const on = when === w;
                  if (!r || r.unsupported) return null;
                  return (
                    <div key={w} className="w-[250px] flex-none snap-start rounded-[16px] p-3.5 sm:w-auto" style={{ background: on ? "rgba(159,211,255,0.10)" : C.base, border: `1px solid ${on ? "rgba(159,211,255,0.5)" : LINE}` }}>
                      <button type="button" onClick={() => setWhen(w)} className="w-full text-left focus-visible:outline focus-visible:outline-2" style={{ outlineColor: SKY }} aria-pressed={on}>
                        <div className="flex items-center gap-1.5 text-[10.5px] font-bold" style={{ color: SKY, letterSpacing: 1.1 }}>
                          <span aria-hidden="true">{t.emoji}</span> {t.en.toUpperCase()}
                        </div>
                        <div className="mt-1.5">
                          <Words parts={r.parts} size={15} />
                        </div>
                        <div className="mt-1 text-[12px]" style={{ color: C.muted }}>
                          {r.english}
                        </div>
                      </button>
                      <div className="mt-2">
                        <PlayButton voice={voice} text={r.sentence} lang={plang} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 rounded-[16px] p-3.5" style={{ background: C.base, border: `1px solid ${LINE}` }}>
                <div className="text-[10.5px] font-bold" style={{ color: C.tube, letterSpacing: 1.1 }}>SAME LINE, EVERY PERSON</div>
                <div className="mt-2 grid gap-x-5 sm:grid-cols-2">
                  {people.map(({ t, r }) => {
                    if (!r || r.unsupported) return null;
                    const on = who === t.id;
                    const short = r.parts.filter((p) => p.role !== "when");
                    return (
                      <div key={t.id} className="flex items-center gap-2.5 py-1.5" style={{ borderTop: `1px solid ${LINE_SOFT}` }}>
                        <button type="button" onClick={() => setWho(t.id)} aria-pressed={on} className="flex min-w-0 flex-1 items-center gap-2.5 text-left focus-visible:outline focus-visible:outline-2" style={{ outlineColor: C.tube }}>
                          <span className="text-[18px]" aria-hidden="true">{t.emoji}</span>
                          <span className="min-w-0">
                            <Words parts={short} size={14} />
                            <span className="block text-[11px]" style={{ color: on ? C.tube : C.faint }}>
                              {t.en}
                              {t.hint ? `, ${t.hint}` : ""}
                            </span>
                          </span>
                        </button>
                        <PlayButton voice={voice} text={r.sentence} lang={plang} />
                      </div>
                    );
                  })}
                </div>
                {plang === "ml" && (
                  <p className="mt-2 text-[12.5px] leading-relaxed" style={{ color: "rgba(255,179,92,0.92)" }}>
                    Look down the list: in Malayalam the action word never changes. Only the person at the front does.
                  </p>
                )}
              </div>
            </div>
          )}
          {view === "order" && res && !res.unsupported && (
            <div>
              <OrderMap en={res.enParts} target={res.parts} langLabel={langInfo.label} />
              <p className="mt-2 text-[12.5px] leading-relaxed" style={{ color: C.muted }}>
                {plang === "fr"
                  ? "French keeps the English order: who, action, what. The lines run straight down."
                  : `${langInfo.label} moves the action to the very end. Follow the orange line: it always crosses over.`}
              </p>
            </div>
          )}
          {view === "all" && (
            <div className="flex flex-col gap-2">
              {everyLang.map(({ l, r }) => (
                <div key={l.id} className="flex items-center gap-3 rounded-[14px] px-3.5 py-3" style={{ background: l.id === plang ? "rgba(255,179,92,0.08)" : C.base, border: `1px solid ${l.id === plang ? "rgba(255,179,92,0.36)" : LINE_SOFT}` }}>
                  <span className="w-[86px] flex-none text-[12px] font-semibold" style={{ color: C.muted }}>
                    <span aria-hidden="true">{l.flag}</span> {l.label}
                  </span>
                  <span className="min-w-0 flex-1">{r?.unsupported ? <span className="text-[12px]" style={{ color: C.faint }}>not in the French set yet</span> : r && <Words parts={r.parts} size={15} />}</span>
                  {r && !r.unsupported && <PlayButton voice={voice} text={r.sentence} lang={l.id} />}
                </div>
              ))}
              <p className="mt-1 text-[12.5px]" style={{ color: C.muted }}>
                Same colours, same jobs. Kannada, Hindi, Tamil, Malayalam and Telugu park the action at the end; French keeps it in the middle like English.
              </p>
            </div>
          )}
          {view === "venn" && <Venn />}
        </div>
      </div>
      )}
      {shape !== "does" && res && !res.unsupported && (
        <p className="mt-5 text-[12.5px] leading-relaxed" style={{ color: C.muted }}>
          {shapeById(shape).blurb}
        </p>
      )}
    </div>
  );
}
