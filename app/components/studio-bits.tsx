"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { splitEnding } from "@/lib/grammar";
import { C, DISPLAY, LINE, LINE_SOFT, MONO, type Lang } from "@/lib/maatu-design";

// Shared pieces of the Sentence Studio: the voice hook, the hear button, chips,
// labels, section frames, and the lit verb. No em dashes anywhere.

export const SKY = "#9FD3FF";
export const LILAC = "#F5C2FF";
export type Tone = "sodium" | "tube" | "lilac" | "sky";

export function toneColor(tone: Tone) {
  return tone === "tube" ? C.tube : tone === "lilac" ? LILAC : tone === "sky" ? SKY : C.sodium;
}
function toneRgb(tone: Tone) {
  return tone === "tube" ? "191,239,219" : tone === "lilac" ? "245,194,255" : tone === "sky" ? "159,211,255" : "255,179,92";
}

// ............................................................ voice
export function useSpeaker(lang: Lang, onHeard: () => void) {
  const cache = useRef<Map<string, string>>(new Map());
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const speak = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean) return;
      setError(null);
      const key = `${lang}:${clean}`;
      let src = cache.current.get(key);
      if (!src) {
        setLoading(clean);
        try {
          const res = await fetch("/api/say", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: clean, lang }) });
          const data = await res.json();
          if (!res.ok || !data.audio) throw new Error(data.error ?? "No voice");
          src = `data:${data.mime ?? "audio/wav"};base64,${data.audio}`;
          cache.current.set(key, src);
        } catch (e) {
          setError(e instanceof Error ? e.message : "The voice did not answer.");
          setLoading(null);
          return;
        }
        setLoading(null);
      }
      audio.current?.pause();
      const el = new Audio(src);
      audio.current = el;
      setPlaying(clean);
      el.onended = () => setPlaying(null);
      el.onerror = () => setPlaying(null);
      try {
        await el.play();
        onHeard();
      } catch {
        setPlaying(null);
        setError("Tap again to allow sound.");
      }
    },
    [lang, onHeard],
  );

  useEffect(() => () => audio.current?.pause(), []);
  return { speak, playing, loading, error };
}
export type Speaker = ReturnType<typeof useSpeaker>;

export function SpeakButton({ text, speaker, size = "md", label }: { text: string; speaker: Speaker; size?: "sm" | "md" | "lg"; label?: string }) {
  const active = speaker.playing === text.trim();
  const busy = speaker.loading === text.trim();
  const pad = size === "lg" ? "px-5 py-3 text-[15px]" : size === "sm" ? "px-2.5 py-1.5 text-[12px]" : "px-3.5 py-2 text-[13px]";
  return (
    <button
      type="button"
      onClick={() => void speaker.speak(text)}
      disabled={busy}
      aria-label={label ? `${label}: ${text}` : `Hear ${text}`}
      className={`inline-flex flex-none items-center gap-2 rounded-full font-semibold focus-visible:outline focus-visible:outline-2 ${pad}`}
      style={{
        background: active ? C.sodium : "rgba(255,179,92,0.12)",
        color: active ? C.ink : C.sodium,
        border: "1px solid rgba(255,179,92,0.34)",
        outlineColor: C.milk,
        opacity: busy ? 0.7 : 1,
        transition: "background 160ms ease, color 160ms ease",
      }}
    >
      <span aria-hidden="true" style={{ fontSize: size === "sm" ? 11 : 13 }}>{busy ? "…" : active ? "◼" : "▶"}</span>
      {label ?? "Hear it"}
    </button>
  );
}

// ............................................................ bits
export function Chip({ on, onClick, children, tone = "sodium", title, small }: { on: boolean; onClick: () => void; children: React.ReactNode; tone?: Tone; title?: string; small?: boolean }) {
  const color = toneColor(tone);
  const rgb = toneRgb(tone);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      title={title}
      className={`rounded-full font-semibold focus-visible:outline focus-visible:outline-2 ${small ? "px-2.5 py-1 text-[11.5px]" : "px-3 py-1.5 text-[12.5px]"}`}
      style={{
        background: on ? `rgba(${rgb},0.16)` : C.base,
        color: on ? color : C.muted,
        border: on ? `1px solid rgba(${rgb},0.5)` : `1px solid ${LINE}`,
        outlineColor: color,
        transition: "background 140ms ease, border-color 140ms ease, color 140ms ease",
      }}
    >
      {children}
    </button>
  );
}

export function Label({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <div className="text-[11px] font-bold" style={{ color: C.mono, letterSpacing: 1 }}>
        {children}
      </div>
      {right}
    </div>
  );
}

export function Section({ id, kicker, title, blurb, children, tone = "sodium", anchor }: { id: string; kicker: string; title: string; blurb?: string; children: React.ReactNode; tone?: Tone; anchor: (id: string, el: HTMLElement | null) => void }) {
  const color = toneColor(tone);
  return (
    <section ref={(el) => anchor(id, el)} className="mt-5 scroll-mt-[76px] rounded-[20px] p-5" style={{ background: C.tar, border: `1px solid ${LINE}` }}>
      <div className="text-[11px] font-bold" style={{ color, letterSpacing: 1.3 }}>
        {kicker}
      </div>
      <h2 className="mt-1" style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: 24, lineHeight: 1.1, color: C.milk }}>
        {title}
      </h2>
      {blurb && (
        <p className="mt-1.5 text-[12.5px] leading-relaxed" style={{ color: C.muted }}>
          {blurb}
        </p>
      )}
      {children}
    </section>
  );
}

// A verb with its ending lit up. The stem stays milk, the ending goes sodium,
// because the ending is the only thing the learner must listen for.
export function Lit({ word, stem, color = C.sodium, size = 15 }: { word: string; stem?: string; color?: string; size?: number }) {
  const split = splitEnding(word, stem);
  if (!split) return <span style={{ color: C.milk, fontFamily: MONO, fontSize: size, fontWeight: 600 }}>{word}</span>;
  return (
    <span style={{ fontFamily: MONO, fontSize: size, fontWeight: 600 }}>
      <span style={{ color: C.milk }}>{split.stem}</span>
      <span style={{ color, borderBottom: `2px solid ${color}55` }}>{split.ending}</span>
    </span>
  );
}

// Two puzzle tiles that dock together: a fixed piece and a moving piece.
export function Dock({ fixed, moving, color = C.sodium, size = 22, fixedLabel, movingLabel }: { fixed: string; moving: string; color?: string; size?: number; fixedLabel?: string; movingLabel?: string }) {
  return (
    <span className="inline-flex items-stretch" style={{ fontFamily: MONO, fontSize: size, fontWeight: 600 }}>
      <span className="flex flex-col justify-end px-3 py-2" style={{ background: C.elevated, color: C.milk, borderRadius: "14px 3px 3px 14px", border: `1px solid ${LINE_SOFT}` }}>
        {fixedLabel && <span className="mb-0.5 text-[9px] font-bold" style={{ color: C.faint, letterSpacing: 1, fontFamily: "inherit" }}>{fixedLabel}</span>}
        <span>{fixed}</span>
      </span>
      <span className="flex flex-col justify-end px-3 py-2" style={{ background: color, color: C.ink, borderRadius: "3px 14px 14px 3px", marginLeft: 2 }}>
        {movingLabel && <span className="mb-0.5 text-[9px] font-bold" style={{ color: "rgba(10,13,22,0.6)", letterSpacing: 1 }}>{movingLabel}</span>}
        <span>{moving}</span>
      </span>
    </span>
  );
}
