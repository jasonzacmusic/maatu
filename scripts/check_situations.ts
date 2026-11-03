// Builds every situation line, and the lines around it, in every language and
// reports anything that comes out empty or unsupported. Run with jiti.
import { OBJECTS, objectById, verbById, DIRECTIONS } from "../lib/grammar";
import { PATH_LANGS, VERB_TILES } from "../lib/sentence-path";
import { SITUATIONS, situationWords } from "../lib/situations";
import { buildLine, fullChoice, relatedTo, conversationAround } from "../lib/related";

const out: string[] = [];
let bad = 0;
const missing = new Set<string>();
for (const s of SITUATIONS) {
  const w = situationWords(s);
  w.objects.forEach((o) => objectById(o) || missing.add(`${s.id}: noun ${o}`));
  w.verbs.forEach((v) => verbById(v) || missing.add(`${s.id}: verb ${v}`));
  for (const l of s.lines) {
    if (l.c.object && !objectById(l.c.object)) missing.add(`${s.id}: line noun ${l.c.object}`);
    if (l.c.verb && !verbById(l.c.verb)) missing.add(`${s.id}: line verb ${l.c.verb}`);
    if (l.c.direction && !DIRECTIONS.find((d) => d.id === l.c.direction)) missing.add(`${s.id}: direction ${l.c.direction}`);
  }
}
for (const t of VERB_TILES) {
  if (!verbById(t.id)) missing.add(`tile verb ${t.id}`);
  t.objects.forEach((o) => objectById(o) || missing.add(`tile ${t.id}: noun ${o}`));
}
for (const l of PATH_LANGS) {
  const indian = l.id !== "fr";
  for (const s of SITUATIONS) {
    out.push(`\n## ${l.label} :: ${s.title}`);
    for (const line of s.lines) {
      const c = fullChoice(line.c, "m");
      const r = buildLine(l.id, c);
      const ok = r && !r.unsupported && r.sentence;
      if (!ok && (indian || c.shape === "does" || c.shape === "tell")) { bad++; out.push(`  !! ${line.by} ${c.shape} ${c.verb}/${c.object}: ${r?.unsupported ?? "nothing"}`); continue; }
      if (ok) out.push(`  ${line.by === "you" ? "YOU " : "THEM"} ${r!.sentence}   = ${r!.english}`);
      if (ok && indian) for (const rel of relatedTo(c, s)) {
        const rr = buildLine(l.id, fullChoice(rel.c, "m"));
        if (!rr || (!rr.unsupported && !rr.sentence)) { bad++; out.push(`     !! related ${rel.label}: empty`); }
      }
    }
  }
  const conv = conversationAround(fullChoice({ shape: "does", verb: "play", object: "piano" }, "m"));
  conv.forEach((line) => { const r = buildLine(l.id, fullChoice(line.c, "m")); if (!r || r.unsupported) { if (indian) bad++; out.push(`  !! conversation ${line.c.shape}: ${r?.unsupported ?? "nothing"}`); } });
}
console.log([...missing].map((m) => "MISSING " + m).join("\n"));
console.log(out.join("\n"));
console.log(`\n${missing.size} missing words, ${bad} lines that did not build. ${OBJECTS.length} nouns.`);
