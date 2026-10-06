"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowRight,
  ArrowUp,
  BookOpen,
  Bookmark,
  Check,
  Coffee,
  MessageCircle,
  Mic,
  Music2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { PERSONAS } from "@/lib/personas.generated";
import { romanizeDisplay } from "@/lib/romanize-client";
import { LANGUAGES } from "@/lib/languages";
import type { Lang } from "@/lib/maatu-design";
import type { PracticeLine } from "./useMaatuCall";
import { toggleSaved } from "@/lib/review";
import { CityArt, HearButton } from "./studio-ui";
import ConversationCoach from "./ConversationCoach";
import CorrectionCoach from "./CorrectionCoach";
import {
  appendConversation,
  createConversation,
  getConversation,
  type ConversationTurn,
} from "@/lib/conversation-history";

export type Message = {
  id?: string;
  at?: number;
  source?: string;
  translated?: boolean;
  role: "user" | "assistant";
  text: string;
  phrase?: string;
  sourcePhrase?: string;
  meaning?: string;
  phraseMeaning?: string;
  followUp?: string;
};

function Chat({
  lang,
  persona,
  seed,
  onVoice,
  conversationId,
  onConversation,
  onNew,
}: {
  lang: Lang;
  persona?: string;
  seed?: string;
  onVoice: (practice?: PracticeLine) => void;
  conversationId?: string;
  onConversation: (id: string) => void;
  onNew: () => void;
}) {
  const l = LANGUAGES[lang];
  const originalPartner = getConversation(conversationId)?.persona;
  const partnerName =
    (originalPartner && PERSONAS[originalPartner]?.name) ||
    (persona ? PERSONAS[persona]?.name : undefined) ||
    l.teacher;
  const storageKey = `maatu-chat-${lang}-${persona ?? "tutor"}`;
  const threadId = useRef(conversationId);
  const [messages, setMessages] = useState<Message[]>(() => {
    const history = getConversation(conversationId)?.versions[lang];
    if (history) return history;
    return [];
  });
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(() =>
    messages.at(-1)?.role === "user"
      ? "The last reply was interrupted. Your message is saved; retry it below."
      : "",
  );
  const [saved, setSaved] = useState<string[]>([]);
  const abort = useRef<AbortController | null>(null);
  const end = useRef<HTMLDivElement | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    return () => abort.current?.abort();
  }, [storageKey]);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, busy]);

  async function send(text: string, retry = false) {
    if (!text.trim() || busy) return;
    if (!threadId.current) {
      const thread = createConversation(
        lang,
        persona,
        persona ? PERSONAS[persona]?.sceneLabel || text.trim() : text.trim(),
      );
      threadId.current = thread.id;
      onConversation(thread.id);
    }
    const learner: ConversationTurn = {
      id: crypto.randomUUID(),
      at: Date.now(),
      role: "user",
      text: text.trim(),
    };
    const next: Message[] = retry ? messages : [...messages, learner];
    if (!retry) appendConversation(threadId.current, lang, learner);
    setMessages(next);
    setInput("");
    setBusy(true);
    setError("");
    const controller = new AbortController();
    abort.current = controller;
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          lang,
          persona,
          continuation: conversationId
            ? {
                name: partnerName,
                scene: getConversation(conversationId)?.title,
              }
            : undefined,
          messages: next.map((m) => ({
            role: m.role,
            text: [
              m.source || m.text,
              m.sourcePhrase || m.phrase,
              m.meaning,
              m.followUp,
            ]
              .filter(Boolean)
              .join("\n"),
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error || "Your teacher could not reply. Try again.",
        );
      const answer: ConversationTurn = {
        id: crypto.randomUUID(),
        at: Date.now(),
        role: "assistant",
        text: data.reply,
        phrase: data.phrase,
        sourcePhrase: data.sourcePhrase,
        meaning: data.meaning,
        followUp: data.followUp,
      };
      const rows: Message[] = [...next, answer];
      appendConversation(threadId.current, lang, answer);
      setMessages(rows);
      try {
        localStorage.setItem(storageKey, JSON.stringify(rows));
      } catch {
        /* Device memory is optional. */
      }
    } catch (e) {
      if (!controller.signal.aborted)
        setError(
          e instanceof Error
            ? e.message
            : "Your teacher could not reply. Try again.",
        );
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active && seed && !initialized.current && !conversationId) {
        initialized.current = true;
        void send(seed);
      }
    });
    return () => {
      active = false;
    };
    // Seed is a learner-selected topic, sent once per conversation surface.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);
  const voiceContext = messages
    .map(
      (m) =>
        `${m.role === "user" ? "Learner" : partnerName}: ${[m.source || m.text, m.sourcePhrase || m.phrase, m.meaning, m.followUp].filter(Boolean).join(" ")}`,
    )
    .slice(-10)
    .join("\n");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void send(input);
  };
  const lastLearner = messages.findLast((m) => m.role === "user");
  const lastTeaching = messages.findLast(
    (m) => m.role === "assistant" && m.phrase,
  );
  const lastPhrase = lastTeaching?.sourcePhrase || lastTeaching?.phrase || "";
  return (
    <div className="chat-space with-coach">
      <div className="chat-session-layout">
        <div className="chat-speaking">
          <div className="chat-heading">
            <div className="avatar">{partnerName.charAt(0)}</div>
            <div>
              <strong>
                {persona
                  ? "Keep the scene going"
                  : `A conversation with ${partnerName}`}
              </strong>
              <span>
                Everyday {l.name}, with your AI{" "}
                {persona ? "practice partner" : "teacher"}.
              </span>
            </div>
            <button
              type="button"
              className="button button-small"
              onClick={() =>
                onVoice({ target: "", en: "", context: voiceContext })
              }
            >
              <Mic size={16} /> Switch to voice
            </button>
          </div>
          <button
            type="button"
            className="text-button new-conversation"
            onClick={onNew}
          >
            Start a fresh conversation
          </button>
          <div
            className="chat-log"
            role="log"
            aria-label="Conversation"
            aria-live="polite"
          >
            {!messages.length && (
              <div className="chat-empty">
                <MessageCircle size={30} />
                <h3>Anything on your mind?</h3>
                <p>
                  Talk about your day, ask a language question, or make up a
                  scene. {partnerName} will help you say it.
                </p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`chat-message ${m.role}`}>
                <span className="message-name">
                  {m.role === "user" ? "You" : partnerName}
                </span>
                <p>{romanizeDisplay(m.text)}</p>
                {m.phrase && (
                  <div className="teaching-phrase">
                    <div>
                      {m.phrase !== m.text && <strong lang={l.code}>{romanizeDisplay(m.sourcePhrase || m.phrase)}</strong>}
                      <span>{m.phraseMeaning || m.meaning}</span>
                    </div>
                    <HearButton
                      lang={lang}
                      text={m.sourcePhrase || m.phrase}
                      compact
                      label="Hear the phrase"
                    />
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={
                        saved.includes(m.phrase)
                          ? "Unsave phrase"
                          : "Save phrase"
                      }
                      onClick={() => {
                        const added = toggleSaved(
                          lang,
                          m.phraseMeaning || m.meaning || "",
                          m.phrase!,
                        );
                        setSaved((s) =>
                          added
                            ? [...s, m.phrase!]
                            : s.filter((x) => x !== m.phrase),
                        );
                      }}
                    >
                      {saved.includes(m.phrase) ? (
                        <Check size={18} />
                      ) : (
                        <Bookmark size={18} />
                      )}
                    </button>
                  </div>
                )}
                {m.followUp && <p className="follow-up">{m.followUp}</p>}
              </div>
            ))}
            {busy && (
              <div className="chat-message assistant">
                <span className="message-name">{partnerName}</span>
                <span className="thinking" role="status">
                  Thinking of a useful way to say it<span>•••</span>
                </span>
              </div>
            )}
            {error && (
              <div className="error-note" role="alert">
                <p>{error}</p>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => void send(messages.at(-1)?.text ?? "", true)}
                >
                  <RefreshCw size={16} /> Retry message
                </button>
              </div>
            )}
            <div ref={end} />
          </div>
          <form onSubmit={submit} className="composer">
            <label className="sr-only" htmlFor="chat-input">
              Your message
            </label>
            <input
              id="chat-input"
              value={input}
              maxLength={1000}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Say anything to ${partnerName}…`}
              disabled={busy}
            />
            <button
              type="submit"
              aria-label="Send message"
              disabled={busy || !input.trim()}
            >
              <ArrowUp size={21} />
            </button>
          </form>
          <p className="composer-hint">
            Saved as you go on this device. English is welcome.
          </p>
          <CorrectionCoach
            lang={lang}
            learner={lastLearner?.source || lastLearner?.text || ""}
            expected={lastPhrase}
            persona={persona || `tutor-${lang}`}
            conversationId={threadId.current}
            turnId={lastLearner?.id}
          />
        </div>
        <ConversationCoach
          lang={lang}
          spoken={lastPhrase}
          teacher={partnerName}
        />
      </div>
    </div>
  );
}

export default function ConversationStudio({
  lang,
  onVoice,
  onScenes,
  onBuild,
  persona,
  seed,
  conversationId,
  onConversation,
  onNew,
}: {
  conversationId?: string;
  onConversation: (id: string) => void;
  onNew: () => void;
  lang: Lang;
  onVoice: (practice?: PracticeLine) => void;
  onScenes: () => void;
  onBuild: () => void;
  persona?: string;
  seed?: string;
}) {
  const l = LANGUAGES[lang];
  const [chat, setChat] = useState(!!seed || !!persona || !!conversationId);
  const [topic, setTopic] = useState(seed ?? "");
  const [draft, setDraft] = useState("");
  const open = (text: string) => {
    setTopic(text);
    setChat(true);
  };
  if (chat)
    return (
      <Chat
        key={`${lang}-${persona ?? "tutor"}`}
        lang={lang}
        persona={persona}
        seed={topic}
        onVoice={onVoice}
        conversationId={conversationId}
        onConversation={onConversation}
        onNew={onNew}
      />
    );
  return (
    <>
      <header className="page-heading">
        <h1>
          A little conversation.
          <br />
          <em>A whole new language.</em>
        </h1>
        <p>
          No perfect sentences needed. Just you, your curiosity, and {l.teacher}
          , your AI teacher.
        </p>
      </header>
      <section className="conversation-hero">
        <div className="hero-copy">
          <h2>
            So, what’s
            <br /> on your mind?
          </h2>
          <p>
            Your day. That film. The best way to order coffee. Start anywhere.
            Learn as you go.
          </p>
          <button
            type="button"
            className="button button-primary"
            onClick={() => onVoice()}
          >
            <Mic size={19} /> Start a conversation <ArrowRight size={18} />
          </button>
          <form
            className="quick-composer"
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.trim()) open(draft);
            }}
          >
            <MessageCircle size={21} />
            <label className="sr-only" htmlFor="first-message">
              Start with a message
            </label>
            <input
              id="first-message"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`Or type a thought to ${l.teacher}…`}
              maxLength={1000}
            />
            <button
              type="submit"
              className="icon-button"
              aria-label="Start text conversation"
              disabled={!draft.trim()}
            >
              <ArrowUp size={21} />
            </button>
          </form>
          <span className="hero-footnote">
            Live voice · Everyday {l.name} · At your pace
          </span>
        </div>
        <div className="hero-art">
          <CityArt lang={lang} />
          <span className="art-greeting">
            <MessageCircle size={16} />
            {l.greeting}!
          </span>
          <span className="art-caption">A little corner of {l.city}</span>
        </div>
      </section>
      <div className="topic-line">
        <span>A conversation starter?</span>
        {[
          {
            icon: Coffee,
            label: "Food & coffee",
            text: "Let's talk about food and coffee. Help me say what I like.",
          },
          {
            icon: Music2,
            label: "Music & movies",
            text: "Let's chat about music and movies. Teach me one useful phrase as we talk.",
          },
          {
            icon: Sparkles,
            label: "How was your day?",
            text: "Let's talk about my day. Ask me a simple question and help me answer.",
          },
        ].map((t) => (
          <button type="button" key={t.label} onClick={() => open(t.text)}>
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>
      <div className="home-bottom">
        <section className="daily-phrase">
          <div className="section-heading">
            <h3>A phrase to take with you</h3>
            <span>Everyday {l.name}</span>
          </div>
          <p className="phrase-text" lang={l.code}>
            {l.phrase}
          </p>
          <p>{l.meaning}</p>
          <div className="phrase-actions">
            <HearButton lang={lang} text={l.phrase} />
            <button
              type="button"
              className="text-button"
              onClick={() => onVoice({ target: l.phrase, en: l.meaning })}
            >
              Try it with {l.teacher}
              <ArrowRight size={16} />
            </button>
          </div>
        </section>
        <section className="try-another">
          <h3>Take your words somewhere.</h3>
          <button type="button" onClick={onScenes}>
            <span className="round-icon peach">
              <Coffee size={21} />
            </span>
            <span>
              <strong>Step into a real-life scene</strong>
              <small>A café, a market, a ride across town.</small>
            </span>
            <ArrowRight size={18} />
          </button>
          <button type="button" onClick={onBuild}>
            <span className="round-icon lavender">
              <BookOpen size={21} />
            </span>
            <span>
              <strong>Build it. Flip it. Say it.</strong>
              <small>Same words, a world of possibilities.</small>
            </span>
            <ArrowRight size={18} />
          </button>
        </section>
      </div>
    </>
  );
}
