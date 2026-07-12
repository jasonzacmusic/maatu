"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import StreetScene from "./StreetScene";
import CallBackdrop from "./CallBackdrop";
import { useMaatuCall, type Speaker, type Line } from "./useMaatuCall";
import { PERSONAS, personaId, type PersonaMeta } from "@/lib/personas.generated";
import { UNITS, teacherMeta, getDone, markDone, LANG_NAME } from "@/lib/curriculum";
import {
  C,
  BODY,
  DISPLAY,
  KN,
  SLOW,
  STREET_CAM,
  STREET_LANG,
  type Lang,
  type ShopId,
} from "@/lib/maatu-design";

// The Maatu app: Street, Call, Debrief, Progress, with the one orchestrated
// camera move on entering a shop. Every lit shopfront across all three
// languages opens a real live call; the Debrief reads the real coach report
// from the session. No em dashes anywhere.

type Screen = "street" | "call" | "debrief" | "progress" | "school";
type SessionEnd = { room: string | null; transcript: Line[]; durationSec: number };
type StreetStats = {
  totalSeconds: number;
  thisWeekSeconds: number;
  sessionCount: number;
  nights: number;
  scenarios: { scenario: string; sessions: number; seconds: number }[];
};

const EMPTY_STATS: StreetStats = { totalSeconds: 0, thisWeekSeconds: 0, sessionCount: 0, nights: 0, scenarios: [] };

function minutes(seconds: number) {
  return Math.round(seconds / 60);
}

const NUMERALS: Record<Lang, string[]> = {
  kn: ["1", "2", "3", "4", "5"],
  hi: ["1", "2", "3", "4", "5"],
  ta: ["1", "2", "3", "4", "5"],
};

function personaFor(shop: ShopId, lang: Lang): string | null {
  return personaId(shop, lang);
}

function MicIcon({ muted }: { muted: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" fill={muted ? "#7E89A8" : C.milk} />
      <path d="M5 11a7 7 0 0 0 14 0" stroke={muted ? "#7E89A8" : C.milk} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="12" y1="18" x2="12" y2="21" stroke={muted ? "#7E89A8" : C.milk} strokeWidth="1.8" strokeLinecap="round" />
      {muted && <line x1="4.5" y1="4" x2="19.5" y2="20" stroke={C.kumkum} strokeWidth="2" strokeLinecap="round" />}
    </svg>
  );
}

function ChevronLeft() {
  return (
    <svg width="14" height="20" viewBox="0 0 14 20" fill="none" aria-hidden="true">
      <path d="M11 3l-7 7 7 7" stroke={C.milk} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ....................................................... THE STREET
function StreetScreen({
  lang,
  setLang,
  onEnter,
  onProgress,
  onSchool,
  rm,
  stats,
  statsLoading,
}: {
  lang: Lang;
  setLang: (l: Lang) => void;
  onEnter: (id: ShopId) => void;
  onProgress: () => void;
  onSchool: () => void;
  rm: boolean;
  stats: StreetStats;
  statsLoading: boolean;
}) {
  const [cam, setCam] = useState<{ x: number; y: number; s: number } | null>(null);
  const [dim, setDim] = useState(false);
  const [wiggleId, setWiggleId] = useState<ShopId | null>(null);
  const [toast, setToast] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const L = STREET_LANG[lang];

  const enter = (id: ShopId) => {
    if (!personaFor(id, lang)) {
      setWiggleId(id);
      setToast(Date.now());
      timers.current.push(setTimeout(() => setWiggleId(null), 900));
      return;
    }
    if (rm) {
      setDim(true);
      timers.current.push(setTimeout(() => onEnter(id), 280));
      return;
    }
    setCam(STREET_CAM[id]);
    timers.current.push(setTimeout(() => setDim(true), 430));
    timers.current.push(setTimeout(() => onEnter(id), 1000));
  };

  const locked = (id: ShopId) => {
    setWiggleId(id);
    setToast(Date.now());
    timers.current.push(setTimeout(() => setWiggleId(null), 900));
  };

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: C.night }}>
      <div
        className="absolute inset-0"
        style={{
          transform: cam ? `scale(${cam.s})` : "none",
          transformOrigin: cam ? `${(cam.x / 390) * 100}% ${(cam.y / 780) * 100}%` : "50% 50%",
          transition: "transform 950ms cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        <StreetScene lang={lang} streak={3} onEnter={enter} onLocked={locked} reduceMotion={rm} wiggleId={wiggleId} />
      </div>

      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: C.night, opacity: dim ? 1 : 0, transition: "opacity 480ms ease" }}
      />

      <div
        className="absolute top-0 inset-x-0 px-5 pt-16 flex items-start justify-between"
        style={{ opacity: cam ? 0 : 1, transition: "opacity 300ms" }}
      >
        <div>
          <div style={{ fontFamily: KN, fontSize: 30, lineHeight: 1, color: C.milk, textShadow: "0 0 18px rgba(255,179,92,0.45)" }}>
            maatu
          </div>
          <div className="mt-1.5 text-[10px] font-semibold uppercase" style={{ fontFamily: BODY, letterSpacing: 2, color: C.muted }}>
            maatu · {L.city}
          </div>
        </div>
        <div
          className="flex rounded-full p-1 backdrop-blur-md"
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.10)" }}
          role="tablist"
          aria-label="Language"
        >
          {(["kn", "hi", "ta"] as Lang[]).map((k) => (
            <button
              key={k}
              role="tab"
              aria-selected={lang === k}
              onClick={() => setLang(k)}
              className="w-10 h-8 rounded-full text-[12px] font-bold uppercase focus-visible:outline focus-visible:outline-2"
              style={{
                fontFamily: BODY,
                background: lang === k ? C.sodium : "transparent",
                color: lang === k ? "#1A1206" : "rgba(242,237,226,0.6)",
                outlineColor: C.tube,
              }}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      <div
        className="absolute bottom-0 inset-x-0 px-5 pb-9 flex items-end justify-between"
        style={{ opacity: cam ? 0 : 1, transition: "opacity 300ms" }}
      >
        <button
          onClick={onSchool}
          aria-label="Classroom"
          className="flex items-center gap-2 h-11 px-4 rounded-full backdrop-blur-md focus-visible:outline focus-visible:outline-2"
          style={{ background: "rgba(191,239,219,0.14)", border: "1px solid rgba(191,239,219,0.35)", outlineColor: C.tube }}
        >
          <span className="text-[15px]">📖</span>
          <span className="text-[13px] font-semibold" style={{ fontFamily: BODY, color: C.tube }}>
            Learn {LANG_NAME[lang]}
          </span>
        </button>
        <button
          onClick={onProgress}
          aria-label="Progress"
          className="flex items-center gap-2.5 h-11 px-4 rounded-full backdrop-blur-md focus-visible:outline focus-visible:outline-2"
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", outlineColor: C.tube }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="8" cy="8" r="6.5" fill="none" stroke={C.sodium} strokeWidth="1.6" />
            <line x1="8" y1="8" x2="11.5" y2="5" stroke={C.sodium} strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <span className="text-[13px] font-semibold" style={{ fontFamily: BODY, color: C.milk }}>
            {statsLoading ? "..." : `${minutes(stats.totalSeconds)} min`}
          </span>
          <span className="text-[13px] font-semibold" style={{ fontFamily: BODY, color: C.sodium }}>
            {statsLoading ? "" : stats.nights === 0 ? "· new street" : `· ${stats.nights} ${stats.nights === 1 ? "night" : "nights"}`}
          </span>
        </button>
      </div>

      {toast > 0 && (
        <div key={toast} className="mt-toast absolute bottom-24 inset-x-0 flex justify-center pointer-events-none">
          <div
            className="px-4 py-2 rounded-full text-[12px] font-semibold"
            style={{ fontFamily: BODY, background: "rgba(6,8,16,0.8)", color: "rgba(242,237,226,0.85)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            Opening soon
          </div>
        </div>
      )}
    </div>
  );
}

// ....................................................... THE CALL
function CallScreen({
  meta,
  lang,
  captionsDefault,
  onEnd,
  rm,
}: {
  meta: PersonaMeta;
  lang: Lang;
  captionsDefault: boolean;
  onEnd: (payload: SessionEnd) => void;
  rm: boolean;
}) {
  const call = useMaatuCall(meta.id);
  const [caps, setCaps] = useState(captionsDefault);
  const [slow, setSlow] = useState(false);
  const [sec, setSec] = useState(0);
  const slowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    call.connect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (call.phase !== "live") return;
    const t = setInterval(() => setSec((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [call.phase]);

  const pressSlow = () => {
    setSlow(true);
    if (slowTimer.current) clearTimeout(slowTimer.current);
    slowTimer.current = setTimeout(() => setSlow(false), 6000);
  };

  const endCall = async () => {
    const room = call.roomName;
    const transcript = call.transcript;
    await call.hangUp();
    onEnd({ room, transcript, durationSec: sec });
  };

  const mm = Math.floor(sec / 60);
  const ss = String(sec % 60).padStart(2, "0");
  const bars = [14, 22, 34, 26, 42, 30, 52, 38, 58, 38, 52, 30, 42, 26, 34, 22, 14];
  const active: Speaker = call.phase === "live" ? call.speaker : null;
  const speakingColor = active === "learner" ? C.tube : C.sodium;
  const barsAnimate = active !== null;

  const captionText =
    caps && call.caption
      ? call.caption.text
      : caps
        ? call.phase === "connecting"
          ? `Calling ${meta.name}`
          : call.phase === "error"
            ? call.error ?? "Could not connect"
            : call.phase === "ended"
              ? "Call over"
              : active === "character"
                ? `${meta.name} is speaking`
                : "Your turn, just talk"
        : "";

  return (
    <div className={"absolute inset-0 overflow-hidden" + (rm ? " mt-noanim" : "")} style={{ background: C.night }}>
      <CallBackdrop scenario={meta.scenario} />

      <div className="relative flex flex-col items-center pt-24">
        <div className="px-6 py-2 rounded-md" style={{ background: "#F5C542", boxShadow: "0 0 32px rgba(245,197,66,0.25)" }}>
          <span style={{ fontFamily: DISPLAY, fontStretch: "75%", fontWeight: 800, fontSize: 24, letterSpacing: 4, color: "#14100A" }}>
            {meta.name.toUpperCase()}
          </span>
        </div>
        {meta.scenario === "class" || meta.scenario === "tutor" ? (
          <div className="mt-3 px-3 text-[12px] font-semibold text-center" style={{ fontFamily: BODY, color: C.tube }}>
            {meta.sceneLabel}
          </div>
        ) : (
          <div className="flex gap-1.5 mt-3" aria-label={`Level ${meta.level} of 5`}>
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: i < meta.level ? C.sodium : "rgba(255,255,255,0.18)" }} />
            ))}
          </div>
        )}
        <div className="mt-2 text-[12px] tabular-nums" style={{ fontFamily: BODY, color: "rgba(126,137,168,0.9)" }}>
          {mm}:{ss}
        </div>
      </div>

      <div className="relative flex flex-col items-center justify-center" style={{ height: 300 }}>
        <div
          className="mt-orb absolute w-44 h-44 rounded-full blur-2xl"
          style={{ background: speakingColor, opacity: 0.22, animationDuration: slow ? "4.4s" : "2.6s" }}
        />
        <div className="relative flex items-center gap-[3px]" style={{ height: 64 }} aria-hidden="true">
          {bars.map((h, i) => (
            <span
              key={i}
              className={barsAnimate ? "mtv rounded-full" : "rounded-full"}
              style={{
                width: 4,
                height: h,
                background: speakingColor,
                opacity: barsAnimate ? 0.92 : 0.28,
                transform: barsAnimate ? undefined : "scaleY(0.4)",
                animationDelay: `${i * 70}ms`,
                animationDuration: slow ? "2.3s" : "1.1s",
              }}
            />
          ))}
        </div>
        <div className="h-16 px-9 mt-8 text-center flex items-center justify-center">
          {call.needsAudioUnlock ? (
            <button
              onClick={call.unlockAudio}
              className="px-6 py-3 rounded-full text-[15px] font-bold animate-pulse focus-visible:outline focus-visible:outline-2"
              style={{ fontFamily: BODY, background: C.sodium, color: "#1A1206", outlineColor: C.tube }}
            >
              🔊 Tap to hear {meta.name}
            </button>
          ) : (
            captionText && (
              <p
                key={captionText}
                className="text-[15px] leading-snug"
                style={{
                  fontFamily: BODY,
                  color: call.caption?.who === "learner" ? "rgba(191,239,219,0.92)" : "rgba(242,237,226,0.9)",
                  animation: "mtFade .4s ease both",
                }}
              >
                {captionText}
              </p>
            )
          )}
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 pb-14 px-6 flex items-center justify-center gap-3.5">
        <button
          onClick={call.toggleMute}
          disabled={call.phase !== "live"}
          aria-label={call.muted ? "Unmute" : "Mute"}
          aria-pressed={call.muted}
          className="w-14 h-14 rounded-full flex items-center justify-center backdrop-blur-md focus-visible:outline focus-visible:outline-2 disabled:opacity-40"
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)", outlineColor: C.tube }}
        >
          <MicIcon muted={call.muted} />
        </button>
        <button
          onClick={pressSlow}
          aria-pressed={slow}
          className="h-14 px-5 rounded-full text-[14px] font-semibold focus-visible:outline focus-visible:outline-2"
          style={{
            fontFamily: BODY,
            color: C.tube,
            outlineColor: C.tube,
            border: "1px solid rgba(191,239,219,0.4)",
            background: slow ? "rgba(191,239,219,0.14)" : "transparent",
          }}
        >
          {SLOW[lang] || SLOW.kn}
        </button>
        <button
          onClick={() => setCaps(!caps)}
          aria-label="Captions"
          aria-pressed={caps}
          className="w-14 h-14 rounded-full flex items-center justify-center backdrop-blur-md focus-visible:outline focus-visible:outline-2"
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)", outlineColor: C.tube }}
        >
          <span
            className="text-[16px] font-bold"
            style={{ fontFamily: BODY, color: caps ? C.sodium : "rgba(126,137,168,0.9)", borderBottom: caps ? `2px solid ${C.sodium}` : "2px solid transparent", lineHeight: 1.15 }}
          >
            Aa
          </span>
        </button>
        <button
          onClick={endCall}
          aria-label="Hang up"
          className="w-16 h-16 rounded-full flex items-center justify-center focus-visible:outline focus-visible:outline-2"
          style={{ background: C.kumkum, boxShadow: "0 0 28px rgba(232,80,58,0.4)", outlineColor: C.milk }}
        >
          <span className="w-6 rounded-full" style={{ height: 5, background: "#FFF4EF" }} />
        </button>
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
  lang,
  session,
  userId,
  onReportReady,
  onStreet,
  onAgain,
}: {
  meta: PersonaMeta;
  lang: Lang;
  session: SessionEnd | null;
  userId: string;
  onReportReady: () => void;
  onStreet: () => void;
  onAgain: () => void;
}) {
  const [report, setReport] = useState<Report | null>(null);
  const [status, setStatus] = useState<"pending" | "ready" | "none">("pending");
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const numerals = NUMERALS[lang];

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

  const durationLabel = report ? `${report.duration_min} min with ${meta.name}` : `${meta.name}, ${meta.sceneLabel.split(",")[0].toLowerCase()}`;

  return (
    <div className="absolute inset-0 overflow-y-auto" style={{ background: C.night }}>
      <div className="px-5 pt-16 pb-10 flex flex-col gap-4">
        <div>
          <div className="text-[10px] font-semibold uppercase" style={{ fontFamily: BODY, letterSpacing: 2.5, color: C.muted }}>
            {meta.sceneLabel} · debrief
          </div>
          <h1 className="mt-1" style={{ fontFamily: DISPLAY, fontStretch: "75%", fontWeight: 700, fontSize: 28, lineHeight: 1.1, color: C.milk }}>
            {durationLabel}
          </h1>
        </div>

        {status === "pending" && (
          <div className="rounded-2xl p-5 text-center" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}>
            <div className="mt-orb mx-auto w-10 h-10 rounded-full blur-md mb-3" style={{ background: C.sodium, opacity: 0.4 }} />
            <div className="text-[14px]" style={{ fontFamily: BODY, color: C.milk }}>
              The coach is reviewing your conversation.
            </div>
            <div className="text-[12px] mt-1" style={{ fontFamily: BODY, color: C.muted }}>
              A few seconds.
            </div>
          </div>
        )}

        {status === "none" && (
          <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}>
            <div className="text-[14px]" style={{ fontFamily: BODY, color: C.milk }}>
              That was a short one. Talk a little longer next time and the coach will have something to say.
            </div>
          </div>
        )}

        {status === "ready" && report && (
          <>
            {report.coach_audio_b64 && (
              <div className="rounded-2xl p-4 flex items-center gap-3.5" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}>
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <audio ref={audioRef} src={`data:audio/mp3;base64,${report.coach_audio_b64}`} onEnded={() => setPlaying(false)} />
                <button
                  onClick={toggleAudio}
                  aria-label={playing ? "Pause coach" : "Play coach"}
                  className="w-11 h-11 rounded-full flex items-center justify-center flex-none focus-visible:outline focus-visible:outline-2"
                  style={{ background: C.sodium, outlineColor: C.tube }}
                >
                  {playing ? (
                    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                      <rect x="2" y="1" width="3.5" height="12" rx="1" fill="#1A1206" />
                      <rect x="8.5" y="1" width="3.5" height="12" rx="1" fill="#1A1206" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                      <polygon points="3,1 13,7 3,13" fill="#1A1206" />
                    </svg>
                  )}
                </button>
                <div className="flex-1">
                  <div className="text-[10px] font-semibold uppercase" style={{ fontFamily: BODY, letterSpacing: 2, color: C.muted }}>
                    Coach
                  </div>
                  <div className="text-[13px] mt-0.5" style={{ fontFamily: BODY, color: C.milk }}>
                    Listen to your 45 second summary
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-[20px] overflow-hidden" style={{ border: "1px solid rgba(255,179,92,0.25)", background: "linear-gradient(180deg, #1D1A12, #161B2B 70%)" }}>
              <div className="p-5 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="text-[9px] font-bold uppercase" style={{ fontFamily: BODY, letterSpacing: 3, color: C.sodium }}>
                  Maatu · {meta.language === "kn" ? "Kannada" : meta.language === "hi" ? "Hindi" : "Tamil"}
                </div>
                <div className="mt-1.5" style={{ fontFamily: DISPLAY, fontStretch: "75%", fontWeight: 700, fontSize: 22, color: C.milk }}>
                  {report.headline}
                </div>
                <div className="mt-0.5 text-[12px]" style={{ fontFamily: BODY, color: C.muted }}>
                  {meta.sceneLabel} · L{meta.level} · {report.duration_min} min
                </div>
              </div>
              <div className="p-5 flex flex-col gap-4">
                {report.takeaways.map((t, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-8 flex-none text-right" style={{ fontFamily: KN, fontSize: 26, lineHeight: 1, color: "rgba(255,179,92,0.35)" }}>
                      {numerals[i] ?? i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="text-[13px]" style={{ fontFamily: BODY, color: "rgba(242,237,226,0.5)" }}>
                        {t.you}
                      </div>
                      <div className="text-[15px] font-medium mt-0.5" style={{ fontFamily: BODY, color: C.milk }}>
                        ↳ {t.native}
                      </div>
                      <div className="text-[12px] mt-1" style={{ fontFamily: BODY, color: "rgba(126,137,168,0.9)" }}>
                        {t.why}
                      </div>
                    </div>
                  </div>
                ))}
                {report.strength && (
                  <div className="rounded-xl p-3 text-[13px]" style={{ fontFamily: BODY, background: "rgba(191,239,219,0.09)", border: "1px solid rgba(191,239,219,0.2)", color: C.tube }}>
                    {report.strength}
                  </div>
                )}
                {report.words.length > 0 && (
                  <div>
                    <div className="text-[9px] font-bold uppercase mb-2" style={{ fontFamily: BODY, letterSpacing: 3, color: C.muted }}>
                      New words
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {report.words.map(([w, m], i) => (
                        <span key={i} className="px-3 py-1.5 rounded-full text-[12px]" style={{ fontFamily: BODY, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                          <span className="font-semibold" style={{ color: C.milk }}>
                            {w}
                          </span>
                          <span style={{ color: C.muted }}> · {m}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <span style={{ fontFamily: KN, fontSize: 15, color: "rgba(242,237,226,0.75)" }}>
                  maatu <span style={{ fontFamily: BODY, fontSize: 10, letterSpacing: 2, color: C.muted }}>MAATU</span>
                </span>
                <span className="text-[10px]" style={{ fontFamily: BODY, letterSpacing: 1, color: C.muted }}>
                  {meta.sceneLabel.split(", ").pop()?.toUpperCase()}
                </span>
              </div>
            </div>

            {report.transcript.length > 0 && (
              <details className="rounded-2xl px-4 py-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <summary className="text-[13px] font-semibold cursor-pointer list-none flex items-center justify-between" style={{ fontFamily: BODY, color: "rgba(242,237,226,0.75)" }}>
                  Transcript
                  <svg width="10" height="7" viewBox="0 0 10 7" aria-hidden="true">
                    <path d="M1 1l4 4 4-4" stroke={C.muted} strokeWidth="1.8" fill="none" strokeLinecap="round" />
                  </svg>
                </summary>
                <div className="mt-3 flex flex-col gap-2 pb-1">
                  {report.transcript.map(([who, text], i) => (
                    <div key={i} className="text-[12.5px] leading-snug" style={{ fontFamily: BODY }}>
                      <span className="font-bold" style={{ color: who === "you" ? "rgba(191,239,219,0.8)" : "rgba(255,179,92,0.8)" }}>
                        {who === "you" ? "You" : meta.name[0]}{" "}
                      </span>
                      <span style={{ color: "rgba(242,237,226,0.62)" }}>{text}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </>
        )}

        <button
          onClick={onStreet}
          className="py-3.5 rounded-full text-[15px] font-bold focus-visible:outline focus-visible:outline-2"
          style={{ fontFamily: BODY, background: C.sodium, color: "#1A1206", outlineColor: C.tube }}
        >
          Back to the street
        </button>
        <button onClick={onAgain} className="text-[13px] font-semibold underline underline-offset-4" style={{ fontFamily: BODY, color: C.muted }}>
          Talk again
        </button>
      </div>
    </div>
  );
}

// ....................................................... PROGRESS
function ProgressScreen({ onBack, stats, loading }: { onBack: () => void; stats: StreetStats; loading: boolean }) {
  const hasSessions = stats.sessionCount > 0;
  return (
    <div className="absolute inset-0 overflow-y-auto" style={{ background: C.night }}>
      <div className="px-5 pt-16 pb-10 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            aria-label="Back to the street"
            className="w-10 h-10 rounded-full flex items-center justify-center focus-visible:outline focus-visible:outline-2"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", outlineColor: C.tube }}
          >
            <ChevronLeft />
          </button>
          <div>
            <h1 style={{ fontFamily: DISPLAY, fontStretch: "75%", fontWeight: 700, fontSize: 26, lineHeight: 1.1, color: C.milk }}>Your street</h1>
            <div className="text-[11px] mt-0.5" style={{ fontFamily: BODY, color: C.muted }}>
              Your real conversation history
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl p-6 text-center" style={{ background: C.tar, border: "1px solid rgba(255,255,255,0.07)", color: C.muted }}>
            Loading your street.
          </div>
        ) : !hasSessions ? (
          <div className="rounded-2xl p-6 text-center" style={{ background: C.tar, border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="text-[22px] font-bold" style={{ fontFamily: DISPLAY, color: C.milk }}>Nothing lit yet</div>
            <div className="text-[13px] mt-2 leading-relaxed" style={{ fontFamily: BODY, color: C.muted }}>
              Finish your first street conversation. Your real minutes, sessions, and places will appear here.
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {[
                [minutes(stats.totalSeconds), "minutes spoken"],
                [stats.sessionCount, stats.sessionCount === 1 ? "conversation" : "conversations"],
                [stats.nights, stats.nights === 1 ? "night spoken" : "nights spoken"],
                [minutes(stats.thisWeekSeconds), "minutes this week"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-2xl p-4" style={{ background: C.tar, border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="tabular-nums" style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 30, color: C.sodium }}>{value}</div>
                  <div className="text-[11px] mt-1" style={{ fontFamily: BODY, color: C.muted }}>{label}</div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl p-5" style={{ background: C.tar, border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="text-[9px] font-bold uppercase" style={{ fontFamily: BODY, letterSpacing: 3, color: C.muted }}>Places practiced</div>
              <div className="mt-3 flex flex-col gap-2">
                {stats.scenarios.map((scenario) => (
                  <div key={scenario.scenario} className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <span className="capitalize text-[13px] font-semibold" style={{ fontFamily: BODY, color: C.milk }}>{scenario.scenario}</span>
                    <span className="text-[12px]" style={{ fontFamily: BODY, color: C.tube }}>{scenario.sessions} {scenario.sessions === 1 ? "call" : "calls"} · {minutes(scenario.seconds)} min</span>
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

// ....................................................... THE SCHOOL
function SchoolScreen({
  lang,
  onBack,
  onTutor,
  onLesson,
}: {
  lang: Lang;
  onBack: () => void;
  onTutor: () => void;
  onLesson: (lessonId: string) => void;
}) {
  const done = getDone(lang);
  let n = 0;
  return (
    <div className="absolute inset-0 overflow-y-auto" style={{ background: C.night }}>
      <div className="px-5 pt-16 pb-10 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            aria-label="Back to the street"
            className="w-10 h-10 rounded-full flex items-center justify-center flex-none focus-visible:outline focus-visible:outline-2"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", outlineColor: C.tube }}
          >
            <ChevronLeft />
          </button>
          <div>
            <h1 style={{ fontFamily: DISPLAY, fontStretch: "75%", fontWeight: 700, fontSize: 26, lineHeight: 1.1, color: C.milk }}>
              Learn {LANG_NAME[lang]}
            </h1>
            <div className="text-[11px] mt-0.5" style={{ fontFamily: BODY, color: C.muted }}>
              A real class. The teacher leads and corrects you.
            </div>
          </div>
        </div>

        {/* Free conversation, corrected on the fly */}
        <button
          onClick={onTutor}
          className="text-left rounded-2xl p-5 focus-visible:outline focus-visible:outline-2"
          style={{ background: "linear-gradient(135deg, rgba(191,239,219,0.16), rgba(255,179,92,0.10))", border: "1px solid rgba(191,239,219,0.3)", outlineColor: C.tube }}
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">💬</span>
            <div>
              <div className="text-[16px] font-bold" style={{ fontFamily: BODY, color: C.milk }}>
                Free conversation
              </div>
              <div className="text-[12.5px] mt-0.5" style={{ fontFamily: BODY, color: "rgba(191,239,219,0.85)" }}>
                Just talk. The teacher chats with you and corrects you as you go.
              </div>
            </div>
          </div>
        </button>

        {UNITS.map((unit) => (
          <div key={unit.unit}>
            <div className="text-[10px] font-bold uppercase mb-2 mt-2" style={{ fontFamily: BODY, letterSpacing: 2.5, color: C.sodium }}>
              {unit.unit}
            </div>
            <div className="flex flex-col gap-2">
              {unit.lessons.map((lesson) => {
                n += 1;
                const isDone = done.has(lesson.id);
                return (
                  <button
                    key={lesson.id}
                    onClick={() => onLesson(lesson.id)}
                    className="text-left rounded-xl p-4 flex items-center gap-3 focus-visible:outline focus-visible:outline-2"
                    style={{ background: C.tar, border: "1px solid rgba(255,255,255,0.07)", outlineColor: C.tube }}
                  >
                    <span
                      className="w-7 h-7 rounded-full flex items-center justify-center flex-none text-[12px] font-bold"
                      style={{
                        background: isDone ? C.sodium : "rgba(255,255,255,0.08)",
                        color: isDone ? "#1A1206" : C.muted,
                        fontFamily: BODY,
                      }}
                    >
                      {isDone ? "✓" : n}
                    </span>
                    <div className="flex-1">
                      <div className="text-[14.5px] font-semibold" style={{ fontFamily: BODY, color: C.milk }}>
                        {lesson.title}
                      </div>
                      <div className="text-[12px] mt-0.5" style={{ fontFamily: BODY, color: C.muted }}>
                        {lesson.objective}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ....................................................... APP SHELL
export default function MaatuApp() {
  const [screen, setScreen] = useState<Screen>("street");
  const [lang, setLang] = useState<Lang>("kn");
  const [activePersona, setActivePersona] = useState<string>("kn-auto");
  const [lastSession, setLastSession] = useState<SessionEnd | null>(null);
  const [rm, setRm] = useState(false);
  const [userId, setUserId] = useState("");
  const [stats, setStats] = useState<StreetStats>(EMPTY_STATS);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (typeof window.matchMedia === "function") {
      setRm(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    }
  }, []);

  useEffect(() => {
    const key = "maatu-user-id";
    let id = window.localStorage.getItem(key);
    if (!id) {
      id = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `maatu-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.localStorage.setItem(key, id);
    }
    setUserId(id);
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
    if (screen === "street" || screen === "progress") void loadStats();
  }, [screen, loadStats]);

  const handleReportReady = useCallback(() => {
    void loadStats();
  }, [loadStats]);

  const enterShop = useCallback(
    (id: ShopId) => {
      const p = personaFor(id, lang);
      if (p) {
        setActivePersona(p);
        setScreen("call");
      }
    },
    [lang],
  );

  const startLesson = useCallback((lessonId: string) => {
    setActivePersona(`teacher-${lang}-${lessonId}`);
    setScreen("call");
  }, [lang]);

  const startTutor = useCallback(() => {
    setActivePersona(`tutor-${lang}`);
    setScreen("call");
  }, [lang]);

  const isClassroom = activePersona.startsWith("teacher-") || activePersona.startsWith("tutor-");
  const meta: PersonaMeta = isClassroom
    ? activePersona.startsWith("tutor-")
      ? teacherMeta(lang, null)
      : teacherMeta(lang, activePersona.split("-").slice(2).join("-"))
    : PERSONAS[activePersona] ?? PERSONAS["kn-auto"];

  const handleCallEnd = useCallback(
    (payload: SessionEnd) => {
      if (activePersona.startsWith("teacher-")) {
        const lessonId = activePersona.split("-").slice(2).join("-");
        markDone(lang, lessonId);
        setScreen("school");
      } else if (activePersona.startsWith("tutor-")) {
        setScreen("school");
      } else {
        setLastSession(payload);
        setScreen("debrief");
      }
    },
    [activePersona, lang],
  );

  return (
    <div className="mt-app relative w-full h-dvh overflow-hidden" style={{ background: C.night, fontFamily: BODY }}>
      <div key={screen} className="absolute inset-0" style={{ animation: "mtFade 450ms ease both" }}>
        {screen === "street" && (
          <StreetScreen
            lang={lang}
            setLang={setLang}
            onEnter={enterShop}
            onProgress={() => setScreen("progress")}
            onSchool={() => setScreen("school")}
            rm={rm}
            stats={stats}
            statsLoading={statsLoading}
          />
        )}
        {screen === "school" && (
          <SchoolScreen lang={lang} onBack={() => setScreen("street")} onTutor={startTutor} onLesson={startLesson} />
        )}
        {screen === "call" && (
          <CallScreen meta={meta} lang={lang} captionsDefault onEnd={handleCallEnd} rm={rm} />
        )}
        {screen === "debrief" && (
          <DebriefScreen
            meta={meta}
            lang={lang}
            session={lastSession}
            userId={userId}
            onReportReady={handleReportReady}
            onStreet={() => setScreen("street")}
            onAgain={() => setScreen("call")}
          />
        )}
        {screen === "progress" && <ProgressScreen onBack={() => setScreen("street")} stats={stats} loading={statsLoading} />}
      </div>
    </div>
  );
}
