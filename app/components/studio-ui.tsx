"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LoaderCircle, Square, Volume2 } from "lucide-react";
import { LANGUAGES } from "@/lib/languages";
import type { Lang } from "@/lib/maatu-design";
import starterAudio from "@/lib/lab-voice.generated.json";

let activePreview: HTMLAudioElement | null = null;

export function CityArt({
  lang,
  className = "",
}: {
  lang: Lang;
  className?: string;
}) {
  const l = LANGUAGES[lang];
  return (
    <div
      className={`city-art ${className}`}
      role="img"
      aria-label={`Photograph of everyday local life in ${l.city}`}
      style={{
        backgroundImage: `url(/scenes/${lang}.webp)`,
        backgroundPosition: "center",
      }}
    />
  );
}

const previewCache = new Map<string, string>();
const previewRequests = new Map<string, Promise<string>>();
const audioKey = (lang: Lang, text: string, slow: boolean, persona = "") =>
  `${lang}:${slow ? 0.72 : 0.9}:${persona}:${text}`;

async function phraseAudio(
  lang: Lang,
  text: string,
  slow: boolean,
  persona = "",
): Promise<string> {
  const key = audioKey(lang, text, slow, persona);
  const cached = previewCache.get(key);
  if (cached) return cached;
  const pending = previewRequests.get(key);
  if (pending) return pending;
  const task = (async () => {
    const seed =
      !persona &&
      (
        starterAudio as {
          lang: string;
          text: string;
          pace: number;
          url: string;
        }[]
      ).find(
        (clip) =>
          clip.lang === lang &&
          clip.text === text &&
          clip.pace === (slow ? 0.72 : 0.9),
      );
    let src: string;
    if (seed) {
      const response = await fetch(seed.url);
      if (!response.ok)
        throw new Error("The saved voice could not load. Try again.");
      // Vercel serves WAVs as audio/wave, which some browsers reject in data URLs.
      const blob = new Blob([await response.arrayBuffer()], {
        type: "audio/wav",
      });
      src = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () =>
          reject(new Error("The voice could not load. Try again."));
        reader.readAsDataURL(blob);
      });
    } else {
      const response = await fetch("/api/say", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lang,
          text,
          pace: slow ? 0.72 : 0.9,
          role: persona ? "coach" : "character",
          persona,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.audio)
        throw new Error(
          data.error || "The voice could not respond. Try again.",
        );
      src = `data:${data.mime || "audio/wav"};base64,${data.audio}`;
    }
    if (previewCache.size >= 64)
      previewCache.delete(previewCache.keys().next().value!);
    previewCache.set(key, src);
    return src;
  })();
  previewRequests.set(key, task);
  try {
    return await task;
  } finally {
    previewRequests.delete(key);
  }
}

export function useSpeech(lang: Lang, persona = "") {
  const audio = useRef<HTMLAudioElement | null>(null);
  const sequence = useRef(0);
  const alive = useRef(true);
  const currentLanguage = useRef(lang);
  currentLanguage.current = lang;
  const [preparedKey, setPreparedKey] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle");
  const [error, setError] = useState("");
  const stop = useCallback(() => {
    sequence.current += 1;
    audio.current?.pause();
    if (alive.current) setState("idle");
  }, []);
  const prepare = useCallback(
    async (text: string, slow = false) => {
      try {
        await phraseAudio(lang, text, slow, persona);
        if (alive.current && currentLanguage.current === lang)
          setPreparedKey(audioKey(lang, text, slow, persona));
        return true;
      } catch {
        return false;
      }
    },
    [lang, persona],
  );
  const speak = useCallback(
    async (text: string, slow = false) => {
      stop();
      setError("");
      const seq = sequence.current;
      try {
        const key = audioKey(lang, text, slow, persona);
        let src = previewCache.get(key);
        if (!src) {
          setState("loading");
          src = await phraseAudio(lang, text, slow, persona);
        }
        if (!alive.current || seq !== sequence.current) return;
        setPreparedKey(key);
        const player = new Audio(src);
        audio.current = player;
        activePreview?.pause();
        activePreview = player;
        player.onended = () => {
          if (alive.current && seq === sequence.current) setState("idle");
        };
        player.onpause = () => {
          if (alive.current && seq === sequence.current) setState("idle");
        };
        player.onerror = () => {
          if (alive.current && seq === sequence.current) {
            setState("idle");
            setError("Audio could not play. Tap Hear it to retry.");
          }
        };
        await player.play();
        if (alive.current && seq === sequence.current) setState("playing");
      } catch (e) {
        if (!alive.current || seq !== sequence.current) return;
        setState("idle");
        setError(
          e instanceof Error ? e.message : "Audio could not play. Try again.",
        );
      }
    },
    [lang, persona, stop],
  );
  useEffect(() => {
    alive.current = true;
    stop();
    return () => {
      alive.current = false;
      sequence.current += 1;
      audio.current?.pause();
    };
  }, [lang, persona, stop]);
  const isReady = useCallback(
    (text: string, slow = false) =>
      previewCache.has(audioKey(lang, text, slow, persona)),
    [lang, persona, preparedKey],
  );
  return { state, error, speak, stop, prepare, isReady };
}

export function HearButton({
  text,
  lang,
  slow = false,
  label = "Hear it",
  compact = false,
}: {
  text: string;
  lang: Lang;
  slow?: boolean;
  label?: string;
  compact?: boolean;
}) {
  const voice = useSpeech(lang);
  return (
    <span className="hear-wrap">
      <button
        type="button"
        className={compact ? "icon-button" : "button button-outline"}
        aria-label={label}
        onClick={() =>
          voice.state === "playing"
            ? voice.stop()
            : void voice.speak(text, slow)
        }
        disabled={voice.state === "loading"}
      >
        {voice.state === "loading" ? (
          <LoaderCircle size={18} className="spin" />
        ) : voice.state === "playing" ? (
          <Square size={16} />
        ) : (
          <Volume2 size={18} />
        )}
        {!compact &&
          (voice.state === "loading"
            ? "Preparing voice…"
            : voice.state === "playing"
              ? "Stop audio"
              : label)}
      </button>
      {voice.error && (
        <span role="alert" className="audio-error">
          {voice.error}
        </span>
      )}
    </span>
  );
}

export function Brand({ small = false }: { small?: boolean }) {
  return (
    <span className={`brand ${small ? "brand-small" : ""}`}>
      <svg
        width="35"
        height="35"
        viewBox="0 0 40 40"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M4 7h23a6 6 0 0 1 6 6v12a6 6 0 0 1-6 6H15l-8 5v-9a6 6 0 0 1-3-5V7Z"
          fill="currentColor"
        />
        <path
          d="M12 14v8m5-10v12m5-9v6m5-9v12"
          stroke="#fff"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      <span>
        maatu<span className="brand-dot">.</span>
      </span>
    </span>
  );
}
