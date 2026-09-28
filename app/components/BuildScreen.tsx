"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LANG_NAME } from "@/lib/curriculum";
import {
  COMMANDS,
  COMMAND_NOTE,
  DECKS,
  DECK_ORDER,
  fillFrame,
  FRAMES,
  OBJECTS,
  objectLabel,
  RULES,
  type DeckId,
  type Gender,
  type Piece,
} from "@/lib/grammar";
import { C, DISPLAY, HOST, LINE, LINE_SOFT, MONO, type Lang } from "@/lib/maatu-design";
import { Chip, Label, LILAC, Lit, SaveButton, Section, SKY, SpeakButton, useSpeaker, type Speaker } from "./studio-bits";
import { ReviewRoom } from "./ReviewRoom";
import { countFor } from "@/lib/review";
import { ScenesRoom, ShapesRoom, type Practice } from "./StudioRooms";
import { SentencePath } from "./SentencePath";

// Build: the second mode next to the voice calls. The Sentence Path sits on
// top (pick who, action, what, when; see and hear the spoken line in Kannada,
// Hindi, Tamil, or French). Below it, one practice tool at a time: Check (say
// or type a line, get the fix and the rule), Review, Scenes, Frames, Commands,
// Words, Shapes, Rules. Every form comes from vetted tables; the brain is used
// only to check free text. Romanized only, never native script. No em dashes
// anywhere.

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

type Room = "review" | "check" | "shapes" | "frames" | "scenes" | "commands" | "rules" | "decks";
const TOOLS: { id: Room; label: string; emoji: string }[] = [
  { id: "check", label: "Check", emoji: "✍️" },
  { id: "review", label: "Review", emoji: "🔁" },
  { id: "scenes", label: "Scenes", emoji: "🎭" },
  { id: "frames", label: "Frames", emoji: "🧩" },
  { id: "commands", label: "Commands", emoji: "📣" },
  { id: "decks", label: "Words", emoji: "🗂️" },
  { id: "shapes", label: "Shapes", emoji: "🧱" },
  { id: "rules", label: "Rules", emoji: "📏" },
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
type BuildScreenProps = { lang: Lang; onLanguageChange: (lang: Lang) => void; seed?: { text: string; nonce: number } | null; rm?: boolean; onTalk?: (line: { target: string; en: string }, french?: boolean) => void };

export function BuildScreen({ lang, onLanguageChange, seed, rm = false, onTalk }: BuildScreenProps) {
  const host = HOST[lang];
  const ln = LANG_NAME[lang];
  const scroller = useRef<HTMLDivElement | null>(null);
  const toolsRef = useRef<HTMLDivElement | null>(null);
  // Rooms used to sit on one long scroll; now one tool is open at a time.
  const anchor = useCallback(() => undefined, []);
  const [tool, setTool] = useState<Room>("check");
  const jump = (id: Room) => {
    setTool(id);
    requestAnimationFrame(() => {
      const root = scroller.current;
      const el = toolsRef.current;
      if (!root || !el) return;
      root.scrollTo({ top: el.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop - 12 });
    });
  };

  // Small memory: what trips you up.
  const [fixes, setFixes] = useState<Record<string, number>>({});
  useEffect(() => {
    setFixes(readFixes());
  }, []);
  const onHeard = useCallback(() => bump("maatu-studio-heard"), []);
  // Slow voice for learners, remembered per device.
  const [slow, setSlowState] = useState(false);
  useEffect(() => {
    setSlowState(window.localStorage.getItem("maatu-studio-slow") === "true");
  }, []);
  const setSlow = (value: boolean) => {
    setSlowState(value);
    window.localStorage.setItem("maatu-studio-slow", String(value));
  };
  const speaker = useSpeaker(lang, onHeard, slow ? 0.72 : 0.9);
  // Review bookkeeping: bumps whenever something is saved or graded.
  const [reviewVersion, setReviewVersion] = useState(0);
  const [reviewCounts, setReviewCounts] = useState({ saved: 0, due: 0 });
  useEffect(() => {
    setReviewCounts(countFor(lang));
  }, [lang, reviewVersion]);
  const touchReview = useCallback(() => setReviewVersion((v) => v + 1), []);

  // Gender is the speaker's own; it changes Hindi and French forms and is told
  // to the checker for every language.
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
        bump("maatu-studio-checked");
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

  // A line handed over from the post-call debrief: check it straight away.
  const seededRef = useRef(0);
  useEffect(() => {
    if (!seed || seed.nonce === seededRef.current) return;
    seededRef.current = seed.nonce;
    setPractice(null);
    setText(seed.text);
    jump("check");
    void runCheck(seed.text);
  }, [seed]); // eslint-disable-line react-hooks/exhaustive-deps

  const startPractice = useCallback((p: Practice) => {
    setPractice(p);
    setShowPractice(false);
    setText("");
    setCheck(null);
    jump("check");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // The verb the Shapes tool docks.
  const [verbId, setVerbId] = useState("play");

  // Frames.
  const [frameId, setFrameId] = useState("like");
  const [frameObj, setFrameObj] = useState("piano");
  const frame = FRAMES.find((f) => f.id === frameId) ?? FRAMES[0];
  const frameObjects = OBJECTS.filter((o) => (frame.slot === "place" ? o.kind === "place" : o.kind === "thing" || o.kind === "language")).filter((o) => !["shopping", "exercise", "cooking", "cleaning", "homework", "order", "download", "ticket"].includes(o.id));
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
  const [deckTest, setDeckTest] = useState(false);
  const [deckShown, setDeckShown] = useState<Set<number>>(new Set());
  const [openRule, setOpenRule] = useState<number | null>(0);
  const openRuleFor = (type: string) => {
    setOpenRule(RULE_FOR[lang][type] ?? 0);
    jump("rules");
  };
  const topFixes = Object.entries(fixes).sort((a, b) => b[1] - a[1]).slice(0, 3);

  return (
    <div ref={scroller} className="absolute inset-0 overflow-y-auto" style={{ background: C.night }}>
      <div className="absolute inset-x-0 top-0 h-[360px] pointer-events-none" style={{ background: "radial-gradient(420px 220px at 20% 0, rgba(255,179,92,0.14), transparent 70%), radial-gradient(360px 200px at 85% 8%, rgba(191,239,219,0.10), transparent 70%)" }} aria-hidden="true" />

      <div className="relative mx-auto max-w-[1040px] px-5 pb-28 pt-10 sm:px-6 lg:pt-12">
        {/* ................................................. hero */}
        <div className="text-[11px] font-bold" style={{ color: C.sodium, letterSpacing: 1.4 }}>
          BUILD A SENTENCE
        </div>
        <h1 className="mt-1 text-[30px] sm:text-[36px]" style={{ fontFamily: DISPLAY, fontWeight: 500, lineHeight: 1.02, color: C.milk, letterSpacing: -0.3 }}>
          From an idea to a spoken line.
        </h1>
        <p className="mt-2 max-w-[560px] text-[13.5px] leading-relaxed" style={{ color: C.muted }}>
          Tap who, the action, what, and when. The line appears the way people actually say it.<span className="hidden sm:inline"> Then change one thing and hear only the ending move.</span>
        </p>

        <div className="mt-5">
          <SentencePath lang={lang} onLanguageChange={onLanguageChange} gender={gender} setGender={setGender} slow={slow} setSlow={setSlow} onSaved={touchReview} rm={rm} onTalk={onTalk} />
        </div>

        {/* ................................................. toolbox */}
        <div ref={toolsRef} className="mt-10">
          <div className="text-[11px] font-bold" style={{ color: C.tube, letterSpacing: 1.4 }}>
            MORE WAYS TO PRACTISE {ln.toUpperCase()}
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-8" role="tablist" aria-label="Practice tools">
            {TOOLS.map((t) => {
              const on = tool === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setTool(t.id)}
                  className="relative flex flex-col items-center gap-1 rounded-[14px] px-1 py-2.5 focus-visible:outline focus-visible:outline-2"
                  style={{ background: on ? "rgba(191,239,219,0.14)" : C.tar, border: `1px solid ${on ? "rgba(191,239,219,0.5)" : LINE}`, outlineColor: C.tube }}
                >
                  <span className="text-[20px] leading-none" aria-hidden="true">{t.emoji}</span>
                  <span className="text-[11.5px] font-semibold" style={{ color: on ? C.milk : C.muted }}>{t.label}</span>
                  {t.id === "review" && reviewCounts.due > 0 && (
                    <span className="absolute -top-1.5 right-1.5 rounded-full px-1.5 text-[10px] font-bold" style={{ background: C.tube, color: C.ink }}>{reviewCounts.due}</span>
                  )}
                </button>
              );
            })}
          </div>

        {tool === "review" && <ReviewRoom lang={lang} speaker={speaker} anchor={anchor} version={reviewVersion} onChange={touchReview} />}

        {/* ................................................. check */}
        {tool === "check" && (
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
                <div className="flex gap-2">
                  <SaveButton lang={lang} en={check.english} target={check.target} onChange={touchReview} />
                  <SpeakButton text={check.target} speaker={speaker} />
                </div>
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
        )}

        {tool === "shapes" && <ShapesRoom lang={lang} gender={gender} speaker={speaker} anchor={anchor} verbId={verbId} onVerb={setVerbId} />}

        {/* ................................................. frames */}
        {tool === "frames" && (
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
                <div className="flex gap-2">
                  <SaveButton lang={lang} en={filled.english} target={filled.sentence} onChange={touchReview} />
                  <SpeakButton text={filled.sentence} speaker={speaker} size="lg" />
                </div>
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
        )}

        {tool === "scenes" && <ScenesRoom lang={lang} gender={gender} speaker={speaker} anchor={anchor} onPractise={startPractice} onSaved={touchReview} />}

        {/* ................................................. commands */}
        {tool === "commands" && (
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
        )}

        {/* ................................................. rules */}
        {tool === "rules" && (
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
        )}

        {/* ................................................. decks */}
        {tool === "decks" && (
        <Section id="decks" anchor={anchor} kicker="DECKS" title="Words to keep in your pocket" blurb="Tap a row to hear it. The small line is how to remember it." tone="tube">
          <div className="mt-4 flex flex-wrap gap-2">
            {DECK_ORDER.map((d) => (
              <Chip key={d.id} on={deck === d.id} onClick={() => setDeck(d.id)} tone="tube">
                {d.label}
              </Chip>
            ))}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[12px]" style={{ color: C.faint }}>
              {DECK_ORDER.find((d) => d.id === deck)?.blurb}
            </span>
            <Chip on={deckTest} onClick={() => { setDeckTest(!deckTest); setDeckShown(new Set()); }} tone="tube" small>
              {deckTest ? "testing: tap to reveal" : "test me"}
            </Chip>
          </div>
          <div className="mt-3 grid gap-x-4 sm:grid-cols-2">
            {DECKS[deck].map((row, i) => {
              const word = row[lang];
              const speakable = word.replace(/\s*\(.*?\)\s*/g, " ").replace(/^-|\s-/g, " ").trim();
              const canSpeak = speakable && speakable !== "same words";
              const active = speaker.playing === speakable;
              const hidden = deckTest && !deckShown.has(i);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    if (hidden) setDeckShown((prev) => new Set(prev).add(i));
                    else if (canSpeak) void speaker.speak(speakable);
                  }}
                  className="py-2.5 text-left focus-visible:outline focus-visible:outline-2"
                  style={{ borderTop: `1px solid ${LINE_SOFT}`, outlineColor: C.tube }}
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="text-[12.5px]" style={{ color: C.muted }}>{row.en}</span>
                    {hidden ? (
                      <span className="rounded-[7px] px-2 py-0.5 text-[11px] font-semibold" style={{ background: "rgba(191,239,219,0.10)", color: C.tube }}>tap to reveal</span>
                    ) : (
                      <span className="text-right text-[15px] font-semibold" style={{ color: active ? C.sodium : C.milk, fontFamily: MONO }}>{word}</span>
                    )}
                  </span>
                  {row.trick && !hidden && (
                    <span className="mt-0.5 block text-[11.5px] leading-snug" style={{ color: C.faint }}>
                      {row.trick}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </Section>
        )}

        </div>

        <div className="mt-6 text-center text-[11.5px]" style={{ color: C.faint }}>
          Everything here is spoken {ln} the way people in {host.place.split(",").pop()?.trim()} talk. Romanized only, no script, no plural endings. French is spoken Paris French.
        </div>
      </div>
    </div>
  );
}
