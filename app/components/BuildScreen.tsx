"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LANG_NAME } from "@/lib/curriculum";
import {
  build,
  COMMANDS,
  COMMAND_NOTE,
  DECKS,
  DECK_ORDER,
  fillFrame,
  FRAMES,
  OBJECTS,
  objectLabel,
  PERSON_ORDER,
  PERSONS,
  RULES,
  splitEnding,
  table,
  TENSES,
  TIMES,
  todaysLines,
  VERBS,
  type Built,
  type Choice,
  type DeckId,
  type Gender,
  type Piece,
  type PersonId,
  type Tense,
} from "@/lib/grammar";
import { C, DISPLAY, HOST, LINE, LINE_SOFT, MONO, type Lang } from "@/lib/maatu-design";
import { LanguageSelector } from "./LanguageSelector";
import { Chip, Label, LILAC, Lit, Section, SKY, SpeakButton, useSpeaker, type Speaker } from "./studio-bits";
import { ScenesRoom, ShapesRoom, type Practice } from "./StudioRooms";

// Sentence Studio. Text-first learning next to the voice calls. Seven rooms on
// one scroll: Check (say or type a line, get the fix and the rule), Build (tap
// the pieces together and watch the ending change), Frames (twenty everyday
// sentence shapes with a slot), Commands (what a teacher says in a music
// room), Flip (one verb through every person), Rules, and Decks (music first).
// Every form comes from vetted tables; the brain is used only to check free
// text. Romanized only, never native script. No em dashes anywhere.

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

const ROLE: Record<Piece["role"], { color: string; label: string }> = {
  time: { color: SKY, label: "when" },
  subject: { color: C.tube, label: "who" },
  object: { color: LILAC, label: "what" },
  verb: { color: C.sodium, label: "action" },
  helper: { color: C.muted, label: "helper" },
};

const TAG: Record<string, { label: string; color: string }> = {
  tense: { label: "Tense", color: C.sodium },
  gender: { label: "Gender", color: C.kumkum },
  verb: { label: "Verb", color: C.tube },
  "word-order": { label: "Word order", color: SKY },
  "missing-word": { label: "Missing word", color: LILAC },
  ending: { label: "Ending", color: C.sodium },
  "word-choice": { label: "Word choice", color: C.tube },
  politeness: { label: "Politeness", color: SKY },
  spelling: { label: "Spelling", color: C.muted },
};

// Which rule card explains each kind of slip, per language.
const RULE_FOR: Record<Lang, Record<string, number>> = {
  kn: { tense: 3, ending: 1, gender: 1, verb: 6, "word-order": 0, "missing-word": 7, "word-choice": 6, politeness: 1, spelling: 1 },
  hi: { tense: 3, ending: 2, gender: 1, verb: 7, "word-order": 0, "missing-word": 2, "word-choice": 7, politeness: 2, spelling: 1 },
  ta: { tense: 2, ending: 1, gender: 5, verb: 6, "word-order": 0, "missing-word": 7, "word-choice": 6, politeness: 5, spelling: 1 },
};

const DEFAULT_OBJECT: Record<string, string | null> = {
  play: "piano", sing: "song", practise: "piano", listen: "music", learn: "language", teach: "language", dance: null,
  do: null, go: "home", come: "home", think: null, travel: "city", speak: "language", eat: "rice", drink: "tea", see: "movie",
  read: "book", write: "song", work: null, sleep: null, playgame: null, give: "money", take: "key", buy: "book", say: null,
  wait: null, sit: null, walk: "home", cook: "rice", help: null, call: null,
};

type Room = "check" | "build" | "shapes" | "frames" | "scenes" | "commands" | "flip" | "rules" | "decks";
const ROOMS: { id: Room; label: string }[] = [
  { id: "check", label: "Check" },
  { id: "build", label: "Build" },
  { id: "shapes", label: "Shapes" },
  { id: "frames", label: "Frames" },
  { id: "scenes", label: "Scenes" },
  { id: "commands", label: "Commands" },
  { id: "flip", label: "Flip" },
  { id: "rules", label: "Rules" },
  { id: "decks", label: "Decks" },
];

// ............................................................ local memory
function readNumber(key: string) {
  try {
    return Number(window.localStorage.getItem(key) || 0) || 0;
  } catch {
    return 0;
  }
}
function bump(key: string) {
  try {
    const n = readNumber(key) + 1;
    window.localStorage.setItem(key, String(n));
    return n;
  } catch {
    return 0;
  }
}
function readFixes(): Record<string, number> {
  try {
    return JSON.parse(window.localStorage.getItem("maatu-studio-fixes") || "{}");
  } catch {
    return {};
  }
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
function Stage({ built, speaker, big = true }: { built: Built; speaker: Speaker; big?: boolean }) {
  return (
    <div key={built.sentence} style={{ animation: "mtFade 320ms ease both" }}>
      <div className="flex flex-wrap items-end gap-x-2.5 gap-y-3">
        {built.pieces.map((p, i) => (
          <span key={i} className="flex flex-col">
            <span className="mb-1 text-[9.5px] font-bold" style={{ color: ROLE[p.role].color, letterSpacing: 1.2, opacity: 0.85 }}>
              {ROLE[p.role].label.toUpperCase()}
            </span>
            {p.role === "verb" ? (
              <Lit word={p.word} stem={p.stem} size={big ? 26 : 18} />
            ) : (
              <span style={{ color: C.milk, fontFamily: MONO, fontSize: big ? 26 : 18, fontWeight: 600 }}>{p.word}</span>
            )}
          </span>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <span className="text-[14px]" style={{ color: C.muted }}>
          {built.english}
        </span>
        <SpeakButton text={built.sentence} speaker={speaker} size={big ? "lg" : "md"} />
      </div>
    </div>
  );
}

function WordRow({ word, meaning, role }: { word: string; meaning: string; role?: Piece["role"] }) {
  return (
    <div className="flex items-baseline gap-3 py-1.5" style={{ borderBottom: `1px solid ${LINE_SOFT}` }}>
      <span className="min-w-[120px] text-[14px] font-semibold" style={{ color: role ? ROLE[role].color : C.milk, fontFamily: MONO }}>
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
  const scroller = useRef<HTMLDivElement | null>(null);
  const anchors = useRef<Partial<Record<Room, HTMLElement | null>>>({});
  const anchor = useCallback((id: string, el: HTMLElement | null) => {
    anchors.current[id as Room] = el;
  }, []);
  const jump = (id: Room) => {
    const root = scroller.current;
    const el = anchors.current[id];
    if (!root || !el) return;
    const top = el.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop - 64;
    // Instant on purpose: smooth scrolling on a nested scroller was cut short
    // in testing, and a jump that lands is better than a glide that stops.
    root.scrollTo({ top });
  };

  // Small memory: how much you have used the studio and what trips you up.
  const [checked, setChecked] = useState(0);
  const [heard, setHeard] = useState(0);
  const [fixes, setFixes] = useState<Record<string, number>>({});
  useEffect(() => {
    setChecked(readNumber("maatu-studio-checked"));
    setHeard(readNumber("maatu-studio-heard"));
    setFixes(readFixes());
  }, []);
  const onHeard = useCallback(() => setHeard(bump("maatu-studio-heard")), []);
  const speaker = useSpeaker(lang, onHeard);

  // Gender is the speaker's own; it changes Hindi forms and is told to the
  // checker for every language.
  const [gender, setGenderState] = useState<Gender>("m");
  useEffect(() => {
    const stored = window.localStorage.getItem("maatu-gender");
    if (stored === "f" || stored === "m") setGenderState(stored);
  }, []);
  const setGender = (g: Gender) => {
    setGenderState(g);
    window.localStorage.setItem("maatu-gender", g);
  };

  // Check.
  const [text, setText] = useState("");
  const [check, setCheck] = useState<Check | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  // A scene line the learner is trying to say; the checker judges against it.
  const [practice, setPractice] = useState<Practice | null>(null);
  const [showPractice, setShowPractice] = useState(false);
  const onHeardText = useCallback((value: string) => {
    setText(value);
    setCheck(null);
  }, []);
  const ears = useRecorder(lang, onHeardText);

  const runCheck = useCallback(
    async (line?: string) => {
      const value = (line ?? text).trim();
      if (!value) return;
      setChecking(true);
      setCheckError(null);
      try {
        const res = await fetch("/api/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: value, lang, gender, expected: practice ? practice.target : undefined }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "The checker did not answer.");
        const result = data as Check;
        setCheck(result);
        setChecked(bump("maatu-studio-checked"));
        if (result.corrections.length) {
          const tally = readFixes();
          for (const c of result.corrections) tally[c.type] = (tally[c.type] || 0) + 1;
          try {
            window.localStorage.setItem("maatu-studio-fixes", JSON.stringify(tally));
          } catch {
            // memory is a convenience only
          }
          setFixes(tally);
        }
      } catch (e) {
        setCheckError(e instanceof Error ? e.message : "The checker did not answer.");
      } finally {
        setChecking(false);
      }
    },
    [text, lang, gender, practice],
  );

  useEffect(() => {
    setCheck(null);
    setPractice(null);
  }, [lang]);

  const startPractice = useCallback((p: Practice) => {
    setPractice(p);
    setShowPractice(false);
    setText("");
    setCheck(null);
    jump("check");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Build.
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
  const today = useMemo(() => todaysLines(lang, gender), [lang, gender]);

  // Frames.
  const [frameId, setFrameId] = useState("like");
  const [frameObj, setFrameObj] = useState("piano");
  const frame = FRAMES.find((f) => f.id === frameId) ?? FRAMES[0];
  const frameObjects = OBJECTS.filter((o) => (frame.slot === "place" ? o.kind === "place" : o.kind !== "place"));
  const frameObject = frameObjects.find((o) => o.id === frameObj) ?? frameObjects[0];
  const filled = fillFrame(lang, frame, frameObject, gender);
  const pickFrame = (id: string) => {
    setFrameId(id);
    const f = FRAMES.find((x) => x.id === id);
    if (f?.slot === "place") setFrameObj("home");
    else if (frame.slot === "place") setFrameObj("piano");
  };

  // Commands, decks, rules.
  const [polite, setPolite] = useState(true);
  const [deck, setDeck] = useState<DeckId>("music");
  const [openRule, setOpenRule] = useState<number | null>(0);
  const openRuleFor = (type: string) => {
    setOpenRule(RULE_FOR[lang][type] ?? 0);
    jump("rules");
  };

  const musicVerbs = VERBS.filter((v) => v.group === "music");
  const coreVerbs = VERBS.filter((v) => v.group === "core");
  const persons = PERSONS[lang];
  const topFixes = Object.entries(fixes).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const [activeRoom, setActiveRoom] = useState<Room>("check");

  // Track which room is on screen for the sticky nav.
  useEffect(() => {
    const root = scroller.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const id = (Object.entries(anchors.current).find(([, el]) => el === visible.target)?.[0] ?? null) as Room | null;
        if (id) setActiveRoom(id);
      },
      { root, threshold: [0.2, 0.5], rootMargin: "-80px 0px -40% 0px" },
    );
    for (const el of Object.values(anchors.current)) if (el) io.observe(el);
    return () => io.disconnect();
  }, [lang]);

  return (
    <div ref={scroller} className="absolute inset-0 overflow-y-auto" style={{ background: C.night }}>
      <div className="absolute inset-x-0 top-0 h-[360px] pointer-events-none" style={{ background: "radial-gradient(420px 220px at 20% 0, rgba(255,179,92,0.14), transparent 70%), radial-gradient(360px 200px at 85% 8%, rgba(191,239,219,0.10), transparent 70%)" }} aria-hidden="true" />

      <div className="relative mx-auto max-w-[820px] px-5 pt-11 sm:px-6 lg:pt-12">
        {/* ................................................. hero */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold" style={{ color: C.sodium, letterSpacing: 1.4 }}>
              SENTENCE STUDIO
            </div>
            <h1 className="mt-1" style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: 38, lineHeight: 1.0, color: C.milk, letterSpacing: -0.3 }}>
              Say anything in {ln}.
            </h1>
            <p className="mt-2.5 max-w-[500px] text-[13.5px] leading-relaxed" style={{ color: C.muted }}>
              Grammar you can see. Type or say a line and get the fix with the rule behind it. Tap the pieces together, watch the ending change, and let {host.name} say it back.
            </p>
          </div>
          <div className="hidden flex-none flex-col items-end gap-1 sm:flex" aria-label="Studio activity">
            <span className="text-[22px] font-semibold" style={{ color: C.milk, fontFamily: MONO }}>{heard}</span>
            <span className="text-[10.5px]" style={{ color: C.faint, letterSpacing: 1 }}>LINES HEARD</span>
            <span className="mt-2 text-[22px] font-semibold" style={{ color: C.milk, fontFamily: MONO }}>{checked}</span>
            <span className="text-[10.5px]" style={{ color: C.faint, letterSpacing: 1 }}>LINES CHECKED</span>
          </div>
        </div>

        {/* ................................................. today's lines */}
        <div className="mt-6">
          <Label right={<span className="text-[11px]" style={{ color: C.faint }}>new every day</span>}>TODAY&apos;S THREE LINES</Label>
          <div className="-mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-1 sm:-mx-6 sm:px-6" style={{ scrollbarWidth: "none" }}>
            {today.map((line, i) => (
              <div key={line.sentence} className="w-[280px] flex-none snap-start rounded-[16px] p-4 sm:w-[300px]" style={{ background: i === 0 ? "linear-gradient(135deg,rgba(255,179,92,0.16),rgba(232,80,58,0.05))" : C.tar, border: `1px solid ${i === 0 ? "rgba(255,179,92,0.34)" : LINE}` }}>
                <div className="flex flex-wrap gap-x-1.5 text-[18px] leading-snug">
                  {line.pieces.map((p, j) => (p.role === "verb" ? <Lit key={j} word={p.word} stem={p.stem} size={18} /> : <span key={j} style={{ color: C.milk, fontFamily: MONO, fontWeight: 600 }}>{p.word}</span>))}
                </div>
                <div className="mt-1.5 text-[12.5px]" style={{ color: C.muted }}>
                  {line.english}
                </div>
                <div className="mt-3">
                  <SpeakButton text={line.sentence} speaker={speaker} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ................................................. sticky rooms nav */}
      <div className="sticky top-0 z-10 mt-5" style={{ background: "rgba(10,13,22,0.82)", backdropFilter: "blur(14px)", borderBottom: `1px solid ${LINE_SOFT}` }}>
        <div className="mx-auto flex max-w-[820px] gap-1.5 overflow-x-auto px-5 py-2.5 sm:px-6" style={{ scrollbarWidth: "none" }} role="tablist" aria-label="Studio rooms">
          {ROOMS.map((r) => {
            const on = activeRoom === r.id;
            return (
              <button
                key={r.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => {
                  setActiveRoom(r.id);
                  jump(r.id);
                }}
                className="flex-none rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold focus-visible:outline focus-visible:outline-2"
                style={{ background: on ? "rgba(255,179,92,0.14)" : "transparent", color: on ? C.sodium : C.muted, outlineColor: C.sodium, transition: "background 140ms ease" }}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative mx-auto max-w-[820px] px-5 pb-28 sm:px-6">
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

        {/* ................................................. check */}
        <Section id="check" anchor={anchor} kicker="CHECK" title="Say it your way" blurb={`English, ${ln}, or a mix. Leave a ___ where you are hunting for a word. ${host.name} fixes one thing at a time and tells you the rule.`} tone="tube">
          {practice && (
            <div className="mt-4 rounded-[14px] p-4" style={{ background: "linear-gradient(135deg,rgba(245,194,255,0.12),rgba(191,239,219,0.05))", border: "1px solid rgba(245,194,255,0.32)", animation: "mtFade 260ms ease both" }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[10.5px] font-bold" style={{ color: LILAC, letterSpacing: 1.2 }}>SAY THIS LINE</div>
                  <div className="mt-1 text-[18px] font-semibold" style={{ color: C.milk }}>{practice.en}</div>
                  {showPractice ? (
                    <div className="mt-1 text-[15px] font-semibold" style={{ color: LILAC, fontFamily: MONO }}>{practice.target}</div>
                  ) : (
                    <button type="button" onClick={() => setShowPractice(true)} className="mt-1.5 text-[12px] font-semibold" style={{ color: C.faint }}>
                      Stuck? Peek at the answer
                    </button>
                  )}
                </div>
                <div className="flex flex-none flex-col items-end gap-2">
                  <SpeakButton text={practice.target} speaker={speaker} size="sm" label="Hear" />
                  <button type="button" onClick={() => { setPractice(null); setCheck(null); }} className="text-[12px] font-semibold" style={{ color: C.faint }}>
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}
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
              className="w-full resize-none rounded-[14px] px-4 py-3 text-[16px] focus-visible:outline focus-visible:outline-2"
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
                onPointerCancel={() => ears.recording && ears.stop()}
                onPointerLeave={() => ears.recording && ears.stop()}
                onContextMenu={(e) => e.preventDefault()}
                onKeyDown={(e) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    if (ears.recording) ears.stop();
                    else void ears.start();
                  }
                }}
                disabled={ears.busy}
                aria-pressed={ears.recording}
                className="inline-flex select-none items-center gap-2 rounded-full px-4 py-2.5 text-[13.5px] font-bold focus-visible:outline focus-visible:outline-2"
                style={{
                  background: ears.recording ? C.kumkum : "rgba(232,80,58,0.14)",
                  color: ears.recording ? C.onKumkum : "#FF8A75",
                  border: "1px solid rgba(232,80,58,0.4)",
                  outlineColor: C.milk,
                  touchAction: "none",
                  WebkitUserSelect: "none",
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
            <div className="mt-4 rounded-[16px] p-4" style={{ background: C.base, border: `1px solid ${check.ok ? "rgba(191,239,219,0.28)" : "rgba(255,179,92,0.34)"}`, animation: "mtFade 320ms ease both" }}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-bold" style={{ color: check.ok ? C.tube : C.sodium, letterSpacing: 1 }}>
                  {check.heard_as === "english" ? `IN ${ln.toUpperCase()}` : check.ok ? "THAT WORKS" : `${check.corrections.length} THING${check.corrections.length === 1 ? "" : "S"} TO FIX`}
                </span>
                <SpeakButton text={check.target} speaker={speaker} />
              </div>
              <div className="mt-2 text-[24px] font-semibold leading-snug" style={{ color: C.milk, fontFamily: MONO }}>
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
                      <div key={i} className="rounded-[12px] p-3" style={{ background: C.tar, border: `1px solid ${tag.color}33` }}>
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
                        <button type="button" onClick={() => openRuleFor(c.type)} className="mt-1.5 text-[12px] font-semibold" style={{ color: tag.color }}>
                          See the rule ›
                        </button>
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
              <div className="mt-3 flex flex-wrap gap-4">
                <button type="button" onClick={() => { setText(check.target); setCheck(null); }} className="text-[12.5px] font-semibold" style={{ color: C.sodium }}>
                  Edit this line
                </button>
              </div>
            </div>
          )}

          {topFixes.length > 0 && (
            <div className="mt-4 rounded-[14px] p-3.5" style={{ background: C.base, border: `1px solid ${LINE_SOFT}` }}>
              <Label>WHAT TRIPS YOU UP</Label>
              <div className="flex flex-wrap gap-2">
                {topFixes.map(([type, n]) => {
                  const tag = TAG[type] ?? TAG["word-choice"];
                  return (
                    <button key={type} type="button" onClick={() => openRuleFor(type)} className="rounded-full px-3 py-1.5 text-[12px] font-semibold focus-visible:outline focus-visible:outline-2" style={{ background: `${tag.color}1a`, color: tag.color, border: `1px solid ${tag.color}55`, outlineColor: tag.color }}>
                      {tag.label} <span style={{ opacity: 0.7 }}>×{n}</span> · rule ›
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </Section>

        {/* ................................................. build */}
        <Section id="build" anchor={anchor} kicker="BUILD" title="Tap the pieces together" blurb="Who, what, when. Only the ending moves; the lit part of the verb is what to listen for.">
          {built && (
            <div className="mt-4 rounded-[18px] p-5" style={{ background: "linear-gradient(135deg,rgba(255,179,92,0.13),rgba(232,80,58,0.04))", border: "1px solid rgba(255,179,92,0.32)" }}>
              <Stage built={built} speaker={speaker} />
              <div className="mt-4">
                {built.pieces.map((p, i) => (
                  <WordRow key={i} word={p.word} meaning={p.meaning} role={p.role} />
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
              <div className="mt-3">
                <button type="button" onClick={() => { setText(built.sentence); void runCheck(built.sentence); jump("check"); }} className="text-[12.5px] font-semibold" style={{ color: C.tube }}>
                  Send to the checker ›
                </button>
              </div>
            </div>
          )}

          <div className="mt-5">
            <Label>WHO</Label>
            <div className="flex flex-wrap gap-2">
              {PERSON_ORDER.map((id, i) => (
                <Chip key={id} on={personId === id} onClick={() => setPersonId(id)} title={persons[i].hint} tone="tube">
                  {persons[i].sub} <span style={{ opacity: 0.6 }}>{persons[i].en}{persons[i].hint ? `, ${persons[i].hint}` : ""}</span>
                </Chip>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <Label right={<span className="text-[11px]" style={{ color: C.sodium }}>music first</span>}>ACTION</Label>
            <div className="flex flex-wrap gap-2">
              {musicVerbs.map((v) => (
                <Chip key={v.id} on={verbId === v.id} onClick={() => pickVerb(v.id)}>
                  {v.en.base} <span style={{ opacity: 0.6 }}>{v[lang].dict}</span>
                </Chip>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {coreVerbs.map((v) => (
                <Chip key={v.id} on={verbId === v.id} onClick={() => pickVerb(v.id)} small>
                  {v.en.base}{v.id === "playgame" ? " (a game)" : ""} <span style={{ opacity: 0.6 }}>{v[lang].dict}</span>
                </Chip>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <Label>WHAT OR WHERE</Label>
            <div className="flex flex-wrap gap-2">
              <Chip on={objectId === null} onClick={() => setObjectId(null)} tone="lilac" small>nothing</Chip>
              {OBJECTS.map((o) => (
                <Chip key={o.id} on={objectId === o.id} onClick={() => setObjectId(o.id)} tone="lilac" small>
                  {objectLabel(o, lang)} <span style={{ opacity: 0.6 }}>{o[lang]}</span>
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
                <Chip on={timeId === null} onClick={() => pickTime(null)} tone="sky" small>none</Chip>
                {TIMES.map((t) => (
                  <Chip key={t.id} on={timeId === t.id} onClick={() => pickTime(t.id)} tone="sky" small>
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
        </Section>

        <ShapesRoom lang={lang} gender={gender} speaker={speaker} anchor={anchor} verbId={verbId} onVerb={pickVerb} />

        {/* ................................................. frames */}
        <Section id="frames" anchor={anchor} kicker="FRAMES" title="Twenty shapes, any word" blurb="Learn the shape once, drop any word in the slot. This is how natives actually build most of what they say." tone="lilac">
          <div className="mt-4 rounded-[18px] p-5" style={{ background: "linear-gradient(135deg,rgba(245,194,255,0.12),rgba(159,211,255,0.04))", border: "1px solid rgba(245,194,255,0.3)" }}>
            <div key={filled.sentence} style={{ animation: "mtFade 320ms ease both" }}>
              <div className="text-[26px] font-semibold leading-snug" style={{ color: C.milk, fontFamily: MONO }}>
                {filled.sentence.split(frameObject[lang]).map((part, i, arr) => (
                  <span key={i}>
                    {part}
                    {i < arr.length - 1 && <span style={{ color: LILAC, borderBottom: `2px solid ${LILAC}55` }}>{frameObject[lang]}</span>}
                  </span>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                <span className="text-[14px]" style={{ color: C.muted }}>{filled.english}</span>
                <SpeakButton text={filled.sentence} speaker={speaker} size="lg" />
              </div>
            </div>
            <div className="mt-3 text-[12.5px] leading-relaxed" style={{ color: "rgba(245,194,255,0.85)" }}>
              {frame.why}
            </div>
          </div>
          <div className="mt-4">
            <Label>SHAPE</Label>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {FRAMES.map((f) => {
                const on = frameId === f.id;
                return (
                  <button key={f.id} type="button" onClick={() => pickFrame(f.id)} aria-pressed={on} className="flex items-baseline justify-between gap-3 rounded-[11px] px-3 py-2 text-left focus-visible:outline focus-visible:outline-2" style={{ background: on ? "rgba(245,194,255,0.12)" : C.base, border: on ? "1px solid rgba(245,194,255,0.45)" : `1px solid ${LINE_SOFT}`, outlineColor: LILAC }}>
                    <span className="text-[12.5px]" style={{ color: on ? C.milk : C.muted }}>{f.en}</span>
                    <span className="text-[12px] font-semibold" style={{ color: on ? LILAC : C.faint, fontFamily: MONO }}>{f[lang]}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-4">
            <Label>WORD FOR THE SLOT</Label>
            <div className="flex flex-wrap gap-2">
              {frameObjects.map((o) => (
                <Chip key={o.id} on={frameObject.id === o.id} onClick={() => setFrameObj(o.id)} tone="lilac" small>
                  {objectLabel(o, lang)} <span style={{ opacity: 0.6 }}>{o[lang]}</span>
                </Chip>
              ))}
            </div>
          </div>
        </Section>

        <ScenesRoom lang={lang} gender={gender} speaker={speaker} anchor={anchor} onPractise={startPractice} />

        {/* ................................................. commands */}
        <Section id="commands" anchor={anchor} kicker="COMMANDS" title="What a teacher says" blurb={COMMAND_NOTE[lang]} tone="sky">
          <div className="mt-4 flex gap-2">
            <Chip on={polite} onClick={() => setPolite(true)} tone="sky">polite</Chip>
            <Chip on={!polite} onClick={() => setPolite(false)} tone="sky">to a friend or a child</Chip>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {COMMANDS.map((c) => {
              const word = c[lang][polite ? 0 : 1];
              const active = speaker.playing === word;
              return (
                <button key={c.en} type="button" onClick={() => void speaker.speak(word)} className="flex items-center justify-between gap-3 rounded-[12px] px-3.5 py-2.5 text-left focus-visible:outline focus-visible:outline-2" style={{ background: active ? "rgba(159,211,255,0.14)" : C.base, border: `1px solid ${active ? "rgba(159,211,255,0.5)" : LINE_SOFT}`, outlineColor: SKY, transition: "background 140ms ease" }}>
                  <span className="text-[12.5px]" style={{ color: C.muted }}>{c.en}</span>
                  <span className="text-[15px] font-semibold" style={{ color: active ? SKY : C.milk, fontFamily: MONO }}>{word}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-2 text-[11.5px]" style={{ color: C.faint }}>
            Tap any command to hear it.
          </div>
        </Section>

        {/* ................................................. flip */}
        <Section id="flip" anchor={anchor} kicker="FLIP" title={`${verb.en.base}: ${verb[lang].dict}`} blurb={verb.note ?? "One ending per person. Learn it on this verb and it works on every verb."}>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {VERBS.map((v) => (
              <Chip key={v.id} on={verbId === v.id} onClick={() => pickVerb(v.id)} small>
                {v.en.base}
              </Chip>
            ))}
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[540px] border-collapse text-left text-[13px]">
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
                    <td className="py-2.5 pr-3" style={{ color: C.muted }}>{row.person}</td>
                    {[row.present, row.past, row.future].map((cell, i) => {
                      const line = `${row.sub} ${cell.word}`;
                      return (
                        <td key={i} className="py-2.5 pr-3">
                          <button type="button" onClick={() => void speaker.speak(line)} className="text-left focus-visible:outline focus-visible:outline-2" style={{ outlineColor: C.sodium, opacity: speaker.playing === line ? 1 : 0.92 }} aria-label={`Hear ${line}`}>
                            <Lit word={cell.word} stem={cell.stem} size={14} color={speaker.playing === line ? C.tube : C.sodium} />
                          </button>
                        </td>
                      );
                    })}
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
        <Section id="rules" anchor={anchor} kicker="RULES" title={`${ln} in ${RULES[lang].length} rules`} blurb="Learn these once and you can build sentences you have never heard.">
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
        <Section id="decks" anchor={anchor} kicker="DECKS" title="Words to keep in your pocket" blurb="Tap a row to hear it. The small line is how to remember it." tone="tube">
          <div className="mt-4 flex flex-wrap gap-2">
            {DECK_ORDER.map((d) => (
              <Chip key={d.id} on={deck === d.id} onClick={() => setDeck(d.id)} tone="tube">
                {d.label}
              </Chip>
            ))}
          </div>
          <div className="mt-1.5 text-[12px]" style={{ color: C.faint }}>
            {DECK_ORDER.find((d) => d.id === deck)?.blurb}
          </div>
          <div className="mt-3 grid gap-x-4 sm:grid-cols-2">
            {DECKS[deck].map((row, i) => {
              const word = row[lang];
              const speakable = word.replace(/\s*\(.*?\)\s*/g, " ").replace(/^-|\s-/g, " ").trim();
              const canSpeak = speakable && speakable !== "same words";
              const active = speaker.playing === speakable;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => (canSpeak ? void speaker.speak(speakable) : undefined)}
                  className="py-2.5 text-left focus-visible:outline focus-visible:outline-2"
                  style={{ borderTop: `1px solid ${LINE_SOFT}`, outlineColor: C.tube }}
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="text-[12.5px]" style={{ color: C.muted }}>{row.en}</span>
                    <span className="text-right text-[15px] font-semibold" style={{ color: active ? C.sodium : C.milk, fontFamily: MONO }}>{word}</span>
                  </span>
                  {row.trick && (
                    <span className="mt-0.5 block text-[11.5px] leading-snug" style={{ color: C.faint }}>
                      {row.trick}
                    </span>
                  )}
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
