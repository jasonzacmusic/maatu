import type { CoachVariant } from "./conversation-coach";
import type { Lang } from "./maatu-design";
import { romanizeDisplay } from "./romanize-client";

// The learner's requested travel contrast has a fixed, reviewed grammar path.
// General conversation still uses source-validated model analysis.
export function travelTenses(
  lang: Lang,
  meaning: string,
  spoken: string,
): CoachVariant[] | null {
  if (!/^I (?:went|had gone) there yesterday[.!]?$/i.test(meaning.trim()))
    return null;
  const female =
    lang === "hi" ? /गई|गयी|gayi|gaee/i.test(spoken) : /allée/.test(spoken);
  const rows: Record<Lang, string[]> = {
    kn: [
      "ನಾನು ದಿನಾ ಅಲ್ಲಿಗೆ ಹೋಗ್ತೀನಿ.",
      "ನಾನು ನಿನ್ನೆ ಅಲ್ಲಿಗೆ ಹೋದೆ.",
      "ನಾನು ಈಗ ಅಲ್ಲಿಗೆ ಹೋಗ್ತಾ ಇದ್ದೀನಿ.",
      "ನಾನು ನಾಳೆ ಅಲ್ಲಿಗೆ ಹೋಗ್ತೀನಿ.",
      "ನಾನು ಈಗಾಗಲೇ ಅಲ್ಲಿಗೆ ಹೋಗಿದ್ದೀನಿ.",
      "ನಾನು ನಿನ್ನೆ ಈ ಸಮಯದಲ್ಲಿ ಅಲ್ಲಿಗೆ ಹೋಗ್ತಾ ಇದ್ದೆ.",
      "ನಾನು ನಾಳೆ ಈ ಸಮಯದಲ್ಲಿ ಅಲ್ಲಿಗೆ ಹೋಗ್ತಾ ಇರ್ತೀನಿ.",
    ],
    ta: [
      "நான் தினமும் அங்க போறேன்.",
      "நான் நேத்து அங்க போனேன்.",
      "நான் இப்போ அங்க போயிட்டு இருக்கேன்.",
      "நான் நாளைக்கு அங்க போவேன்.",
      "நான் ஏற்கனவே அங்க போயிட்டேன்.",
      "நான் நேத்து இந்த நேரம் அங்க போயிட்டு இருந்தேன்.",
      "நான் நாளைக்கு இந்த நேரம் அங்க போயிட்டு இருப்பேன்.",
    ],
    hi: female
      ? [
          "मैं रोज़ वहाँ जाती हूँ।",
          "मैं कल वहाँ गई थी।",
          "मैं अभी वहाँ जा रही हूँ।",
          "मैं कल वहाँ जाऊँगी।",
          "मैं पहले ही वहाँ जा चुकी हूँ।",
          "मैं कल इस समय वहाँ जा रही थी।",
          "मैं कल इस समय वहाँ जा रही होऊँगी।",
        ]
      : [
          "मैं रोज़ वहाँ जाता हूँ।",
          "मैं कल वहाँ गया था।",
          "मैं अभी वहाँ जा रहा हूँ।",
          "मैं कल वहाँ जाऊँगा।",
          "मैं पहले ही वहाँ जा चुका हूँ।",
          "मैं कल इस समय वहाँ जा रहा था।",
          "मैं कल इस समय वहाँ जा रहा होऊँगा।",
        ],
    fr: [
      "D'habitude, je vais là-bas.",
      `Je suis ${female ? "allée" : "allé"} là-bas hier.`,
      "Là, je suis en train d'aller là-bas.",
      "Demain, je vais aller là-bas.",
      `Je suis déjà ${female ? "allée" : "allé"} là-bas.`,
      "Hier à cette heure-là, j'allais là-bas.",
      "Demain à cette heure-là, je serai en train d'aller là-bas.",
    ],
  };
  const labels = [
    "Every day",
    "Yesterday",
    "Right now",
    "Tomorrow",
    "Already done",
    "Was going",
    "Will be going",
  ];
  const meanings = [
    "I go there every day.",
    "I went there yesterday.",
    "I am going there now.",
    "I will go there tomorrow.",
    "I have already gone there.",
    "I was going there at this time yesterday.",
    "I will be going there at this time tomorrow.",
  ];
  const notes = [
    "Habitual present: a regular action.",
    "Past: a finished action with yesterday.",
    "Present continuous: an action happening now.",
    "Future: the time word makes the future clear.",
    "Completed action: already, without adding a return journey.",
    "Past continuous: the action was in progress at a past time.",
    "Future continuous: the action will be in progress at a future time.",
  ];
  return rows[lang].map((speech, i) => ({
    label: labels[i],
    text: romanizeDisplay(speech),
    speech,
    meaning: meanings[i],
    note: notes[i],
  }));
}

export function travelPastTime(lang: Lang, spoken: string): CoachVariant {
  const female = /गई|गयी|gayi|gaee/i.test(spoken);
  const speech = {kn:"ನಾನು ಎರಡು ದಿನಗಳ ಹಿಂದೆ ಅಲ್ಲಿಗೆ ಹೋದೆ.",ta:"நான் ரெண்டு நாளுக்கு முன்னாடி அங்க போனேன்.",hi:`मैं दो दिन पहले वहाँ ${female ? "गई थी" : "गया था"}।`,fr:`Je suis ${/allée/.test(spoken)?"allée":"allé"} là-bas il y a deux jours.`}[lang];
  return {label:"Two days ago",text:romanizeDisplay(speech),speech,meaning:"I went there two days ago.",note:"A completed action with a finished time takes a past form. This keeps the destination and person unchanged."};
}
