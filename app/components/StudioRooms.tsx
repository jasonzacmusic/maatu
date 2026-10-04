"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PERSON_ORDER, PERSONS, TENSES, VERBS, verbForm, type Gender, type Tense } from "@/lib/grammar";
import { composeNumber, lineText, NUMBERS, SCENE_GROUPS, SCENES, SOUND_NOTE, SOUNDS, type Line, type SceneGroup } from "@/lib/playbooks";
import { C, LINE, LINE_SOFT, MONO, type IndianLang as Lang } from "@/lib/maatu-design";
import { Chip, CopyButton, Dock, Label, LILAC, SaveButton, Section, SKY, SpeakButton, type Speaker } from "./studio-bits";

// Two rooms of the Sentence Studio. Scenes: scripted conversations for real
// Bengaluru situations and music teaching, with the lines you will hear as
// well as the ones you say, test-yourself hiding, and a practise loop into the
// checker. Shapes: build a verb, a number, or a sound by touch, from blocks
// that dock together. No em dashes anywhere.

export type Practice = { en: string; target: string };

// ............................................................ scenes
export function ScenesRoom({ lang, gender, speaker, anchor, onPractise, onSaved }: { lang: Lang; gender: Gender; speaker: Speaker; anchor: (id: string, el: HTMLElement | null) => void; onPractise: (p: Practice) => void; onSaved: () => void }) {
  const [group, setGroup] = useState<SceneGroup>("music");
  const [playingAll, setPlayingAll] = useState(false);
  const stopRef = useRef(false);
  useEffect(() => () => { stopRef.current = true; }, []);
  const [sceneId, setSceneId] = useState("majorscale");
  const [testMe, setTestMe] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const scenes = SCENES.filter((s) => s.group === group);
  const scene = SCENES.find((s) => s.id === sceneId) ?? scenes[0];
  const pickGroup = (g: SceneGroup) => {
    setGroup(g);
    const first = SCENES.find((s) => s.group === g);
    if (first) setSceneId(first.id);
    setRevealed(new Set());
  };
  const reveal = (key: string) => setRevealed((prev) => new Set(prev).add(key));
  const total = scene.beats.reduce((n, b) => n + b.lines.length, 0);
  const playAll = async () => {
    if (playingAll) {
      stopRef.current = true;
      speaker.stop();
      setPlayingAll(false);
      return;
    }
    stopRef.current = false;
    setPlayingAll(true);
    for (const beat of scene.beats) {
      for (const line of beat.lines) {
        if (stopRef.current) break;
        await speaker.speak(lineText(line, lang, gender));
        if (stopRef.current) break;
        await new Promise((r) => setTimeout(r, 450));
      }
    }
    setPlayingAll(false);
  };
  const yours = scene.beats.reduce((n, b) => n + b.lines.filter((l) => l.who === "you").length, 0);

  return (
    <Section id="scenes" anchor={anchor} kicker="SCENES" title="Whole conversations, both sides" blurb="What you say and what they will ask, in the order it really happens. Hide the answers and test yourself, then practise any line with the checker." tone="lilac">
      <div className="mt-4 flex flex-wrap gap-2">
        {SCENE_GROUPS.map((g) => (
          <Chip key={g.id} on={group === g.id} onClick={() => pickGroup(g.id)} tone="lilac">
            {g.label}
          </Chip>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {scenes.map((s) => (
          <Chip key={s.id} on={scene.id === s.id} onClick={() => { setSceneId(s.id); setRevealed(new Set()); }} small>
            {s.title}
          </Chip>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[18px] font-bold" style={{ color: C.milk }}>{scene.title}</div>
          <div className="text-[12.5px]" style={{ color: C.muted }}>{scene.place}. {scene.blurb}</div>
          <div className="mt-1 text-[11px]" style={{ color: C.faint }}>{yours} lines you say, {total - yours} you will hear</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip on={playingAll} onClick={() => void playAll()} tone="sodium">
            {playingAll ? "◼ stop" : "▶ play the whole scene"}
          </Chip>
          <Chip on={testMe} onClick={() => { setTestMe(!testMe); setRevealed(new Set()); }} tone="tube">
            {testMe ? "testing: tap a line to reveal" : "test me"}
          </Chip>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-4">
        {scene.beats.map((beat) => (
          <div key={beat.beat}>
            <Label>{beat.beat.toUpperCase()}</Label>
            <div className="flex flex-col gap-1.5">
              {beat.lines.map((line, i) => {
                const key = `${beat.beat}-${i}`;
                const target = lineText(line, lang, gender);
                const hidden = testMe && !revealed.has(key);
                const you = line.who === "you";
                return (
                  <SceneLine key={key} lang={lang} line={line} target={target} hidden={hidden} you={you} speaker={speaker} onReveal={() => reveal(key)} onPractise={() => onPractise({ en: line.en, target })} onSaved={onSaved} />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function SceneLine({ lang, line, target, hidden, you, speaker, onReveal, onPractise, onSaved }: { lang: Lang; line: Line; target: string; hidden: boolean; you: boolean; speaker: Speaker; onReveal: () => void; onPractise: () => void; onSaved: () => void }) {
  const color = you ? C.tube : LILAC;
  const active = speaker.playing === target;
  return (
    <div className="rounded-[13px] px-3.5 py-3" style={{ background: C.base, border: `1px solid ${active ? color + "66" : LINE_SOFT}`, marginLeft: you ? 0 : 18, marginRight: you ? 18 : 0 }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold" style={{ color, letterSpacing: 1.2 }}>
            {you ? "YOU" : "THEY ASK"}
          </div>
          <div className="mt-0.5 text-[12.5px]" style={{ color: C.muted }}>{line.en}</div>
          {hidden ? (
            <button type="button" onClick={onReveal} className="mt-1.5 rounded-[8px] px-2.5 py-1 text-[12px] font-semibold focus-visible:outline focus-visible:outline-2" style={{ background: "rgba(191,239,219,0.10)", color: C.tube, border: "1px solid rgba(191,239,219,0.28)", outlineColor: C.tube }}>
              Say it first, then tap to reveal
            </button>
          ) : (
            <div className="mt-1 text-[16px] font-semibold" style={{ color: active ? color : C.milk, fontFamily: MONO }}>{target}</div>
          )}
          {line.note && !hidden && (
            <div className="mt-1 text-[11.5px]" style={{ color: C.faint }}>{line.note}</div>
          )}
        </div>
        <div className="flex flex-none flex-col items-end gap-1.5">
          <div className="flex gap-1.5">
            <SaveButton lang={lang} en={line.en} target={target} onChange={onSaved} size="sm" />
            <SpeakButton text={target} speaker={speaker} size="sm" label={hidden ? "Hear" : undefined} />
          </div>
          <div className="flex gap-3">
            <CopyButton en={line.en} target={target} />
            {you && (
              <button type="button" onClick={onPractise} className="text-[11.5px] font-semibold" style={{ color: C.tube }}>
                Practise ›
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ............................................................ shapes
export function ShapesRoom({ lang, gender, speaker, anchor, verbId, onVerb }: { lang: Lang; gender: Gender; speaker: Speaker; anchor: (id: string, el: HTMLElement | null) => void; verbId: string; onVerb: (id: string) => void }) {
  const [mode, setMode] = useState<"verb" | "number" | "sound">("verb");
  return (
    <Section id="shapes" anchor={anchor} kicker="SHAPES" title="Build the word by touch" blurb="A word is two blocks: the part that stays and the part that moves. Tap the moving block and watch it dock.">
      <div className="mt-4 flex flex-wrap gap-2">
        <Chip on={mode === "verb"} onClick={() => setMode("verb")}>verb + ending</Chip>
        <Chip on={mode === "number"} onClick={() => setMode("number")}>tens + units</Chip>
        <Chip on={mode === "sound"} onClick={() => setMode("sound")}>short + long sounds</Chip>
      </div>
      {mode === "verb" && <VerbShapes lang={lang} gender={gender} speaker={speaker} verbId={verbId} onVerb={onVerb} />}
      {mode === "number" && <NumberShapes lang={lang} speaker={speaker} />}
      {mode === "sound" && <SoundShapes lang={lang} speaker={speaker} />}
    </Section>
  );
}

function VerbShapes({ lang, gender, speaker, verbId, onVerb }: { lang: Lang; gender: Gender; speaker: Speaker; verbId: string; onVerb: (id: string) => void }) {
  const [tense, setTense] = useState<Tense>("present");
  const [person, setPerson] = useState(0);
  const verb = VERBS.find((v) => v.id === verbId) ?? VERBS[0];
  const persons = PERSONS[lang];
  const forms = useMemo(() => PERSON_ORDER.map((p) => verbForm(lang, verb, p, tense, false, gender)), [lang, verb, tense, gender]);
  const form = forms[person];
  const stem = form.stem && form.word.startsWith(form.stem) && form.word.length > form.stem.length ? form.stem : null;
  const ending = stem ? form.word.slice(stem.length).trim() : null;
  const sub = persons[person].sub;
  const line = `${sub} ${form.word}`;
  const tenseNote = lang === "kn" && tense === "future" ? "Kannada reuses the every-day block for the future." : lang === "hi" && tense === "past" ? "Hindi past forms match the person or the thing, not a fixed ending; see Flip for the full set." : null;

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-1.5">
        {VERBS.map((v) => (
          <Chip key={v.id} on={verbId === v.id} onClick={() => onVerb(v.id)} small>
            {v.en.base}
          </Chip>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {TENSES.filter((t) => t.id === "present" || t.id === "past" || t.id === "future").map((t) => (
          <Chip key={t.id} on={tense === t.id} onClick={() => setTense(t.id)} tone="sky">
            {t.label}
          </Chip>
        ))}
      </div>

      <div className="mt-5 rounded-[18px] p-5" style={{ background: "linear-gradient(135deg,rgba(255,179,92,0.12),rgba(159,211,255,0.05))", border: "1px solid rgba(255,179,92,0.3)" }}>
        <div key={line} className="flex flex-wrap items-center gap-4" style={{ animation: "mtFade 260ms ease both" }}>
          {stem && ending ? (
            <Dock fixed={stem} moving={ending} fixedLabel="STAYS" movingLabel={persons[person].en.toUpperCase()} size={24} />
          ) : (
            <span className="rounded-[14px] px-3 py-2" style={{ background: C.elevated, color: C.milk, fontFamily: MONO, fontSize: 24, fontWeight: 600 }}>{form.word}</span>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-semibold" style={{ color: C.milk }}>
              {sub} {form.word}
            </div>
            <div className="text-[12.5px]" style={{ color: C.muted }}>
              {persons[person].en}{persons[person].hint ? ` (${persons[person].hint})` : ""} {tense === "past" ? verb.en.past : tense === "future" ? `will ${verb.en.base}` : person === 3 || person === 4 ? verb.en.s : verb.en.base}
            </div>
          </div>
          <SpeakButton text={line} speaker={speaker} />
        </div>
        {tenseNote && <div className="mt-3 text-[12px]" style={{ color: "rgba(255,179,92,0.85)" }}>{tenseNote}</div>}
      </div>

      <div className="mt-4">
        <Label>TAP A MOVING BLOCK</Label>
        <div className="flex flex-wrap gap-2">
          {forms.map((f, i) => {
            const s = f.stem && f.word.startsWith(f.stem) && f.word.length > f.stem.length ? f.stem : null;
            const e = s ? f.word.slice(s.length).trim() : f.word;
            const on = i === person;
            return (
              <button key={i} type="button" onClick={() => setPerson(i)} aria-pressed={on} className="flex flex-col items-start px-3 py-2 focus-visible:outline focus-visible:outline-2" style={{ background: on ? C.sodium : "rgba(255,179,92,0.12)", color: on ? C.ink : C.sodium, borderRadius: "3px 14px 14px 3px", border: "1px solid rgba(255,179,92,0.34)", outlineColor: C.milk, transition: "background 140ms ease" }}>
                <span className="text-[9px] font-bold" style={{ letterSpacing: 1, opacity: 0.75 }}>{persons[i].sub.toUpperCase()}</span>
                <span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 600 }}>{e}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function NumberShapes({ lang, speaker }: { lang: Lang; speaker: Speaker }) {
  const b = NUMBERS[lang];
  const [tens, setTens] = useState(2);
  const [unit, setUnit] = useState(1);
  const n = tens * 10 + unit;
  const word = composeNumber(lang, n) ?? "";
  const tensWord = b.tens[tens - 2];
  const unitWord = unit === 0 ? "" : b.units[unit - 1];
  return (
    <div className="mt-4">
      <div className="rounded-[18px] p-5" style={{ background: "linear-gradient(135deg,rgba(159,211,255,0.12),rgba(245,194,255,0.05))", border: "1px solid rgba(159,211,255,0.3)" }}>
        <div key={word} className="flex flex-wrap items-center gap-4" style={{ animation: "mtFade 260ms ease both" }}>
          <span className="text-[34px] font-semibold" style={{ color: SKY, fontFamily: MONO }}>{n}</span>
          {lang !== "hi" && unit !== 0 ? (
            <Dock fixed={lang === "kn" ? tensWord.slice(0, /^[aeiou]/.test(unitWord) ? -1 : -2) : (b.tensJoin ?? b.tens)[tens - 2]} moving={lang === "kn" ? unitWord : ` ${unitWord}`} color={SKY} fixedLabel="TENS" movingLabel="UNIT" size={22} />
          ) : (
            <span className="rounded-[14px] px-3 py-2" style={{ background: C.elevated, color: C.milk, fontFamily: MONO, fontSize: 22, fontWeight: 600 }}>{word}</span>
          )}
          <SpeakButton text={word} speaker={speaker} />
        </div>
        <div className="mt-3 text-[12px] leading-relaxed" style={{ color: "rgba(159,211,255,0.85)" }}>{b.rule}</div>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <Label>TENS</Label>
          <div className="flex flex-wrap gap-2">
            {b.tens.map((t, i) => (
              <Chip key={t} on={tens === i + 2} onClick={() => setTens(i + 2)} tone="sky" small>
                {(i + 2) * 10} <span style={{ opacity: 0.6 }}>{t}</span>
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <Label>UNITS</Label>
          <div className="flex flex-wrap gap-2">
            <Chip on={unit === 0} onClick={() => setUnit(0)} tone="sky" small>0</Chip>
            {b.units.map((u, i) => (
              <Chip key={u} on={unit === i + 1} onClick={() => setUnit(i + 1)} tone="sky" small>
                {i + 1} <span style={{ opacity: 0.6 }}>{u}</span>
              </Chip>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4">
        <Label>ONE TO TWENTY, TAP TO HEAR</Label>
        <div className="flex flex-wrap gap-1.5">
          {[...b.units, ...b.teens].map((w, i) => (
            <button key={w} type="button" onClick={() => void speaker.speak(w)} className="rounded-[9px] px-2.5 py-1.5 text-[12px] focus-visible:outline focus-visible:outline-2" style={{ background: C.base, border: `1px solid ${LINE_SOFT}`, color: speaker.playing === w ? SKY : C.milk, fontFamily: MONO, outlineColor: SKY }}>
              <span style={{ color: C.faint, marginRight: 6 }}>{i + 1}</span>{w}
            </button>
          ))}
          <button type="button" onClick={() => void speaker.speak(b.hundred)} className="rounded-[9px] px-2.5 py-1.5 text-[12px] focus-visible:outline focus-visible:outline-2" style={{ background: C.base, border: `1px solid ${LINE_SOFT}`, color: speaker.playing === b.hundred ? SKY : C.milk, fontFamily: MONO, outlineColor: SKY }}>
            <span style={{ color: C.faint, marginRight: 6 }}>100</span>{b.hundred}
          </button>
        </div>
      </div>
      {lang === "hi" && b.table && (
        <div className="mt-4">
          <Label>TWENTY-ONE TO NINETY-NINE, EACH ITS OWN WORD</Label>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
            {b.table.map((w, i) => (
              <button key={w} type="button" onClick={() => void speaker.speak(w)} className="rounded-[9px] px-2 py-1.5 text-left text-[12px] focus-visible:outline focus-visible:outline-2" style={{ background: C.base, border: `1px solid ${LINE_SOFT}`, color: speaker.playing === w ? SKY : C.milk, fontFamily: MONO, outlineColor: SKY }}>
                <span style={{ color: C.faint, marginRight: 6 }}>{i + 21}</span>{w}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SoundShapes({ lang, speaker }: { lang: Lang; speaker: Speaker }) {
  const pairs = SOUNDS[lang];
  return (
    <div className="mt-4">
      <div className="rounded-[14px] px-4 py-3 text-[12.5px] leading-relaxed" style={{ background: "rgba(245,194,255,0.08)", color: "rgba(245,194,255,0.9)", border: "1px solid rgba(245,194,255,0.2)" }}>
        {SOUND_NOTE[lang]}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {pairs.map((p) => (
          <div key={p.short} className="rounded-[14px] p-3.5" style={{ background: C.base, border: `1px solid ${LINE}` }}>
            <div className="flex items-center justify-between gap-2">
              <button type="button" onClick={() => void speaker.speak(p.short)} className="text-left focus-visible:outline focus-visible:outline-2" style={{ outlineColor: LILAC }}>
                <span className="block text-[20px] font-semibold" style={{ color: speaker.playing === p.short ? LILAC : C.milk, fontFamily: MONO }}>{p.short}</span>
                <span className="block text-[11.5px]" style={{ color: C.muted }}>{p.shortEn}</span>
              </button>
              <span className="text-[11px] font-bold" style={{ color: C.faint, letterSpacing: 1 }}>SHORT · LONG</span>
              <button type="button" onClick={() => void speaker.speak(p.long)} className="text-right focus-visible:outline focus-visible:outline-2" style={{ outlineColor: LILAC }}>
                <span className="block text-[20px] font-semibold" style={{ color: speaker.playing === p.long ? LILAC : C.milk, fontFamily: MONO }}>
                  {p.long.replace(/(aa|ee|oo)/, (m) => m)}
                </span>
                <span className="block text-[11.5px]" style={{ color: C.muted }}>{p.longEn}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 text-[11.5px]" style={{ color: C.faint }}>Tap either word to hear it. Say the pair back to back until the length difference is obvious.</div>
    </div>
  );
}
