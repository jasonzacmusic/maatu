"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LANG_NAME } from "@/lib/curriculum";
import {
  build,
  DECKS,
  DECK_ORDER,
  OBJECTS,
  PERSONS,
  RULES,
  table,
  TENSES,
  TIMES,
  VERBS,
  type Choice,
  type DeckId,
  type Gender,
  type PersonId,
  type Tense,
} from "@/lib/grammar";
import { C, DISPLAY, HOST, LINE, LINE_SOFT, MONO, type Lang } from "@/lib/maatu-design";
import { LanguageSelector } from "./LanguageSelector";

// Sentence Studio. Text-first learning next to the voice calls: say or type a
// line and get it corrected with the rule behind each fix; tap a subject, a
// verb, a tense and a thing to assemble any sentence and hear it in the
// teacher's voice; flip a verb through every person; read the eight rules;
// keep the word decks (music first) one tap away. No em dashes anywhere.

type Correction = { type: string; was: string; now: string; why: string };
type Check = {
  heard_as: "english" | "target" | "mixed";
  target: string;
  english: string;
  ok: boolean;
  corrections: Correction[];
  words: { word: string; meaning: string }[];
  tip: string;
};

const TAG: Record<string, { label: string; color: string }> = {
  tense: { label: "Tense", color: C.sodium },
  gender: { label: "Gender", color: C.kumkum },
  verb: { label: "Verb", color: C.tube },
  "word-order": { label: "Word order", color: "#9FD3FF" },
  "missing-word": { label: "Missing word", color: "#F5C2FF" },
  ending: { label: "Ending", color: C.sodium },
  "word-choice": { label: "Word choice", color: C.tube },
  politeness: { label: "Politeness", color: "#9FD3FF" },
  spelling: { label: "Spelling", color: C.muted },
};

const DEFAULT_OBJECT: Record<string, string | null> = {
  play: "piano",
  sing: "song",
  practise: "piano",
  listen: "music",
  learn: "language",
  teach: "language",
  do: null,
  go: "home",
  come: "home",
  think: null,
  travel: "city",
  speak: "language",
  eat: "rice",
  drink: "tea",
  see: "movie",
  read: "book",
  write: "song",
  work: null,
  sleep: null,
  playgame: null,
};

const PERSON_ORDER: PersonId[] = ["i", "you", "youp", "he", "she", "we", "they"];

// ............................................................ voice
function useSpeaker(lang: Lang) {
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
      } catch {
        setPlaying(null);
        setError("Tap again to allow sound.");
      }
    },
    [lang],
  );

  useEffect(() => () => audio.current?.pause(), []);
  return { speak, playing, loading, error };
}

function SpeakButton({ text, speaker, size = "md", label }: { text: string; speaker: ReturnType<typeof useSpeaker>; size?: "sm" | "md" | "lg"; label?: string }) {
  const active = speaker.playing === text.trim();
  const busy = speaker.loading === text.trim();
  const pad = size === "lg" ? "px-5 py-3 text-[15px]" : size === "sm" ? "px-2.5 py-1.5 text-[12px]" : "px-3.5 py-2 text-[13px]";
  return (
    <button
      type="button"
      onClick={() => void speaker.speak(text)}
      disabled={busy}
      aria-label={label ? `${label}: ${text}` : `Hear ${text}`}
      className={`inline-flex items-center gap-2 rounded-full font-semibold focus-visible:outline focus-visible:outline-2 ${pad}`}
      style={{
        background: active ? C.sodium : "rgba(255,179,92,0.12)",
        color: active ? C.ink : C.sodium,
        border: "1px solid rgba(255,179,92,0.34)",
        outlineColor: C.milk,
        opacity: busy ? 0.7 : 1,
      }}
    >
      <span aria-hidden="true" style={{ fontSize: size === "sm" ? 11 : 13 }}>{busy ? "…" : active ? "◼" : "▶"}</span>
      {label ?? "Hear it"}
    </button>
  );
}

// ............................................................ ears
function useRecorder(lang: Lang, onText: (text: string) => void) {
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    const r = rec.current;
    if (r && r.state !== "inactive") r.stop();
    setRecording(false);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("This browser cannot record. Type your sentence instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find((m) => MediaRecorder.isTypeSupported(m));
      const r = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunks.current = [];
      r.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };
      r.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: r.mimeType || "audio/webm" });
        setBusy(true);
        try {
          const form = new FormData();
          form.append("audio", blob, "speech");
          form.append("lang", lang);
          const res = await fetch("/api/hear", { method: "POST", body: form });
          const data = await res.json();
          if (!res.ok || !data.text) throw new Error(data.error ?? "I could not hear that.");
          onText(String(data.text));
        } catch (e) {
          setError(e instanceof Error ? e.message : "I could not hear that.");
        } finally {
          setBusy(false);
        }
      };
      rec.current = r;
      r.start();
      setRecording(true);
    } catch {
      setError("Microphone blocked. Allow the mic for this site, or type instead.");
    }
  }, [lang, onText]);

  useEffect(() => () => rec.current?.stream.getTracks().forEach((t) => t.stop()), []);
  return { recording, busy, error, start, stop };
}

// ............................................................ bits
function Chip({ on, onClick, children, tone = "sodium", title }: { on: boolean; onClick: () => void; children: React.ReactNode; tone?: "sodium" | "tube"; title?: string }) {
  const color = tone === "tube" ? C.tube : C.sodium;
  const rgb = tone === "tube" ? "191,239,219" : "255,179,92";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      title={title}
      className="rounded-full px-3 py-1.5 text-[12.5px] font-semibold focus-visible:outline focus-visible:outline-2"
      style={{
        background: on ? `rgba(${rgb},0.16)` : C.base,
        color: on ? color : C.muted,
        border: on ? `1px solid rgba(${rgb},0.45)` : `1px solid ${LINE}`,
        outlineColor: color,
      }}
    >
      {children}
    </button>
  );
}

function Label({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <div className="text-[11px] font-bold" style={{ color: C.mono, letterSpacing: 1 }}>
        {children}
      </div>
      {right}
    </div>
  );
}

function Section({ kicker, title, blurb, children, tone = "sodium" }: { kicker: string; title: string; blurb?: string; children: React.ReactNode; tone?: "sodium" | "tube" }) {
  return (
    <section className="mt-5 rounded-[18px] p-5" style={{ background: C.tar, border: `1px solid ${LINE}` }}>
      <div className="text-[11px] font-bold" style={{ color: tone === "tube" ? C.tube : C.sodium, letterSpacing: 1.3 }}>
        {kicker}
      </div>
      <h2 className="mt-1 text-[19px] font-bold" style={{ color: C.milk }}>
        {title}
      </h2>
      {blurb && (
        <p className="mt-1 text-[12.5px] leading-relaxed" style={{ color: C.muted }}>
          {blurb}
        </p>
      )}
      {children}
    </section>
  );
}

function WordRow({ word, meaning }: { word: string; meaning: string }) {
  return (
    <div className="flex items-baseline gap-3 py-1.5" style={{ borderBottom: `1px solid ${LINE_SOFT}` }}>
      <span className="min-w-[110px] text-[14px] font-semibold" style={{ color: C.milk, fontFamily: MONO }}>
        {word}
      </span>
      <span className="text-[12.5px] leading-snug" style={{ color: C.muted }}>
        {meaning}
      </span>
    </div>
  );
}

// ............................................................ screen
type BuildScreenProps = { lang: Lang; onLanguageChange: (lang: Lang) => void };

export function BuildScreen({ lang, onLanguageChange }: BuildScreenProps) {
  const host = HOST[lang];
  const ln = LANG_NAME[lang];
  const speaker = useSpeaker(lang);

  // Gender is the speaker's own; it only changes Hindi forms but the checker
  // is told for every language.
  const [gender, setGenderState] = useState<Gender>("m");
  useEffect(() => {
    const stored = window.localStorage.getItem("maatu-gender");
    if (stored === "f" || stored === "m") setGenderState(stored);
  }, []);
  const setGender = (g: Gender) => {
    setGenderState(g);
    window.localStorage.setItem("maatu-gender", g);
  };

  // Say it your way.
  const [text, setText] = useState("");
  const [check, setCheck] = useState<Check | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const onHeard = useCallback((heard: string) => {
    setText(heard);
    setCheck(null);
  }, []);
  const ears = useRecorder(lang, onHeard);

  const runCheck = useCallback(
    async (line?: string) => {
      const value = (line ?? text).trim();
      if (!value) return;
      setChecking(true);
      setCheckError(null);
      try {
        const res = await fetch("/api/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: value, lang, gender }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "The checker did not answer.");
        setCheck(data as Check);
      } catch (e) {
        setCheckError(e instanceof Error ? e.message : "The checker did not answer.");
      } finally {
        setChecking(false);
      }
    },
    [text, lang, gender],
  );

  useEffect(() => {
    setCheck(null);
  }, [lang]);

  // Build a sentence.
  const [personId, setPersonId] = useState<PersonId>("i");
  const [verbId, setVerbId] = useState("play");
  const [tense, setTense] = useState<Tense>("present");
  const [objectId, setObjectId] = useState<string | null>("piano");
  const [timeId, setTimeId] = useState<string | null>(null);
  const [negative, setNegative] = useState(false);
  const [question, setQuestion] = useState(false);

  const pickVerb = (id: string) => {
    setVerbId(id);
    setObjectId(DEFAULT_OBJECT[id] ?? null);
  };
  const pickTime = (id: string | null) => {
    setTimeId(id);
    const t = TIMES.find((x) => x.id === id);
    if (t?.tense) setTense(t.tense);
  };

  const choice: Choice = { person: personId, verb: verbId, tense, object: objectId, time: timeId, negative, question, gender };
  const built = useMemo(() => build(lang, choice), [lang, personId, verbId, tense, objectId, timeId, negative, question, gender]); // eslint-disable-line react-hooks/exhaustive-deps
  const verb = VERBS.find((v) => v.id === verbId) ?? VERBS[0];
  const flip = useMemo(() => table(lang, verbId, gender) ?? [], [lang, verbId, gender]);

  // Decks.
  const [deck, setDeck] = useState<DeckId>("music");
  const [openRule, setOpenRule] = useState<number | null>(0);

  const musicVerbs = VERBS.filter((v) => v.group === "music");
  const coreVerbs = VERBS.filter((v) => v.group === "core");
  const persons = PERSONS[lang];

  return (
    <div className="absolute inset-0 overflow-y-auto" style={{ background: C.night }}>
      <div className="absolute inset-x-0 top-0 h-[240px] pointer-events-none" style={{ background: "radial-gradient(360px 180px at 50% 0, rgba(191,239,219,0.10), transparent 72%)" }} aria-hidden="true" />
      <div className="relative mx-auto max-w-[760px] px-6 pb-28 pt-12 lg:pt-14">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold" style={{ color: C.tube, letterSpacing: 1.4 }}>
              SENTENCE STUDIO
            </div>
            <h1 className="mt-1" style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: 30, lineHeight: 1.05, color: C.milk }}>
              Build {ln}, see it, hear it
            </h1>
            <p className="mt-2 max-w-[520px] text-[13.5px] leading-relaxed" style={{ color: C.muted }}>
              Type or say a line and get it fixed with the rule behind each fix. Or tap the pieces together and let {host.name} say it back to you.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 rounded-[16px] p-4 sm:grid-cols-[1fr_auto]" style={{ background: C.tar, border: `1px solid ${LINE}` }}>
          <LanguageSelector lang={lang} onChange={onLanguageChange} label="Language" />
          <div>
            <Label>I AM</Label>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Your gender, for verb endings">
              {(["m", "f"] as Gender[]).map((g) => (
                <Chip key={g} on={gender === g} onClick={() => setGender(g)}>
                  {g === "m" ? "a man" : "a woman"}
                </Chip>
              ))}
            </div>
          </div>
        </div>

        {/* ................................................. say it your way */}
        <Section kicker="SAY IT YOUR WAY" title="Type or speak, then check" blurb={`English, ${ln}, or a mix. Leave a ___ where you are hunting for a word.`} tone="tube">
          <div className="mt-4 flex flex-col gap-3">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void runCheck();
                }
              }}
              rows={2}
              placeholder={lang === "kn" ? "I played piano yesterday  /  naanu nenne piano nudistini  /  naanu ___ hogtini" : lang === "hi" ? "I played piano yesterday  /  main kal piano bajaata  /  main ___ jaata hoon" : "I played piano yesterday  /  naan nethu piano vaasikkiren  /  naan ___ poren"}
              className="w-full resize-none rounded-[13px] px-4 py-3 text-[15px] focus-visible:outline focus-visible:outline-2"
              style={{ background: C.base, color: C.milk, border: `1px solid ${LINE}`, outlineColor: C.tube, fontFamily: "inherit" }}
              aria-label="Your sentence"
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  if (!ears.recording) void ears.start();
                }}
                onPointerUp={() => ears.recording && ears.stop()}
                onPointerLeave={() => ears.recording && ears.stop()}
                onKeyDown={(e) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    if (ears.recording) ears.stop();
                    else void ears.start();
                  }
                }}
                disabled={ears.busy}
                aria-pressed={ears.recording}
                className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[13.5px] font-bold focus-visible:outline focus-visible:outline-2"
                style={{
                  background: ears.recording ? C.kumkum : "rgba(232,80,58,0.14)",
                  color: ears.recording ? C.onKumkum : "#FF8A75",
                  border: "1px solid rgba(232,80,58,0.4)",
                  outlineColor: C.milk,
                  animation: ears.recording ? "mtPulse 1.2s ease-in-out infinite" : undefined,
                }}
              >
                <span aria-hidden="true">●</span>
                {ears.busy ? "Listening back…" : ears.recording ? "Release to send" : "Hold to speak"}
              </button>
              <button
                type="button"
                onClick={() => void runCheck()}
                disabled={checking || !text.trim()}
                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13.5px] font-bold focus-visible:outline focus-visible:outline-2"
                style={{ background: C.tube, color: C.ink, opacity: checking || !text.trim() ? 0.55 : 1, outlineColor: C.milk }}
              >
                {checking ? "Checking…" : "Check it"}
              </button>
              {text.trim() && (
                <button type="button" onClick={() => { setText(""); setCheck(null); }} className="text-[12.5px] font-semibold" style={{ color: C.faint }}>
                  Clear
                </button>
              )}
            </div>
            {(ears.error || checkError) && (
              <div className="rounded-[12px] px-4 py-2.5 text-[12.5px]" style={{ background: "rgba(232,80,58,0.10)", color: "#FFB3A6", border: "1px solid rgba(232,80,58,0.28)" }} role="alert">
                {ears.error ?? checkError}
              </div>
            )}
          </div>

          {check && (
            <div className="mt-4 rounded-[16px] p-4" style={{ background: C.base, border: `1px solid ${check.ok ? "rgba(191,239,219,0.28)" : "rgba(255,179,92,0.34)"}` }}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-bold" style={{ color: check.ok ? C.tube : C.sodium, letterSpacing: 1 }}>
                  {check.heard_as === "english" ? `IN ${ln.toUpperCase()}` : check.ok ? "THAT WORKS" : `${check.corrections.length} THING${check.corrections.length === 1 ? "" : "S"} TO FIX`}
                </span>
                <SpeakButton text={check.target} speaker={speaker} />
              </div>
              <div className="mt-2 text-[22px] font-bold leading-snug" style={{ color: C.milk }}>
                {check.target}
              </div>
              <div className="mt-1 text-[13.5px]" style={{ color: C.muted }}>
                {check.english}
              </div>

              {check.corrections.length > 0 && (
                <div className="mt-4 flex flex-col gap-2">
                  {check.corrections.map((c, i) => {
                    const tag = TAG[c.type] ?? TAG["word-choice"];
                    return (
                      <div key={i} className="rounded-[12px] p-3" style={{ background: C.tar, border: `1px solid ${LINE_SOFT}` }}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full px-2 py-0.5 text-[10.5px] font-bold" style={{ background: `${tag.color}22`, color: tag.color, letterSpacing: 0.8 }}>
                            {tag.label.toUpperCase()}
                          </span>
                          {c.was && (
                            <span className="text-[13px] line-through" style={{ color: C.faint }}>
                              {c.was}
                            </span>
                          )}
                          {c.now && (
                            <span className="text-[14px] font-semibold" style={{ color: C.milk, fontFamily: MONO }}>
                              {c.now}
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 text-[12.5px] leading-relaxed" style={{ color: C.muted }}>
                          {c.why}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {check.words.length > 0 && (
                <div className="mt-4">
                  <Label>WORD BY WORD</Label>
                  {check.words.map((w, i) => (
                    <WordRow key={i} word={w.word} meaning={w.meaning} />
                  ))}
                </div>
              )}
              {check.tip && (
                <div className="mt-3 rounded-[12px] px-3.5 py-2.5 text-[12.5px] leading-relaxed" style={{ background: "rgba(191,239,219,0.08)", color: "rgba(191,239,219,0.9)", border: "1px solid rgba(191,239,219,0.18)" }}>
                  {check.tip}
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => { setText(check.target); setCheck(null); }} className="text-[12.5px] font-semibold" style={{ color: C.sodium }}>
                  Edit this line
                </button>
              </div>
            </div>
          )}
        </Section>

        {/* ................................................. build */}
        <Section kicker="BUILD A SENTENCE" title="Tap the pieces together" blurb="Who, what, when. The verb changes its ending; everything else stays put.">
          <div className="mt-4">
            <Label>WHO</Label>
            <div className="flex flex-wrap gap-2">
              {PERSON_ORDER.map((id, i) => (
                <Chip key={id} on={personId === id} onClick={() => setPersonId(id)} title={persons[i].hint}>
                  {persons[i].sub} <span style={{ opacity: 0.6 }}>{persons[i].en}{persons[i].hint ? `, ${persons[i].hint}` : ""}</span>
                </Chip>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <Label right={<span className="text-[11px]" style={{ color: C.tube }}>music first</span>}>ACTION</Label>
            <div className="flex flex-wrap gap-2">
              {musicVerbs.map((v) => (
                <Chip key={v.id} on={verbId === v.id} onClick={() => pickVerb(v.id)} tone="tube">
                  {v.en.base} <span style={{ opacity: 0.6 }}>{v[lang].dict}</span>
                </Chip>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {coreVerbs.map((v) => (
                <Chip key={v.id} on={verbId === v.id} onClick={() => pickVerb(v.id)}>
                  {v.en.base}{v.id === "playgame" ? " (a game)" : ""} <span style={{ opacity: 0.6 }}>{v[lang].dict}</span>
                </Chip>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <Label>WHAT OR WHERE</Label>
            <div className="flex flex-wrap gap-2">
              <Chip on={objectId === null} onClick={() => setObjectId(null)}>nothing</Chip>
              {OBJECTS.map((o) => (
                <Chip key={o.id} on={objectId === o.id} onClick={() => setObjectId(o.id)}>
                  {o.enByLang ? o.enByLang[lang] : o.en} <span style={{ opacity: 0.6 }}>{o[lang]}</span>
                </Chip>
              ))}
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Label>WHEN</Label>
              <div className="flex flex-wrap gap-2">
                {TENSES.map((t) => (
                  <Chip key={t.id} on={tense === t.id} onClick={() => setTense(t.id)} title={t.en}>
                    {t.label}
                  </Chip>
                ))}
              </div>
            </div>
            <div>
              <Label>TIME WORD</Label>
              <div className="flex flex-wrap gap-2">
                <Chip on={timeId === null} onClick={() => pickTime(null)}>none</Chip>
                {TIMES.map((t) => (
                  <Chip key={t.id} on={timeId === t.id} onClick={() => pickTime(t.id)}>
                    {t.en} <span style={{ opacity: 0.6 }}>{t[lang]}</span>
                  </Chip>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Chip on={negative} onClick={() => setNegative(!negative)} tone="tube">not</Chip>
            <Chip on={question} onClick={() => setQuestion(!question)} tone="tube">question?</Chip>
          </div>

          {built && (
            <div className="mt-5 rounded-[16px] p-4" style={{ background: "linear-gradient(135deg,rgba(255,179,92,0.14),rgba(232,80,58,0.05))", border: "1px solid rgba(255,179,92,0.34)" }}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[24px] font-bold leading-snug" style={{ color: C.milk }}>
                    {built.sentence}
                  </div>
                  <div className="mt-1 text-[14px]" style={{ color: C.muted }}>
                    {built.english}
                  </div>
                </div>
                <SpeakButton text={built.sentence} speaker={speaker} size="lg" />
              </div>
              <div className="mt-3">
                {built.pieces.map((p, i) => (
                  <WordRow key={i} word={p.word} meaning={p.meaning} />
                ))}
              </div>
              {built.note && (
                <div className="mt-3 text-[12.5px] leading-relaxed" style={{ color: "rgba(255,179,92,0.9)" }}>
                  {built.note}
                </div>
              )}
              {speaker.error && (
                <div className="mt-2 text-[12px]" style={{ color: "#FFB3A6" }} role="alert">
                  {speaker.error}
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-3">
                <button type="button" onClick={() => { setText(built.sentence); void runCheck(built.sentence); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="text-[12.5px] font-semibold" style={{ color: C.tube }}>
                  Send to the checker
                </button>
              </div>
            </div>
          )}
        </Section>

        {/* ................................................. flip */}
        <Section kicker="FLIP THE VERB" title={`${verb.en.base}: ${verb[lang].dict}`} blurb={verb.note ?? "One ending per person. Learn it on this verb and it works on every verb."}>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left text-[13px]">
              <thead>
                <tr style={{ color: C.mono }}>
                  <th className="pb-2 pr-3 text-[11px] font-bold" style={{ letterSpacing: 1 }}>WHO</th>
                  <th className="pb-2 pr-3 text-[11px] font-bold" style={{ letterSpacing: 1 }}>EVERY DAY</th>
                  <th className="pb-2 pr-3 text-[11px] font-bold" style={{ letterSpacing: 1 }}>PAST</th>
                  <th className="pb-2 text-[11px] font-bold" style={{ letterSpacing: 1 }}>FUTURE</th>
                </tr>
              </thead>
              <tbody>
                {flip.map((row) => (
                  <tr key={row.person} style={{ borderTop: `1px solid ${LINE_SOFT}` }}>
                    <td className="py-2 pr-3" style={{ color: C.muted }}>{row.person}</td>
                    {[row.present, row.past, row.future].map((cell, i) => (
                      <td key={i} className="py-2 pr-3">
                        <button type="button" onClick={() => void speaker.speak(`${row.person.split(" ")[0]} ${cell}`)} className="text-left font-semibold focus-visible:outline focus-visible:outline-2" style={{ color: speaker.playing === `${row.person.split(" ")[0]} ${cell}` ? C.sodium : C.milk, fontFamily: MONO, outlineColor: C.sodium }}>
                          {cell}
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-2 text-[11.5px]" style={{ color: C.faint }}>
            Tap any form to hear it with its subject.{lang === "kn" ? " Kannada uses the same form for every day and future." : lang === "hi" ? " Switch I am to hear the other gender." : ""}
          </div>
        </Section>

        {/* ................................................. rules */}
        <Section kicker="THE RULES" title={`${ln} in ${RULES[lang].length} rules`} blurb="Learn these once and you can build sentences you have never heard.">
          <div className="mt-4 flex flex-col gap-2">
            {RULES[lang].map((r, i) => {
              const open = openRule === i;
              return (
                <div key={r.title} className="rounded-[13px]" style={{ background: C.base, border: `1px solid ${open ? "rgba(255,179,92,0.3)" : LINE_SOFT}` }}>
                  <button type="button" onClick={() => setOpenRule(open ? null : i)} aria-expanded={open} className="flex w-full items-center gap-3 px-4 py-3 text-left focus-visible:outline focus-visible:outline-2" style={{ outlineColor: C.sodium }}>
                    <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-[11px] font-bold" style={{ background: "rgba(255,179,92,0.14)", color: C.sodium }}>
                      {i + 1}
                    </span>
                    <span className="flex-1 text-[14px] font-semibold" style={{ color: C.milk }}>
                      {r.title}
                    </span>
                    <span aria-hidden="true" style={{ color: C.faint }}>{open ? "–" : "+"}</span>
                  </button>
                  {open && (
                    <div className="px-4 pb-4">
                      <p className="text-[13px] leading-relaxed" style={{ color: C.muted }}>
                        {r.body}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <span className="text-[14px] font-semibold" style={{ color: C.milk, fontFamily: MONO }}>
                          {r.example}
                        </span>
                        <SpeakButton text={r.example.split(" = ")[0].replace(/\?$/, "")} speaker={speaker} size="sm" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Section>

        {/* ................................................. decks */}
        <Section kicker="WORD DECKS" title="Words to keep in your pocket" blurb="Tap a row to hear it. The trick column is how to remember it." tone="tube">
          <div className="mt-4 flex flex-wrap gap-2">
            {DECK_ORDER.map((d) => (
              <Chip key={d.id} on={deck === d.id} onClick={() => setDeck(d.id)} tone="tube">
                {d.label}
              </Chip>
            ))}
          </div>
          <div className="mt-1 text-[12px]" style={{ color: C.faint }}>
            {DECK_ORDER.find((d) => d.id === deck)?.blurb}
          </div>
          <div className="mt-3 flex flex-col">
            {DECKS[deck].map((row, i) => {
              const word = row[lang];
              const speakable = word.replace(/\s*\(.*?\)\s*/g, " ").trim();
              const active = speaker.playing === speakable;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => (speakable && speakable !== "same words" ? void speaker.speak(speakable) : undefined)}
                  className="grid gap-x-4 gap-y-0.5 py-2.5 text-left focus-visible:outline focus-visible:outline-2 sm:grid-cols-[150px_1fr]"
                  style={{ borderTop: `1px solid ${LINE_SOFT}`, outlineColor: C.tube }}
                >
                  <span className="text-[12.5px]" style={{ color: C.muted }}>
                    {row.en}
                  </span>
                  <span>
                    <span className="block text-[15px] font-semibold" style={{ color: active ? C.sodium : C.milk, fontFamily: MONO }}>
                      {word}
                    </span>
                    {row.trick && (
                      <span className="mt-0.5 block text-[12px] leading-snug" style={{ color: C.faint }}>
                        {row.trick}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </Section>

        <div className="mt-6 text-center text-[11.5px]" style={{ color: C.faint }}>
          Everything here is spoken {ln} the way people in {host.place.split(",").pop()?.trim()} talk. Romanized only, no script, no plural endings.
        </div>
      </div>
    </div>
  );
}
