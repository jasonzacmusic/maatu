"use client";
import { useEffect, useId, useRef, useState } from "react";
import {
  GitBranch,
  LoaderCircle,
  Pause,
  Play,
  RefreshCw,
  Volume2,
} from "lucide-react";
import type { Lang } from "@/lib/maatu-design";
import type {
  ConversationCoach as Coach,
  CoachVariant,
} from "@/lib/conversation-coach";
import type { WordStep } from "@/lib/sentence-game";
import { LANGUAGES } from "@/lib/languages";
import SentenceBoard from "./SentenceBoard";
import { useSpeech } from "./studio-ui";

const steps: WordStep[] = ["who", "action", "what", "describe", "when"];
const titles: Record<WordStep, string> = {
  who: "Doer",
  action: "Verb",
  what: "Object / place",
  describe: "Adjective",
  when: "Time",
};
const localCache = new Map<string, Coach>();
export default function ConversationCoach({
  lang,
  spoken,
  paused = false,
  onPause,
  onResume,
  teacher,
  initialOpen = true,
  onPhrase,
}: {
  lang: Lang;
  spoken: string;
  paused?: boolean;
  onPause?: () => Promise<void>;
  onResume?: () => Promise<void>;
  teacher?: string;
  initialOpen?: boolean;
  onPhrase?: (phrase: string) => void;
}) {
  const panelId = useId();
  const [wordIndex, setWordIndex] = useState<number | null>(null);
  const [open, setOpen] = useState(initialOpen);
  const [data, setData] = useState<Coach | null>(null);
  const [englishOnly, setEnglishOnly] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const [step, setStep] = useState<WordStep>("action");
  const [variant, setVariant] = useState<CoachVariant | null>(null);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    onPhrase?.(data?.speech || "");
  }, [data?.speech, onPhrase]);
  const frozen = useRef(spoken);
  const voice = useSpeech(lang);
  // Pausing freezes the current sentence; live audio can never replace the
  // words while a learner is inspecting an ending or trying an alternative.
  if (!paused) frozen.current = spoken;
  const source = paused ? frozen.current : spoken;
  useEffect(() => {
    if (!source.trim()) {
      setData(null);
      setVariant(null);
      setError("");
      setBusy(false);
      setEnglishOnly(false);
      voice.stop();
      return;
    }
    if (!open) return;
    const controller = new AbortController();
    const key = JSON.stringify([lang, source]);
    setData(null);
    setVariant(null);
    setWordIndex(null);
    setError("");
    setEnglishOnly(false);
    voice.stop();
    const saved = localCache.get(key);
    if (saved) {
      setData(saved);
      setBusy(false);
      return;
    }
    setBusy(true);
    fetch("/api/sentence-coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lang, spoken: source }),
      signal: controller.signal,
    })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok)
          throw new Error(
            d.error || "The sentence explanation could not load.",
          );
        return d as Coach;
      })
      .then((d) => {
        if (controller.signal.aborted) return;
        if ("available" in d && d.available === false) {
          setEnglishOnly(true);
          return;
        }
        if (localCache.size >= 32)
          localCache.delete(localCache.keys().next().value!);
        localCache.set(key, d);
        setData(d);
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error
              ? e.message
              : "Try the sentence explanation again.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
    // Voice playback stops on the actual source change, never on a status tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, source, open, retry]);
  const text = variant?.text || data?.phrase || "";
  const speech = variant?.speech || data?.speech || text;
  useEffect(() => {
    if (!text) return;
    const timer = setTimeout(() => {
      void voice.prepare(speech, slow);
    }, 700);
    return () => clearTimeout(timer);
  }, [speech, slow, voice.prepare]);
  const currentWords =
    wordIndex !== null && data?.words[wordIndex]
      ? [data.words[wordIndex]]
      : data?.words.filter((w) => w.slot === step) || [];
  async function hear() {
    if (onPause && !paused) await onPause();
    void voice.speak(speech, slow);
  }
  function choose(v: CoachVariant) {
    voice.stop();
    setVariant(v);
  }
  return (
    <section
      className="conversation-coach word-game"
      aria-label="Sentence construction"
    >
      <div className="coach-heading">
        <button
          type="button"
          className="text-button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <GitBranch size={18} />
          {open ? "How this sentence works" : "Show sentence flowchart"}
        </button>
        {onPause && (
          <button
            type="button"
            className="button button-outline"
            onClick={() => void (paused ? onResume?.() : onPause())}
          >
            {paused ? <Play size={16} /> : <Pause size={16} />}{" "}
            {paused ? "Resume conversation" : "Pause & practise"}
          </button>
        )}
      </div>
      {open && (
        <>
          {paused && (
            <p className="coach-paused" role="status">
              Conversation paused. Your microphone is muted. Take your time with
              this sentence.
            </p>
          )}
          {!source && (
            <p className="coach-empty">
              Your teacher’s next phrase will appear here with its meaning, word
              roles and ways to change it.
            </p>
          )}
          {englishOnly && (
            <p className="coach-empty">
              Your teacher is explaining in English. The next target-language
              phrase will open here.
            </p>
          )}
          {busy && (
            <p className="coach-loading" role="status">
              <LoaderCircle size={17} className="spin" /> Connecting the words…
              Your conversation can keep going.
            </p>
          )}
          {error && (
            <div className="error-note" role="alert">
              <p>{error}</p>
              <button
                type="button"
                className="text-button"
                onClick={() => setRetry((x) => x + 1)}
              >
                <RefreshCw size={16} /> Retry explanation
              </button>
            </div>
          )}
          {data && (
            <>
              <div className="coach-said">
                <div className="coach-said-head">
                  <h2>
                    {teacher
                      ? `${teacher} said`
                      : `Your ${LANGUAGES[lang].name} phrase`}
                  </h2>
                  <button
                    type="button"
                    className="button button-small coach-quick-hear"
                    disabled={voice.state === "loading"}
                    onClick={async () => {
                      if (onPause && !paused) await onPause();
                      await voice.speak(data.speech, slow);
                    }}
                  >
                    <Volume2 size={16} /> Listen
                  </button>
                </div>
                <p lang={LANGUAGES[lang].code}>{data.phrase}</p>
                <span>{data.meaning}</span>
              </div>
              {data.words.some((w) => w.role === "verb") && (
                <SentenceBoard
                  step={step}
                  named={data.words.some((w) => w.role === "proper noun")}
                  hasObject={data.words.some((w) => w.slot === "what")}
                  labels={titles}
                  inspecting
                  panelId={panelId}
                  idPrefix={panelId}
                  description={data.rule}
                  hasDescription={data.words.some(
                    (w) => w.role === "adjective",
                  )}
                  hasTime={data.words.some((w) => w.role === "time")}
                  objectLinkLabel="links"
                  values={
                    Object.fromEntries(
                      steps.map((k) => [
                        k,
                        data.words
                          .filter((w) => w.slot === k)
                          .map((w) => w.text)
                          .join(" ") || "Not stated",
                      ]),
                    ) as Record<WordStep, string>
                  }
                  previews={
                    Object.fromEntries(
                      steps.map((k) => [
                        k,
                        data.words
                          .filter((w) => w.slot === k)
                          .map((w) => w.meaning)
                          .join(" · ") || "No separate word",
                      ]),
                    ) as Record<WordStep, string>
                  }
                  onSelect={(s) => {
                    setWordIndex(null);
                    setStep(s);
                  }}
                />
              )}
              <p className="coach-rule">{data.rule}</p>
              <div className="coach-word-order" aria-label="Spoken word order">
                {data.words.map((w, i) => (
                  <button
                    type="button"
                    key={i}
                    onClick={() => {
                      setWordIndex(i);
                      if (w.slot !== "detail") setStep(w.slot);
                    }}
                    className={`coach-word role-${w.role.replace(/ /g, "-")}`}
                    title={`${w.meaning}. ${w.note}`}
                  >
                    <strong>{w.text}</strong>
                    <small>{w.role}</small>
                  </button>
                ))}
              </div>
              <div
                className="coach-word-notes"
                id={panelId}
                role="tabpanel"
                aria-label="Word explanation"
                aria-live="polite"
              >
                <h3>
                  {wordIndex !== null
                    ? data.words[wordIndex]?.role
                    : titles[step]}{" "}
                  in this sentence
                </h3>
                {currentWords.length ? (
                  currentWords.map((w, i) => (
                    <p key={i}>
                      <strong>{w.text}</strong> means {w.meaning}. {w.note}
                    </p>
                  ))
                ) : (
                  <p>This role has no separate word here. {data.rule}</p>
                )}
              </div>
              <div className="coach-variations">
                <div>
                  <h3>Another way to say it</h3>
                  {data.alternatives.map((v, i) => (
                    <button
                      type="button"
                      key={i}
                      aria-pressed={variant === v}
                      onClick={() => choose(v)}
                    >
                      <span>{v.label}</span>
                      <strong>{v.text}</strong>
                      <small>{v.meaning}</small>
                    </button>
                  ))}
                </div>
                <div>
                  <h3>Keep the idea. Change the time.</h3>
                  {data.tenses.length ? (
                    data.tenses.map((v, i) => (
                      <button
                        type="button"
                        key={i}
                        aria-pressed={variant === v}
                        onClick={() => choose(v)}
                      >
                        <span>{v.label}</span>
                        <strong>{v.text}</strong>
                        <small>{v.meaning}</small>
                      </button>
                    ))
                  ) : (
                    <p>This phrase does not need tense changes.</p>
                  )}
                </div>
              </div>
              {data.timeNote && (
                <p className="coach-time-note">{data.timeNote}</p>
              )}
              <div className="coach-practice">
                <div>
                  <h3>
                    {variant
                      ? "Try this version"
                      : "Practise the spoken phrase"}
                  </h3>
                  <p>{text}</p>
                  <span>{variant?.meaning || data.meaning}</span>
                  {variant?.note && <small>{variant.note}</small>}
                </div>
                <div className="coach-audio">
                  <button
                    type="button"
                    className="button button-primary"
                    disabled={voice.state === "loading"}
                    onClick={() =>
                      voice.state === "playing" ? voice.stop() : void hear()
                    }
                  >
                    <Volume2 size={17} />
                    {voice.state === "playing"
                      ? "Stop audio"
                      : voice.state === "loading"
                        ? "Preparing voice…"
                        : "Hear this"}
                  </button>
                  <label>
                    <input
                      type="checkbox"
                      checked={slow}
                      onChange={(e) => {
                        voice.stop();
                        setSlow(e.target.checked);
                      }}
                    />{" "}
                    Slower
                  </label>
                  {variant && (
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => {
                        voice.stop();
                        setVariant(null);
                      }}
                    >
                      Back to spoken phrase
                    </button>
                  )}
                </div>
                {voice.error && (
                  <p role="alert" className="audio-error">
                    {voice.error}
                  </p>
                )}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
