import { writeFileSync } from "node:fs";
import { buildPath, VERB_TILES, type When } from "../lib/sentence-path";
const lines = ["SPOKEN FRENCH REFERENCE. Same deterministic forms as Maatu's sentence flowchart.", "Persons: je (I), tu (friend), vous (polite), il, elle, on (we), ils. French does not share Indian-language word order. Keep articles, contractions and gender agreement. On uses a singular verb; plural participles can refer to the group. Negative speech drops ne. Near future uses aller plus infinitive. Questions can keep normal word order with rising intonation."];
for (const v of VERB_TILES) {
  const forms = (["present", "past", "future", "cont"] as When[]).map((when) => buildPath("fr", { who: "i", verb: v.id, object: v.objects[0] ?? null, when, gender: "m", negative: false, question: false, timeWord: false })?.sentence);
  lines.push(`${v.en}: ${forms.join(" / ")}`);
}
lines.push("Adjectives: bon/bonne, nouveau/nouvelle, petit/petite, grand/grande come before the noun. Chaud/chaude, froid/froide, frais/fraîche come after it. Example: je bois du café chaud; je joue de la nouvelle guitare. Masculine/feminine article, adjective and participle agreement must match the actual noun or subject.");
writeFileSync("french-reference.txt", lines.join("\n") + "\n");
console.log(`Exported ${VERB_TILES.length} French verb patterns from the flowchart.`);
