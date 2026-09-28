"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import CallBackdrop from "./CallBackdrop";
import { useMaatuCall, type Speaker, type Line, type PracticeLine } from "./useMaatuCall";
import { PERSONAS, personaId, type PersonaMeta } from "@/lib/personas.generated";
import { ALL_LESSONS, teacherMeta, getDone, markDone, lessonWasMastered, LANG_NAME, type Lesson } from "@/lib/curriculum";
import { ClassroomScreen } from "./ClassroomScreen";
import { BuildScreen } from "./BuildScreen";
import { countFor } from "@/lib/review";
import { CourseProgressCard } from "./CourseProgressCard";
import { LessonPreviewScreen } from "./LessonPreviewScreen";
import { LessonResultScreen } from "./LessonResultScreen";
import {
  C,
  BODY,
  DISPLAY,
  MONO,
  LINE,
  LINE_SOFT,
  SLOW,
  SCENARIO_ORDER,
  SCENARIO_TAGLINE,
  SCENARIO_BRIEF,
  DIFFICULTY,
  HOST,
  type Lang,
  type ShopId,
} from "@/lib/maatu-design";

// The Maatu app, Night Bazaar (elevated). A responsive shell: bottom nav on
// mobile, a side rail on desktop. Onboarding, Bazaar hub, scenario pre-call,
// the hero call, debrief, progress, classroom, settings. Every live scenario
// and lesson opens a real voice call; the debrief reads the real coach report.
// No em dashes anywhere.

type Screen =
  | "onboarding"
  | "hub"
  | "scenario"
  | "call"
  | "debrief"
  | "progress"
  | "school"
  | "lessonPreview"
  | "lessonResult"
  | "build"
  | "settings";
type Tab = "hub" | "school" | "build" | "progress" | "settings";
type SessionEnd = {
  room: string | null;
  transcript: Line[];
  rawTranscript?: Line[];
  durationSec: number;
  endedUnexpectedly?: boolean;
};
type DifficultyStage = 1 | 2 | 3;
type LessonResult = { lesson: Lesson; passed: boolean; transcript: Line[] };
type StreetStats = {
  totalSeconds: number;
  thisWeekSeconds: number;
  sessionCount: number;
  nights: number;
  scenarios: { scenario: string; sessions: number; seconds: number }[];
};

const EMPTY_STATS: StreetStats = { totalSeconds: 0, thisWeekSeconds: 0, sessionCount: 0, nights: 0, scenarios: [] };
const LANGS: Lang[] = ["kn", "hi", "ta"];

function greeting() {
  const hour = new Date().getHours();
  return hour < 5 ? "Still up?" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

function minutes(seconds: number) {
  return Math.round(seconds / 60);
}
function personaFor(shop: ShopId, lang: Lang): string | null {
  return personaId(shop, lang);
}
function requirePersona(id: string): PersonaMeta {
  const meta = PERSONAS[id];
  if (!meta) throw new Error(`Unknown Maatu persona: ${id}`);
  return meta;
}
function initial(name: string) {
  return (name || "?").trim().charAt(0).toUpperCase();
}

// ....................................................... small pieces
function Lamp({ height = 230, rm }: { height?: number; rm?: boolean }) {
  return (
    <div className="absolute inset-x-0 top-0 pointer-events-none" style={{ height, overflow: "hidden" }} aria-hidden="true">
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{ top: -70, width: 360, height: height + 90, background: "radial-gradient(180px 140px at 50% 0, rgba(255,179,92,0.30), transparent 70%)" }}
      />
      <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 8, width: 2, height: 34, background: "linear-gradient(#FFB35C, transparent)" }} />
      <div
        className={"absolute left-1/2 -translate-x-1/2 rounded-full" + (rm ? "" : " mt-breathe-lamp")}
        style={{ top: 40, width: 15, height: 15, background: C.sodium, boxShadow: "0 0 30px 8px rgba(255,179,92,0.5)" }}
      />
    </div>
  );
}

function Bars({ color, n = 3, rm }: { color: string; n?: number; rm?: boolean }) {
  return (
    <span className="inline-flex items-end gap-[2px]" style={{ height: 12 }} aria-hidden="true">
      {Array.from({ length: n }).map((_, i) => (
        <span
          key={i}
          className={rm ? "" : "mt-bar"}
          style={{ width: 3, height: "100%", background: color, borderRadius: 2, animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}

function StreakChip({ streak }: { streak: number }) {
  return (
    <div
      className="flex items-center gap-2 rounded-full"
      style={{ padding: "7px 13px", background: "rgba(255,179,92,0.12)", border: "1px solid rgba(255,179,92,0.26)" }}
    >
      <span style={{ fontFamily: DISPLAY, fontSize: 18, lineHeight: 1, color: C.sodium }}>{streak}</span>
      <span className="text-[11px] font-semibold" style={{ color: C.sodium }}>
        day streak
      </span>
    </div>
  );
}

function difficultyColor(d: string) {
  if (d === "Intermediate") return C.milk;
  if (d === "Teach mode") return C.tube;
  return C.sodium;
}

function progressionLabel(stage: DifficultyStage) {
  if (stage === 1) return "Supported";
  if (stage === 3) return "Challenge";
  return "Everyday";
}

// Nav icons, simple line marks.
function NavIcon({ tab, active }: { tab: Tab; active: boolean }) {
  const s = active ? C.sodium : C.faint;
  if (tab === "hub")
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M3 9.5 10 3l7 6.5" stroke={s} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4.8 8.6V16h10.4V8.6" stroke={s} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (tab === "school")
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M10 3 18 7l-8 4-8-4 8-4Z" stroke={s} strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M5 8.6V13c0 1.2 2.2 2.4 5 2.4s5-1.2 5-2.4V8.6" stroke={s} strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  if (tab === "build")
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <rect x="2.5" y="4" width="6" height="5" rx="1.4" stroke={s} strokeWidth="1.6" />
        <rect x="11.5" y="4" width="6" height="5" rx="1.4" stroke={s} strokeWidth="1.6" />
        <rect x="7" y="11" width="6" height="5" rx="1.4" stroke={s} strokeWidth="1.6" />
      </svg>
    );
  if (tab === "progress")
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M3 17h14" stroke={s} strokeWidth="1.7" strokeLinecap="round" />
        <rect x="4.5" y="10" width="3" height="5" rx="1" stroke={s} strokeWidth="1.6" />
        <rect x="12.5" y="6" width="3" height="9" rx="1" stroke={s} strokeWidth="1.6" />
      </svg>
    );
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="2.6" stroke={s} strokeWidth="1.6" />
      <path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4" stroke={s} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function MicIcon({ muted }: { muted: boolean }) {
  const c = muted ? C.faint : C.milk;
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" fill={c} />
      <path d="M5 11a7 7 0 0 0 14 0" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="12" y1="18" x2="12" y2="21" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      {muted && <line x1="4.5" y1="4" x2="19.5" y2="20" stroke={C.kumkum} strokeWidth="2" strokeLinecap="round" />}
    </svg>
  );
}

function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="w-10 h-10 rounded-full flex items-center justify-center flex-none focus-visible:outline focus-visible:outline-2"
      style={{ background: "rgba(242,237,226,0.06)", border: `1px solid ${LINE}`, outlineColor: C.sodium }}
    >
      <svg width="14" height="20" viewBox="0 0 14 20" fill="none" aria-hidden="true">
        <path d="M11 3l-7 7 7 7" stroke={C.milk} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

// ....................................................... ONBOARDING
function Onboarding({ lang, setLang, onEnter, rm }: { lang: Lang; setLang: (l: Lang) => void; onEnter: () => void; rm: boolean }) {
  return (
    <div className="absolute inset-0 overflow-y-auto" style={{ background: C.night }}>
      <div className="relative mx-auto flex min-h-full max-w-[460px] flex-col px-7 pb-10">
        <div className="absolute inset-x-0 top-0 pointer-events-none" style={{ height: 320, background: "radial-gradient(200px 160px at 50% 0, rgba(255,179,92,0.30), transparent 68%)" }} />
        <div className="relative pt-16 text-center">
          <div
            className="inline-flex items-center justify-center rounded-[17px]"
            style={{ width: 56, height: 56, background: "linear-gradient(150deg,#FFB35C,#E8503A)", boxShadow: "0 10px 34px rgba(255,179,92,0.34)" }}
          >
            <span style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 28, color: C.ink }}>M</span>
          </div>
          <h1 className="mx-auto mt-6" style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: 31, lineHeight: 1.12, color: C.milk, maxWidth: 340 }}>
            Your private speaking teacher, from the very first word.
          </h1>
          <p className="mx-auto mt-3 text-[14.5px] leading-relaxed" style={{ color: C.muted, maxWidth: 320 }}>
            Learn Kannada, Hindi, or Tamil through guided voice lessons. Then practise in real conversations.
          </p>
        </div>

        <div className="relative mt-8">
          <div className="mb-3 text-[12px] font-semibold" style={{ letterSpacing: 0.5, color: C.mono }}>
            CHOOSE YOUR LANGUAGE
          </div>
          <div className="flex flex-col gap-3">
            {LANGS.map((k) => {
              const on = lang === k;
              return (
                <button
                  key={k}
                  onClick={() => setLang(k)}
                  aria-pressed={on}
                  className="flex items-center gap-4 rounded-[15px] px-4 py-4 text-left focus-visible:outline focus-visible:outline-2"
                  style={{
                    background: on ? "rgba(255,179,92,0.10)" : C.tar,
                    border: on ? "1px solid rgba(255,179,92,0.40)" : `1px solid ${LINE}`,
                    outlineColor: C.sodium,
                  }}
                >
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-full text-[12px] font-bold"
                    style={{ background: on ? "rgba(255,179,92,0.14)" : C.elevated, color: on ? C.sodium : C.muted }}
                  >
                    {k.toUpperCase()}
                  </span>
                  <span className="flex-1">
                    <span className="block text-[16px] font-semibold" style={{ color: C.milk }}>
                      {LANG_NAME[k]}
                    </span>
                    <span className="block text-[12px]" style={{ color: C.muted }}>
                      {HOST[k].name} · {HOST[k].place}
                    </span>
                  </span>
                  {on && (
                    <span className="flex items-center justify-center rounded-full text-[13px] font-bold" style={{ width: 22, height: 22, background: C.sodium, color: C.ink }}>
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative mt-auto pt-8">
          <div className="mb-3.5 flex items-center justify-center gap-2 text-center text-[12.5px]" style={{ color: C.muted }}>
            <span aria-hidden="true">🎙</span> Your first lesson starts with hello. You can ask questions at any time.
          </div>
          <button
            onClick={onEnter}
            className={"w-full rounded-[16px] text-[16px] font-bold focus-visible:outline focus-visible:outline-2" + (rm ? "" : " transition-transform active:scale-[0.99]")}
            style={{ padding: 16, background: C.sodium, color: C.ink, boxShadow: "0 10px 30px rgba(255,179,92,0.28)", outlineColor: C.milk }}
          >
            Meet your teacher
          </button>
        </div>
      </div>
    </div>
  );
}

// ....................................................... HUB
function ScenarioCard({
  shop,
  lang,
  difficultyStage,
  onOpen,
}: {
  shop: ShopId;
  lang: Lang;
  difficultyStage: DifficultyStage;
  onOpen: (shop: ShopId) => void;
}) {
  const id = personaFor(shop, lang);
  const p = id ? PERSONAS[id] : null;
  const live = !!p;
  const tagline = SCENARIO_TAGLINE[shop];
  const diff = DIFFICULTY[shop];
  const tint = shop === "chai" ? "rgba(191,239,219,0.22)" : "rgba(255,179,92,0.28)";
  return (
    <button
      onClick={() => live && onOpen(shop)}
      disabled={!live}
      className="group overflow-hidden rounded-[16px] text-left focus-visible:outline focus-visible:outline-2 disabled:cursor-default"
      style={{
        background: C.tar,
        border: live ? "1px solid rgba(255,179,92,0.22)" : `1px solid ${LINE_SOFT}`,
        opacity: live ? 1 : 0.55,
        outlineColor: C.sodium,
      }}
    >
      <div
        className="relative"
        style={{
          height: 84,
          background: live
            ? `radial-gradient(110px 70px at 78% 12%, ${tint}, transparent), repeating-linear-gradient(135deg, rgba(255,179,92,0.07) 0 11px, transparent 11px 22px)`
            : "repeating-linear-gradient(135deg, rgba(242,237,226,0.04) 0 11px, transparent 11px 22px)",
        }}
      >
        <div
          className="absolute flex items-center justify-center rounded-full"
          style={{ left: 12, bottom: 12, width: 34, height: 34, background: "radial-gradient(circle at 32% 30%, #FFC888, #B85E24)", color: "rgba(10,13,22,0.85)", fontFamily: DISPLAY, fontSize: 16, fontWeight: 600 }}
          aria-hidden="true"
        >
          {p ? initial(p.name) : ""}
        </div>
        {!live && <span className="absolute right-3 top-2.5 text-[13px]" aria-hidden="true">🔒</span>}
      </div>
      <div className="p-4">
        <div className="text-[15px] font-semibold leading-tight" style={{ color: live ? C.milk : C.muted }}>
          {p ? p.name : "Coming soon"}
        </div>
        <div className="mt-0.5 text-[12.5px]" style={{ color: live ? C.muted : C.faint }}>
          {live ? tagline : "Opening soon"}
          {live && (
            <span style={{ color: difficultyColor(diff) }}> · {diff} · {progressionLabel(difficultyStage)}</span>
          )}
        </div>
      </div>
    </button>
  );
}

function Hub({
  lang,
  stats,
  nextLesson,
  completedLessons,
  difficultyStage,
  onScenario,
  onSchool,
  onTutor,
  onBuild,
  rm,
}: {
  lang: Lang;
  stats: StreetStats;
  nextLesson: { index: number; title: string };
  completedLessons: number;
  difficultyStage: DifficultyStage;
  onScenario: (shop: ShopId) => void;
  onSchool: () => void;
  onTutor: () => void;
  onBuild: () => void;
  rm: boolean;
}) {
  const [showScenes, setShowScenes] = useState(false);
  const host = HOST[lang];
  return (
    <div className="absolute inset-0 overflow-y-auto" style={{ background: C.night }}>
      <Lamp rm={rm} />
      <div className="relative mx-auto max-w-[760px] px-6 pb-28 pt-14 lg:pt-14">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] font-bold" style={{ color: C.sodium, letterSpacing: 1.3 }}>
              THREE WAYS TO LEARN
            </div>
            <div className="mt-1" style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: 34, lineHeight: 1.02, color: C.milk }}>{greeting()}</div>
            <div className="mt-2 text-[13.5px]" style={{ color: C.muted, maxWidth: 380 }}>
              Chat about anything, build any sentence, or act out a situation. All in spoken {LANG_NAME[lang]}.
            </div>
          </div>
          <StreakChip streak={stats.nights} />
        </div>

        {/* Three ways to learn. Chat and Build lead; situations are optional. */}
        <button
          onClick={onTutor}
          className="mt-7 flex w-full items-center gap-4 rounded-[20px] p-5 text-left focus-visible:outline focus-visible:outline-2 sm:p-6"
          style={{ background: "linear-gradient(135deg,rgba(191,239,219,0.20),rgba(191,239,219,0.05))", border: "1px solid rgba(191,239,219,0.42)", outlineColor: C.tube }}
        >
          <span className="flex h-14 w-14 flex-none items-center justify-center rounded-full text-[26px]" style={{ background: "rgba(191,239,219,0.16)" }} aria-hidden="true">
            💬
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-bold" style={{ color: C.tube, letterSpacing: 1.1 }}>1 · CHAT</span>
            <span className="mt-0.5 block text-[19px] font-bold" style={{ color: C.milk }}>
              Talk about anything with {host.name}
            </span>
            <span className="mt-1 block text-[12.5px] leading-snug" style={{ color: C.muted }}>
              A live voice call. Say anything in English or {LANG_NAME[lang]}. She answers, tells you how to say what you meant, and teaches whatever you ask.
            </span>
          </span>
          <span className="text-[24px]" style={{ color: C.tube }} aria-hidden="true">›</span>
        </button>

        <button
          onClick={onBuild}
          className="mt-3 flex w-full items-center gap-4 rounded-[20px] p-5 text-left focus-visible:outline focus-visible:outline-2 sm:p-6"
          style={{ background: "linear-gradient(135deg,rgba(255,179,92,0.18),rgba(232,80,58,0.06))", border: "1px solid rgba(255,179,92,0.38)", outlineColor: C.sodium }}
        >
          <span className="flex h-14 w-14 flex-none items-center justify-center rounded-full text-[26px]" style={{ background: "rgba(255,179,92,0.14)" }} aria-hidden="true">
            🧩
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-bold" style={{ color: C.sodium, letterSpacing: 1.1 }}>2 · BUILD</span>
            <span className="mt-0.5 block text-[19px] font-bold" style={{ color: C.milk }}>
              Build any sentence yourself
            </span>
            <span className="mt-1 block text-[12.5px] leading-snug" style={{ color: C.muted }}>
              Tap who, the action, what and when. See it, hear it, flip it to did, doing and will do. Kannada, Hindi, Tamil, French.
            </span>
          </span>
          <span className="text-[24px]" style={{ color: C.sodium }} aria-hidden="true">›</span>
        </button>

        <button
          onClick={() => setShowScenes(!showScenes)}
          aria-expanded={showScenes}
          className="mt-3 flex w-full items-center gap-4 rounded-[20px] p-5 text-left focus-visible:outline focus-visible:outline-2"
          style={{ background: C.tar, border: `1px solid ${LINE}`, outlineColor: C.sodium }}
        >
          <span className="flex h-12 w-12 flex-none items-center justify-center rounded-full text-[22px]" style={{ background: "rgba(245,194,255,0.10)" }} aria-hidden="true">
            🎭
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-bold" style={{ color: "#F5C2FF", letterSpacing: 1.1 }}>3 · ACT IT OUT (OPTIONAL)</span>
            <span className="mt-0.5 block text-[17px] font-bold" style={{ color: C.milk }}>
              Play a real situation
            </span>
            <span className="mt-1 block text-[12.5px] leading-snug" style={{ color: C.muted }}>
              An auto driver, a chai stall, a clinic. {SCENARIO_ORDER.length} characters who stay in role.
            </span>
          </span>
          <span className="text-[20px]" style={{ color: C.faint }} aria-hidden="true">{showScenes ? "–" : "+"}</span>
        </button>
        {showScenes && (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {SCENARIO_ORDER.map((shop) => (
              <ScenarioCard key={shop} shop={shop} lang={lang} difficultyStage={difficultyStage} onOpen={onScenario} />
            ))}
          </div>
        )}

        <button
          onClick={onSchool}
          className="mt-6 flex w-full items-center gap-3.5 rounded-[16px] px-4 py-3.5 text-left focus-visible:outline focus-visible:outline-2"
          style={{ background: C.base, border: `1px solid ${LINE_SOFT}`, outlineColor: C.sodium }}
        >
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-[13px] font-bold" style={{ background: "rgba(255,179,92,0.14)", color: C.sodium }}>
            {nextLesson.index}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold" style={{ color: C.milk }}>
              Want a guided start? Beginner course, lesson {nextLesson.index}: {nextLesson.title}
            </span>
            <span className="block text-[11.5px]" style={{ color: C.faint }}>
              {completedLessons}/{ALL_LESSONS.length} lessons done
            </span>
          </span>
          <span className="text-[18px]" style={{ color: C.faint }} aria-hidden="true">›</span>
        </button>
      </div>
    </div>
  );
}

// ....................................................... SCENARIO PRE-CALL
function ScenarioDetail({
  meta,
  shop,
  difficultyStage,
  onBack,
  onCall,
  rm,
}: {
  meta: PersonaMeta;
  shop: ShopId;
  difficultyStage: DifficultyStage;
  onBack: () => void;
  onCall: () => void;
  rm: boolean;
}) {
  const diff = DIFFICULTY[shop];
  return (
    <div className="absolute inset-0 overflow-y-auto" style={{ background: C.night }}>
      <div className="relative mx-auto flex min-h-full max-w-[520px] flex-col">
        <div
          className="relative"
          style={{ height: 280, background: "radial-gradient(220px 170px at 68% 24%, rgba(255,179,92,0.32), transparent 70%), repeating-linear-gradient(135deg, rgba(255,179,92,0.07) 0 14px, transparent 14px 28px)" }}
        >
          <div className="absolute left-5 top-14">
            <BackButton onClick={onBack} label="Back to the bazaar" />
          </div>
          <div
            className="absolute left-1/2 top-[120px] flex -translate-x-1/2 items-center justify-center rounded-full"
            style={{ width: 108, height: 108, background: "radial-gradient(circle at 34% 30%, #FFC888, #E8823C 60%, #B85E24)", boxShadow: "0 0 46px rgba(255,179,92,0.5)", fontFamily: DISPLAY, fontWeight: 600, fontSize: 44, color: "rgba(10,13,22,0.85)" }}
            aria-hidden="true"
          >
            {initial(meta.name)}
          </div>
        </div>
        <div className="flex flex-1 flex-col px-7 pb-10 pt-6">
          <span className="self-start rounded-full px-3 py-1.5 text-[11.5px] font-semibold" style={{ color: difficultyColor(diff), background: "rgba(255,179,92,0.12)" }}>
            {diff} · {progressionLabel(difficultyStage)}
          </span>
          <h1 className="mt-3.5" style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: 30, lineHeight: 1.1, color: C.milk }}>
            {meta.name}
          </h1>
          <div className="text-[14px]" style={{ color: C.muted }}>
            {meta.sceneLabel}
          </div>
          <p className="mt-4 text-[15px] leading-relaxed" style={{ color: C.milk }}>
            {SCENARIO_BRIEF[shop]}
          </p>
          <p className="mt-3 text-[13px] leading-relaxed" style={{ color: C.muted }}>
            {difficultyStage === 1
              ? "You will get shorter turns, extra prompting, and patient repeats."
              : difficultyStage === 3
                ? "Expect faster turns, follow-up questions, and fewer hints."
                : "Expect natural turns with help when you ask for it."}
          </p>
          <button
            onClick={onCall}
            className={"mt-auto flex w-full items-center justify-center gap-2.5 rounded-[16px] text-[17px] font-bold focus-visible:outline focus-visible:outline-2" + (rm ? "" : " transition-transform active:scale-[0.99]")}
            style={{ marginTop: 32, padding: 17, background: C.sodium, color: C.ink, boxShadow: "0 12px 32px rgba(255,179,92,0.30)", outlineColor: C.milk }}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M6 3.5 8 3l1.6 3.4-1.6 1.3a9 9 0 0 0 4.3 4.3l1.3-1.6L17 12l-.5 2c-.2.8-1 1.3-1.8 1.1A13 13 0 0 1 4.9 5.3C4.7 4.5 5.2 3.7 6 3.5Z" fill={C.ink} />
            </svg>
            Call {meta.name}
          </button>
        </div>
      </div>
    </div>
  );
}

// ....................................................... THE CALL
function CallScreen({
  meta,
  lang,
  difficultyStage,
  captionsDefault,
  onEnd,
  onBack,
  rm,
  practice = null,
}: {
  meta: PersonaMeta;
  lang: Lang;
  difficultyStage: DifficultyStage;
  captionsDefault: boolean;
  onEnd: (payload: SessionEnd) => void;
  onBack: () => void;
  rm: boolean;
  practice?: PracticeLine | null;
}) {
  const call = useMaatuCall(meta.id, difficultyStage, practice);
  const [caps, setCaps] = useState(captionsDefault);
  const [slowPending, setSlowPending] = useState(false);
  const [sec, setSec] = useState(0);
  const [noShow, setNoShow] = useState(false);
  const slowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endedRef = useRef(false);

  useEffect(() => {
    call.connect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If nobody answers within 25 seconds of going live, say so instead of
  // leaving the learner on a silent call (the agent brain may be offline).
  useEffect(() => {
    if (call.phase !== "live" || call.characterHeard) {
      setNoShow(false);
      return;
    }
    const t = setTimeout(() => setNoShow(true), 25000);
    return () => clearTimeout(t);
  }, [call.phase, call.characterHeard]);

  useEffect(() => {
    if (call.phase !== "live") return;
    const t = setInterval(() => setSec((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [call.phase]);

  useEffect(() => {
    if (!call.slowerPace) return;
    setSlowPending(false);
    if (slowTimer.current) clearTimeout(slowTimer.current);
  }, [call.slowerPace]);

  useEffect(() => {
    return () => {
      if (slowTimer.current) clearTimeout(slowTimer.current);
    };
  }, []);

  const pressSlow = async () => {
    if (call.slowerPace || slowPending || call.phase !== "live") return;
    const sent = await call.requestSlowDown();
    if (!sent) return;
    setSlowPending(true);
    slowTimer.current = setTimeout(() => setSlowPending(false), 6000);
  };

  const endCall = async () => {
    if (endedRef.current) return;
    endedRef.current = true;
    const room = call.roomName;
    await call.hangUp();
    onEnd({
      room,
      transcript: call.recordDisplayTranscript(),
      rawTranscript: call.recordTranscript(),
      durationSec: sec,
      endedUnexpectedly: call.endedUnexpectedly,
    });
  };

  // A dropped connection (network blip, agent offline, token expiry) must not
  // strand the learner on a dead call screen: route out with what we have.
  useEffect(() => {
    if (call.phase !== "ended" || endedRef.current) return;
    endedRef.current = true;
    onEnd({
      room: call.roomName,
      transcript: call.recordDisplayTranscript(),
      rawTranscript: call.recordTranscript(),
      durationSec: sec,
      endedUnexpectedly: call.endedUnexpectedly,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call.phase]);

  const mm = Math.floor(sec / 60);
  const ss = String(sec % 60).padStart(2, "0");
  const active: Speaker = call.phase === "live" ? call.speaker : null;
  const isClass = meta.scenario === "class" || meta.scenario === "tutor";

  // Two-line caption block from the real transcript, current line emphasized.
  const recent = caps ? call.transcript.slice(-2) : [];
  const statusLine =
    call.phase === "connecting"
      ? `Calling ${meta.name}`
      : call.phase === "error"
        ? call.error ?? "Could not connect"
        : call.connectionIssue
          ? call.connectionIssue
        : call.phase === "ended"
          ? "Call over"
          : call.micIssue
            ? call.micIssue
          : noShow && !call.characterHeard
            ? `${meta.name} is not answering right now. Hang up and try again in a minute.`
          : call.muted
            ? "Microphone is off. Tap the mic to answer."
          : active === "learner"
            ? "Your turn, just talk"
            : `${meta.name} is listening`;

  return (
    <div className={"absolute inset-0 overflow-hidden" + (rm ? " mt-noanim" : "")} style={{ background: C.night }}>
      <CallBackdrop scenario={meta.scenario} />
      <div className="absolute inset-x-0 top-0 pointer-events-none" style={{ height: 420, background: "radial-gradient(220px 200px at 50% 8%, rgba(255,179,92,0.24), transparent 68%)" }} aria-hidden="true" />

      <div className="relative mx-auto flex h-full max-w-[440px] flex-col">
        {/* header */}
        <div className="flex items-center justify-between px-6 pt-14">
          <span className="flex items-center gap-2 text-[13px]" style={{ color: C.muted }}>
            <button onClick={onBack} aria-label="Back" className="opacity-70 hover:opacity-100" style={{ color: C.muted }}>
              ‹
            </button>
            {isClass ? meta.sceneLabel : `${meta.name} · ${meta.sceneLabel.split(",")[0]}`}
          </span>
          <span className="inline-flex items-center gap-2 text-[12.5px] font-semibold" style={{ color: C.kumkum }}>
            <span className={"rounded-full" + (rm ? "" : " mt-dotflash")} style={{ width: 7, height: 7, background: C.kumkum }} />
            <span style={{ fontFamily: MONO }}>
              {mm}:{ss}
            </span>
          </span>
        </div>

        {/* avatar + speaking state */}
        <div className="flex flex-col items-center pt-6">
          <div className="relative flex items-center justify-center" style={{ width: 120, height: 120 }}>
            {active && !rm && <div className="mt-ring absolute rounded-full" style={{ width: 120, height: 120, border: `1px solid ${active === "learner" ? "rgba(191,239,219,0.45)" : "rgba(255,179,92,0.45)"}` }} />}
            <div
              className="flex items-center justify-center rounded-full"
              style={{ width: 100, height: 100, background: "radial-gradient(circle at 34% 30%, #FFC888, #E8823C 60%, #B85E24)", boxShadow: "0 0 46px rgba(255,179,92,0.5)", fontFamily: DISPLAY, fontWeight: 600, fontSize: 40, color: "rgba(10,13,22,0.85)" }}
              aria-hidden="true"
            >
              {initial(meta.name)}
            </div>
          </div>
          <div className="mt-4" style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: 22, color: C.milk }}>
            {meta.name}
          </div>
          {active === "character" && (
            <div className="mt-2.5 inline-flex items-center gap-2 rounded-full" style={{ padding: "6px 13px", background: "rgba(255,179,92,0.12)", border: "1px solid rgba(255,179,92,0.26)" }}>
              <Bars color={C.sodium} rm={rm} />
              <span className="text-[12px] font-semibold" style={{ color: C.sodium }}>
                {meta.name} is speaking
              </span>
            </div>
          )}
          {active === "learner" && (
            <div className="mt-2.5 inline-flex items-center gap-2 rounded-full" style={{ padding: "6px 14px", background: "rgba(191,239,219,0.10)", border: "1px solid rgba(191,239,219,0.28)" }}>
              <Bars color={C.tube} rm={rm} />
              <span className="text-[12px] font-semibold" style={{ color: C.tube }}>
                Listening to you
              </span>
            </div>
          )}
        </div>

        {/* caption block */}
        <div className="flex flex-1 flex-col justify-center gap-4 px-7">
          {(call.connectionIssue || call.micIssue || (noShow && !call.characterHeard)) && recent.length > 0 && (
            <p className="text-center text-[13px] font-semibold" style={{ color: C.kumkum }}>
              {call.connectionIssue ?? call.micIssue ?? `${meta.name} is not answering right now. Hang up and try again in a minute.`}
            </p>
          )}
          {call.needsAudioUnlock ? (
            <button
              onClick={call.unlockAudio}
              className="mx-auto rounded-full px-6 py-3 text-[15px] font-bold focus-visible:outline focus-visible:outline-2"
              style={{ background: C.sodium, color: C.ink, outlineColor: C.tube }}
            >
              🔊 Tap to hear {meta.name}
            </button>
          ) : recent.length > 0 ? (
            recent.map((l, i) => {
              const last = i === recent.length - 1;
              const you = l.who === "learner";
              return (
                <div key={i} style={{ opacity: last ? 1 : 0.42 }}>
                  <div className="mb-1 text-[11px] font-bold" style={{ letterSpacing: 0.5, color: you ? C.tube : C.sodium }}>
                    {you ? "YOU" : meta.name.toUpperCase()}
                  </div>
                  <div style={{ fontFamily: BODY, fontSize: last ? 21 : 16, fontWeight: last ? 500 : 400, lineHeight: 1.35, color: last ? C.milk : C.muted }}>
                    {l.text}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-center text-[15px]" style={{ color: C.muted }}>
              {statusLine}
            </p>
          )}
        </div>

        {/* slow down */}
        <div className="flex justify-center pb-1">
          <button
            onClick={pressSlow}
            disabled={call.phase !== "live" || call.slowerPace || slowPending}
            aria-label={call.slowerPace ? "Slower speaking pace is on" : slowPending ? "Asking to slow down" : "Ask to slow down"}
            aria-pressed={call.slowerPace}
            className="inline-flex items-center gap-2 rounded-full text-[13px] font-semibold focus-visible:outline focus-visible:outline-2 disabled:cursor-default"
            style={{ padding: "9px 16px", color: call.slowerPace ? C.tube : C.muted, background: call.slowerPace ? "rgba(191,239,219,0.14)" : "rgba(242,237,226,0.06)", border: `1px solid ${call.slowerPace ? "rgba(191,239,219,0.4)" : LINE}`, outlineColor: C.tube }}
          >
            🐢 {call.slowerPace ? "Slower pace is on" : slowPending ? "Asking..." : SLOW[lang] || SLOW.kn}
          </button>
        </div>

        {/* controls */}
        <div className="flex items-center justify-center gap-6 pb-12 pt-3">
          <button
            onClick={call.toggleMute}
            disabled={call.phase !== "live"}
            aria-label={call.muted ? "Unmute" : "Mute"}
            aria-pressed={call.muted}
            className="flex items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 disabled:opacity-40"
            style={{ width: 60, height: 60, background: C.tar, border: `1px solid ${LINE}`, outlineColor: C.tube }}
          >
            <MicIcon muted={call.muted} />
          </button>
          <button
            onClick={endCall}
            aria-label="Hang up"
            className="flex items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2"
            style={{ width: 76, height: 76, background: C.kumkum, boxShadow: "0 12px 34px rgba(232,80,58,0.4)", outlineColor: C.milk }}
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ transform: "rotate(135deg)" }}>
              <path d="M6 3.5 8 3l1.6 3.4-1.6 1.3a9 9 0 0 0 4.3 4.3l1.3-1.6L17 12l-.5 2c-.2.8-1 1.3-1.8 1.1A13 13 0 0 1 4.9 5.3C4.7 4.5 5.2 3.7 6 3.5Z" fill={C.onKumkum} />
            </svg>
          </button>
          <button
            onClick={() => setCaps(!caps)}
            aria-label="Captions"
            aria-pressed={caps}
            className="flex items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2"
            style={{ width: 60, height: 60, background: C.tar, border: `1px solid ${LINE}`, outlineColor: C.tube }}
          >
            <span className="text-[16px] font-bold" style={{ color: caps ? C.sodium : C.faint, borderBottom: caps ? `2px solid ${C.sodium}` : "2px solid transparent", lineHeight: 1.15 }}>
              Aa
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ....................................................... THE DEBRIEF
type Report = {
  headline: string;
  strength: string;
  duration_min: number;
  takeaways: { you: string; native: string; why: string }[];
  words: [string, string][];
  transcript: [string, string][];
  coach_audio_b64?: string | null;
};

function DebriefScreen({
  meta,
  session,
  userId,
  onReportReady,
  onHub,
  onAgain,
  onStudio,
}: {
  meta: PersonaMeta;
  session: SessionEnd | null;
  userId: string;
  onReportReady: () => void;
  onHub: () => void;
  onAgain: () => void;
  onStudio: (text: string) => void;
}) {
  const [report, setReport] = useState<Report | null>(null);
  const [status, setStatus] = useState<"pending" | "ready" | "none">("pending");
  const [playing, setPlaying] = useState(false);
  const [persisted, setPersisted] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const learnerLines = session?.transcript.filter((l) => l.who === "learner").length ?? 0;
    if (!session || !session.room || learnerLines < 1) {
      setStatus("none");
      return;
    }
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room: session.room,
            userId,
            personaId: meta.id,
            durationSec: session.durationSec,
            transcript: session.transcript,
          }),
        });
        const data = await res.json();
        if (!alive) return;
        if (data.status === "ready" && data.report) {
          setReport(data.report);
          setPersisted(data.persisted !== false);
          setStatus("ready");
          onReportReady();
        } else {
          setStatus("none");
        }
      } catch {
        if (alive) setStatus("none");
      }
    })();
    return () => {
      alive = false;
    };
  }, [session, meta.id, userId, onReportReady]);

  const toggleAudio = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  };

  return (
    <div className="absolute inset-0 overflow-y-auto" style={{ background: C.night }}>
      <div className="absolute inset-x-0 top-0 pointer-events-none" style={{ height: 260, background: "radial-gradient(180px 130px at 50% 0, rgba(191,239,219,0.20), transparent 70%)" }} aria-hidden="true" />
      <div className="relative mx-auto max-w-[560px] px-6 pb-28 pt-16">
        {session?.endedUnexpectedly && (
          <div className="mb-4 rounded-[14px] px-4 py-3 text-[13px] font-semibold" style={{ background: "rgba(232,80,58,0.12)", border: "1px solid rgba(232,80,58,0.30)", color: C.onKumkum }}>
            The call was interrupted. Your transcript is safe.
          </div>
        )}
        {!persisted && (
          <div className="mb-4 rounded-[14px] px-4 py-3 text-[13px] font-semibold" style={{ background: "rgba(255,179,92,0.12)", border: "1px solid rgba(255,179,92,0.30)", color: C.sodium }}>
            Your coach notes are ready, but they could not be saved to progress.
          </div>
        )}
        <div className="text-center">
          {status === "ready" && report?.coach_audio_b64 && (
            <button
              onClick={toggleAudio}
              className="inline-flex items-center gap-2.5 rounded-full focus-visible:outline focus-visible:outline-2"
              style={{ padding: "8px 15px", background: "rgba(191,239,219,0.10)", border: "1px solid rgba(191,239,219,0.28)", outlineColor: C.tube }}
            >
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <audio ref={audioRef} src={`data:audio/mp3;base64,${report.coach_audio_b64}`} onEnded={() => setPlaying(false)} />
              <Bars color={C.tube} />
              <span className="text-[12px] font-semibold" style={{ color: C.tube }}>
                {playing ? "Coach is speaking" : "Play coach summary"}
              </span>
            </button>
          )}
          <h1 className="mx-auto mt-4" style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: 28, lineHeight: 1.12, color: C.milk, maxWidth: 380 }}>
            {status === "none" ? "That was a short one." : report ? report.headline : "You did it. That was a real conversation."}
          </h1>
          <p className="mt-1.5 text-[14px]" style={{ color: C.muted }}>
            {report ? `${report.duration_min} min with ${meta.name}. Here is how it went.` : `${meta.name}, ${meta.sceneLabel.split(",")[0].toLowerCase()}`}
          </p>
          {status === "ready" && report && !report.coach_audio_b64 && (
            <p className="mt-2 text-[12.5px]" style={{ color: C.mono }}>
              The audio summary is unavailable. Your written coach notes are complete.
            </p>
          )}
        </div>

        {status === "pending" && (
          <div className="mt-6 flex flex-col gap-3">
            {[70, 100, 45].map((w, i) => (
              <div key={i} className="mt-skeleton h-3.5 rounded-full" style={{ width: `${w}%` }} />
            ))}
          </div>
        )}

        {status === "none" && (
          <div className="mt-6 rounded-[16px] p-5 text-[14px] leading-relaxed" style={{ background: C.tar, border: `1px solid ${LINE}`, color: C.milk }}>
            Talk a little longer next time and the coach will have plenty to say. Every real sentence counts.
          </div>
        )}

        {status === "ready" && report && (
          <div className="mt-6 flex flex-col gap-3">
            {report.takeaways[0] && (
              <div className="rounded-[16px] p-4" style={{ background: C.tar, border: "1px solid rgba(191,239,219,0.20)" }}>
                <div className="mb-2 text-[12px] font-bold" style={{ color: C.tube }}>
                  WENT WELL
                </div>
                <div className="text-[14.5px] leading-relaxed" style={{ color: C.milk }}>
                  {report.strength || report.takeaways[0].why}
                </div>
              </div>
            )}
            {report.takeaways.map((t, i) => (
              <div key={i} className="rounded-[16px] p-4" style={{ background: C.tar, border: "1px solid rgba(255,179,92,0.22)" }}>
                <div className="mb-2 text-[12px] font-bold" style={{ color: C.sodium }}>
                  TRY NEXT TIME
                </div>
                <div className="text-[13.5px]" style={{ color: C.muted }}>
                  {t.you}
                </div>
                <div className="mt-0.5 text-[15px] font-medium" style={{ color: C.milk }}>
                  ↳ {t.native}
                </div>
                {t.why && (
                  <div className="mt-1 text-[12.5px]" style={{ color: C.mono }}>
                    {t.why}
                  </div>
                )}
                <button type="button" onClick={() => onStudio(t.native)} className="mt-2 text-[12.5px] font-semibold focus-visible:outline focus-visible:outline-2" style={{ color: C.tube, outlineColor: C.tube }}>
                  Practise this in the Studio ›
                </button>
              </div>
            ))}
            {report.words.length > 0 && (
              <div className="rounded-[16px] p-4" style={{ background: C.tar, border: `1px solid ${LINE}` }}>
                <div className="mb-2.5 text-[12px] font-bold" style={{ color: C.muted }}>
                  PHRASES YOU NAILED
                </div>
                <div className="flex flex-wrap gap-2">
                  {report.words.map(([w, m], i) => (
                    <span key={i} className="rounded-full px-3 py-1.5 text-[12.5px]" style={{ background: "rgba(191,239,219,0.10)", color: C.tube }}>
                      <span className="font-semibold">{w}</span>
                      <span style={{ color: "rgba(191,239,219,0.7)" }}> · {m}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            {report.transcript.length > 0 && (
              <details className="rounded-[16px] px-4 py-3" style={{ background: "rgba(242,237,226,0.04)", border: `1px solid ${LINE_SOFT}` }}>
                <summary className="flex cursor-pointer list-none items-center justify-between text-[13px] font-semibold" style={{ color: C.muted }}>
                  Transcript
                  <span aria-hidden="true">▾</span>
                </summary>
                <div className="mt-3 flex flex-col gap-2 pb-1">
                  {report.transcript.map(([who, text], i) => (
                    <div key={i} className="text-[12.5px] leading-snug">
                      <span className="font-bold" style={{ color: who === "you" ? C.tube : C.sodium }}>
                        {who === "you" ? "You " : `${meta.name[0]} `}
                      </span>
                      <span style={{ color: "rgba(242,237,226,0.62)" }}>{text}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <button onClick={onAgain} className="rounded-[16px] py-3.5 text-[15px] font-bold focus-visible:outline focus-visible:outline-2" style={{ background: C.sodium, color: C.ink, outlineColor: C.tube }}>
            Practice again
          </button>
          <button onClick={onHub} className="rounded-[16px] py-3.5 text-[15px] font-semibold focus-visible:outline focus-visible:outline-2" style={{ background: "transparent", color: C.milk, border: `1px solid ${LINE}`, outlineColor: C.tube }}>
            Back to the bazaar
          </button>
        </div>
      </div>
    </div>
  );
}

// ....................................................... PROGRESS
function StatTile({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="rounded-[16px] p-4" style={{ background: C.tar, border: `1px solid ${LINE}` }}>
      <div style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: 40, lineHeight: 1, color: C.sodium }}>{value}</div>
      <div className="mt-1.5 text-[12px]" style={{ color: C.muted }}>
        {label}
      </div>
    </div>
  );
}

function StudioStats({ lang }: { lang: Lang }) {
  const [v, setV] = useState({ heard: 0, checked: 0, saved: 0, due: 0 });
  useEffect(() => {
    const n = (k: string) => Number(window.localStorage.getItem(k) || 0) || 0;
    const r = countFor(lang);
    setV({ heard: n("maatu-studio-heard"), checked: n("maatu-studio-checked"), saved: r.saved, due: r.due });
  }, [lang]);
  return (
    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatTile value={v.heard} label="studio lines heard" />
      <StatTile value={v.checked} label="lines checked" />
      <StatTile value={v.saved} label="saved for review" />
      <StatTile value={v.due} label="due to review now" />
    </div>
  );
}

function ProgressScreen({ stats, loading, lang, onSchool }: { stats: StreetStats; loading: boolean; lang: Lang; onSchool: () => void }) {
  const hasSessions = stats.sessionCount > 0;
  return (
    <div className="absolute inset-0 overflow-y-auto" style={{ background: C.night }}>
      <div className="relative mx-auto max-w-[760px] px-6 pb-28 pt-16 lg:pt-14">
        <h1 style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: 30, lineHeight: 1.05, color: C.milk }}>Your progress</h1>
        <div className="mt-1 text-[13px]" style={{ color: C.muted }}>
          Your completed lessons and real speaking history.
        </div>

        <CourseProgressCard activeLanguage={lang} onOpenCourse={onSchool} />

        <div className="mb-3 mt-7">
          <div className="text-[16px] font-bold" style={{ color: C.milk }}>Conversation practice</div>
          <div className="mt-0.5 text-[12px]" style={{ color: C.muted }}>Only completed calls are counted here.</div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="mt-skeleton rounded-[16px]" style={{ height: 96 }} />
            ))}
          </div>
        ) : !hasSessions ? (
          <div className="rounded-[16px] p-6 text-center" style={{ background: C.tar, border: `1px solid ${LINE}` }}>
            <div className="mx-auto rounded-[13px]" style={{ width: 44, height: 44, border: "1px dashed rgba(255,179,92,0.4)" }} />
            <div className="mt-3.5 text-[15px] font-semibold" style={{ color: C.milk }}>
              No calls yet
            </div>
            <div className="mx-auto mt-1.5 text-[13.5px] leading-relaxed" style={{ color: C.muted, maxWidth: 260 }}>
              Your first one is the bravest. Once you talk, your minutes, nights and places will appear here.
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile value={minutes(stats.totalSeconds)} label="minutes spoken" />
              <StatTile value={stats.sessionCount} label={stats.sessionCount === 1 ? "conversation" : "conversations"} />
              <StatTile value={stats.nights} label={stats.nights === 1 ? "night spoken" : "nights spoken"} />
              <StatTile value={minutes(stats.thisWeekSeconds)} label="minutes this week" />
            </div>
            <StudioStats lang={lang} />
            <div className="mt-4 rounded-[16px] p-5" style={{ background: C.tar, border: `1px solid ${LINE}` }}>
              <div className="text-[12px] font-bold" style={{ letterSpacing: 1, color: C.muted }}>
                PLACES PRACTICED
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {stats.scenarios.map((s) => (
                  <div key={s.scenario} className="flex items-center justify-between rounded-[12px] px-3.5 py-2.5" style={{ background: "rgba(242,237,226,0.04)" }}>
                    <span className="text-[13.5px] font-semibold capitalize" style={{ color: C.milk }}>
                      {s.scenario}
                    </span>
                    <span className="text-[12.5px]" style={{ color: C.tube }}>
                      {s.sessions} {s.sessions === 1 ? "call" : "calls"} · {minutes(s.seconds)} min
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ....................................................... SETTINGS
function Row({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[14px] px-4 py-3.5" style={{ background: C.tar, border: `1px solid ${LINE}` }}>
      <div>
        <div className="text-[15px] font-medium" style={{ color: C.milk }}>
          {label}
        </div>
        {sub && (
          <div className="mt-0.5 text-[12px]" style={{ color: C.muted }}>
            {sub}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      role="switch"
      aria-checked={on}
      aria-label={label}
      className="relative flex-none rounded-full focus-visible:outline focus-visible:outline-2"
      style={{ width: 48, height: 28, background: on ? C.sodium : C.elevated, border: on ? "none" : `1px solid ${LINE}`, outlineColor: C.tube }}
    >
      <span className="absolute rounded-full" style={{ top: 3, [on ? "right" : "left"]: 3, width: 22, height: 22, background: on ? C.ink : C.faint } as React.CSSProperties} />
    </button>
  );
}

function SettingsScreen({
  lang,
  setLang,
  caps,
  setCaps,
  rm,
  setRm,
  canInstall,
  onInstall,
}: {
  lang: Lang;
  setLang: (l: Lang) => void;
  caps: boolean;
  setCaps: (v: boolean) => void;
  rm: boolean;
  setRm: (v: boolean) => void;
  canInstall: boolean;
  onInstall: () => void;
}) {
  return (
    <div className="absolute inset-0 overflow-y-auto" style={{ background: C.night }}>
      <div className="relative mx-auto max-w-[560px] px-6 pb-28 pt-16 lg:pt-14">
        <h1 style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: 30, lineHeight: 1.05, color: C.milk }}>Settings</h1>

        <div className="mt-5 flex flex-col gap-3">
          <div className="rounded-[14px] p-4" style={{ background: C.tar, border: `1px solid ${LINE}` }}>
            <div className="mb-3 text-[15px] font-medium" style={{ color: C.milk }}>
              Language
            </div>
            <div className="flex gap-2">
              {LANGS.map((k) => {
                const on = lang === k;
                return (
                  <button
                    key={k}
                    onClick={() => setLang(k)}
                    aria-pressed={on}
                    className="flex-1 rounded-[12px] py-2.5 text-[14px] font-semibold focus-visible:outline focus-visible:outline-2"
                    style={{ background: on ? "rgba(255,179,92,0.14)" : C.base, color: on ? C.sodium : C.muted, border: on ? "1px solid rgba(255,179,92,0.4)" : `1px solid ${LINE}`, outlineColor: C.sodium }}
                  >
                    {LANG_NAME[k]}
                  </button>
                );
              })}
            </div>
          </div>

          <Row label="Captions" sub="Show romanized captions during a call">
            <Toggle on={caps} onClick={() => setCaps(!caps)} label="Captions" />
          </Row>
          <Row label="Reduce motion" sub="Calm the lamp glow and animations">
            <Toggle on={rm} onClick={() => setRm(!rm)} label="Reduce motion" />
          </Row>

          {canInstall && (
            <button
              onClick={onInstall}
              className="mt-1 rounded-[14px] py-3.5 text-[15px] font-bold focus-visible:outline focus-visible:outline-2"
              style={{ background: C.sodium, color: C.ink, outlineColor: C.tube }}
            >
              Install Maatu on this device
            </button>
          )}

          <div className="mt-3 text-center text-[12px]" style={{ color: C.faint }}>
            <span style={{ fontFamily: MONO }}>Maatu · private voice learning</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ....................................................... NAV SHELL
const TABS: { tab: Tab; label: string }[] = [
  { tab: "hub", label: "Talk" },
  { tab: "build", label: "Build" },
  { tab: "school", label: "Course" },
  { tab: "progress", label: "Progress" },
  { tab: "settings", label: "Settings" },
];

function SideRail({ active, go, lang }: { active: Tab; go: (t: Tab) => void; lang: Lang }) {
  return (
    <aside className="hidden lg:flex" style={{ width: 236, flex: "none", background: C.base, borderRight: `1px solid ${LINE_SOFT}` }}>
      <div className="flex w-full flex-col px-5 py-7">
        <div className="mb-9 flex items-center gap-3">
          <div className="flex items-center justify-center rounded-[12px]" style={{ width: 38, height: 38, background: "linear-gradient(150deg,#FFB35C,#E8503A)" }}>
            <span style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 20, color: C.ink }}>M</span>
          </div>
          <span style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: 20, color: C.milk }}>Maatu</span>
        </div>
        {TABS.map(({ tab, label }) => {
          const on = active === tab;
          return (
            <button
              key={tab}
              onClick={() => go(tab)}
              className="mb-1.5 flex items-center gap-3 rounded-[13px] px-3.5 py-3 text-left text-[15px] font-semibold focus-visible:outline focus-visible:outline-2"
              style={{ background: on ? "rgba(255,179,92,0.12)" : "transparent", color: on ? C.sodium : C.muted, outlineColor: C.sodium }}
            >
              <NavIcon tab={tab} active={on} />
              {label}
            </button>
          );
        })}
        <div className="mt-auto flex items-center gap-3 rounded-[13px] p-3" style={{ background: C.tar }}>
          <div className="rounded-full" style={{ width: 34, height: 34, background: "radial-gradient(circle at 30% 30%, #FFB35C, #E8503A)" }} />
          <div>
            <div className="text-[13.5px] font-semibold" style={{ color: C.milk }}>
              {HOST[lang].name}
            </div>
            <div className="text-[11px]" style={{ color: C.mono }}>
              {LANG_NAME[lang]} · learner
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function BottomNav({ active, go }: { active: Tab; go: (t: Tab) => void }) {
  return (
    <nav
      className="absolute inset-x-0 bottom-0 z-20 flex justify-around lg:hidden"
      style={{ background: "rgba(10,13,22,0.86)", backdropFilter: "blur(16px)", borderTop: `1px solid ${LINE_SOFT}`, padding: "12px 8px calc(env(safe-area-inset-bottom) + 14px)" }}
    >
      {TABS.map(({ tab, label }) => {
        const on = active === tab;
        return (
          <button key={tab} onClick={() => go(tab)} className="flex flex-col items-center gap-1 focus-visible:outline focus-visible:outline-2" style={{ color: on ? C.sodium : C.faint, outlineColor: C.sodium }}>
            <NavIcon tab={tab} active={on} />
            <span className="text-[10.5px]" style={{ fontWeight: on ? 600 : 400 }}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

// ....................................................... APP SHELL
export default function MaatuApp() {
  const [screen, setScreen] = useState<Screen>("hub");
  const [ready, setReady] = useState(false);
  const [lang, setLangState] = useState<Lang>("kn");
  const [activePersona, setActivePersona] = useState<string>("kn-auto");
  const [pendingShop, setPendingShop] = useState<ShopId | null>(null);
  const [tutorOrigin, setTutorOrigin] = useState<Screen>("hub");
  const [pendingLessonId, setPendingLessonId] = useState("l1");
  const [lastSession, setLastSession] = useState<SessionEnd | null>(null);
  const [lastLessonResult, setLastLessonResult] = useState<LessonResult | null>(null);
  const [studioSeed, setStudioSeed] = useState<{ text: string; nonce: number } | null>(null);
  const [rm, setRm] = useState(false);
  const [caps, setCaps] = useState(true);
  const [userId, setUserId] = useState("");
  const [stats, setStats] = useState<StreetStats>(EMPTY_STATS);
  const [statsLoading, setStatsLoading] = useState(true);
  const installEvt = useRef<{ prompt: () => void } | null>(null);
  const [canInstall, setCanInstall] = useState(false);

  // First run: no stored language means show onboarding.
  useEffect(() => {
    const storedMotion = window.localStorage.getItem("maatu-reduce-motion");
    const prefersReduced = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setRm(storedMotion === null ? prefersReduced : storedMotion === "true");
    setCaps(window.localStorage.getItem("maatu-captions") !== "false");
    const storedLang = window.localStorage.getItem("maatu-lang") as Lang | null;
    if (storedLang && LANGS.includes(storedLang)) {
      setLangState(storedLang);
      setScreen("hub");
    } else {
      setScreen("onboarding");
    }
    const key = "maatu-user-id";
    let id = window.localStorage.getItem(key);
    if (!id) {
      id = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `maatu-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.localStorage.setItem(key, id);
    }
    setUserId(id);
    setReady(true);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      installEvt.current = e as unknown as { prompt: () => void };
      setCanInstall(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    window.localStorage.setItem("maatu-lang", l);
  }, []);

  const setCaptions = useCallback((value: boolean) => {
    setCaps(value);
    window.localStorage.setItem("maatu-captions", String(value));
  }, []);

  const setReducedMotion = useCallback((value: boolean) => {
    setRm(value);
    window.localStorage.setItem("maatu-reduce-motion", String(value));
  }, []);

  const loadStats = useCallback(async () => {
    if (!userId) return;
    setStatsLoading(true);
    try {
      const response = await fetch(`/api/stats?userId=${encodeURIComponent(userId)}`, { cache: "no-store" });
      if (!response.ok) throw new Error("stats unavailable");
      setStats(await response.json());
    } catch {
      setStats(EMPTY_STATS);
    } finally {
      setStatsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (screen === "hub" || screen === "progress") void loadStats();
  }, [screen, loadStats]);

  const handleReportReady = useCallback(() => {
    void loadStats();
  }, [loadStats]);

  const openScenario = useCallback(
    (shop: ShopId) => {
      const p = personaFor(shop, lang);
      if (!p) return;
      setActivePersona(p);
      setPendingShop(shop);
      setScreen("scenario");
    },
    [lang],
  );

  const openLesson = useCallback((lessonId: string) => {
    setPendingLessonId(lessonId);
    setScreen("lessonPreview");
  }, []);

  const startLesson = useCallback((lessonId: string) => {
    setPendingLessonId(lessonId);
    setActivePersona(`teacher-${lang}-${lessonId}`);
    setScreen("call");
  }, [lang]);

  // Free talk is reachable from both the hub and the classroom, so remember
  // where it started and go back there when the call ends.
  const [practiceLine, setPracticeLine] = useState<PracticeLine | null>(null);
  const startTutor = useCallback((line?: PracticeLine) => {
    setPracticeLine(line && line.target ? line : null);
    setTutorOrigin(screen === "school" ? "school" : screen === "build" ? "build" : "hub");
    setActivePersona(`tutor-${lang}`);
    setScreen("call");
  }, [lang, screen]);

  const isClassroom = activePersona.startsWith("teacher-") || activePersona.startsWith("tutor-");
  const meta: PersonaMeta = isClassroom
    ? activePersona.startsWith("tutor-")
      ? teacherMeta(lang, null)
      : teacherMeta(lang, activePersona.split("-").slice(2).join("-"))
    : requirePersona(activePersona);

  const handleCallEnd = useCallback(
    (payload: SessionEnd) => {
      if (activePersona.startsWith("teacher-")) {
        const lessonId = activePersona.split("-").slice(2).join("-");
        const lesson = ALL_LESSONS.find((item) => item.id === lessonId);
        const raw = payload.rawTranscript ?? [];
        const assessmentTranscript = Array.from(
          { length: Math.max(payload.transcript.length, raw.length) },
          (_, index) => {
            const displayLine = payload.transcript[index];
            const rawLine = raw[index];
            return {
              who: displayLine?.who ?? rawLine?.who ?? "learner",
              text: `${displayLine?.text ?? ""} ${rawLine?.text ?? ""}`.trim(),
            };
          },
        );
        const passed = lesson
          ? lessonWasMastered(assessmentTranscript, lesson, lang)
          : false;
        if (passed) markDone(lang, lessonId);
        if (lesson) setLastLessonResult({ lesson, passed, transcript: payload.transcript });
        setScreen(lesson ? "lessonResult" : "school");
      } else if (activePersona.startsWith("tutor-")) {
        setLastSession(payload);
        setScreen("debrief");
      } else {
        setLastSession(payload);
        setScreen("debrief");
      }
    },
    [activePersona, lang, tutorOrigin],
  );

  // Next lesson label for the course-first home card.
  const done = ready ? getDone(lang) : new Set<string>();
  const completedLessonCount = ALL_LESSONS.filter((lesson) => done.has(lesson.id)).length;
  const difficultyStage: DifficultyStage = completedLessonCount < 6 ? 1 : completedLessonCount < 12 ? 2 : 3;
  const nextIndex = ALL_LESSONS.findIndex((lesson) => !done.has(lesson.id));
  const nextLessonItem = nextIndex >= 0 ? ALL_LESSONS[nextIndex] : ALL_LESSONS[0];
  const nextLesson = { index: nextIndex >= 0 ? nextIndex + 1 : 1, title: nextLessonItem.title };
  const pendingLesson = ALL_LESSONS.find((lesson) => lesson.id === pendingLessonId) ?? ALL_LESSONS[0];

  const immersive = screen === "onboarding" || screen === "scenario" || screen === "call" || screen === "debrief" || screen === "lessonPreview" || screen === "lessonResult";
  const activeTab: Tab = (["hub", "school", "build", "progress", "settings"].includes(screen) ? screen : "hub") as Tab;
  const goTab = (t: Tab) => setScreen(t);

  const doInstall = () => {
    installEvt.current?.prompt();
    setCanInstall(false);
  };

  return (
    <div className={"mt-app relative flex h-dvh w-full overflow-hidden" + (rm ? " mt-noanim" : "")} style={{ background: C.night, fontFamily: BODY }}>
      {!immersive && <SideRail active={activeTab} go={goTab} lang={lang} />}

      <main className="relative flex-1 overflow-hidden">
        <div key={screen} className="absolute inset-0" style={{ animation: rm ? undefined : "mtFade 420ms ease both" }}>
          {!ready ? null : screen === "onboarding" ? (
            <Onboarding
              lang={lang}
              setLang={setLang}
              onEnter={() => {
                setLang(lang);
                setScreen("school");
              }}
              rm={rm}
            />
          ) : screen === "hub" ? (
            <Hub lang={lang} stats={stats} nextLesson={nextLesson} completedLessons={completedLessonCount} difficultyStage={difficultyStage} onScenario={openScenario} onSchool={() => setScreen("school")} onTutor={() => startTutor()} onBuild={() => setScreen("build")} rm={rm} />
          ) : screen === "lessonPreview" ? (
            <LessonPreviewScreen lang={lang} lesson={pendingLesson} onBack={() => setScreen("school")} onStart={() => startLesson(pendingLesson.id)} />
          ) : screen === "scenario" && pendingShop ? (
            <ScenarioDetail meta={meta} shop={pendingShop} difficultyStage={difficultyStage} onBack={() => setScreen("hub")} onCall={() => setScreen("call")} rm={rm} />
          ) : screen === "call" ? (
            <CallScreen meta={meta} lang={lang} difficultyStage={difficultyStage} captionsDefault={caps} onEnd={handleCallEnd} onBack={() => setScreen(activePersona.startsWith("teacher-") ? "lessonPreview" : activePersona.startsWith("tutor-") ? tutorOrigin : "hub")} rm={rm} practice={activePersona.startsWith("tutor-") ? practiceLine : null} />
          ) : screen === "lessonResult" && lastLessonResult ? (
            <LessonResultScreen
              lang={lang}
              lesson={lastLessonResult.lesson}
              passed={lastLessonResult.passed}
              transcript={lastLessonResult.transcript}
              onCourse={() => setScreen("school")}
              onOpenLesson={openLesson}
              onRetry={() => startLesson(lastLessonResult.lesson.id)}
            />
          ) : screen === "debrief" ? (
            <DebriefScreen meta={meta} session={lastSession} userId={userId} onReportReady={handleReportReady} onHub={() => setScreen(activePersona.startsWith("tutor-") ? tutorOrigin : "hub")} onAgain={() => setScreen("call")} onStudio={(text) => { setStudioSeed({ text, nonce: Date.now() }); setScreen("build"); }} />
          ) : screen === "progress" ? (
            <ProgressScreen stats={stats} loading={statsLoading} lang={lang} onSchool={() => setScreen("school")} />
          ) : screen === "school" ? (
            <ClassroomScreen lang={lang} onLanguageChange={setLang} onTutor={() => startTutor()} onLesson={openLesson} onBuild={() => setScreen("build")} />
          ) : screen === "build" ? (
            <BuildScreen lang={lang} onLanguageChange={setLang} seed={studioSeed} rm={rm} onTalk={(line) => startTutor(line)} />
          ) : screen === "settings" ? (
            <SettingsScreen lang={lang} setLang={setLang} caps={caps} setCaps={setCaptions} rm={rm} setRm={setReducedMotion} canInstall={canInstall} onInstall={doInstall} />
          ) : null}
        </div>

        {!immersive && <BottomNav active={activeTab} go={goTab} />}
      </main>
    </div>
  );
}
