"use client";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bike,
  CarFront,
  CarTaxiFront,
  Coffee,
  FileWarning,
  GraduationCap,
  Hospital,
  House,
  LoaderCircle,
  MapPin,
  MessageCircle,
  Mic,
  Music2,
  Phone,
  Piano,
  Pill,
  Plane,
  Scissors,
  ShieldCheck,
  ShoppingBasket,
  Shuffle,
  Stethoscope,
  UsersRound,
  Utensils,
} from "lucide-react";
import { LANGUAGES } from "@/lib/languages";
import { PERSONAS, personaId, type PersonaMeta } from "@/lib/personas.generated";
import { SCENARIO_ORDER, type Lang, type ShopId } from "@/lib/maatu-design";
import { SITUATIONS, situationBrief, type Situation } from "@/lib/scene-situations";
import { SCENE_NAMES, SCENE_TASKS } from "@/lib/scenes";
import { HearButton } from "./studio-ui";

export const SCENE_ICONS: Record<string, typeof Coffee> = {
  auto: CarFront,
  cab: CarTaxiFront,
  chai: Coffee,
  market: ShoppingBasket,
  gate: Bike,
  phone: Phone,
  music: Music2,
  lesson: Piano,
  desk: GraduationCap,
  airport: Plane,
  salon: Scissors,
  kirana: ShoppingBasket,
  clinic: Stethoscope,
  hospital: Hospital,
  insurance: ShieldCheck,
  claim: FileWarning,
  restaurant: Utensils,
  neighbour: UsersRound,
  landlord: House,
  pharmacy: Pill,
};

const NAME = SCENE_NAMES;
const TASKS = SCENE_TASKS;

// A first line in English for each scene, shown translated so a beginner
// always has something to say when the call opens.
const STARTERS: Record<ShopId, string> = {
  auto: "Please go to the railway station. How much will it be?",
  cab: "I am standing near the main gate. The OTP is 4 5 2 1.",
  chai: "Hello! It is very hot today, isn't it?",
  market: "How much are the tomatoes for one kilo?",
  kirana: "I need one kilo of rice and a packet of sugar.",
  restaurant: "What is ready right now? One coffee, please.",
  gate: "Please come to block B, third floor, flat 304.",
  neighbour: "Hello, I just moved in next door.",
  landlord: "The kitchen tap is leaking. Can you send a plumber?",
  salon: "Just a small trim, please. Not too short.",
  phone: "Hello, I want a new internet connection.",
  airport: "Can I have a window seat, please?",
  clinic: "I have had a fever for three days.",
  pharmacy: "Do you have a cheaper medicine for this?",
  hospital: "Excuse me, where is the cardiology department?",
  insurance: "I need health insurance for my family. What does it cover?",
  claim: "Why was my claim only partly approved?",
  music: "Today we will learn to count four beats.",
  lesson: "I want to learn the piano. Where do I start?",
  desk: "I am a complete beginner. Which course should I join?",
};

function FirstLine({ lang, english }: { lang: Lang; english: string }) {
  const [line, setLine] = useState<{ native: string; display: string } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    setLine(null);
    setFailed(false);
    fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: english, to: [lang] }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (active && d.items?.[0]) setLine(d.items[0]);
        else if (active) setFailed(true);
      })
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [lang, english]);
  if (failed) return null;
  return (
    <div className="first-line" aria-live="polite">
      <h3>A first line, if you need one</h3>
      {line ? (
        <div>
          <span>
            <strong lang={LANGUAGES[lang].code}>{line.display}</strong>
            <small>{english}</small>
          </span>
          <HearButton compact lang={lang} text={line.native} label="Hear the first line" />
        </div>
      ) : (
        <p className="coach-loading">
          <LoaderCircle size={16} className="spin" /> Preparing a first line…
        </p>
      )}
    </div>
  );
}

const GROUPS: { id: string; label: string; scenes: ShopId[] }[] = [
  { id: "all", label: "All", scenes: SCENARIO_ORDER },
  { id: "everyday", label: "Everyday", scenes: ["chai", "market", "kirana", "restaurant", "neighbour", "salon", "gate", "landlord"] },
  { id: "around", label: "Getting around", scenes: ["auto", "cab", "airport"] },
  { id: "health", label: "Health", scenes: ["hospital", "clinic", "pharmacy", "insurance", "claim"] },
  { id: "phone", label: "Phone calls", scenes: ["phone", "cab", "claim", "desk"] },
  { id: "music", label: "Music", scenes: ["lesson", "music", "desk"] },
];

const FEATURED: ShopId[] = ["auto", "market", "hospital"];
const SCENE_PHOTOS: Record<string, string> = {
  "ta-chai": "ta-chai",
  "ta-market": "ta",
  "kn-market": "kn",
  "kn-auto": "kn-auto",
  "hi-market": "hi",
  "fr-chai": "fr",
  "fr-market": "fr-market",
};

export type SceneStart = { persona: PersonaMeta; situation?: string; label?: string };

export default function ScenarioStudio({
  lang,
  onStart,
  onText,
  onCustom,
}: {
  lang: Lang;
  onStart: (start: SceneStart) => void;
  onText: (start: SceneStart) => void;
  onCustom: (context: string) => void;
}) {
  const l = LANGUAGES[lang];
  const [selected, setSelected] = useState<ShopId | null>(null);
  const [group, setGroup] = useState("all");
  const [custom, setCustom] = useState("");
  const [situationId, setSituationId] = useState<string | null>(null);
  const meta = selected ? PERSONAS[personaId(selected, lang) ?? ""] : null;
  const visible = useMemo(
    () =>
      (GROUPS.find((g) => g.id === group) ?? GROUPS[0]).scenes.filter(
        (id) => PERSONAS[personaId(id, lang) ?? ""],
      ),
    [group, lang],
  );

  function open(id: ShopId) {
    setSelected(id);
    setSituationId(SITUATIONS[id]?.[0]?.id ?? null);
    window.scrollTo({ top: 0 });
  }

  if (meta && selected) {
    const Icon = SCENE_ICONS[selected];
    const photograph = SCENE_PHOTOS[`${lang}-${selected}`];
    const situations = SITUATIONS[selected] ?? [];
    const situation: Situation | undefined =
      situations.find((s) => s.id === situationId) ?? situations[0];
    const start: SceneStart = {
      persona: meta,
      situation: situation ? situationBrief(situation, lang) : undefined,
      label: situation?.label,
    };
    const goals =
      TASKS[selected] ??
      meta.rubric.slice(0, 3).map((x) => x.charAt(0).toUpperCase() + x.slice(1));
    return (
      <div className="scene-preview">
        <button type="button" className="text-button" onClick={() => setSelected(null)}>
          <ArrowLeft size={17} /> All scenes
        </button>
        <div
          className={`scene-cover scene-${selected} ${photograph ? "has-photo" : ""}`}
          style={photograph ? { backgroundImage: `url(/scenes/${photograph}.webp)` } : undefined}
        >
          <Icon size={74} strokeWidth={1.2} />
          <span>
            <MapPin size={16} />
            {meta.sceneLabel}
          </span>
        </div>
        <header className="page-heading">
          <h1>{NAME[selected]}</h1>
          <p>
            You talk with {meta.name}, your AI {meta.teachMode ? "student" : "scene partner"}.{" "}
            {meta.teachMode
              ? "You are the teacher here."
              : `${meta.name} stays in the scene and quietly helps you say it right.`}
          </p>
        </header>
        {situations.length > 0 && (
          <section className="situation-picker" aria-labelledby="situation-title">
            <div className="situation-heading">
              <h2 id="situation-title">Choose what happens today</h2>
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  const others = situations.filter((s) => s.id !== situation?.id);
                  const next = others[Math.floor(Math.random() * others.length)];
                  if (next) setSituationId(next.id);
                }}
              >
                <Shuffle size={16} /> Surprise me
              </button>
            </div>
            <div className="situation-options" role="radiogroup" aria-label="Situation">
              {situations.map((s) => (
                <button
                  type="button"
                  role="radio"
                  aria-checked={situation?.id === s.id}
                  key={s.id}
                  className={situation?.id === s.id ? "active" : ""}
                  onClick={() => setSituationId(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {situation && <p className="situation-brief">{situationBrief(situation, lang)}</p>}
          </section>
        )}
        <div className="scene-goals">
          <h3>Things to try</h3>
          {goals.map((goal, i) => (
            <p key={goal}>
              <span>{i + 1}</span>
              {goal}
            </p>
          ))}
        </div>
        <FirstLine lang={lang} english={STARTERS[selected]} />
        <div className="preview-actions">
          <button type="button" className="button button-primary" onClick={() => onStart(start)}>
            <Mic size={18} /> Start talking
            <ArrowRight size={17} />
          </button>
          <button type="button" className="button button-outline" onClick={() => onText(start)}>
            <MessageCircle size={18} /> Type instead
          </button>
        </div>
        <p className="composer-hint">
          Speak English whenever you are stuck. Ask “how do I say…?” or “what does that mean?” and{" "}
          {meta.name} helps, then carries on.
        </p>
      </div>
    );
  }

  return (
    <>
      <header className="page-heading">
        <h1>
          Real places.
          <br />
          <em>Real things to say.</em>
        </h1>
        <p>
          Pick a place in {l.city}
          {lang === "fr" ? "" : " or beyond"}, choose what happens, and talk your way through it.
        </p>
      </header>
      <div className="scene-filters" role="group" aria-label="Filter scenes">
        {GROUPS.map((g) => (
          <button
            type="button"
            aria-pressed={group === g.id}
            key={g.id}
            className={group === g.id ? "active" : ""}
            onClick={() => setGroup(g.id)}
          >
            {g.label}
          </button>
        ))}
      </div>
      {group === "all" && (
        <div className="featured-scenes">
          {FEATURED.map((id) => {
            const p = PERSONAS[personaId(id, lang)!];
            const Icon = SCENE_ICONS[id];
            const photograph = SCENE_PHOTOS[`${lang}-${id}`];
            return (
              <button type="button" className={`featured-scene scene-${id}`} key={id} onClick={() => open(id)}>
                <div
                  className={`scene-picture ${photograph ? "has-photo" : ""}`}
                  style={photograph ? { backgroundImage: `url(/scenes/${photograph}.webp)` } : undefined}
                >
                  <Icon size={38} strokeWidth={1.5} />
                  <span>
                    <MapPin size={13} />
                    {l.city}
                  </span>
                </div>
                <div className="scene-card-copy">
                  <h3>{NAME[id]}</h3>
                  <span className="scene-category">{p.sceneLabel}</span>
                  <p>
                    {SITUATIONS[id]?.length ?? 0} situations with {p.name}, your AI partner.
                  </p>
                  <span className="scene-open">
                    Try this scene
                    <ArrowRight size={17} />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
      <h2 className="sr-only">{group === "all" ? "More scenes" : "Scenes"}</h2>
      <div className="scene-list">
        {visible
          .filter((id) => group !== "all" || !FEATURED.includes(id))
          .map((id) => {
            const p = PERSONAS[personaId(id, lang)!];
            const Icon = SCENE_ICONS[id];
            return (
              <button type="button" key={id} onClick={() => open(id)}>
                <span className="round-icon">
                  <Icon size={24} />
                </span>
                <span>
                  <strong>{NAME[id]}</strong>
                  <small>
                    {p.sceneLabel} · {p.name}
                  </small>
                </span>
                <ArrowRight size={18} />
              </button>
            );
          })}
      </div>
      <section className="custom-scene">
        <div>
          <h3>Your imagination is a good place, too.</h3>
          <p>Describe any situation and your teacher plays the other part.</p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (custom.trim())
              onCustom(
                `Let's role-play this scene: ${custom.trim()}. Take the other role and help me learn naturally as we go.`,
              );
          }}
        >
          <label className="sr-only" htmlFor="custom-scene">
            Invent a scenario
          </label>
          <input
            id="custom-scene"
            value={custom}
            maxLength={500}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="I’m ordering a birthday cake…"
          />
          <button type="submit" className="icon-button" aria-label="Start your own scene" disabled={!custom.trim()}>
            <ArrowRight size={19} />
          </button>
        </form>
      </section>
    </>
  );
}
