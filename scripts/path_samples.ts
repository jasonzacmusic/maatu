// Dumps a broad sample of Sentence Path lines (every verb, object, and time,
// persons rotating) as JSON for an independent language audit.
import { buildPath, objectsFor, VERB_TILES, WHEN_TILES, whenAllowed, type PathChoice, type PathLang } from "../lib/sentence-path";
import type { PersonId } from "../lib/grammar";

const persons: PersonId[] = ["i", "you", "youp", "he", "she", "we", "they"];
const out: Record<PathLang, { id: number; en: string; line: string }[]> = { kn: [], hi: [], ta: [], fr: [] };
let n = 0;
let k = 0;
for (const v of VERB_TILES) {
  const objs: (string | null)[] = [...objectsFor(v.id), ...(v.objects.length ? [] : [null])];
  for (const o of objs) {
    for (const w of WHEN_TILES) {
      if (!whenAllowed(v.id, w.id, o)) continue;
      k += 1;
      const c: PathChoice = {
        who: k % 11 === 0 ? "name" : persons[k % 7], name: k % 2 ? "Ravi" : "Meera", nameG: k % 2 ? "m" : "f",
        verb: v.id, object: o, when: w.id, timeWord: k % 4 !== 0, negative: k % 3 === 0, question: k % 5 === 0, gender: k % 2 ? "m" : "f",
      };
      for (const l of ["kn", "hi", "ta", "fr"] as PathLang[]) {
        const r = buildPath(l, c);
        if (!r || r.unsupported) continue;
        out[l].push({ id: n, en: r.english + (l === "hi" || l === "fr" ? ` [speaker is a ${c.gender === "f" ? "woman" : "man"}]` : ""), line: r.sentence });
      }
      n += 1;
    }
  }
}
console.log(JSON.stringify(out));
