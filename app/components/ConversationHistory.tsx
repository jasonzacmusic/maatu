"use client";
import { useEffect, useState } from "react";
import { ArrowRight, Clock3, Download, MessageCircle } from "lucide-react";
import {
  HISTORY_EVENT,
  loadConversations,
  type ConversationThread,
} from "@/lib/conversation-history";
import { romanizeDisplay } from "@/lib/romanize-client";
import { LANGUAGES } from "@/lib/languages";
import { HearButton } from "./studio-ui";
export default function ConversationHistory({
  onContinue,
}: {
  onContinue: (thread: ConversationThread) => void;
}) {
  const [threads, setThreads] =
    useState<ConversationThread[]>(loadConversations);
  const [selected, setSelected] = useState<string>();
  useEffect(() => {
    const refresh = () => setThreads(loadConversations());
    window.addEventListener(HISTORY_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(HISTORY_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  const active = threads.find((t) => t.id === selected);
  function download(t: ConversationThread) {
    const blob = new Blob([JSON.stringify(t, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `maatu-${t.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <header className="page-heading">
        <h1>
          Your words,
          <br />
          <em>kept for next time.</em>
        </h1>
        <p>
          Voice and text conversations are saved on this device as you go.
          Tap Continue to carry one on. To hear the same conversation in
          another language, continue it, then pick that language at the top:
          the whole conversation is translated and your original is kept.
        </p>
      </header>
      <div className="history-layout">
        <div className="history-list" aria-label="Saved conversations">
          {!threads.length ? (
            <div className="empty-state">
              <MessageCircle size={28} />
              <h3>Your next conversation will wait here.</h3>
              <p>A scene, a question, a few words. Each turn counts.</p>
            </div>
          ) : (
            threads.map((t) => (
              <button
                type="button"
                key={t.id}
                aria-pressed={selected === t.id}
                onClick={() => setSelected(t.id)}
              >
                <Clock3 size={19} />
                <span>
                  <strong>{t.title}</strong>
                  <small>
                    {LANGUAGES[t.lang].name} ·{" "}
                    {(t.versions[t.lang] || []).length} turns ·{" "}
                    {t.updated
                      ? new Date(t.updated).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })
                      : "Earlier chat"}
                  </small>
                </span>
                <ArrowRight size={17} />
              </button>
            ))
          )}
        </div>
        {active && (
          <section className="history-reading">
            <div className="section-heading">
              <h2>{active.title}</h2>
              <button
                type="button"
                className="icon-button"
                aria-label="Download conversation"
                onClick={() => download(active)}
              >
                <Download size={19} />
              </button>
            </div>
            <p className="composer-hint">
              Saved on this device. Clearing browser data removes these records.
            </p>
            <button
              type="button"
              className="button button-primary"
              onClick={() => onContinue(active)}
            >
              Continue this conversation
              <ArrowRight size={17} />
            </button>
            <div className="history-transcript">
              {(active.versions[active.lang] || []).map((t) => (
                <article key={t.id}>
                  <small>
                    {t.role === "user" ? "You" : "Partner"}
                    {t.translated ? " · translated" : ""}
                  </small>
                  <p>{romanizeDisplay(t.text)}</p>
                  {t.phrase && t.phrase !== t.text && (
                    <strong>{romanizeDisplay(t.phrase)}</strong>
                  )}
                  {t.meaning && <p className="history-meaning">{t.meaning}</p>}
                  {t.followUp && <p>{t.followUp}</p>}
                  {t.correction && (
                    <div className="saved-correction">
                      <small>Side coach</small>
                      <strong>{t.correction.corrected}</strong>
                      <p>{t.correction.meaning}</p>
                      <p>{t.correction.explanation}</p>
                    </div>
                  )}
                  {t.role === "assistant" && (
                    <HearButton
                      compact
                      lang={active.lang}
                      text={t.sourcePhrase || t.source || t.phrase || t.text}
                    />
                  )}
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
