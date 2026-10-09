"use client";
import { useState } from "react";
import { Languages, LoaderCircle } from "lucide-react";
import type { Lang } from "@/lib/maatu-design";
import { SAY_IT, type SpeakLang } from "@/lib/say-it";
import { HearButton } from "./studio-ui";

type Item = { code: SpeakLang; name: string; native: string; display: string };

// One phrase, every language: the learner's own thought in Tamil, Kannada,
// Hindi, Malayalam, Telugu and French, each with its own local voice.
export default function SayItIn({
  lang,
  text,
  meaning,
}: {
  lang: Lang;
  text: string;
  meaning: string;
}) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "open" | "error">(
    "idle",
  );
  async function open() {
    if (state === "open") {
      setState("idle");
      return;
    }
    if (items) {
      setState("open");
      return;
    }
    setState("loading");
    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          meaning,
          to: SAY_IT.filter((l) => l.code !== lang).map((l) => l.code),
        }),
      });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data.items)) throw new Error();
      setItems(data.items);
      setState("open");
    } catch {
      setState("error");
    }
  }
  return (
    <div className="say-it-in">
      <button
        type="button"
        className="text-button say-it-toggle"
        aria-expanded={state === "open"}
        onClick={() => void open()}
        disabled={state === "loading"}
      >
        {state === "loading" ? (
          <LoaderCircle size={15} className="spin" />
        ) : (
          <Languages size={15} />
        )}
        {state === "open" ? "Hide other languages" : "Say it in other languages"}
      </button>
      {state === "error" && (
        <p className="audio-error" role="alert">
          The other languages could not load. Tap to try again.
        </p>
      )}
      {state === "open" && items && (
        <ul className="say-it-list">
          {items.map((item) => (
            <li key={item.code}>
              <span>
                <small>{item.name}</small>
                <strong lang={SAY_IT.find((l) => l.code === item.code)?.bcp}>
                  {item.display}
                </strong>
              </span>
              <HearButton
                compact
                lang={item.code}
                text={item.native}
                label={`Hear it in ${item.name}`}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
