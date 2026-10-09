"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Captions,
  CircleHelp,
  Keyboard,
  LoaderCircle,
  Mic,
  MicOff,
  Pause,
  Play,
  PhoneOff,
  RefreshCw,
  Volume2,
} from "lucide-react";
import { useMaatuCall, type Line, type PracticeLine } from "./useMaatuCall";
import type { PersonaMeta } from "@/lib/personas.generated";
import type { Lang } from "@/lib/maatu-design";
import CorrectionCoach from "./CorrectionCoach";
import { LANGUAGES } from "@/lib/languages";
import { SCENE_ICONS } from "./ScenarioStudio";
import ConversationCoach from "./ConversationCoach";

export type CallEnd = {
  room: string | null;
  personaId: string;
  transcript: Line[];
  raw: Line[];
  durationSec: number;
};
export default function CallRoom({
  meta,
  stage,
  practice,
  captions,
  onEnd,
  onBack,
  onType,
  conversationId,
}: {
  conversationId?: string;
  onLanguage?: (lang: Lang) => void;
  onType: () => void;
  meta: PersonaMeta;
  stage: 1 | 2 | 3;
  practice?: PracticeLine | null;
  captions: boolean;
  onEnd: (data: CallEnd) => void;
  onBack: () => void;
}) {
  const l = LANGUAGES[meta.language];
  const call = useMaatuCall(meta.id, stage, practice ?? null, conversationId);
  const started = useRef(0);
  const ending = useRef(false);
  const mutedBeforePause = useRef(false);
  const controlPending = useRef(false);
  const [elapsed, setElapsed] = useState(0);
  const [showCaps, setShowCaps] = useState(captions);
  const [paused, setPaused] = useState(false);
  const [practicePhrase, setPracticePhrase] = useState("");
  const [notice, setNotice] = useState("");
  const [waitingTooLong, setWaitingTooLong] = useState(false);
  const Icon = SCENE_ICONS[meta.shop] ?? Mic;
  useEffect(() => {
    void call.connect();
  }, [call.connect]);
  useEffect(() => {
    if (call.phase === "live" && !started.current) started.current = Date.now();
    if (call.phase !== "live") return;
    const timer = setInterval(
      () => setElapsed(Math.floor((Date.now() - started.current) / 1000)),
      1000,
    );
    return () => clearInterval(timer);
  }, [call.phase]);
  useEffect(() => {
    if (call.phase !== "live" || call.characterHeard) {
      setWaitingTooLong(false);
      return;
    }
    const timer = setTimeout(() => setWaitingTooLong(true), 30000);
    return () => clearTimeout(timer);
  }, [call.phase, call.characterHeard]);
  async function finish() {
    if (ending.current) return;
    ending.current = true;
    await call.hangUp();
    onEnd({
      room: call.roomName,
      personaId: meta.id,
      transcript: call.recordDisplayTranscript(),
      raw: call.recordTranscript(),
      durationSec: started.current
        ? Math.floor((Date.now() - started.current) / 1000)
        : 0,
    });
  }
  async function typeInstead() {
    if (ending.current) return;
    ending.current = true;
    await call.hangUp();
    onType();
  }
  const status =
    call.phase === "connecting"
      ? `Calling ${meta.name}…`
      : call.phase === "error"
        ? "Could not connect"
        : call.phase === "ended"
          ? "Conversation ended"
          : !call.characterHeard
            ? `${meta.name} is picking up. The first call of the day can take up to 20 seconds.`
            : paused
              ? "Take your time. We’re here."
              : call.speaker === "character"
                ? `${meta.name} is speaking`
                : call.speaker === "learner"
                  ? "Your turn, keep going"
                  : call.muted
                    ? "Microphone muted. You can listen."
                    : "Listening to you";
  async function help(
    action: "repeat" | "explain" | "pause" | "resume" | "slow-down",
  ) {
    if (controlPending.current) return;
    controlPending.current = true;
    if (action === "pause") {
      mutedBeforePause.current = call.muted;
      call.setRemoteAudioEnabled(false);
      if (!call.muted) await call.toggleMute();
      setPaused(true);
    }
    const ok =
      action === "slow-down"
        ? await call.requestSlowDown()
        : await call.requestHelp(action);
    setNotice(
      ok
        ? action === "slow-down"
          ? "Asked for a slower pace"
          : action === "repeat"
            ? "Asked to hear that again"
            : action === "explain"
              ? "Asked for the meaning"
              : action === "pause"
                ? "Conversation paused"
                : "Picking up where you left off"
        : "Could not send that request. Try again.",
    );
    if (ok && action === "resume") {
      call.setRemoteAudioEnabled(true);
      if (!mutedBeforePause.current && call.muted) await call.toggleMute();
      setPaused(false);
    }
    controlPending.current = false;
  }
  const lastLearnerLine = call.transcript.findLast(
    (line) => line.who === "learner",
  );
  const lastTeacherLine = call.transcript.findLast(
    (line) => line.who === "character",
  );
  return (
    <div className="call-room with-coach">
      <div className="call-top">
        <button
          type="button"
          className="text-button"
          onClick={() => void finish()}
        >
          <ArrowLeft size={17} /> End call
        </button>
        <span className="call-language">
          {l.name} · {l.city}
        </span>
        <span aria-label="Call time">
          {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
        </span>
      </div>
      <div className="call-session-layout">
        <div className="call-speaking">
          <div className="call-identity">
            <div
              className="call-avatar"
              style={{ background: l.tint, color: l.color }}
            >
              {meta.scenario === "tutor" || meta.scenario === "class" ? (
                meta.name.charAt(0)
              ) : (
                <Icon size={58} strokeWidth={1.5} />
              )}
            </div>
            <h1>{meta.name}</h1>
            <p>{meta.sceneLabel}</p>
            <div className="call-status" role="status">
              {call.phase === "connecting" ||
              (!call.characterHeard && call.phase === "live") ? (
                <LoaderCircle size={17} className="spin" />
              ) : (
                <span className="status-dot" />
              )}
              {status}
            </div>
          </div>
          <div
            className={`voice-field ${call.speaker === "character" ? "speaking" : ""}`}
            aria-hidden="true"
          >
            {Array.from({ length: 25 }, (_, i) => (
              <i
                key={i}
                style={{
                  height: `${10 + Math.sin(i * 0.67) ** 2 * 48}px`,
                  animationDelay: `${i * 35}ms`,
                }}
              />
            ))}
          </div>
          <div className="caption-area" aria-live="polite">
            {showCaps && call.caption ? (
              <>
                <span>
                  {call.caption.who === "learner" ? "You" : meta.name}
                </span>
                <p lang={l.code}>{call.caption.text}</p>
              </>
            ) : (
              <p className="call-prompt">
                {practice?.target
                  ? `Practice: ${practice.target}`
                  : `Just speak. English or ${l.name}, both are welcome.`}
              </p>
            )}
          </div>
          {(call.error ||
            call.connectionIssue ||
            call.micIssue ||
            waitingTooLong) && (
            <div className="error-note" role="alert">
              {call.error ||
                call.connectionIssue ||
                call.micIssue ||
                `${meta.name} is taking longer than usual. Try reconnecting, or keep going by typing.`}
              {(call.micIssue || call.phase === "error" || waitingTooLong) && (
                <button
                  type="button"
                  className="button button-primary call-type-instead"
                  onClick={() => void typeInstead()}
                >
                  <Keyboard size={17} /> Keep going by typing
                </button>
              )}
              {(call.phase === "error" ||
                call.phase === "ended" ||
                waitingTooLong) && (
                <button
                  type="button"
                  className="text-button"
                  onClick={async () => {
                    await call.hangUp();
                    started.current = 0;
                    ending.current = false;
                    setPaused(false);
                    call.setRemoteAudioEnabled(true);
                    await call.connect();
                  }}
                >
                  <RefreshCw size={16} /> Reconnect
                </button>
              )}
            </div>
          )}
          {call.needsAudioUnlock && (
            <button
              type="button"
              className="button button-primary"
              onClick={() => void call.unlockAudio()}
            >
              <Volume2 size={18} /> Tap to hear {meta.name}
            </button>
          )}
          {call.micSilent && !call.muted && (
            <p className="error-note">
              We cannot hear you yet. Check that the right microphone is
              chosen below, or{" "}
              <button
                type="button"
                className="text-button"
                onClick={() => void typeInstead()}
              >
                keep going by typing
              </button>
              .
            </p>
          )}
          {call.mics.length > 1 && (
            <label className="mic-selector">
              Microphone
              <select
                value={call.micId ?? "default"}
                onChange={(e) => void call.switchMic(e.target.value)}
              >
                {call.mics.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div
            className="call-tools"
            role="group"
            aria-label="Conversation help"
          >
            <button
              type="button"
              disabled={call.phase !== "live" || paused}
              onClick={() => void help("repeat")}
            >
              <RefreshCw size={17} /> Say it again
            </button>
            <button
              type="button"
              disabled={call.phase !== "live" || paused}
              onClick={() => void help("explain")}
            >
              <CircleHelp size={17} /> What does it mean?
            </button>
            <button
              type="button"
              disabled={call.phase !== "live" || paused}
              aria-pressed={call.slowerPace}
              onClick={() => void help("slow-down")}
            >
              <Volume2 size={17} />
              {call.slowerPace ? "Speaking slower" : "A little slower"}
            </button>
            <button
              type="button"
              disabled={call.phase !== "live"}
              aria-pressed={paused}
              onClick={() => void help(paused ? "resume" : "pause")}
            >
              {paused ? <Play size={17} /> : <Pause size={17} />}
              {paused ? "Resume" : "Give me a moment"}
            </button>
          </div>
          {notice && (
            <p className="control-notice" role="status">
              {notice}
            </p>
          )}
          <div className="call-controls">
            <button
              type="button"
              className="call-control"
              disabled={call.phase !== "live" || paused}
              aria-label={call.muted ? "Unmute microphone" : "Mute microphone"}
              aria-pressed={call.muted}
              onClick={() => void call.toggleMute()}
            >
              {call.muted ? <MicOff size={24} /> : <Mic size={24} />}
            </button>
            <button
              type="button"
              className="call-control end-call"
              aria-label="End conversation"
              onClick={() => void finish()}
            >
              <PhoneOff size={25} />
            </button>
            <button
              type="button"
              className="call-control"
              aria-label={showCaps ? "Hide captions" : "Show captions"}
              aria-pressed={showCaps}
              onClick={() => setShowCaps(!showCaps)}
            >
              <Captions size={24} />
            </button>
          </div>
          {call.phase === "ended" && call.endedUnexpectedly && (
            <button
              type="button"
              className="button button-outline"
              onClick={() => void finish()}
            >
              Save transcript & return
            </button>
          )}
          {call.phase === "error" && (
            <button type="button" className="text-button" onClick={onBack}>
              Return to practice
            </button>
          )}
          <p className="composer-hint">
            Stuck? Say it in English, or ask “how do I say…?”. Each turn is
            saved on this device.
          </p>
          <CorrectionCoach
            lang={meta.language}
            learner={lastLearnerLine?.source || lastLearnerLine?.text || ""}
            expected={practicePhrase}
            persona={meta.id}
            onPause={() => (paused ? Promise.resolve() : help("pause"))}
            getAudio={call.latestLearnerAudio}
            recordPractice={call.recordPrivatePractice}
            conversationId={conversationId}
            turnId={lastLearnerLine?.id}
          />
        </div>
        <ConversationCoach
          lang={meta.language}
          initialOpen={false}
          spoken={lastTeacherLine?.source || lastTeacherLine?.text || ""}
          paused={paused}
          onPause={call.phase === "live" ? () => help("pause") : undefined}
          onResume={() => help("resume")}
          teacher={meta.name}
          onPhrase={setPracticePhrase}
        />
      </div>
      {showCaps && call.transcript.length > 0 && (
        <details className="call-transcript">
          <summary>Your conversation so far</summary>
          {call.transcript.map((line, i) => (
            <p key={i}>
              <strong>{line.who === "learner" ? "You" : meta.name}: </strong>
              {line.text}
            </p>
          ))}
        </details>
      )}
    </div>
  );
}
