"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ArrowRight, Bookmark, Check, ChevronRight, CircleHelp, Clock3, GitBranch, Mic, Shuffle, Sparkles, UserRound, Volume2, WandSparkles } from "lucide-react";
import { person, verbById } from "@/lib/grammar";
import { LANGUAGES } from "@/lib/languages";
import { toggleSaved, isSaved } from "@/lib/review";
import { buildPath, ADJECTIVES, adjectiveAllowed, WHEN_TILES, WHO_TILES, VERB_TILES, objectsFor, objectEnglish, randomChoice, whenAllowed, HOW_TO_SAY, type PathChoice, type Role, type Who, type When } from "@/lib/sentence-path";
import type { Lang } from "@/lib/maatu-design";
import type { PracticeLine } from "./useMaatuCall";
import { useSpeech } from "./studio-ui";

type Step = "who" | "action" | "what" | "describe" | "when";
const STEPS: { id: Step; label: string; prompt: string; icon: typeof UserRound }[] = [
  { id: "who", label: "Who", prompt: "Who are we talking about?", icon: UserRound },
  { id: "action", label: "Does", prompt: "Pick something to do.", icon: WandSparkles },
  { id: "what", label: "What", prompt: "Give your action a little context.", icon: GitBranch },
  { id: "describe", label: "Describe", prompt: "Add a little detail.", icon: Sparkles },
  { id: "when", label: "When", prompt: "Make it happen in a different time.", icon: Clock3 },
];
const FR_WHO: Record<Who, string> = { i: "je", you: "tu", youp: "vous", he: "il", she: "elle", we: "on", they: "ils", name: "a name" };
const DEFAULT: PathChoice = { who: "i", name: "Ravi", nameG: "m", verb: "drink", object: "coffee", when: "present", timeWord: true, negative: false, question: false, gender: "m", adjective: "none" };

export default function SentencePath({ lang, onTalk }: { lang: Lang; onTalk: (line: PracticeLine, french?: boolean) => void; rm?: boolean }) {
  const [choice, setChoice] = useState<PathChoice>(DEFAULT);
  const [step, setStep] = useState<Step>("who");
  const [search, setSearch] = useState("");
  const [slow, setSlow] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const stepButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const voice = useSpeech(lang);
  const result = useMemo(() => buildPath(lang, choice), [lang, choice]);
  const l = LANGUAGES[lang];
  useEffect(() => { setSaved(result?.sentence ? isSaved(lang, result.sentence) : false); voice.stop(); }, [lang, result?.sentence, voice.stop]);
  function change(patch: Partial<PathChoice>) {
    setChoice((current) => {
      const next = { ...current, ...patch };
      if (patch.verb) { const list = objectsFor(next.verb); if (!next.object || !list.includes(next.object)) next.object = list[0] ?? null; }
      if (!whenAllowed(next.verb, next.when, next.object)) next.when = "present";
      if (!adjectiveAllowed(next.adjective ?? "none", next.object)) next.adjective = "none";
      return next;
    });
  }
  const whoText = choice.who === "name" ? choice.name || "Ravi" : WHO_TILES.find((w) => w.id === choice.who)?.en ?? "I";
  const values: Record<Step, string> = { who: whoText, action: VERB_TILES.find((v) => v.id === choice.verb)?.short ?? VERB_TILES.find((v) => v.id === choice.verb)?.en ?? "drink", what: choice.object ? objectEnglish(choice.object, lang).replace(/^(the|a|an) /, "") : "No object", describe: choice.adjective === "none" ? "Optional" : choice.adjective || "Optional", when: WHEN_TILES.find((w) => w.id === choice.when)?.en ?? "Every day" };
  const nextStep = () => setStep(STEPS[(STEPS.findIndex((s) => s.id === step) + 1) % STEPS.length].id);
  function navigateStep(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const target = e.key === "Home" ? 0 : e.key === "End" ? STEPS.length - 1 : ["ArrowRight", "ArrowDown"].includes(e.key) ? (index + 1) % STEPS.length : ["ArrowLeft", "ArrowUp"].includes(e.key) ? (index - 1 + STEPS.length) % STEPS.length : null;
    if (target === null) return;
    e.preventDefault(); setStep(STEPS[target].id); setSearch(""); stepButtons.current[target]?.focus();
  }
  const valid = !!result?.sentence && !result.unsupported;
  return <>
    <header className="page-heading lab-heading"><div><h1>One sentence.<br/><em>So many possibilities.</em></h1><p>Pick your pieces. Change one thing. Hear how the language moves.</p></div><button type="button" className="button button-outline" onClick={() => { const next = randomChoice(choice.gender); next.adjective = "none"; setChoice(next); }}><Shuffle size={17}/> Surprise me</button></header>
    <div className="sentence-flow" role="tablist" aria-label="Sentence-building steps">
      {STEPS.map((s, i) => <div className="flow-stop-wrap" key={s.id}><button type="button" role="tab" ref={(node) => { stepButtons.current[i] = node; }} tabIndex={step === s.id ? 0 : -1} onKeyDown={(e) => navigateStep(e, i)} id={`step-${s.id}`} aria-controls="piece-panel" aria-selected={step === s.id} className={`flow-stop role-${s.id} ${step === s.id ? "selected" : ""}`} onClick={() => { setStep(s.id); setSearch(""); }}><span className="flow-label"><s.icon size={16}/>{i + 1}. {s.label}</span><strong>{values[s.id]}</strong></button>{i < STEPS.length - 1 && <ChevronRight className="flow-connector" size={18}/>}</div>)}
    </div>
    <div className="lab-workspace">
      <section className="piece-picker" id="piece-panel" role="tabpanel" aria-labelledby={`step-${step}`}><div className="picker-heading"><h2>{STEPS.find((s) => s.id === step)?.prompt}</h2><span>{STEPS.findIndex((s) => s.id === step) + 1} of 5</span></div>
        {step === "who" && <><div className="piece-grid">{WHO_TILES.map((w) => <button type="button" className={`piece-choice role-who ${choice.who === w.id ? "chosen" : ""}`} key={w.id} aria-pressed={choice.who === w.id} onClick={() => change({ who: w.id })}><strong>{w.en}</strong><small>{w.id === "name" ? "Ravi, Meera, anyone" : `${lang === "fr" ? FR_WHO[w.id] : person(lang, w.id).sub}${w.hint ? ` · ${w.hint}` : ""}`}</small></button>)}</div>{choice.who === "name" && <div className="name-fields"><label>A real name<input value={choice.name ?? ""} onChange={(e) => change({ name: e.target.value })} maxLength={24} placeholder="Ravi or Meera"/></label><label>For this person<select value={choice.nameG ?? "m"} onChange={(e) => change({ nameG: e.target.value as "m" | "f" })}><option value="m">He</option><option value="f">She</option></select></label></div>}<p className="picker-note">A friend and someone you address politely use different forms. Try both.</p></>}
        {step === "action" && <><label className="search-field"><span className="sr-only">Find an action</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find an action…"/></label><div className="piece-grid action-grid">{VERB_TILES.filter((v) => v.en.toLowerCase().includes(search.toLowerCase())).map((v) => <button type="button" key={v.id} className={`piece-choice role-action ${choice.verb === v.id ? "chosen" : ""}`} aria-pressed={choice.verb === v.id} onClick={() => change({ verb: v.id })}><strong>{v.en.replace(" (the magic verb)", "")}</strong><small>{lang === "fr" ? "Everyday French" : verbById(v.id)?.[lang].dict}</small></button>)}</div>{!VERB_TILES.some((v) => v.en.toLowerCase().includes(search.toLowerCase())) && <p>No matching action. Try “eat”, “go”, or “play”.</p>}</>}
        {step === "what" && <><div className="piece-grid">{objectsFor(choice.verb).map((id) => <button type="button" key={id} className={`piece-choice role-what ${choice.object === id ? "chosen" : ""}`} aria-pressed={choice.object === id} onClick={() => change({ object: id })}><strong>{objectEnglish(id, lang).replace(/^(the|a|an) /, "")}</strong></button>)}<button type="button" className={`piece-choice role-what ${!choice.object ? "chosen" : ""}`} aria-pressed={!choice.object} onClick={() => change({ object: null })}><strong>{objectsFor(choice.verb).length ? "Just the action" : "No object needed"}</strong><small>Keep it simple</small></button></div><p className="picker-note">These nouns fit the action you picked. Different verbs need different kinds of things.</p></>}
        {step === "describe" && <><div className="piece-grid">{ADJECTIVES.map((a) => <button type="button" key={a.id} className={`piece-choice role-describe ${(choice.adjective ?? "none") === a.id ? "chosen" : ""}`} aria-pressed={(choice.adjective ?? "none") === a.id} disabled={!adjectiveAllowed(a.id, choice.object)} onClick={() => change({ adjective: a.id })}><strong>{a.en}</strong><small>{a.id === "none" ? "Optional step" : adjectiveAllowed(a.id, choice.object) ? "Fits this noun" : "Choose a matching noun"}</small></button>)}</div><p className="picker-note">{lang === "fr" ? "Some French adjectives come after the noun. Gender changes the form too." : lang === "hi" ? "The adjective matches the noun. Try chai and coffee to watch the endings." : "The adjective sits before the noun. Listen to the phrase as one whole thought."}</p></>}
        {step === "when" && <><div className="piece-grid">{WHEN_TILES.map((w) => <button type="button" key={w.id} className={`piece-choice role-when ${choice.when === w.id ? "chosen" : ""}`} aria-pressed={choice.when === w.id} disabled={!whenAllowed(choice.verb, w.id, choice.object)} onClick={() => change({ when: w.id })}><strong>{w.en}</strong><small>{w.blurb}</small></button>)}</div><label className="check-line"><input type="checkbox" checked={choice.timeWord} onChange={(e) => change({ timeWord: e.target.checked })}/> Include a time word</label><p className="picker-note">The same pieces can tell a different story. Flip between yesterday, today, and tomorrow.</p></>}
        <button type="button" className="text-button next-piece" onClick={nextStep}>Next piece<ArrowRight size={17}/></button>
      </section>
      <section className="sentence-result" aria-live="polite"><div className="result-heading"><span className="status-dot"/><strong>Your sentence in {l.name}</strong><span>{l.city}, spoken naturally</span></div>
        {valid ? <><p className="result-english">{result.english}</p><div className="result-words" lang={l.code}>{result.parts.map((p, i) => <span key={i} className={`word role-${p.role}`}><strong>{p.word}</strong><small>{({ who: "who", action: "action", what: "what", describe: "detail", when: "when", helper: "helper" } as Record<Role, string>)[p.role]}</small></span>)}</div><p className="pronunciation-guide">{result.say}</p><div className="result-actions"><button type="button" className="button button-primary" disabled={voice.state === "loading"} onClick={() => voice.state === "playing" ? voice.stop() : void voice.speak(result.sentence, slow)}><Volume2 size={18}/>{voice.state === "loading" ? "Preparing voice…" : voice.state === "playing" ? "Stop audio" : "Hear it"}</button><button type="button" className={`icon-button save-button ${saved ? "saved" : ""}`} aria-label={saved ? "Unsave sentence" : "Save sentence"} onClick={() => setSaved(toggleSaved(lang, result.english, result.sentence))}>{saved ? <Check size={19}/> : <Bookmark size={19}/>}</button><label className="check-line"><input type="checkbox" checked={slow} onChange={(e) => setSlow(e.target.checked)}/> Slower</label></div>{voice.error && <p className="error-note" role="alert">{voice.error}</p>}<p className="result-note">{result.note || (lang === "fr" ? "French keeps the action near the start. Read it, then listen for the rhythm." : "The action comes at the end. The ending tells you who is doing it.")}</p><button type="button" className="button button-outline practice-button" onClick={() => onTalk({ target: result.sentence, en: result.english }, lang === "fr")}><Mic size={17}/> Say it with {l.teacher}<ArrowRight size={17}/></button></> : <p className="error-note">{result?.unsupported || "Try another action or noun to build a sentence."}</p>}
      </section>
    </div>
    <div className="lab-toggles"><div role="group" aria-label="Sentence variations"><button type="button" aria-pressed={choice.negative} className={`variation ${choice.negative ? "on" : ""}`} onClick={() => change({ negative: !choice.negative })}>Make it negative</button><button type="button" aria-pressed={choice.question} className={`variation ${choice.question ? "on" : ""}`} onClick={() => change({ question: !choice.question })}>Ask a question</button></div>{choice.who === "i" && <label className="gender-label">For “I”, my agreement<select value={choice.gender} onChange={(e) => change({ gender: e.target.value as "m" | "f" })}><option value="m">Masculine</option><option value="f">Feminine</option></select></label>}</div>
    <section className="flip-strip"><div><h3>Change the time. Keep your words.</h3><p>Tap a line to bring it into your sentence.</p></div><div className="tense-ladder">{(["past", "cont", "present", "future"] as When[]).map((when) => { const line = buildPath(lang, { ...choice, when, timeWord: true }); return <button type="button" className={choice.when === when ? "active" : ""} aria-pressed={choice.when === when} key={when} onClick={() => change({ when, timeWord: true })}><span>{WHEN_TILES.find((w) => w.id === when)?.en}</span><strong lang={l.code}>{line?.sentence || "Try a different combination"}</strong></button>; })}</div></section>
    <button type="button" className="text-button pronunciation-help" aria-expanded={showTip} onClick={() => setShowTip(!showTip)}><CircleHelp size={17}/> A little help with the sounds</button>{showTip && <div className="sounds-help">{HOW_TO_SAY[lang].map((t) => <p key={t.k}><strong>{t.k}</strong><span>{t.v}</span></p>)}</div>}
  </>;
}
