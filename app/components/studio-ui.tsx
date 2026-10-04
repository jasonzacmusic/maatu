"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LoaderCircle, Square, Volume2 } from "lucide-react";
import { LANGUAGES } from "@/lib/languages";
import type { Lang } from "@/lib/maatu-design";

let activePreview: HTMLAudioElement | null = null;

export function CityArt({ lang, className = "" }: { lang: Lang; className?: string }) {
  const l = LANGUAGES[lang];
  return <div className={`city-art ${className}`} role="img" aria-label={`Photograph of everyday local life in ${l.city}`} style={{ backgroundImage: `url(/scenes/${lang}.webp)`, backgroundPosition: "center" }} />;
}

export function useSpeech(lang: Lang) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const request = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const cache = useRef(new Map<string, string>());
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle");
  const [error, setError] = useState("");
  const stop = useCallback(() => {
    sequence.current += 1;
    request.current?.abort();
    audio.current?.pause();
    setState("idle");
  }, []);
  const speak = useCallback(async (text: string, slow = false) => {
    stop(); setError("");
    const seq = sequence.current;
    const key = `${lang}:${slow}:${text}`;
    let src = cache.current.get(key);
    try {
      if (!src) {
        setState("loading");
        const controller = new AbortController(); request.current = controller;
        const response = await fetch("/api/say", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lang, text, pace: slow ? 0.72 : 0.9 }), signal: controller.signal });
        const data = await response.json();
        if (!response.ok || !data.audio) throw new Error(data.error || "The voice could not respond. Try again.");
        src = `data:${data.mime || "audio/wav"};base64,${data.audio}`;
        if (cache.current.size >= 60) cache.current.delete(cache.current.keys().next().value!);
        cache.current.set(key, src!);
      }
      if (seq !== sequence.current) return;
      const player = new Audio(src); audio.current = player;
      activePreview?.pause(); activePreview = player;
      player.onended = () => { if (seq === sequence.current) setState("idle"); };
      player.onpause = () => { if (seq === sequence.current) setState("idle"); };
      player.onerror = () => { if (seq === sequence.current) { setState("idle"); setError("Audio could not play. Tap Hear it to retry."); } };
      await player.play();
      if (seq === sequence.current) setState("playing");
    } catch (e) {
      if (seq !== sequence.current) return;
      setState("idle"); setError(e instanceof Error ? e.message : "Audio could not play. Try again.");
    }
  }, [lang, stop]);
  useEffect(() => { stop(); return stop; }, [lang, stop]);
  return { state, error, speak, stop };
}

export function HearButton({ text, lang, slow = false, label = "Hear it", compact = false }: { text: string; lang: Lang; slow?: boolean; label?: string; compact?: boolean }) {
  const voice = useSpeech(lang);
  return <span className="hear-wrap">
    <button type="button" className={compact ? "icon-button" : "button button-outline"} aria-label={label} onClick={() => voice.state === "playing" ? voice.stop() : void voice.speak(text, slow)} disabled={voice.state === "loading"}>
      {voice.state === "loading" ? <LoaderCircle size={18} className="spin" /> : voice.state === "playing" ? <Square size={16} /> : <Volume2 size={18} />}{!compact && (voice.state === "loading" ? "Preparing voice…" : voice.state === "playing" ? "Stop audio" : label)}
    </button>
    {voice.error && <span role="alert" className="audio-error">{voice.error}</span>}
  </span>;
}

export function Brand({ small = false }: { small?: boolean }) {
  return <span className={`brand ${small ? "brand-small" : ""}`}><svg width="35" height="35" viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M4 7h23a6 6 0 0 1 6 6v12a6 6 0 0 1-6 6H15l-8 5v-9a6 6 0 0 1-3-5V7Z" fill="currentColor"/><path d="M12 14v8m5-10v12m5-9v6m5-9v12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/></svg><span>maatu<span className="brand-dot">.</span></span></span>;
}
