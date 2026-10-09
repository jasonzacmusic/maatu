"use client";
import { useEffect, useRef, useState } from "react";
import { Check, CircleHelp, LoaderCircle, Mic, Volume2 } from "lucide-react";
import type { Lang } from "@/lib/maatu-design";
import { useSpeech } from "./studio-ui";
import { saveCorrection } from "@/lib/conversation-history";
export type Correction = {
  status: "clear" | "needs-help" | "uncertain";
  kind: "grammar" | "pronunciation" | "none";
  corrected: string;
  speech: string;
  meaning: string;
  explanation: string;
  cue: string;
};
const checks = new Map<string, Correction>();
export default function CorrectionCoach({
  lang,
  learner,
  expected,
  persona,
  onPause,
  getAudio,
  recordPractice,
  conversationId,
  turnId,
}: {
  lang: Lang;
  learner: string;
  expected: string;
  persona: string;
  onPause?: () => Promise<void>;
  getAudio?: () => Promise<Blob | null>;
  recordPractice?: () => Promise<Blob | null>;
  conversationId?: string;
  turnId?: string;
}) {
  const [result, setResult] = useState<Correction | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [opened, setOpened] = useState(false);
  const request = useRef<AbortController | null>(null);
  const current = useRef(learner);
  current.current = learner;
  const voice = useSpeech(lang, persona);
  async function check(
    kind: "grammar" | "pronunciation",
    practice = false,
    automatic = false,
  ) {
    const source = learner;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    if (!automatic) {
      setOpened(true);
      setError("");
      setBusy(
        practice
          ? "Pausing the scene for private practice…"
          : "Checking your last turn…",
      );
    }
    try {
      let blob: Blob | null = null;
      if (kind === "pronunciation") {
        await onPause?.();
        if (practice) setBusy("Recording for 6 seconds. Say the phrase now…");
        blob = practice
          ? (await recordPractice?.()) || null
          : (await getAudio?.()) || null;
        if (!blob)
          throw new Error(
            "No recent recording. Use Try it privately to check your pronunciation.",
          );
        setBusy("Listening to your pronunciation…");
      }
      if (controller.signal.aborted) return;
      let audio: string | undefined;
      if (blob)
        audio = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(",", 2)[1]);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      const response = await fetch("/api/correction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lang,
          learner: source.slice(0, 1500),
          expected: expected.slice(0, 1800),
          kind,
          audio,
          mime: blob?.type.split(";")[0],
          practice,
        }),
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Your coach could not check that turn.");
      if (controller.signal.aborted || source !== current.current) return;
      setResult(data);
      if (kind === "grammar" && checks.size >= 64)
        checks.delete(checks.keys().next().value!);
      if (kind === "grammar") checks.set(`${lang}:${source}`, data);
      if (conversationId && turnId)
        saveCorrection(conversationId, lang, turnId, data);
    } catch (e) {
      if (!controller.signal.aborted && !automatic)
        setError(
          e instanceof Error ? e.message : "Please try that check again.",
        );
    } finally {
      if (!controller.signal.aborted && !automatic) setBusy("");
    }
  }
  useEffect(() => {
    request.current?.abort();
    voice.stop();
    setResult(null);
    setOpened(false);
    setError("");
    setBusy("");
    if (!learner.trim()) return;
    const cached = checks.get(`${lang}:${learner}`);
    if (cached) {
      setResult(cached);
      return;
    }
    const timer = setTimeout(() => {
      void check("grammar", false, true);
    }, 700);
    return () => {
      clearTimeout(timer);
      request.current?.abort();
      voice.stop();
    };
    // One independent check per completed learner turn, never per interim caption.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, learner]);
  async function hear() {
    await onPause?.();
    await voice.speak(result?.speech || expected, true);
  }
  const warning = result?.status === "needs-help";
  return (
    <section
      className={`correction-coach ${warning ? "needs-help" : ""}`}
      aria-label="Independent correction coach"
    >
      <div className="correction-heading">
        <CircleHelp size={18} />
        <span>
          <strong>Side coach</strong>
          <small>Quietly checks what you just said</small>
        </span>
        {warning && (
          <span className="correction-warning" role="status">
            One small adjustment
          </span>
        )}
      </div>
      {warning && !opened && <p>{result?.explanation}</p>}
      <div className="correction-actions">
        <button
          type="button"
          disabled={!learner || !!busy}
          onClick={() => void check("grammar")}
        >
          <Check size={15} />
          {warning ? "Show the correction" : "Check my sentence"}
        </button>
        {getAudio && (
          <button
            type="button"
            disabled={!learner || !!busy}
            onClick={() => void check("pronunciation")}
          >
            <Volume2 size={15} /> Check pronunciation
          </button>
        )}
        {recordPractice && (
          <button
            type="button"
            disabled={!expected || !!busy}
            onClick={() => void check("pronunciation", true)}
          >
            <Mic size={15} /> Try it privately
          </button>
        )}
      </div>
      {busy && (
        <p role="status">
          <LoaderCircle size={15} className="spin" /> {busy}
        </p>
      )}
      {(opened || warning) && result && (
        <div className="correction-result">
          <small>
            {result.status === "clear"
              ? "Your meaning comes through"
              : result.status === "uncertain"
                ? "Your coach is not certain"
                : result.kind === "pronunciation"
                  ? "A sound to practise"
                  : "A sentence to try"}
          </small>
          {result.corrected && <strong>{result.corrected}</strong>}
          {result.meaning && <p>{result.meaning}</p>}
          <p>{result.explanation}</p>
          {result.cue && <p className="sound-cue">{result.cue}</p>}
          {result.speech && (
            <button
              type="button"
              className="text-button"
              disabled={voice.state === "loading"}
              onClick={() => void hear()}
            >
              {voice.state === "loading" ? (
                <LoaderCircle size={16} className="spin" />
              ) : (
                <Volume2 size={16} />
              )}
              Hear the correction
            </button>
          )}
        </div>
      )}
      {(error || voice.error) && (
        <p className="error-note" role="alert">
          {error || voice.error}
        </p>
      )}
      <p className="correction-footnote">
        {getAudio
          ? "Your recording is used only when you tap a pronunciation check. Private practice pauses the call first."
          : "Your partner keeps talking. The side coach helps with your sentence."}
      </p>
    </section>
  );
}
