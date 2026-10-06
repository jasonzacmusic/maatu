// Provider transport belongs here. Teaching prompts, state, history and output
// validation stay in their callers. Keys never travel to the browser.
export type ModelPart =
  { text: string } | { inlineData: { mimeType: string; data: string } };
export type ModelMessage = { role: "user" | "model"; parts: ModelPart[] };
export async function generateModel({
  system,
  messages,
  schema,
  audio = false,
}: {
  system: string;
  messages: ModelMessage[];
  schema?: unknown;
  audio?: boolean;
}) {
  const provider = audio
    ? "gemini"
    : process.env.MAATU_TEXT_PROVIDER || "gemini";
  if (provider === "openai-compatible") {
    const endpoint = process.env.MAATU_TEXT_BASE_URL;
    const key = process.env.MAATU_TEXT_API_KEY;
    if (!endpoint || !key || !process.env.MAATU_TEXT_MODEL)
      throw new Error("Text provider is not configured.");
    const response = await fetch(
      `${endpoint.replace(/\/$/, "")}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: process.env.MAATU_TEXT_MODEL,
          messages: [
            {
              role: "system",
              content:
                system +
                "\nReturn one JSON object following this schema: " +
                JSON.stringify(schema),
            },
            ...messages.map((m) => ({
              role: m.role === "model" ? "assistant" : "user",
              content: m.parts
                .map((p) => ("text" in p ? p.text : ""))
                .join("\n"),
            })),
          ],
          response_format: { type: "json_object" },
        }),
        signal: AbortSignal.timeout(28000),
      },
    );
    if (!response.ok) throw new Error("Text provider unavailable.");
    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  }
  if (provider !== "gemini")
    throw new Error("Unsupported provider. Configure an installed adapter.");
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) throw new Error("Model unavailable.");
  const model = audio
    ? process.env.MAATU_ASSESSMENT_MODEL || "gemini-3.5-flash"
    : process.env.MAATU_TEXT_MODEL ||
      process.env.MAATU_CHAT_MODEL ||
      "gemini-3.5-flash";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: messages,
        generationConfig: {
          thinkingConfig: { thinkingLevel: "low" },
          responseMimeType: "application/json",
          ...(schema ? { responseSchema: schema } : {}),
        },
      }),
      signal: AbortSignal.timeout(28000),
    },
  );
  if (!response.ok) throw new Error("Model unavailable.");
  const data = await response.json();
  return (data.candidates?.[0]?.content?.parts || [])
    .filter((p: { text?: string; thought?: boolean }) => p.text && !p.thought)
    .map((p: { text: string }) => p.text)
    .join("");
}
