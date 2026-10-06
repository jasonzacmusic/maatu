import assert from "node:assert/strict";
import fs from "node:fs/promises";

const site = process.env.MAATU_TEST_SITE || "http://127.0.0.1:3033";
const scripts = {
  kn: /[\u0c80-\u0cff]/u,
  ta: /[\u0b80-\u0bff]/u,
  hi: /[\u0900-\u097f]/u,
  fr: /[a-z]/i,
};
const turns = [
  { id: "question", role: "user", text: "My name is Jason. Teach me to say I went to Jayanagar yesterday for 100 rupees." },
  {
    id: "teaching",
    role: "assistant",
    text: "In spoken Kannada, 'hode' means went. Here is the sentence:",
    sourcePhrase: "ನಾನು ನಿನ್ನೆ ಜಯನಗರಕ್ಕೆ ಹೋದೆ.",
    phrase: "naanu ninne Jayanagarakke hode.",
    meaning: "I went to Jayanagar yesterday.",
    followUp: "Now try the future form using 'naale' for tomorrow.",
  },
];
const results = await Promise.allSettled(Object.keys(scripts).map(async (to) => {
  const response = await fetch(`${site}/api/conversation-translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ from: "kn", to, title: "Yesterday in Jayanagar", turns }),
  });
  const body = await response.json();
  assert.ok(response.ok, body.error);
  assert.deepEqual(body.turns.map((turn) => turn.id), turns.map((turn) => turn.id));
  assert.deepEqual(body.turns.map((turn) => turn.role), turns.map((turn) => turn.role));
  const phrase = body.turns[1];
  assert.ok(scripts[to].test(phrase.sourcePhrase), "Practice must use the selected language");
  if (to !== "kn") assert.ok(!scripts.kn.test(phrase.sourcePhrase), "Old Kannada quotations must not become the next language's practice");
  assert.match(phrase.phraseMeaning, /I (?:went|had gone).*Jayanagar.*yesterday/i);
  assert.match(body.turns[0].meaning, /Jason/);
  assert.match(body.turns[0].meaning, /100|hundred/i);
  assert.match(phrase.meaning, /Kannada/i, "The full historical explanation remains faithful");
  return { to, turns: body.turns };
}));
if (process.env.MAATU_VERIFICATION_RECORD) {
  await fs.writeFile(process.env.MAATU_VERIFICATION_RECORD, JSON.stringify(results, null, 2));
}
results.forEach((result, i) => console.log(result.status === "fulfilled"
  ? `${result.value.to}: PASS; native practice phrase, faithful full history, names and prices retained`
  : `${Object.keys(scripts)[i]}: FAIL ${result.reason}`));
assert.ok(results.every((result) => result.status === "fulfilled"));
