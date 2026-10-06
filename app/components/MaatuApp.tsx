"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  ArrowRight,
  AudioLines,
  BookOpen,
  Bookmark,
  Check,
  ChevronRight,
  Coffee,
  GitBranch,
  LoaderCircle,
  Menu,
  MessageCircle,
  Mic,
  Settings2,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import {
  ALL_LESSONS,
  getDone,
  lessonWasMastered,
  markDone,
  teacherMeta,
  type Lesson,
} from "@/lib/curriculum";
import { LANGUAGE_ORDER, LANGUAGES, isLang } from "@/lib/languages";
import { loadReview, grade, type ReviewItem } from "@/lib/review";
import type { Lang } from "@/lib/maatu-design";
import type { PersonaMeta } from "@/lib/personas.generated";
import type { CoachReport } from "@/lib/coach";
import type { PracticeLine } from "./useMaatuCall";
import ConversationHistory from "./ConversationHistory";
import {
  migrateLegacyChats,
  activeConversation,
  selectConversation,
  createConversation,
  getConversation,
  conversationContext,
  translateConversation,
  HISTORY_EVENT,
  type ConversationThread,
} from "@/lib/conversation-history";
import { PERSONAS } from "@/lib/personas.generated";
import ConversationStudio from "./ConversationStudio";
import ScenarioStudio from "./ScenarioStudio";
import { BuildScreen } from "./BuildScreen";
import type { CallEnd } from "./CallRoom";
const CallRoom = dynamic(() => import("./CallRoom"), {
  ssr: false,
  loading: () => (
    <div className="app-loading" role="status">
      Opening your conversation…
    </div>
  ),
});
import { Brand, HearButton } from "./studio-ui";

type Screen =
  | "talk"
  | "scenes"
  | "build"
  | "course"
  | "progress"
  | "settings"
  | "call"
  | "recap"
  | "lesson"
  | "history";
type Stats = {
  totalSeconds: number;
  thisWeekSeconds: number;
  sessionCount: number;
  nights: number;
};
const NAV = [
  { id: "talk", label: "Just talk", icon: MessageCircle },
  { id: "scenes", label: "Real-life scenes", icon: Coffee },
  { id: "build", label: "Sentence lab", icon: GitBranch },
  { id: "course", label: "Your first words", icon: BookOpen },
  { id: "history", label: "Conversation history", icon: Bookmark },
  { id: "progress", label: "Your progress", icon: TrendingUp },
  { id: "settings", label: "Make it yours", icon: Settings2 },
] as const;

function read<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback;
  } catch {
    return fallback;
  }
}
function remember(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Practice does not depend on storage. */
  }
}

export default function MaatuApp() {
  const [chatReset, setChatReset] = useState(0);
  const [conversationId, setConversationId] = useState<string>();
  const [translation, setTranslation] = useState("");
  const [translationError, setTranslationError] = useState("");
  const [storageError, setStorageError] = useState(false);
  const [lang, setLang] = useState<Lang>("ta");
  const [screen, setScreen] = useState<Screen>("talk");
  const [menu, setMenu] = useState(false);
  const [ready, setReady] = useState(false);
  const [caps, setCaps] = useState(true);
  const [rm, setRm] = useState(false);
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const [user, setUser] = useState("");
  const [meta, setMeta] = useState<PersonaMeta | null>(null);
  const [practice, setPractice] = useState<PracticeLine | null>(null);
  const [origin, setOrigin] = useState<Screen>("talk");
  const [topic, setTopic] = useState("");
  const [textPersona, setTextPersona] = useState<string | undefined>();
  const [pendingLesson, setPendingLesson] = useState<Lesson | null>(null);
  const [finished, setFinished] = useState<CallEnd | null>(null);
  const [passed, setPassed] = useState(false);
  const [report, setReport] = useState<CoachReport | null>(null);
  const [reportState, setReportState] = useState<
    "idle" | "loading" | "ready" | "unavailable"
  >("idle");
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsError, setStatsError] = useState(false);
  const [review, setReview] = useState<ReviewItem[]>([]);
  const l = LANGUAGES[lang];

  useEffect(() => {
    let stored: unknown;
    try {
      stored = localStorage.getItem("maatu-lang");
    } catch {
      /* Default Tamil. */
    }
    if (isLang(stored)) setLang(stored);
    setCaps(read("maatu-caps", true));
    setRm(read("maatu-rm", false));
    const level = read<number>("maatu-difficulty", 1);
    if ([1, 2, 3].includes(level)) setStage(level as 1 | 2 | 3);
    let id = read<string>("maatu-user-id-v2", "");
    if (!id) {
      try {
        id = localStorage.getItem("maatu-user-id") ?? "";
      } catch {
        /* Anonymous session. */
      }
    }
    if (!id) id = crypto.randomUUID();
    remember("maatu-user-id-v2", id);
    setUser(id);
    migrateLegacyChats();
    const current = getConversation(activeConversation());
    if (current) continueThread(current);
    setReview(loadReview());
    setReady(true);
  }, []);
  useEffect(() => {
    const changed = (e: Event) =>
      setStorageError((e as CustomEvent).detail?.saved === false);
    window.addEventListener(HISTORY_EVENT, changed);
    return () => window.removeEventListener(HISTORY_EVENT, changed);
  }, []);
  function rememberThread(id: string) {
    setConversationId(id);
    selectConversation(id);
  }
  function continueThread(thread: ConversationThread) {
    rememberThread(thread.id);
    setLang(thread.lang);
    setTextPersona(
      thread.persona === "tutor" ||
        thread.persona.startsWith("tutor-") ||
        thread.persona.startsWith("teacher-")
        ? undefined
        : PERSONAS[thread.persona]?.language === thread.lang
          ? thread.persona
          : Object.values(PERSONAS).find(
              (p) =>
                p.language === thread.lang &&
                p.scenario === PERSONAS[thread.persona]?.scenario,
            )?.id,
    );
    setTopic("");
    setScreen("talk");
  }
  async function chooseLang(next: Lang) {
    if (next === lang || translation) return;
    const thread = getConversation(conversationId);
    setTranslationError("");
    if (
      thread &&
      (screen === "talk" || screen === "recap" || screen === "call")
    ) {
      setTranslation(
        `Bringing your conversation into ${LANGUAGES[next].name}…`,
      );
      // Call turns have already been saved by the transcription handler.
      if (screen === "call") setScreen("talk");
      try {
        await translateConversation(thread.id, thread.lang, next);
      } catch (e) {
        setTranslationError(
          e instanceof Error
            ? e.message
            : "Could not translate. Your conversation is saved.",
        );
        setTranslation("");
        return;
      }
      const scene = PERSONAS[thread.persona]?.scenario;
      setTextPersona(
        scene
          ? Object.values(PERSONAS).find(
              (p) => p.language === next && p.scenario === scene,
            )?.id
          : undefined,
      );
      setTopic("");
      setScreen("talk");
    } else {
      setTopic("");
      setTextPersona(undefined);
      if (screen === "recap" || screen === "lesson") {
        setPendingLesson(null);
        setScreen("talk");
      }
    }
    setLang(next);
    setTranslation("");
    try {
      localStorage.setItem("maatu-lang", next);
    } catch {
      /* In-memory selection. */
    }
  }
  const refreshStats = useCallback(async () => {
    if (!user) return;
    setStatsError(false);
    try {
      const response = await fetch(
        `/api/stats?userId=${encodeURIComponent(user)}`,
      );
      if (!response.ok) throw new Error();
      setStats(await response.json());
    } catch {
      setStatsError(true);
    }
  }, [user]);
  useEffect(() => {
    if (screen === "progress") {
      void refreshStats();
      setReview(loadReview());
    }
  }, [screen, refreshStats]);
  function go(next: Screen) {
    setMenu(false);
    setScreen(next);
    if (next === "talk") {
      setTopic("");
      const thread = getConversation(conversationId);
      const scene = thread && PERSONAS[thread.persona]?.scenario;
      setTextPersona(
        scene
          ? Object.values(PERSONAS).find(
              (p) => p.language === lang && p.scenario === scene,
            )?.id
          : undefined,
      );
    }
  }
  function startVoice(line?: PracticeLine, selected?: PersonaMeta) {
    const partner = selected ?? teacherMeta(lang, null);
    const old = getConversation(conversationId);
    const freshScene =
      screen === "scenes" || screen === "lesson" || !!line?.target;
    const thread =
      old && !freshScene
        ? old
        : createConversation(lang, partner.id, partner.sceneLabel);
    rememberThread(thread.id);
    setOrigin(screen === "recap" ? origin : screen);
    setMeta(
      old && !freshScene && PERSONAS[old.persona]
        ? {
            ...partner,
            name: PERSONAS[old.persona].name,
            sceneLabel: old.title,
          }
        : partner,
    );
    const context = conversationContext(thread.id, lang);
    setPractice(
      context || line
        ? {
            target: line?.target || "",
            en: line?.en || "",
            context: [context, line?.context].filter(Boolean).join("\n"),
          }
        : null,
    );
    setScreen("call");
  }
  function textScene(selected: PersonaMeta) {
    setConversationId(undefined);
    setTextPersona(selected.id);
    setTopic(
      `Let's start this ${selected.sceneLabel} scene. You play ${selected.name}. Keep the conversation natural and help me when I need a phrase.`,
    );
    setScreen("talk");
  }
  async function finishCall(data: CallEnd) {
    setFinished(data);
    setReport(null);
    setPassed(false);
    setScreen("recap");
    const lesson = data.personaId.startsWith("teacher-")
      ? ALL_LESSONS.find((x) => data.personaId === `teacher-${lang}-${x.id}`)
      : undefined;
    if (lesson) {
      const success = lessonWasMastered(data.raw, lesson, lang);
      if (success) markDone(lang, lesson.id);
      setPassed(success);
    }
    if (!data.room || !data.raw.some((x) => x.who === "learner")) {
      setReportState("idle");
      return;
    }
    setReportState("loading");
    try {
      const response = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room: data.room,
          personaId: data.personaId,
          userId: user,
          transcript: data.raw,
          durationSec: data.durationSec,
        }),
      });
      const result = await response.json();
      if (!response.ok || result.status !== "ready") throw new Error();
      setReport(result.report);
      setReportState("ready");
      void refreshStats();
    } catch {
      setReportState("unavailable");
    }
  }
  const immersive = screen === "call";
  const done = ready ? getDone(lang) : new Set<string>();
  const complete = ALL_LESSONS.filter((x) => done.has(x.id)).length;
  const nextLesson = ALL_LESSONS.find((x) => !done.has(x.id)) ?? ALL_LESSONS[0];
  const openLesson = (lesson: Lesson) => {
    setPendingLesson(lesson);
    setScreen("lesson");
  };

  return (
    <div className={`maatu-app ${rm ? "reduce-motion" : ""}`}>
      {!immersive && (
        <>
          {menu && (
            <button
              type="button"
              className="menu-scrim"
              aria-label="Close navigation"
              onClick={() => setMenu(false)}
            />
          )}
          <aside className={`sidebar ${menu ? "open" : ""}`}>
            <button
              type="button"
              className="brand-button"
              onClick={() => go("talk")}
              aria-label="Maatu home"
            >
              <Brand />
            </button>
            <button
              type="button"
              className="menu-close icon-button"
              aria-label="Close navigation"
              onClick={() => setMenu(false)}
            >
              <X size={21} />
            </button>
            <p className="brand-line">Find your voice.</p>
            <nav aria-label="Your practice">
              {NAV.slice(0, 3).map((n) => (
                <button
                  type="button"
                  key={n.id}
                  className={screen === n.id ? "active" : ""}
                  onClick={() => go(n.id)}
                  aria-current={screen === n.id ? "page" : undefined}
                >
                  <n.icon size={21} />
                  <span>{n.label}</span>
                  {screen === n.id && <span className="nav-active-dot" />}
                </button>
              ))}
              <div className="nav-separator" />
              {NAV.slice(3).map((n) => (
                <button
                  type="button"
                  key={n.id}
                  className={screen === n.id ? "active" : ""}
                  onClick={() => go(n.id)}
                  aria-current={screen === n.id ? "page" : undefined}
                >
                  <n.icon size={20} />
                  <span>{n.label}</span>
                </button>
              ))}
            </nav>
            <div className="sidebar-note">
              <AudioLines size={32} />
              <h3>
                A few words today.
                <br />
                More courage tomorrow.
              </h3>
              <p>Small conversations count.</p>
              <button
                type="button"
                className="text-button"
                onClick={() => openLesson(nextLesson)}
              >
                {complete ? "Keep learning" : "Start with your first words"}
                <ArrowRight size={15} />
              </button>
            </div>
            <div className="sidebar-footer">
              <span className="profile-initial">Y</span>
              <span>
                Your speaking space<small>No account needed</small>
              </span>
            </div>
          </aside>
        </>
      )}
      <div className={`app-main ${immersive ? "immersive" : ""}`}>
        {!immersive && (
          <header className="topbar">
            <div className="topbar-left">
              <button
                type="button"
                className="icon-button mobile-menu"
                aria-label="Open navigation"
                aria-expanded={menu}
                onClick={() => setMenu(!menu)}
              >
                <Menu size={22} />
              </button>
              <span className="desktop-topline">
                A good day to say something new.
              </span>
              <span className="mobile-brand">
                <Brand small />
              </span>
            </div>
            <div
              className="language-picker"
              role="group"
              aria-label="Practice language"
            >
              {LANGUAGE_ORDER.map((code) => (
                <button
                  type="button"
                  key={code}
                  aria-pressed={lang === code}
                  className={lang === code ? "active" : ""}
                  disabled={!!translation}
                  onClick={() => void chooseLang(code)}
                >
                  <span style={{ background: LANGUAGES[code].color }} />
                  {LANGUAGES[code].name}
                </button>
              ))}
            </div>
          </header>
        )}
        {!immersive && (
          <nav className="mode-tabs" aria-label="Learning modes">
            {NAV.slice(0, 3).map((n) => (
              <button
                type="button"
                key={n.id}
                onClick={() => go(n.id)}
                aria-current={screen === n.id ? "page" : undefined}
                className={screen === n.id ? "active" : ""}
              >
                <n.icon size={17} />
                {n.label}
              </button>
            ))}
            <span className="local-register">
              <span className="status-dot" />
              {l.city}, the everyday way
            </span>
          </nav>
        )}
        <main className={immersive ? "" : "studio-content"}>
          {translation && (
            <p className="translation-notice" role="status">
              <LoaderCircle size={18} className="spin" />
              {translation}
            </p>
          )}
          {translationError && (
            <p className="error-note" role="alert">
              {translationError}
            </p>
          )}
          {storageError && (
            <p className="error-note" role="alert">
              Device storage is full or blocked. This conversation stays in
              memory for this visit; download it from Conversation history
              before closing.
            </p>
          )}
          {!ready ? (
            <div className="app-loading" role="status">
              <LoaderCircle size={26} className="spin" /> Opening your speaking
              space
            </div>
          ) : screen === "talk" ? (
            <ConversationStudio
              key={`${lang}-${textPersona ?? "tutor"}-${topic}-${chatReset}`}
              lang={lang}
              persona={textPersona}
              seed={topic}
              conversationId={conversationId}
              onConversation={rememberThread}
              onNew={() => {
                setConversationId(undefined);
                setTextPersona(undefined);
                setTopic("");
                setChatReset((n) => n + 1);
              }}
              onVoice={(line) =>
                startVoice(
                  line,
                  textPersona ? PERSONAS[textPersona] : undefined,
                )
              }
              onScenes={() => go("scenes")}
              onBuild={() => go("build")}
            />
          ) : screen === "scenes" ? (
            <ScenarioStudio
              key={lang}
              lang={lang}
              onStart={(p) => startVoice(undefined, p)}
              onText={(p) => {
                setMeta(p);
                textScene(p);
              }}
              onCustom={(context) => {
                setConversationId(undefined);
                setTextPersona(undefined);
                setTopic(context);
                setScreen("talk");
              }}
            />
          ) : screen === "build" ? (
            <BuildScreen lang={lang} onTalk={(line) => startVoice(line)} />
          ) : screen === "call" && meta ? (
            <CallRoom
              conversationId={conversationId}
              onLanguage={(next) => void chooseLang(next)}
              meta={meta}
              stage={stage}
              practice={practice}
              captions={caps}
              onEnd={(data) => void finishCall(data)}
              onBack={() => setScreen(origin)}
            />
          ) : screen === "history" ? (
            <ConversationHistory onContinue={continueThread} />
          ) : screen === "course" ? (
            <>
              <header className="page-heading">
                <h1>
                  Your first words.
                  <br />
                  <em>And everything after.</em>
                </h1>
                <p>
                  Start from hello. Build a little confidence with {l.teacher},
                  one conversation at a time.
                </p>
              </header>
              <div className="course-start">
                <div>
                  <h2>{nextLesson.title}</h2>
                  <span>
                    {complete} of {ALL_LESSONS.length} lessons complete
                  </span>
                  <p>{nextLesson.objective}</p>
                </div>
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => openLesson(nextLesson)}
                >
                  {complete ? "Continue learning" : "Begin here"}
                  <ArrowRight size={18} />
                </button>
              </div>
              <div className="course-list">
                {ALL_LESSONS.map((lesson, i) => (
                  <button
                    type="button"
                    key={lesson.id}
                    onClick={() => openLesson(lesson)}
                  >
                    <span
                      className={`lesson-number ${done.has(lesson.id) ? "complete" : ""}`}
                    >
                      {done.has(lesson.id) ? (
                        <Check size={18} />
                      ) : (
                        String(i + 1).padStart(2, "0")
                      )}
                    </span>
                    <span>
                      <strong>{lesson.title}</strong>
                      <small>{lesson.objective}</small>
                    </span>
                    <ChevronRight size={19} />
                  </button>
                ))}
              </div>
            </>
          ) : screen === "lesson" && pendingLesson ? (
            <>
              <button
                type="button"
                className="text-button"
                onClick={() => go("course")}
              >
                <ArrowLeft size={17} /> All lessons
              </button>
              <header className="page-heading">
                <h1>{pendingLesson.title}</h1>
                <p>{pendingLesson.objective}</p>
              </header>
              <div className="lesson-preview">
                <h3>By the end, you’ll be able to say…</h3>
                {pendingLesson.examples_en.map((x) => (
                  <p key={x}>
                    <MessageCircle size={18} />
                    {x}
                  </p>
                ))}
                <h3>Listen to a little of the language</h3>
                {pendingLesson.lexicon[lang]
                  .filter((x) => !x.startsWith("note:"))
                  .slice(0, 3)
                  .map((entry) => {
                    const [en, target] = entry.split("=", 2);
                    return (
                      <div className="lesson-example" key={entry}>
                        <span>
                          <strong>{target?.trim() || entry}</strong>
                          <small>{en.trim()}</small>
                        </span>
                        {target && (
                          <HearButton
                            compact
                            lang={lang}
                            text={target.split("(", 1)[0].trim()}
                            label={`Hear ${en.trim()}`}
                          />
                        )}
                      </div>
                    );
                  })}
                <p>
                  Your teacher explains one thing, listens to your attempt, and
                  helps you try it. Finish with three short speaking checks.
                </p>
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() =>
                    startVoice(undefined, teacherMeta(lang, pendingLesson.id))
                  }
                >
                  <Mic size={18} /> Learn with {l.teacher}
                  <ArrowRight size={17} />
                </button>
              </div>
            </>
          ) : screen === "progress" ? (
            <>
              <header className="page-heading">
                <h1>
                  Look how far
                  <br />
                  <em>your words can go.</em>
                </h1>
                <p>Your real conversations and the phrases you want to keep.</p>
              </header>
              {statsError ? (
                <p className="error-note">
                  Your conversation history could not load.{" "}
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => void refreshStats()}
                  >
                    Try again
                  </button>
                </p>
              ) : !stats ? (
                <p role="status">Loading your conversations…</p>
              ) : (
                <div className="progress-facts">
                  <div>
                    <strong>{Math.floor(stats.totalSeconds / 60)}</strong>
                    <span>minutes spoken</span>
                  </div>
                  <div>
                    <strong>{stats.sessionCount}</strong>
                    <span>conversations</span>
                  </div>
                  <div>
                    <strong>
                      {complete}/{ALL_LESSONS.length}
                    </strong>
                    <span>{l.name} lessons</span>
                  </div>
                </div>
              )}
              <div className="section-heading">
                <h3>Your pocket phrasebook</h3>
                <span>
                  {review.filter((x) => x.lang === lang).length} saved in{" "}
                  {l.name}
                </span>
              </div>
              {!review.some((x) => x.lang === lang) ? (
                <div className="empty-state">
                  <Bookmark size={28} />
                  <h3>A good phrase is worth keeping.</h3>
                  <p>
                    Save a line in the sentence lab or a conversation. It will
                    wait for you here.
                  </p>
                  <button
                    type="button"
                    className="button button-outline"
                    onClick={() => go("build")}
                  >
                    Build your first phrase
                    <ArrowRight size={17} />
                  </button>
                </div>
              ) : (
                <div className="saved-phrases">
                  {review
                    .filter((x) => x.lang === lang)
                    .map((item) => (
                      <div key={item.id}>
                        <span>
                          <strong>{item.target}</strong>
                          <small>{item.en}</small>
                          <small>
                            {item.due <= Date.now()
                              ? "Ready to review"
                              : `Review on ${new Date(item.due).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
                          </small>
                        </span>
                        <HearButton compact text={item.target} lang={lang} />
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={`Practice ${item.en}`}
                          onClick={() =>
                            startVoice({ target: item.target, en: item.en })
                          }
                        >
                          <Mic size={18} />
                        </button>
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => {
                            grade(item.id, true);
                            setReview(loadReview());
                          }}
                        >
                          Got it
                        </button>
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => {
                            grade(item.id, false);
                            setReview(loadReview());
                          }}
                        >
                          Again
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </>
          ) : screen === "settings" ? (
            <>
              <header className="page-heading">
                <h1>
                  Make this
                  <br />
                  <em>your kind of space.</em>
                </h1>
                <p>A little support goes a long way.</p>
              </header>
              <div className="settings-list">
                <label>
                  <span>
                    <strong>Show what you hear</strong>
                    <small>
                      Romanized captions during your voice conversation.
                    </small>
                  </span>
                  <input
                    type="checkbox"
                    checked={caps}
                    onChange={(e) => {
                      setCaps(e.target.checked);
                      remember("maatu-caps", e.target.checked);
                    }}
                  />
                </label>
                <label>
                  <span>
                    <strong>Keep things still</strong>
                    <small>Reduce animation and movement.</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={rm}
                    onChange={(e) => {
                      setRm(e.target.checked);
                      remember("maatu-rm", e.target.checked);
                    }}
                  />
                </label>
                <fieldset>
                  <legend>How much support would you like?</legend>
                  {(
                    [
                      {
                        value: 1,
                        name: "A helping hand",
                        text: "Slower, shorter turns and patient repetition.",
                      },
                      {
                        value: 2,
                        name: "Everyday conversation",
                        text: "A natural pace with support when you ask.",
                      },
                      {
                        value: 3,
                        name: "A little challenge",
                        text: "Natural pace and a realistic complication.",
                      },
                    ] as const
                  ).map((s) => (
                    <label key={s.value}>
                      <span>
                        <strong>{s.name}</strong>
                        <small>{s.text}</small>
                      </span>
                      <input
                        type="radio"
                        name="difficulty"
                        value={s.value}
                        checked={stage === s.value}
                        onChange={() => {
                          setStage(s.value);
                          remember("maatu-difficulty", s.value);
                        }}
                      />
                    </label>
                  ))}
                </fieldset>
                <div className="settings-about">
                  <Brand />
                  <p>
                    Everyday Tamil, Kannada, Hindi, and French. Learn by
                    talking, trying, and talking some more.
                  </p>
                  <p>A Nathaniel School of Music project by Jason Zac.</p>
                  <a href="/photo-credits.txt" target="_blank" rel="noreferrer">
                    Photography credits
                  </a>
                </div>
              </div>
            </>
          ) : screen === "recap" && finished ? (
            <>
              <button
                type="button"
                className="text-button"
                onClick={() => setScreen(origin)}
              >
                <ArrowLeft size={17} /> Back to your studio
              </button>
              <header className="page-heading">
                <h1>
                  {finished.personaId.startsWith("teacher-")
                    ? passed
                      ? "You can say something new."
                      : "Every try counts."
                    : "A conversation worth keeping."}
                </h1>
                <p>
                  {finished.raw.some((x) => x.who === "learner")
                    ? "Here’s what to take into your next conversation."
                    : "Your teacher did not hear a speaking turn yet. Come back and try a little conversation."}
                </p>
              </header>
              {finished.personaId.startsWith("teacher-") && (
                <p className="lesson-outcome">
                  {passed
                    ? "Speaking check passed. Your lesson is saved as complete."
                    : "This lesson is paused. Try the speaking check again when you’re ready."}
                </p>
              )}
              {reportState === "loading" && (
                <p role="status" className="report-loading">
                  <LoaderCircle size={19} className="spin" /> Your coach is
                  listening back…
                </p>
              )}
              {reportState === "unavailable" && (
                <p className="error-note">
                  Your coach’s notes could not load. Your transcript is below.
                </p>
              )}
              {report && (
                <div className="coach-notes">
                  <h2>{report.headline}</h2>
                  <p>{report.strength}</p>
                  {report.takeaways.map((t, i) => (
                    <div key={i}>
                      <small>You said: {t.you}</small>
                      <strong>{t.native}</strong>
                      <p>{t.why}</p>
                      <HearButton text={t.native} lang={lang} />
                    </div>
                  ))}
                </div>
              )}
              <div className="preview-actions">
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => {
                    if (meta) startVoice(practice ?? undefined, meta);
                  }}
                >
                  Try another conversation
                  <ArrowRight size={17} />
                </button>
                <button
                  type="button"
                  className="button button-outline"
                  onClick={() => go("build")}
                >
                  Play with your words
                  <GitBranch size={17} />
                </button>
              </div>
              {finished.transcript.length > 0 && (
                <details className="recap-transcript">
                  <summary>Your conversation</summary>
                  {finished.transcript.map((line, i) => (
                    <p key={i}>
                      <strong>
                        {line.who === "learner" ? "You" : meta?.name}:{" "}
                      </strong>
                      {line.text}
                    </p>
                  ))}
                </details>
              )}
            </>
          ) : null}
        </main>
        {!immersive && (
          <footer className="app-footer">
            <span>Made for the way people actually talk.</span>
            <span>Maatu · Nathaniel School of Music</span>
          </footer>
        )}
      </div>
    </div>
  );
}
