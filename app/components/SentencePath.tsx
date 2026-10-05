"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Bookmark, Check, CircleHelp, GitBranch, Mic, Shuffle, Sparkles, Volume2 } from "lucide-react";
import { person, verbById } from "@/lib/grammar";
import { LANGUAGES } from "@/lib/languages";
import { toggleSaved, isSaved } from "@/lib/review";
import { buildPath, ADJECTIVES, adjectiveAllowed, WHEN_TILES, WHO_TILES, VERB_TILES, objectsFor, objectEnglish, randomChoice, whenAllowed, HOW_TO_SAY, type PathChoice, type Role, type Who, type When } from "@/lib/sentence-path";
import type { Lang } from "@/lib/maatu-design";
import type { PracticeLine } from "./useMaatuCall";
import { useSpeech } from "./studio-ui";
import SentenceBoard from "./SentenceBoard";
import { checkMission, fitChoices, MISSIONS, STARTER, WORD_ROLES, type WordStep } from "@/lib/sentence-game";

type Step = WordStep;
const STEPS: { id: Step; prompt: string }[] = [
  { id: "who", prompt: "Who are we talking about?" },
  { id: "action", prompt: "Pick something to do." },
  { id: "what", prompt: "Give your action a little context." },
  { id: "describe", prompt: "Add a little detail." },
  { id: "when", prompt: "Make it happen in a different time." },
];
const FR_WHO: Record<Who, string> = { i: "je", you: "tu", youp: "vous", he: "il", she: "elle", we: "on", they: "ils", name: "a name" };
const DEFAULT = STARTER;

export default function SentencePath({ lang, onTalk, rm = false }: { lang: Lang; onTalk: (line: PracticeLine, french?: boolean) => void; rm?: boolean }) {
  const [choice, setChoice] = useState<PathChoice>(DEFAULT);
  const [step, setStep] = useState<Step>("who");
  const [search, setSearch] = useState("");
  const [slow, setSlow] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [game, setGame] = useState(true);
  const [missionIndex, setMissionIndex] = useState(0);
  const [progress, setProgress] = useState<Record<string, string[]>>({});
  const [notice, setNotice] = useState("");
  const [feedback, setFeedback] = useState<{ correct: boolean; hint: string } | null>(null);
  const voice = useSpeech(lang);
  const result = useMemo(() => buildPath(lang, choice), [lang, choice]);
  const l = LANGUAGES[lang];
  useEffect(() => { setSaved(result?.sentence ? isSaved(lang, result.sentence) : false); voice.stop(); }, [lang, result?.sentence, voice.stop]);
  useEffect(() => { setFeedback(null); }, [lang]);
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("maatu-sentence-game-v1") || "{}");
      const clean: Record<string, string[]> = {};
      for (const code of ["ta", "kn", "hi", "fr"]) clean[code] = Array.isArray(stored[code]) ? [...new Set<string>(stored[code].filter((id: unknown) => typeof id === "string" && MISSIONS.some((m) => m.id === id)))] : [];
      setProgress(clean);
    } catch { /* A build still works when device storage is unavailable. */ }
  }, []);
  useEffect(() => {
    if (!result?.sentence || result.unsupported || document.visibilityState === "hidden") return;
    const timer = setTimeout(() => void voice.prepare(result.sentence, slow), 1000);
    return () => clearTimeout(timer);
  }, [lang, result?.sentence, result?.unsupported, slow, voice.prepare]);
  function change(patch: Partial<PathChoice>) {
    const next = fitChoices(choice, patch);
    setChoice(next.choice); setNotice(next.notice); setFeedback(null);
  }
  const whoText = choice.who === "name" ? choice.name || "Ravi" : WHO_TILES.find((w) => w.id === choice.who)?.en ?? "I";
  const values: Record<Step, string> = { who: whoText, action: VERB_TILES.find((v) => v.id === choice.verb)?.short ?? VERB_TILES.find((v) => v.id === choice.verb)?.en ?? "drink", what: choice.object ? objectEnglish(choice.object, lang).replace(/^(the|a|an) /, "") : "No object", describe: choice.adjective === "none" ? "Optional" : choice.adjective || "Optional", when: WHEN_TILES.find((w) => w.id === choice.when)?.en ?? "Every day" };
  const nextStep = () => setStep(STEPS[(STEPS.findIndex((s) => s.id === step) + 1) % STEPS.length].id);
  const selectStep = (next: Step) => { setStep(next); setSearch(""); };
  const previews = Object.fromEntries(STEPS.map((s) => [s.id, result?.parts.filter((p) => p.role === s.id).map((p) => p.word).join(" ") || ""])) as Record<Step, string>;
  const mission = MISSIONS[missionIndex];
  const built = progress[lang] ?? [];
  function verify() {
    if (!valid) { setFeedback({ correct: false, hint: "Choose a supported verb and noun first." }); return; }
    const answer = checkMission(choice, mission.target);
    setFeedback(answer);
    if (answer.step) selectStep(answer.step);
    if (answer.correct) {
      const next = { ...progress, [lang]: [...new Set([...built, mission.id])] };
      setProgress(next);
      try { localStorage.setItem("maatu-sentence-game-v1", JSON.stringify(next)); } catch { /* Optional device storage. */ }
    }
  }
  const valid = !!result?.sentence && !result.unsupported;
  return <div className="word-game" data-motion={rm ? "reduce" : "full"}>
    <header className="page-heading game-heading"><div><h1>Make the words <em>click.</em></h1><p>Build it. Change it. Hear it. A little grammar, a whole new story.</p></div><div className="game-speaker"><button type="button" className="button button-primary" disabled={!valid || voice.state === "loading"} onClick={() => voice.state === "playing" ? voice.stop() : result && void voice.speak(result.sentence, slow)}><Volume2 size={20}/>{voice.state === "loading" ? "Getting audio…" : voice.state === "playing" ? "Stop audio" : "Hear it"}</button><small>{valid && voice.isReady(result!.sentence, slow) ? "Audio is ready" : "Hear your current sentence"}</small></div></header>
    <div className="game-toolbar"><div className="game-switch" role="group" aria-label="Sentence lab activity"><button type="button" aria-pressed={!game} className={!game ? "active" : ""} onClick={() => { setGame(false); setFeedback(null); }}><GitBranch size={16}/> Free build</button><button type="button" aria-pressed={game} className={game ? "active" : ""} onClick={() => { setGame(true); setFeedback(null); }}><Sparkles size={16}/> Play a challenge</button></div><button type="button" className="text-button" onClick={() => { setChoice(randomChoice(choice.gender)); setFeedback(null); setNotice("A new sentence to play with. Change one piece and hear the difference."); }}><Shuffle size={16}/> Shuffle words</button></div>
    {game && <section className={`sentence-mission ${feedback?.correct ? "complete" : ""}`} aria-label="Sentence challenge"><div className="mission-copy"><h2>{mission.goal}</h2><p>{mission.title}. Build this meaning in {l.name}.</p></div><div className="mission-controls"><span className="build-count">{built.length} of {MISSIONS.length} built</span><div className="mission-dots" role="group" aria-label="Choose a challenge">{MISSIONS.map((m,i) => <button type="button" key={m.id} aria-label={`Challenge ${i+1}: ${m.title}${built.includes(m.id) ? ", completed" : ""}`} aria-pressed={i === missionIndex} className={`${i === missionIndex ? "current" : ""} ${built.includes(m.id) ? "built" : ""}`} onClick={() => { setMissionIndex(i); setFeedback(null); }}>{built.includes(m.id) ? <Check size={15}/> : i+1}</button>)}</div><button type="button" className="button button-primary check-build" onClick={verify}><Check size={16}/> Check build</button></div>{feedback && <div className={`mission-feedback ${feedback.correct ? "success" : ""}`} role="status">{feedback.correct ? <Check size={17}/> : <CircleHelp size={17}/>}<span>{feedback.hint}</span>{feedback.correct && <button type="button" className="text-button" onClick={() => { setMissionIndex((missionIndex+1)%MISSIONS.length); setFeedback(null); }}>Next challenge<ArrowRight size={15}/></button>}</div>}</section>}
    <SentenceBoard step={step} values={values} previews={previews} named={choice.who === "name"} hasObject={!!choice.object} onSelect={selectStep}/>
    {notice && <p className="fit-notice" role="status"><Sparkles size={16}/>{notice}</p>}
    <div className="lab-workspace">
      <section className="piece-picker" id="piece-panel" role="tabpanel" aria-labelledby={`step-${step}`}><div className="picker-heading"><div><h2>{step === "who" && choice.who === "name" ? "Proper noun" : WORD_ROLES[step].title} bank</h2><p className="bank-question">{STEPS.find((s) => s.id === step)?.prompt}</p></div><span>{STEPS.findIndex((s) => s.id === step) + 1} of 5</span></div><p className="type-lesson">{WORD_ROLES[step].lesson}</p>
        {step === "who" && <><div className="piece-grid">{WHO_TILES.map((w) => <button type="button" className={`piece-choice role-who ${choice.who === w.id ? "chosen" : ""}`} key={w.id} aria-pressed={choice.who === w.id} onClick={() => change({ who: w.id })}><strong>{w.id === "name" ? "Proper noun" : w.en}</strong><small>{w.id === "name" ? "Ravi, Meera, anyone" : `${lang === "fr" ? FR_WHO[w.id] : person(lang, w.id).sub}${w.hint ? ` · ${w.hint}` : ""}`}</small></button>)}</div>{choice.who === "name" && <div className="name-fields"><label>A real name<input value={choice.name ?? ""} onChange={(e) => change({ name: e.target.value })} maxLength={24} placeholder="Ravi or Meera"/></label><label>For this person<select value={choice.nameG ?? "m"} onChange={(e) => change({ nameG: e.target.value as "m" | "f" })}><option value="m">He</option><option value="f">She</option></select></label></div>}<p className="picker-note">A friend and someone you address politely use different forms. Try both.</p></>}
        {step === "action" && <><label className="search-field"><span className="sr-only">Find an action</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find an action…"/></label><div className="piece-grid action-grid">{VERB_TILES.filter((v) => v.en.toLowerCase().includes(search.toLowerCase())).map((v) => <button type="button" key={v.id} className={`piece-choice role-action ${choice.verb === v.id ? "chosen" : ""}`} aria-pressed={choice.verb === v.id} onClick={() => change({ verb: v.id })}><strong>{v.en.replace(" (the magic verb)", "")}</strong><small>{lang === "fr" ? "Everyday French" : verbById(v.id)?.[lang].dict}</small></button>)}</div>{!VERB_TILES.some((v) => v.en.toLowerCase().includes(search.toLowerCase())) && <p>No matching action. Try “eat”, “go”, or “play”.</p>}</>}
        {step === "what" && <><div className="piece-grid">{objectsFor(choice.verb).map((id) => <button type="button" key={id} className={`piece-choice role-what ${choice.object === id ? "chosen" : ""}`} aria-pressed={choice.object === id} onClick={() => change({ object: id })}><strong>{objectEnglish(id, lang).replace(/^(the|a|an) /, "")}</strong></button>)}<button type="button" className={`piece-choice role-what ${!choice.object ? "chosen" : ""}`} aria-pressed={!choice.object} onClick={() => change({ object: null })}><strong>{objectsFor(choice.verb).length ? "Just the action" : "No object needed"}</strong><small>Keep it simple</small></button></div><p className="picker-note">These nouns fit the action you picked. Different verbs need different kinds of things.</p></>}
        {step === "describe" && <><div className="piece-grid">{ADJECTIVES.map((a) => <button type="button" key={a.id} className={`piece-choice role-describe ${(choice.adjective ?? "none") === a.id ? "chosen" : ""}`} aria-pressed={(choice.adjective ?? "none") === a.id} disabled={!adjectiveAllowed(a.id, choice.object)} onClick={() => change({ adjective: a.id })}><strong>{a.en}</strong><small>{a.id === "none" ? "Optional step" : adjectiveAllowed(a.id, choice.object) ? "Fits this noun" : "Choose a matching noun"}</small></button>)}</div><p className="picker-note">{lang === "fr" ? "Some French adjectives come after the noun. Gender changes the form too." : lang === "hi" ? "The adjective matches the noun. Try chai and coffee to watch the endings." : "The adjective sits before the noun. Listen to the phrase as one whole thought."}</p></>}
        {step === "when" && <><div className="piece-grid">{WHEN_TILES.map((w) => <button type="button" key={w.id} className={`piece-choice role-when ${choice.when === w.id ? "chosen" : ""}`} aria-pressed={choice.when === w.id} disabled={!whenAllowed(choice.verb, w.id, choice.object)} onClick={() => change({ when: w.id })}><strong>{w.en}</strong><small>{w.blurb}</small></button>)}</div><label className="check-line"><input type="checkbox" checked={choice.timeWord} onChange={(e) => change({ timeWord: e.target.checked })}/> Include a time word</label><p className="picker-note">The same pieces can tell a different story. Flip between yesterday, today, and tomorrow.</p></>}
        <button type="button" className="text-button next-piece" onClick={nextStep}>Next piece<ArrowRight size={17}/></button>
      </section>
      <section className="sentence-result" aria-live="polite"><div className="result-heading"><span className="status-dot"/><strong>{l.name} word order</strong><span>{l.city}, spoken naturally</span></div>
        {valid ? <><p className="result-english">{result.english}</p><div className="result-words" lang={l.code}>{result.parts.map((p, i) => <button type="button" key={i} className={`word role-${p.role}`} onClick={() => selectStep(p.role === "helper" ? "action" : p.role)} title={p.role === "helper" ? "A helper connects the other words" : WORD_ROLES[p.role].lesson}><strong>{p.stem && p.word.startsWith(p.stem) ? <>{p.stem}<em className="verb-ending">{p.word.slice(p.stem.length)}</em></> : p.word}</strong><small>{p.role === "who" ? choice.who === "name" ? "proper noun" : "pronoun" : p.role === "action" ? "verb" : p.role === "what" ? "noun" : p.role === "describe" ? "adjective" : p.role === "when" ? "time" : "helper"}</small></button>)}</div><div className="word-order-key"><ArrowRight size={14}/><span>{lang === "fr" ? "The verb follows the person. Some adjectives follow their noun." : lang === "hi" ? "The verb comes near the end. Some past endings match the noun’s gender." : "The verb comes near the end. Its ending follows the doer and the time."}</span></div><p className="pronunciation-guide">{result.say}</p><div className="result-actions"><button type="button" className="button button-primary" disabled={voice.state === "loading"} onClick={() => voice.state === "playing" ? voice.stop() : void voice.speak(result.sentence, slow)}><Volume2 size={18}/>{voice.state === "loading" ? "Preparing voice…" : voice.state === "playing" ? "Stop audio" : "Hear it"}</button><button type="button" className={`icon-button save-button ${saved ? "saved" : ""}`} aria-label={saved ? "Unsave sentence" : "Save sentence"} onClick={() => setSaved(toggleSaved(lang, result.english, result.sentence))}>{saved ? <Check size={19}/> : <Bookmark size={19}/>}</button><label className="check-line"><input type="checkbox" checked={slow} onChange={(e) => setSlow(e.target.checked)}/> Slower</label></div>{voice.error && <p className="error-note" role="alert">{voice.error}</p>}<p className="result-note">{result.note || (lang === "fr" ? "French keeps the action near the start. Read it, then listen for the rhythm." : lang === "hi" ? "Try different nouns with the same past action to hear the agreement." : "The action comes at the end. The ending tells you who is doing it.")}</p><button type="button" className="button button-outline practice-button" onClick={() => onTalk({ target: result.sentence, en: result.english }, lang === "fr")}><Mic size={17}/> Say it with {l.teacher}<ArrowRight size={17}/></button></> : <p className="error-note">{result?.unsupported || "Try another action or noun to build a sentence."}</p>}
      </section>
    </div>
    <div className="lab-toggles"><div role="group" aria-label="Sentence variations"><button type="button" aria-pressed={choice.negative} className={`variation ${choice.negative ? "on" : ""}`} onClick={() => change({ negative: !choice.negative })}>Make it negative</button><button type="button" aria-pressed={choice.question} className={`variation ${choice.question ? "on" : ""}`} onClick={() => change({ question: !choice.question })}>Ask a question</button></div>{choice.who === "i" && <label className="gender-label">For “I”, my agreement<select value={choice.gender} onChange={(e) => change({ gender: e.target.value as "m" | "f" })}><option value="m">Masculine</option><option value="f">Feminine</option></select></label>}</div>
    <section className="flip-strip"><div><h3>Change the time. Keep your words.</h3><p>Tap a line to bring it into your sentence.</p></div><div className="tense-ladder">{(["past", "cont", "present", "future"] as When[]).map((when) => { const line = buildPath(lang, { ...choice, when, timeWord: true }); return <button type="button" className={choice.when === when ? "active" : ""} aria-pressed={choice.when === when} key={when} onClick={() => change({ when, timeWord: true })}><span>{WHEN_TILES.find((w) => w.id === when)?.en}</span><strong lang={l.code}>{line?.sentence || "Try a different combination"}</strong></button>; })}</div></section>
    <button type="button" className="text-button pronunciation-help" aria-expanded={showTip} onClick={() => setShowTip(!showTip)}><CircleHelp size={17}/> A little help with the sounds</button>{showTip && <div className="sounds-help">{HOW_TO_SAY[lang].map((t) => <p key={t.k}><strong>{t.k}</strong><span>{t.v}</span></p>)}</div>}
  </div>;
}
