import type { Lang } from "@/lib/maatu-design";
import { NextResponse } from "next/server";
import { isLang, LANGUAGES } from "@/lib/languages";
import { generateModel } from "@/lib/model-adapters";
import { romanizeDisplay } from "@/lib/romanize-client";
export const maxDuration = 40;
export async function POST(request: Request) {
  const b = await request.json().catch(() => ({}));
  if (
    !isLang(b.from) ||
    !isLang(b.to) ||
    !Array.isArray(b.turns) ||
    !b.turns.length ||
    b.turns.length > 12 ||
    b.turns.some(
      (t: { id?: string; role?: string; text?: string }) =>
        typeof t.id !== "string" ||
        !["user", "assistant"].includes(t.role || "") ||
        typeof t.text !== "string" ||
        t.text.length > 3000,
    )
  )
    return NextResponse.json(
      { error: "Choose a saved conversation and language." },
      { status: 400 },
    );
  const from = b.from as Lang,
    to = b.to as Lang;
  const translationTurns = b.turns.map((t: {
    id: string; role: string; text: string; source?: string;
    phrase?: string; sourcePhrase?: string; meaning?: string;
    phraseMeaning?: string; followUp?: string; translated?: boolean;
  }) => ({
    id: t.id,
    role: t.role,
    text: t.translated ? t.source || t.text : [...new Set([
      t.source || t.text, t.sourcePhrase || t.phrase, t.meaning, t.followUp,
    ].filter(Boolean))].join("\n"),
    practiceText: t.role === "assistant" ? t.sourcePhrase || t.phrase || "" : "",
    practiceMeaning: t.phraseMeaning || t.meaning || "",
  }));
  const schema = {
    type: "OBJECT",
    properties: {
      turns: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            id: { type: "STRING" },
            role: { type: "STRING" },
            text: { type: "STRING" },
            meaning: { type: "STRING" },
            phrase: { type: "STRING" },
            phraseMeaning: { type: "STRING" },
          },
          required: ["id", "role", "text", "meaning", "phrase", "phraseMeaning"],
        },
      },
    },
    required: ["turns"],
  };
  try {
    const raw = JSON.parse(
      await generateModel({
        system: `Translate EVERY turn of this ${LANGUAGES[from].name} conversation into colloquial spoken ${LANGUAGES[to].name} from ${LANGUAGES[to].city}. Return the same number of turns in exactly the same order with unchanged id and role. text is the entire turn translated into ${LANGUAGES[to].name}, native script for Indian languages, ordinary French spelling for French. meaning is its full plain English meaning. Preserve names, facts, prices, currencies, numbers, tense, polarity, locations and questions, even when the scene is in another country. Preserve every digit-based number using those same digits in BOTH text and meaning, including prices within quoted requests. Do not answer, correct, summarize, invent turns, restart or adapt the scene geographically. Translate the reply, phrase and follow-up together. For each assistant turn, phrase is a SEPARATE short practice sentence: translate its practiceText into ${LANGUAGES[to].name}, preserving the practice sentence's meaning, person and tense. Do not copy a quoted ${LANGUAGES[from].name} example into phrase, even when the full translated explanation refers to that original language. Indian phrase output must use the selected language's native script. If no practiceText was supplied, use one short complete sentence from the translated turn. phraseMeaning is that practice sentence's plain English meaning. User turns have empty phrase and phraseMeaning. No em dashes.`,
        messages: [
          {
            role: "user",
            parts: [
              {
                text: JSON.stringify({
                  scene: String(b.title || "").slice(0, 120),
                  context: b.context?.slice(-3),
                  turns: translationTurns,
                }),
              },
            ],
          },
        ],
        schema,
      }),
    );
    if (
      !Array.isArray(raw.turns) ||
      raw.turns.length !== b.turns.length ||
      raw.turns.some(
        (
          t: { id: string; role: string; text: string; meaning: string; phrase: string; phraseMeaning: string },
          i: number,
        ) =>
          t.id !== b.turns[i].id ||
          t.role !== b.turns[i].role ||
          typeof t.text !== "string" ||
          !t.text.trim() ||
          typeof t.meaning !== "string" ||
          (translationTurns[i].text.match(/\d+(?:[.,]\d+)*/g) || []).some(
            (number: string) => !t.text.includes(number) || !t.meaning.includes(number),
          ) ||
          (t.role === "assistant" && (
            typeof t.phrase !== "string" ||
            !t.phrase.trim() ||
            t.phrase.length > 600 ||
            typeof t.phraseMeaning !== "string" ||
            !t.phraseMeaning.trim() ||
            (to !== "fr" && !{
              kn: /[\u0c80-\u0cff]/u,
              ta: /[\u0b80-\u0bff]/u,
              hi: /[\u0900-\u097f]/u,
            }[to].test(t.phrase))
          )),
      )
    )
      throw new Error();
    return NextResponse.json({
      turns: raw.turns.map(
        (t: { id: string; role: string; text: string; meaning: string; phrase: string; phraseMeaning: string }) => ({
          id: t.id,
          role: t.role,
          text: romanizeDisplay(t.text),
          source: t.text,
          meaning: romanizeDisplay(t.meaning),
          ...(t.role === "assistant"
            ? { phrase: romanizeDisplay(t.phrase), sourcePhrase: t.phrase, phraseMeaning: romanizeDisplay(t.phraseMeaning) }
            : {}),
        }),
      ),
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "The translation could not finish. Your original conversation is saved.",
      },
      { status: 502 },
    );
  }
}
