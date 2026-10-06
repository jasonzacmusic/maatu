import assert from "node:assert/strict";
import { travelTenses } from "../lib/spoken-tense-examples";
import { performance } from "node:perf_hooks";
import { romanizeDisplay, NATIVE_SCRIPT } from "../lib/romanize-client";
import { validateCoach } from "../lib/conversation-coach";

const samples = [
  ["ನಾನು ನಿನ್ನೆ ಅಲ್ಲಿಗೆ ಹೋಗಿದ್ದೆ.", "naanu ninne allige hogidde."],
  ["நான் நேற்று அங்கே போனேன்.", "naan netru ange ponen."],
  ["मैं कल वहाँ गया था।", "main kal vahaan gayaa thaa."],
];
for (const [input, expected] of samples) {
  assert.equal(romanizeDisplay(input), expected);
  assert.ok(!NATIVE_SCRIPT.test(romanizeDisplay(input)));
}
const mixed =
  "ನಾನು ನಿನ್ನೆ ಅಲ್ಲಿಗೆ ಹೋಗಿದ್ದೆ. Now try saying that, Jason. Bonjour !";
assert.equal(
  romanizeDisplay(mixed),
  "naanu ninne allige hogidde. Now try saying that, Jason. Bonjour !",
);
assert.equal(romanizeDisplay(""), "");
assert.ok(!NATIVE_SCRIPT.test(romanizeDisplay("ऑटो में कॉफ़ी और फ़्रेंच")));
assert.ok(!/[\u0c00-\u0d7f]/u.test(romanizeDisplay("ಧನ್ಯವಾದಗಳು. ధన్యವಾದಗಳು.")));
assert.equal(romanizeDisplay("Bonjour, ça va ?"), "Bonjour, ça va ?");
const raw = {
  phrase: "ನಾನು ನಿನ್ನೆ ಅಲ್ಲಿಗೆ ಹೋಗಿದ್ದೆ.",
  meaning: "I went there yesterday.",
  rule: "The doer comes first, then yesterday and the destination. The verb comes last.",
  words: [
    {
      text: "ನಾನು",
      role: "pronoun",
      slot: "who",
      meaning: "I",
      note: "The doer.",
    },
    {
      text: "ನಿನ್ನೆ",
      role: "time",
      slot: "when",
      meaning: "yesterday",
      note: "A past time.",
    },
    {
      text: "ಅಲ್ಲಿಗೆ",
      role: "place",
      slot: "what",
      meaning: "to there",
      note: "The ending indicates direction.",
    },
    {
      text: "ಹೋಗಿದ್ದೆ",
      role: "verb",
      slot: "action",
      meaning: "went",
      note: "First person past.",
    },
  ],
  alternatives: [],
  tenses: [],
  timeNote: "Yesterday requires a past form.",
};
const coach = validateCoach(raw, mixed, "kn");
assert.equal(coach.phrase, samples[0][1]);
assert.equal(coach.speech, raw.phrase);
assert.equal(coach.words[2].role, "place");
assert.throws(() =>
  validateCoach({ ...raw, phrase: "ನಾನು ಈಗ ಹೋಗ್ತೀನಿ" }, mixed, "kn"),
);
assert.throws(() =>
  validateCoach({ ...raw, words: raw.words.slice(1) }, mixed, "kn"),
);
assert.throws(() =>
  validateCoach(
    {
      ...raw,
      words: [{ ...raw.words[0], role: "made up" }, ...raw.words.slice(1)],
    },
    mixed,
    "kn",
  ),
);
for (const lang of ["kn", "ta", "hi", "fr"] as const) {
  const forms = travelTenses(lang, "I went there yesterday.", samples[0][0])!;
  assert.equal(forms.length, 7);
  assert.equal(forms[2].meaning, "I am going there now.");
  assert.equal(forms[3].meaning, "I will go there tomorrow.");
  assert.ok(!forms.some((f) => f.meaning.includes("come back")));
}
assert.ok(
  travelTenses(
    "hi",
    "I went there yesterday.",
    "मैं कल वहाँ गई थी।",
  )![3].speech.includes("जाऊँगी"),
);
assert.equal(travelTenses("kn", "She ate food yesterday.", ""), null);
const start = performance.now();
for (let i = 0; i < 1000; i++) romanizeDisplay(mixed);
console.log(
  JSON.stringify({
    checks: 29,
    captionMeanMs: +((performance.now() - start) / 1000).toFixed(3),
    status: "pass",
  }),
);
