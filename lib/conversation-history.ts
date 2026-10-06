import type { Lang } from "./maatu-design";
import { PERSONAS } from "./personas.generated";
import { isLang } from "./languages";

export type ConversationTurn = {
  id: string;
  role: "user" | "assistant";
  text: string;
  source?: string;
  phrase?: string;
  sourcePhrase?: string;
  meaning?: string;
  phraseMeaning?: string;
  followUp?: string;
  at: number;
  translated?: boolean;
  correction?: {
    corrected: string;
    meaning: string;
    explanation: string;
    speech: string;
  };
};
export type ConversationThread = {
  id: string;
  title: string;
  persona: string;
  lang: Lang;
  created: number;
  updated: number;
  versions: Partial<Record<Lang, ConversationTurn[]>>;
};
const KEY = "maatu-conversations-v1";
const ACTIVE = "maatu-active-conversation-v1";
export const HISTORY_EVENT = "maatu-history-changed";
let memory: ConversationThread[] = [];
let memoryOnly = false;
function conciseTitle(title: string) {
  const clean = title.trim();
  if (clean.length <= 80) return clean;
  const cut = clean.lastIndexOf(" ", 80);
  return clean.slice(0, cut > 40 ? cut : 80).trimEnd() + "…";
}
function historyTitle(thread: ConversationThread) {
  const scene = PERSONAS[thread.persona]?.sceneLabel;
  return conciseTitle(
    scene && /^Let's start this /i.test(thread.title)
      ? scene
      : thread.title,
  );
}
export function loadConversations(): ConversationThread[] {
  if (typeof window === "undefined") return [];
  if (memoryOnly) return memory;
  try {
    const rows = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (Array.isArray(rows))
      memory = rows.filter(
        (t) =>
          t &&
          typeof t.id === "string" &&
          typeof t.title === "string" &&
          isLang(t.lang) &&
          t.versions &&
          typeof t.versions === "object",
      ).map((t: ConversationThread) => ({ ...t, title: historyTitle(t) }));
  } catch {
    /* In-memory practice remains available when storage is blocked. */
  }
  return memory;
}
export function getConversation(id?: string | null) {
  return id ? loadConversations().find((t) => t.id === id) : undefined;
}
function write(thread: ConversationThread) {
  const rows = loadConversations().filter((t) => t.id !== thread.id);
  memory = [thread, ...rows].sort((a, b) => b.updated - a.updated);
  let saved = true;
  try {
    localStorage.setItem(KEY, JSON.stringify(memory));
  } catch {
    saved = false;
    memoryOnly = true;
  }
  window.dispatchEvent(new CustomEvent(HISTORY_EVENT, { detail: { saved } }));
  return saved;
}
export function activeConversation() {
  try {
    return localStorage.getItem(ACTIVE) || undefined;
  } catch {
    return undefined;
  }
}
export function selectConversation(id: string) {
  try {
    localStorage.setItem(ACTIVE, id);
  } catch {
    /* Memory handled by app. */
  }
}
export function createConversation(
  lang: Lang,
  persona = "tutor",
  title = "A little conversation",
) {
  const now = Date.now();
  const thread: ConversationThread = {
    id: crypto.randomUUID(),
    title: conciseTitle(title),
    persona,
    lang,
    created: now,
    updated: now,
    versions: { [lang]: [] },
  };
  write(thread);
  selectConversation(thread.id);
  return thread;
}
export function appendConversation(
  id: string,
  lang: Lang,
  turn: ConversationTurn,
) {
  const thread = getConversation(id);
  if (!thread) return false;
  const rows = thread.versions[lang] || [];
  if (rows.some((t) => t.id === turn.id)) return true;
  // A translated version becomes stale when another language gets new turns.
  // Keep it readable, and translate the complete newest version on the next switch.
  return write({
    ...thread,
    lang,
    updated: Date.now(),
    versions: { ...thread.versions, [lang]: [...rows, turn] },
  });
}
export function saveTranslation(
  id: string,
  from: Lang,
  to: Lang,
  sourceIds: string[],
  rows: ConversationTurn[],
) {
  const thread = getConversation(id);
  if (
    !thread ||
    (thread.versions[from] || []).map((t) => t.id).join() !== sourceIds.join()
  )
    return false;
  return write({
    ...thread,
    lang: to,
    updated: Date.now(),
    versions: { ...thread.versions, [to]: rows },
  });
}
export function conversationContext(id: string, lang: Lang) {
  const thread = getConversation(id);
  if (!thread) return "";
  const rows = thread.versions[lang] || thread.versions[thread.lang] || [];
  return `Continue this saved conversation. Do not restart with a greeting. Preserve its people, numbers, facts and unfinished question. Original scene: ${thread.title}. ${PERSONAS[thread.persona] ? `Keep the same character name, ${PERSONAS[thread.persona].name}, and the original scene location and currency while speaking the selected language.` : ""}\n${rows
    .slice(-14)
    .map(
      (t) =>
        `${t.role === "user" ? "Learner" : "Partner"}: ${[t.source || t.text, t.sourcePhrase || t.phrase, t.meaning, t.followUp].filter(Boolean).join(" ")}`,
    )
    .join("\n")
    .slice(-1900)}`;
}
export async function translateConversation(id: string, from: Lang, to: Lang) {
  const thread = getConversation(id);
  const original = thread?.versions[from] || [];
  if (!thread || !original.length || from === to) return;
  const existing = thread.versions[to];
  if (
    existing?.length === original.length &&
    existing.every((t, i) => t.id === original[i].id &&
      (!t.translated || t.role !== "assistant" || typeof t.phraseMeaning === "string"))
  ) {
    saveTranslation(
      id,
      from,
      to,
      original.map((t) => t.id),
      existing,
    );
    return;
  }
  const translated: ConversationTurn[] = [];
  // Translate every turn in ordered batches, and publish only a complete version.
  for (let offset = 0; offset < original.length; offset += 12) {
    const batch = original.slice(offset, offset + 12);
    const response = await fetch("/api/conversation-translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to,
        title: thread.title,
        turns: batch,
        context: original.slice(Math.max(0, offset - 3), offset),
      }),
    });
    const data = await response.json();
    if (
      !response.ok ||
      !Array.isArray(data.turns) ||
      data.turns.length !== batch.length ||
      data.turns.some(
        (t: ConversationTurn, i: number) =>
          t.id !== batch[i].id ||
          t.role !== batch[i].role ||
          typeof t.text !== "string",
      )
    )
      throw new Error(
        "The translation could not finish. Your original conversation is saved.",
      );
    translated.push(
      ...data.turns.map((t: ConversationTurn, i: number) => ({
        ...t,
        at: batch[i].at,
        translated: true,
      })),
    );
  }
  if (
    !saveTranslation(
      id,
      from,
      to,
      original.map((t) => t.id),
      translated,
    )
  )
    throw new Error(
      "The conversation changed while translating. Please try again.",
    );
}

export function saveCorrection(
  id: string,
  lang: Lang,
  turnId: string,
  correction: NonNullable<ConversationTurn["correction"]>,
) {
  const thread = getConversation(id);
  if (!thread) return;
  const rows = (thread.versions[lang] || []).map((t) =>
    t.id === turnId ? { ...t, correction } : t,
  );
  write({ ...thread, versions: { ...thread.versions, [lang]: rows } });
}

// Older text chats were saved per language/persona. Import them once without
// replacing or deleting those original records.
export function migrateLegacyChats() {
  if (typeof window === "undefined") return;
  for (const lang of ["kn", "hi", "ta", "fr"] as const) {
    for (const persona of [
      "tutor",
      ...Object.keys(PERSONAS).filter((id) => PERSONAS[id].language === lang),
    ]) {
      const key = `maatu-chat-${lang}-${persona}`;
      const id = `legacy:${key}`;
      if (getConversation(id)) continue;
      try {
        const rows = JSON.parse(localStorage.getItem(key) || "[]");
        if (!Array.isArray(rows)) continue;
        const turns = rows
          .filter(
            (t) =>
              t &&
              ["user", "assistant"].includes(t.role) &&
              typeof t.text === "string",
          )
          .map((t, i) => ({ ...t, id: `${id}:${i}`, at: 0 }));
        if (turns.length)
          write({
            id,
            title:
              PERSONAS[persona]?.sceneLabel ||
              `Earlier ${lang === "kn" ? "Kannada" : lang === "hi" ? "Hindi" : lang === "ta" ? "Tamil" : "French"} conversation`,
            persona,
            lang,
            created: 0,
            updated: 0,
            versions: { [lang]: turns },
          });
      } catch {
        /* Keep the original legacy key intact. */
      }
    }
  }
}
