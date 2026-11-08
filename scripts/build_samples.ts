// Dumps every new Build line for a native-speaker check: each situation script,
// every command form, every illness, every place and person in "where is".
import { OBJECTS, VERBS } from "../lib/grammar";
import { PATH_LANGS } from "../lib/sentence-path";
import { SITUATIONS } from "../lib/situations";
import { buildLine, fullChoice } from "../lib/related";
import type { LineSpec } from "../lib/situations";

const langs = (process.argv[2] ?? "kn,hi,ta,ml,te,fr").split(",");
for (const l of PATH_LANGS.filter((x) => langs.includes(x.id))) {
  const say = (spec: LineSpec) => {
    const r = buildLine(l.id, fullChoice(spec, "m"));
    return r && !r.unsupported && r.sentence ? `${r.sentence}   = ${r.english}` : null;
  };
  console.log(`\n# ${l.label}\n\n## Situations`);
  for (const s of SITUATIONS) {
    console.log(`\n### ${s.title} (talking to: ${s.them})`);
    s.lines.forEach((ln) => { const t = say(ln.c); if (t) console.log(`- ${ln.by === "you" ? "YOU " : "THEM"} ${t}`); });
  }
  console.log(`\n## Commands (friend / polite / do not, polite)`);
  for (const v of VERBS) {
    const a = say({ shape: "tell", verb: v.id, polite: false });
    const b = say({ shape: "tell", verb: v.id, polite: true });
    const c = say({ shape: "tell", verb: v.id, polite: true, negative: true });
    if (a || b || c) console.log(`- ${v.id}: ${[a, b, c].map((x) => x?.split("   =")[0] ?? "-").join("  |  ")}`);
  }
  if (l.id === "fr") continue;
  console.log(`\n## Illness (I have / do you have)`);
  for (const o of OBJECTS.filter((x) => x.ill)) console.log(`- ${say({ shape: "feel", object: o.id })}  |  ${say({ shape: "feel", object: o.id, who: "youp", question: true })?.split("   =")[0]}`);
  console.log(`\n## Where is (places, people)`);
  for (const o of OBJECTS.filter((x) => x.kind === "place" || x.cat === "people")) console.log(`- ${say({ shape: "whereIs", object: o.id, the: o.kind === "place", who: "i" })}`);
  console.log(`\n## Everyday new actions (I, present / past / want)`);
  for (const v of VERBS.slice(69)) console.log(`- ${["present", "past", "want"].map((w) => say({ shape: "does", verb: v.id, object: null, when: w as never, who: "i" })?.split("   =")[0] ?? "-").join("  |  ")}`);
}
