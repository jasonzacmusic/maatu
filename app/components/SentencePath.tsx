"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { verbById, type Gender } from "@/lib/grammar";
import { C, DISPLAY, HOST, LINE, LINE_SOFT, MONO, type Lang } from "@/lib/maatu-design";
import {
  buildPath,
  HOW_TO_SAY,
  LADDER,
  OBJECT_EMOJI,
  objectEnglish,
  objectsFor,
  PATH_LANGS,
  randomChoice,
  VERB_TILES,
  WHEN_TILES,
  whenAllowed,
  WHO_TILES,
  type Part,
  type PathChoice,
  type PathLang,
  type PathResult,
  type Role,
  type When,
  type Who,
} from "@/lib/sentence-path";
import { LILAC, Lit, SaveButton, SKY } from "./studio-bits";

// Sentence Path: the visual builder. Four stops on a path (who, action, what,
// when), each picked from emoji tiles, and the spoken line appears at once in
// Kannada, Hindi, Tamil, or French with how to say it. Then change one thing
// (the time, the person) and watch only the ending move. No em dashes anywhere.

const ROLE: Record<Role, { color: string; rgb: string; label: string }> = {
  who: { color: C.tube, rgb: "191,239,219", label: "who" },
  action: { color: C.sodium, rgb: "255,179,92", label: "action" },
  what: { color: LILAC, rgb: "245,194,255", label: "what" },
  when: { color: SKY, rgb: "159,211,255", label: "when" },
  helper: { color: C.muted, rgb: "154,164,192", label: "helper" },
};

type Step = "who" | "action" | "what" | "when";
const STEPS: { id: Step; label: string; role: Role }[] = [
  { id: "who", label: "WHO", role: "who" },
  { id: "action", label: "DOES", role: "action" },
  { id: "what", label: "WHAT", role: "what" },
  { id: "when", label: "WHEN", role: "when" },
];

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
    async (text: string, lang: PathLang) => {
      const clean = text.replace(/\s+\?$/, "?").trim();
      if (!clean) return;
      const id = `${lang}:${clean}`;
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
        u.rate = slow ? 0.72 : 0.92;
        u.onend = () => setPlaying(null);
        u.onerror = () => setPlaying(null);
        setPlaying(id);
        window.speechSynthesis.speak(u);
        return;
      }
      const pace = slow ? 0.72 : 0.9;
      const key = `${id}:${pace}`;
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

function PlayButton({ voice, text, lang, big, label }: { voice: Voice; text: string; lang: PathLang; big?: boolean; label?: string }) {
  const id = `${lang}:${text.replace(/\s+\?$/, "?").trim()}`;
  const active = voice.playing === id;
  const busy = voice.loading === id;
  return (
    <button
      type="button"
      onClick={() => (active ? voice.stop() : void voice.speak(text, lang))}
      aria-label={`${active ? "Stop" : "Hear"}: ${text}`}
      className={`inline-flex flex-none items-center justify-center gap-2 rounded-full font-bold focus-visible:outline focus-visible:outline-2 ${big ? "h-12 px-5 text-[15px]" : "h-8 w-8 text-[11px]"}`}
      style={{
        background: active ? C.sodium : big ? C.sodium : "rgba(255,179,92,0.12)",
        color: active || big ? C.ink : C.sodium,
        border: big ? "none" : "1px solid rgba(255,179,92,0.34)",
        boxShadow: big ? "0 8px 26px -8px rgba(255,179,92,0.55)" : undefined,
        outlineColor: C.milk,
        opacity: busy ? 0.7 : 1,
      }}
    >
      <span aria-hidden="true">{busy ? "…" : active ? "◼" : "▶"}</span>
      {big && (label ?? "Hear it")}
    </button>
  );
}

// ............................................................ pieces
function Words({ parts, size, lit = true }: { parts: Part[]; size: number; lit?: boolean }) {
  return (
    <span className="flex flex-wrap items-baseline" style={{ columnGap: size * 0.42, rowGap: size * 0.3 }}>
      {parts.map((p, i) =>
        p.role === "action" && lit && p.stem ? (
          <Lit key={i} word={p.word} stem={p.stem} size={size} />
        ) : (
          <span key={i} style={{ fontFamily: MONO, fontSize: size, fontWeight: 600, color: p.role === "helper" ? C.muted : p.role === "action" ? C.sodium : ROLE[p.role].color }}>
            {p.word}
          </span>
        ),
      )}
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

function Tile({ on, onClick, emoji, title, sub, tone, badge, disabled }: { on: boolean; onClick: () => void; emoji: string; title: string; sub?: string; tone: Role; badge?: string; disabled?: boolean }) {
  const r = ROLE[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
      className="relative flex min-h-[74px] flex-col items-center justify-center gap-1 rounded-[16px] px-2 py-2.5 text-center focus-visible:outline focus-visible:outline-2"
      style={{
        background: on ? `rgba(${r.rgb},0.16)` : C.base,
        border: `1px solid ${on ? `rgba(${r.rgb},0.6)` : LINE}`,
        outlineColor: r.color,
        transform: on ? "translateY(-1px)" : undefined,
        boxShadow: on ? `0 10px 24px -14px rgba(${r.rgb},0.8)` : undefined,
        opacity: disabled ? 0.4 : 1,
        transition: "background 140ms ease, border-color 140ms ease, transform 140ms ease",
      }}
    >
      {badge && (
        <span className="absolute -top-2 right-2 rounded-full px-1.5 py-0.5 text-[9px] font-bold" style={{ background: r.color, color: C.ink, letterSpacing: 0.6 }}>
          {badge}
        </span>
      )}
      <span className="text-[24px] leading-none" aria-hidden="true">
        {emoji}
      </span>
      <span className="text-[12.5px] font-semibold leading-tight" style={{ color: on ? C.milk : C.muted }}>
        {title}
      </span>
      {sub && (
        <span className="text-[11px] leading-tight" style={{ color: on ? r.color : C.faint, fontFamily: MONO }}>
          {sub}
        </span>
      )}
    </button>
  );
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-semibold focus-visible:outline focus-visible:outline-2"
      style={{ background: on ? "rgba(191,239,219,0.16)" : C.base, color: on ? C.tube : C.muted, border: `1px solid ${on ? "rgba(191,239,219,0.5)" : LINE}`, outlineColor: C.tube }}
    >
      {children}
    </button>
  );
}

// ............................................................ the path strip
function PathStrip({ step, setStep, choice, lang, rm }: { step: Step; setStep: (s: Step) => void; choice: PathChoice; lang: PathLang; rm: boolean }) {
  const who = WHO_TILES.find((w) => w.id === choice.who)!;
  const verb = VERB_TILES.find((v) => v.id === choice.verb)!;
  const when = WHEN_TILES.find((w) => w.id === choice.when)!;
  const hasObjects = objectsFor(choice.verb).length > 0;
  const nodes: Record<Step, { emoji: string; value: string; empty?: boolean }> = {
    who: { emoji: who.emoji, value: choice.who === "name" ? (choice.name?.trim() || "a name") : who.hint ? `${who.en} (${who.hint})` : who.en },
    action: { emoji: verb.emoji, value: verb.short ?? verb.en },
    what: choice.object ? { emoji: OBJECT_EMOJI[choice.object] ?? "•", value: objectEnglish(choice.object, lang).replace(/^(the|a|an) /, "") } : { emoji: "○", value: hasObjects ? "nothing" : "not needed", empty: true },
    when: { emoji: when.emoji, value: when.en },
  };
  return (
    <div className="flex items-stretch" role="tablist" aria-label="Sentence path">
      {STEPS.map((s, i) => {
        const on = step === s.id;
        const r = ROLE[s.role];
        const n = nodes[s.id];
        return (
          <div key={s.id} className="flex min-w-0 flex-1 items-stretch">
            <button
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setStep(s.id)}
              className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[16px] px-1 py-2.5 focus-visible:outline focus-visible:outline-2"
              style={{
                background: on ? `rgba(${r.rgb},0.14)` : "rgba(22,27,43,0.7)",
                border: `1.5px solid ${on ? r.color : `rgba(${r.rgb},0.26)`}`,
                outlineColor: r.color,
                boxShadow: on ? `0 0 0 4px rgba(${r.rgb},0.08), 0 12px 28px -16px rgba(${r.rgb},0.9)` : undefined,
                transition: "background 160ms ease, border-color 160ms ease, box-shadow 160ms ease",
              }}
            >
              <span className="text-[9.5px] font-bold" style={{ color: r.color, letterSpacing: 1.3 }}>
                {s.label}
              </span>
              <span className="text-[24px] leading-none" aria-hidden="true" style={{ opacity: n.empty ? 0.45 : 1 }}>
                {n.emoji}
              </span>
              <span className="w-full truncate px-0.5 text-center text-[11.5px] font-semibold" style={{ color: n.empty ? C.faint : C.milk }}>
                {n.value}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <svg width="18" viewBox="0 0 18 40" className="flex-none self-center" aria-hidden="true" style={{ height: 40 }}>
                <defs>
                  <linearGradient id={`pg${i}`} x1="0" x2="1">
                    <stop offset="0" stopColor={ROLE[STEPS[i].role].color} />
                    <stop offset="1" stopColor={ROLE[STEPS[i + 1].role].color} />
                  </linearGradient>
                </defs>
                <path d="M1 20 H14" stroke={`url(#pg${i})`} strokeWidth="2" strokeDasharray="3 3" className={rm ? "" : "mt-flow"} />
                <path d="M11 15 L16 20 L11 25" fill="none" stroke={ROLE[STEPS[i + 1].role].color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ............................................................ word order map
// English on top, the target line below, a curve for each role. In the Indian
// languages the action crosses to the end; in French it stays in the middle.
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
    <div>
      <svg viewBox={`-2 0 ${width + 4} ${H}`} width="100%" style={{ maxWidth: width + 4, display: "block" }} role="img" aria-label={`Word order: English ${top.map((p) => p.word).join(" ")}, ${langLabel} ${bottom.map((p) => p.word).join(" ")}`}>
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

// ............................................................ the Venn
function Venn() {
  const left = ["The action goes last", "No words for the or a", "English word + maadu, karna, pannu", "Often drop I: the ending already says it (Kannada, Tamil)"];
  const both = ["A friendly you and a polite you", "Loanwords stay: piano, football", "Time words: yesterday, now, tomorrow"];
  const right = ["The action sits in the middle", "Needs le, la, un, une", "Each action is its own verb", "French: tu for friends, vous to be polite"];
  return (
    <div>
      <svg viewBox="0 0 360 170" width="100%" style={{ maxWidth: 460, display: "block", margin: "0 auto" }} role="img" aria-label="Venn diagram: Kannada, Hindi and Tamil on the left, English and French on the right, shared ideas in the middle">
        <circle cx="130" cy="85" r="78" fill="rgba(255,179,92,0.13)" stroke={C.sodium} strokeOpacity="0.6" />
        <circle cx="230" cy="85" r="78" fill="rgba(159,211,255,0.12)" stroke={SKY} strokeOpacity="0.6" />
        <text x="92" y="80" textAnchor="middle" fontSize="13" fontWeight="700" fill={C.sodium}>Kannada</text>
        <text x="92" y="96" textAnchor="middle" fontSize="13" fontWeight="700" fill={C.sodium}>Hindi · Tamil</text>
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

// ............................................................ screen part
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
};

export function SentencePath({ lang, onLanguageChange, gender, setGender, slow, setSlow, onSaved, rm, onTalk }: Props) {
  const [plang, setPlang] = useState<PathLang>(lang);
  useEffect(() => {
    setPlang((cur) => (cur === "fr" ? cur : lang));
  }, [lang]);
  const pickLang = (l: PathLang) => {
    setPlang(l);
    if (l !== "fr") onLanguageChange(l);
  };

  const [step, setStep] = useState<Step>("who");
  const [who, setWho] = useState<Who>("i");
  const [name, setName] = useState("");
  const [nameG, setNameG] = useState<Gender>("m");
  const [verb, setVerb] = useState("play");
  const [object, setObject] = useState<string | null>("piano");
  const [when, setWhen] = useState<When>("present");
  const [timeWord, setTimeWord] = useState(true);
  const [negative, setNegative] = useState(false);
  const [question, setQuestion] = useState(false);
  const [view, setView] = useState<"order" | "all" | "venn">("order");
  const [showKey, setShowKey] = useState(false);
  const voice = useVoice(slow);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [cardVisible, setCardVisible] = useState(true);
  useEffect(() => {
    const el = cardRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setCardVisible(e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const choice: PathChoice = { who, name, nameG, verb, object, when, timeWord, negative, question, gender };
  const result = useMemo(() => buildPath(plang, choice), [plang, who, name, nameG, verb, object, when, timeWord, negative, question, gender]); // eslint-disable-line react-hooks/exhaustive-deps
  const ladder = useMemo(() => LADDER.map((w) => ({ w, r: buildPath(plang, { ...choice, when: w }) })), [plang, who, name, nameG, verb, object, timeWord, negative, question, gender]); // eslint-disable-line react-hooks/exhaustive-deps
  const people = useMemo(
    () => WHO_TILES.filter((t) => t.id !== "name").map((t) => ({ t, r: buildPath(plang, { ...choice, who: t.id, timeWord: false, question: false }) })),
    [plang, verb, object, when, negative, gender], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const everyLang = useMemo(() => PATH_LANGS.map((l) => ({ l, r: buildPath(l.id, choice) })), [who, name, nameG, verb, object, when, timeWord, negative, question, gender]); // eslint-disable-line react-hooks/exhaustive-deps

  // Example sentences to start from: tap one and it fills the path, then change
  // any stop yourself. Fresh ones on every roll of the dice.
  const [examples, setExamples] = useState<PathChoice[]>([]);
  const rollExamples = useCallback(() => setExamples(Array.from({ length: 4 }, () => randomChoice(gender))), [gender]);
  useEffect(() => {
    rollExamples();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const load = (c: PathChoice) => {
    setWho(c.who);
    setVerb(c.verb);
    setObject(c.object);
    setWhen(c.when);
    setTimeWord(c.timeWord);
    setNegative(c.negative);
    setQuestion(c.question);
    setStep("who");
  };
  const surprise = () => {
    load(randomChoice(gender));
    rollExamples();
  };

  const langInfo = PATH_LANGS.find((l) => l.id === plang)!;
  const objects = objectsFor(verb);
  const pickVerb = (id: string) => {
    setVerb(id);
    const list = objectsFor(id);
    const next = DEFAULT_OBJECT[id] ?? null;
    const obj = next && list.includes(next) ? next : list[0] ?? null;
    setObject(obj);
    if (!whenAllowed(id, when, obj)) setWhen("present");
    setStep(list.length ? "what" : "when");
  };
  const pickWho = (id: Who) => {
    setWho(id);
    if (id !== "name") setStep("action");
  };

  const res: PathResult | null = result;
  const musicVerbs = VERB_TILES.filter((v) => v.music);
  const otherVerbs = VERB_TILES.filter((v) => !v.music);
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

  return (
    <div>
      {/* ................................................. language + settings */}
      <div className="grid grid-cols-4 gap-1.5 sm:flex sm:flex-wrap sm:items-center sm:gap-2" role="group" aria-label="Language">
        {PATH_LANGS.map((l) => {
          const on = plang === l.id;
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => pickLang(l.id)}
              aria-pressed={on}
              className="inline-flex items-center justify-center gap-1 rounded-full px-1 py-2 text-[12.5px] font-semibold focus-visible:outline focus-visible:outline-2 sm:gap-1.5 sm:px-3.5 sm:text-[13px]"
              style={{ background: on ? C.sodium : C.base, color: on ? C.ink : C.muted, border: `1px solid ${on ? C.sodium : LINE}`, outlineColor: C.milk }}
            >
              <span aria-hidden="true">{l.flag}</span>
              {l.label}
            </button>
          );
        })}
        <span className="col-span-4 mt-1 flex justify-end gap-1.5 sm:col-auto sm:mt-0 sm:ml-auto">
          <Toggle on={gender === "f"} onClick={() => setGender(gender === "f" ? "m" : "f")}>
            {gender === "f" ? "🙋‍♀️ I'm a woman" : "🙋‍♂️ I'm a man"}
          </Toggle>
          <Toggle on={slow} onClick={() => setSlow(!slow)}>
            🐢 {slow ? "Slow voice" : "Slow"}
          </Toggle>
        </span>
      </div>

      {/* ................................................. start from an example */}
      <div className="mt-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10.5px] font-bold" style={{ color: C.mono, letterSpacing: 1.2 }}>START FROM ANY SENTENCE, THEN MAKE IT YOURS</span>
          <button
            type="button"
            onClick={surprise}
            className="inline-flex flex-none items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-bold focus-visible:outline focus-visible:outline-2"
            style={{ background: "rgba(245,194,255,0.14)", color: LILAC, border: "1px solid rgba(245,194,255,0.45)", outlineColor: LILAC }}
          >
            <span aria-hidden="true">🎲</span> Surprise me
          </button>
        </div>
        <div className="-mx-5 mt-2 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" style={{ scrollbarWidth: "none" }}>
          {examples.map((c, i) => {
            const r = buildPath("kn", c);
            if (!r) return null;
            const v = VERB_TILES.find((t) => t.id === c.verb);
            return (
              <button
                key={`${i}-${r.english}`}
                type="button"
                onClick={() => load(c)}
                className="flex flex-none items-center gap-2 rounded-full px-3.5 py-2 text-left text-[12.5px] focus-visible:outline focus-visible:outline-2"
                style={{ background: C.base, color: C.milk, border: `1px solid ${LINE}`, outlineColor: LILAC }}
              >
                <span aria-hidden="true">{v?.emoji}</span>
                {r.english}
              </button>
            );
          })}
        </div>
      </div>

      {/* ................................................. the path */}
      <div className="mt-4">
        <PathStrip step={step} setStep={setStep} choice={choice} lang={plang} rm={rm} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-start">
        {/* ................................................. the options for this stop */}
        <div className="rounded-[20px] p-4" style={{ background: C.tar, border: `1px solid ${LINE}` }}>
          {step === "who" && (
            <div>
              <div className="mb-3 text-[13px] font-semibold" style={{ color: C.milk }}>Who is doing it?</div>
              <div className="grid grid-cols-4 gap-2">
                {WHO_TILES.map((t) => (
                  <Tile key={t.id} tone="who" on={who === t.id} onClick={() => pickWho(t.id)} emoji={t.emoji} title={t.hint && t.id !== "name" ? `${t.en}, ${t.hint}` : t.en} sub={whoWord(t.id)} />
                ))}
              </div>
              {who === "name" && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && setStep("action")}
                    placeholder="Type a name: Ravi, Meera, Jason"
                    maxLength={24}
                    className="min-w-0 flex-1 rounded-full px-4 py-2.5 text-[14px] focus-visible:outline focus-visible:outline-2"
                    style={{ background: C.base, color: C.milk, border: `1px solid ${LINE}`, outlineColor: C.tube }}
                    aria-label="A name"
                  />
                  <Toggle on={nameG === "m"} onClick={() => setNameG("m")}>👨 he</Toggle>
                  <Toggle on={nameG === "f"} onClick={() => setNameG("f")}>👩 she</Toggle>
                  <button type="button" onClick={() => setStep("action")} className="rounded-full px-4 py-2 text-[12.5px] font-bold" style={{ background: C.tube, color: C.ink }}>
                    Next ›
                  </button>
                </div>
              )}
            </div>
          )}

          {step === "action" && (
            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-[13px] font-semibold" style={{ color: C.milk }}>What are they doing?</span>
                <span className="text-[11px]" style={{ color: C.sodium }}>music first</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {musicVerbs.map((v) => (
                  <Tile key={v.id} tone="action" on={verb === v.id} onClick={() => pickVerb(v.id)} emoji={v.emoji} title={v.en} sub={targetWord(v.id)} />
                ))}
              </div>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {otherVerbs.map((v) => (
                  <Tile key={v.id} tone="action" on={verb === v.id} onClick={() => pickVerb(v.id)} emoji={v.emoji} title={v.id === "do" ? "do" : v.en} sub={targetWord(v.id)} badge={v.trick ? "MAGIC" : undefined} />
                ))}
              </div>
            </div>
          )}

          {step === "what" && (
            <div>
              <div className="mb-3 text-[13px] font-semibold" style={{ color: C.milk }}>
                {objects.length ? (verb === "go" || verb === "come" ? "Where to?" : verb === "do" ? "Which English word? It works with the magic verb" : "What?") : "This action needs nothing after it."}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {objects.map((id) => {
                  const r = buildPath(plang, { ...choice, object: id, when: "present", negative: false, question: false, timeWord: false });
                  const sub = plang === "fr" ? "" : r?.parts.find((p) => p.role === "what")?.word;
                  return (
                    <Tile
                      key={id}
                      tone="what"
                      on={object === id}
                      onClick={() => {
                        setObject(id);
                        if (!whenAllowed(verb, when, id)) setWhen("present");
                        setStep("when");
                      }}
                      emoji={OBJECT_EMOJI[id] ?? "•"}
                      title={objectEnglish(id, plang).replace(/^(the|a|an|to the|to) /, "")}
                      sub={sub}
                    />
                  );
                })}
                <Tile tone="what" on={object === null} onClick={() => { setObject(null); setStep("when"); }} emoji="○" title="nothing" />
              </div>
            </div>
          )}

          {step === "when" && (
            <div>
              <div className="mb-3 text-[13px] font-semibold" style={{ color: C.milk }}>When?</div>
              <div className="grid grid-cols-3 gap-2">
                {WHEN_TILES.map((t) => {
                  const ok = whenAllowed(verb, t.id, object);
                  return <Tile key={t.id} tone="when" on={when === t.id} onClick={() => setWhen(t.id)} emoji={t.emoji} title={t.en} sub={ok ? t.blurb : "for skills only"} disabled={!ok} />;
                })}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Toggle on={negative} onClick={() => setNegative(!negative)}>✋ Not</Toggle>
                <Toggle on={question} onClick={() => setQuestion(!question)}>❓ Ask it</Toggle>
                {WHEN_TILES.find((t) => t.id === when)?.time && (
                  <Toggle on={timeWord} onClick={() => setTimeWord(!timeWord)}>🕰️ Say the time word</Toggle>
                )}
              </div>
            </div>
          )}
        </div>
        {/* ................................................. phone: the line stays in sight while you tap */}
        {res && !res.unsupported && !cardVisible && (
          <div className="sticky bottom-[92px] z-10 -mt-2 flex items-center gap-2 rounded-[16px] py-2 pl-4 pr-2 lg:hidden" style={{ background: "rgba(30,36,56,0.95)", border: "1px solid rgba(255,179,92,0.4)", backdropFilter: "blur(12px)", boxShadow: "0 12px 30px -12px rgba(0,0,0,0.7)" }}>
            <button type="button" onClick={() => cardRef.current?.scrollIntoView({ block: "center" })} className="flex min-w-0 flex-1 items-center gap-2.5 text-left" aria-label={`Your sentence: ${res.sentence}. Show details`}>
              <span className="rounded-full px-1.5 text-[10px] font-bold" style={{ background: C.sodium, color: C.ink }}>B</span>
              <span className="min-w-0 flex-1 truncate" style={{ fontFamily: MONO, fontSize: 15, fontWeight: 600, color: C.milk }}>{res.sentence}</span>
            </button>
            <PlayButton voice={voice} text={res.sentence} lang={plang} />
          </div>
        )}
        {/* ................................................. the sentence (point B) */}
        <div ref={cardRef} className="lg:sticky lg:top-4">
          <div
            className="rounded-[22px] p-5"
            style={{ background: "linear-gradient(150deg,rgba(255,179,92,0.15),rgba(232,80,58,0.05) 55%,rgba(191,239,219,0.06))", border: "1px solid rgba(255,179,92,0.34)" }}
            aria-live="polite"
          >
            <div className="flex items-center gap-2 text-[10.5px] font-bold" style={{ color: C.mono, letterSpacing: 1.2 }}>
              <span className="rounded-full px-1.5" style={{ background: "rgba(242,237,226,0.1)", color: C.milk }}>A</span>
              YOUR IDEA
            </div>
            <div className="mt-1.5 text-[17px] font-semibold leading-snug">
              {res && <EnglishWords parts={res.enParts} question={question} />}
            </div>

            <div className="my-3.5 flex items-center gap-2" aria-hidden="true">
              <span className="h-px flex-1" style={{ background: "linear-gradient(90deg,rgba(191,239,219,0.4),rgba(255,179,92,0.5))" }} />
              <span className="text-[13px]">{langInfo.flag}</span>
              <span className="h-px flex-1" style={{ background: "linear-gradient(90deg,rgba(255,179,92,0.5),rgba(245,194,255,0.4))" }} />
            </div>

            <div className="flex items-center gap-2 text-[10.5px] font-bold" style={{ color: C.sodium, letterSpacing: 1.2 }}>
              <span className="rounded-full px-1.5" style={{ background: C.sodium, color: C.ink }}>B</span>
              SAY IT IN {langInfo.label.toUpperCase()}
            </div>
            {res?.unsupported ? (
              <p className="mt-2 text-[14px] leading-relaxed" style={{ color: C.muted }}>
                {res.unsupported}
              </p>
            ) : res ? (
              <div key={res.sentence} style={{ animation: rm ? undefined : "mtFade 280ms ease both" }}>
                <div className="mt-2">
                  <Words parts={res.parts} size={24} />
                  {question && <span style={{ fontFamily: MONO, fontSize: 24, color: C.muted }}>{plang === "fr" ? " ?" : "?"}</span>}
                </div>
                <div className="mt-2.5 rounded-[12px] px-3 py-2" style={{ background: "rgba(10,13,22,0.45)", border: `1px solid ${LINE_SOFT}` }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold" style={{ color: C.faint, letterSpacing: 1.1 }}>
                      {plang === "fr" ? "SOUNDS LIKE" : "SAY IT IN BEATS"}
                    </span>
                    <button type="button" onClick={() => setShowKey(!showKey)} className="text-[11px] font-semibold" style={{ color: C.faint }} aria-expanded={showKey}>
                      {showKey ? "hide the key" : "how to read this"}
                    </button>
                  </div>
                  <div className="mt-1 text-[15px] leading-relaxed" style={{ color: C.milk, fontFamily: MONO, wordSpacing: 4 }}>
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
                <div className="mt-3.5 flex flex-wrap items-center gap-2">
                  <PlayButton voice={voice} text={res.sentence} lang={plang} big />
                  {plang !== "fr" && <SaveButton lang={plang} en={res.english} target={res.sentence} onChange={onSaved} />}
                </div>
                {onTalk && (
                  <button
                    type="button"
                    onClick={() => onTalk({ target: res.sentence, en: res.english }, plang === "fr")}
                    className="mt-3 flex w-full items-center gap-3 rounded-[14px] px-4 py-3 text-left focus-visible:outline focus-visible:outline-2"
                    style={{ background: "rgba(191,239,219,0.10)", border: "1px solid rgba(191,239,219,0.38)", outlineColor: C.tube }}
                  >
                    <span className="text-[20px]" aria-hidden="true">🗣️</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-bold" style={{ color: C.milk }}>Say it out loud with {plang === "fr" ? "Camille" : HOST[plang].name}</span>
                      <span className="block text-[12px]" style={{ color: C.muted }}>A live call: she drills this line, then flips it to did, doing and will do.</span>
                    </span>
                    <span className="text-[20px]" style={{ color: C.tube }} aria-hidden="true">›</span>
                  </button>
                )}
                {voice.error && (
                  <div className="mt-2 text-[12px]" style={{ color: "#FFB3A6" }} role="alert">
                    {voice.error}
                  </div>
                )}
                {res.note && (
                  <p className="mt-3 text-[12.5px] leading-relaxed" style={{ color: "rgba(255,179,92,0.92)" }}>
                    {res.note}
                  </p>
                )}
              </div>
            ) : null}
          </div>
        </div>

      </div>

      {/* ................................................. change one thing */}
      <div className="mt-6">
        <div className="text-[11px] font-bold" style={{ color: C.sodium, letterSpacing: 1.3 }}>CHANGE ONE THING</div>
        <h3 className="mt-1" style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: 22, lineHeight: 1.1, color: C.milk }}>
          Did, doing, do, will do
        </h3>
        <p className="mt-1 text-[12.5px]" style={{ color: C.muted }}>
          Same sentence, four times. Tap one to make it yours; the lit part is all that moves.
        </p>
        <div className="-mx-5 mt-3 flex snap-x gap-2.5 overflow-x-auto px-5 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 lg:grid-cols-4" style={{ scrollbarWidth: "none" }}>
          {ladder.map(({ w, r }) => {
            const t = WHEN_TILES.find((x) => x.id === w)!;
            const on = when === w;
            if (!r || r.unsupported) return null;
            return (
              <div
                key={w}
                className="w-[250px] flex-none snap-start rounded-[16px] p-3.5 sm:w-auto"
                style={{ background: on ? "rgba(159,211,255,0.10)" : C.tar, border: `1px solid ${on ? "rgba(159,211,255,0.5)" : LINE}` }}
              >
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

        <div className="mt-4 rounded-[16px] p-3.5" style={{ background: C.tar, border: `1px solid ${LINE}` }}>
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
        </div>
      </div>

      {/* ................................................. how it's built */}
      <div className="mt-6 rounded-[20px] p-4 sm:p-5" style={{ background: C.tar, border: `1px solid ${LINE}` }}>
        <div className="text-[11px] font-bold" style={{ color: LILAC, letterSpacing: 1.3 }}>SEE HOW IT&apos;S BUILT</div>
        <div className="mt-2.5 flex flex-wrap gap-2" role="tablist" aria-label="How it is built">
          {([
            { id: "order", label: "🔀 Word order" },
            { id: "all", label: "🌏 All four languages" },
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
                  <span className="w-[74px] flex-none text-[12px] font-semibold" style={{ color: C.muted }}>
                    <span aria-hidden="true">{l.flag}</span> {l.label}
                  </span>
                  <span className="min-w-0 flex-1">{r?.unsupported ? <span className="text-[12px]" style={{ color: C.faint }}>no shortcut in French</span> : r && <Words parts={r.parts} size={15} />}</span>
                  {r && !r.unsupported && <PlayButton voice={voice} text={r.sentence} lang={l.id} />}
                </div>
              ))}
              <p className="mt-1 text-[12.5px]" style={{ color: C.muted }}>
                Same colours, same jobs. Kannada, Hindi and Tamil park the action at the end; French keeps it in the middle like English.
              </p>
            </div>
          )}
          {view === "venn" && <Venn />}
        </div>
      </div>
    </div>
  );
}
