import { OBJECTS, objectById, verbById, type Gender } from "./grammar";
import { buildPath, objectsFor, syllables, VERB_TILES, whenAllowed, type PathLang, type PathResult, type When } from "./sentence-path";
import { buildShape, shapeEnglish, type ShapeChoice } from "./shapes";
import { SITUATIONS, type Line, type LineSpec, type Situation } from "./situations";

// The sentences around the one you just made. Built from the choice, never from
// one language's text, so Kannada, Hindi, Tamil, Malayalam and French all get
// the same neighbours. No em dashes anywhere.

export type Related = { label: string; c: LineSpec };

// Any line spec becomes a full choice, then a sentence in any language.
const DEFAULTS: ShapeChoice = {
  shape: "does", who: "i", name: "", nameG: "m", verb: "play", object: null, when: "present", timeWord: false,
  negative: false, question: false, gender: "m", subject: "this", adj: null, quant: null, place: null,
  verb2: "buy", qword: "where", polite: true, direction: null, the: false, need: false,
};

export function fullChoice(spec: LineSpec, gender: Gender): ShapeChoice {
  return { ...DEFAULTS, gender, ...spec };
}

export function buildLine(lang: PathLang, c: ShapeChoice): PathResult | null {
  if (c.shape === "does") return buildPath(lang, c);
  const r = buildShape(lang, c);
  if (!r) return null;
  return { ...r, english: shapeEnglish(c, lang), say: lang === "fr" ? r.say : r.parts.map((x) => syllables(x.word)).join("  ") };
}

// Things that happen to you, not things you set out to do: nobody says "let's lose the phone".
const ACCIDENTS = new Set(["lose", "forget", "understand"]);
// Things done once in a while: "I renew the passport every day" is never said.
const ONE_OFF = new Set(["renew", "register", "apply", "submit", "complain", "lose", "forget", "shift", "book", "cancel", "transfer", "exchange", "invite", "celebrate", "sell", "repair"]);

const TIME_LABEL: Record<string, string> = { past: "Yesterday", cont: "Right now", present: "Every day", future: "Tomorrow", want: "Want to", can: "Know how" };

function objectCat(id: string | null | undefined): string | null {
  return id ? objectById(id)?.cat ?? null : null;
}

// Other words that fit: the situation's own words first, then the same kind of
// thing (another drink, another document), then whatever the action suggests.
function siblingObjects(c: ShapeChoice, situation: Situation | null, n: number): string[] {
  const cur = c.object ? objectById(c.object) : null;
  if (!cur) return [];
  const pool: string[] = [];
  if (situation) for (const l of situation.lines) if (l.c.object) pool.push(l.c.object);
  pool.push(...OBJECTS.filter((o) => o.cat === cur.cat).map((o) => o.id));
  // An action only takes the words that go with it: you drink water, never a fever.
  const acts = c.shape === "does" || c.shape === "tell" || c.shape === "lets";
  const fits = acts ? new Set(objectsFor(c.verb)) : null;
  if (acts) pool.push(...objectsFor(c.verb));
  return [...new Set(pool)]
    .filter((id) => {
      const o = objectById(id);
      if (!o || id === c.object) return false;
      if (fits) return fits.has(id);
      // A thing for a thing of the same kind: a cough for a fever, rent for the fare.
      return o.cat === cur.cat && o.kind === cur.kind && Boolean(o.ill) === Boolean(cur.ill);
    })
    .slice(0, n);
}

function siblingVerbs(c: ShapeChoice, n: number): string[] {
  if (!c.object) return [];
  return VERB_TILES.filter((v) => v.id !== c.verb && v.objects.includes(c.object as string) && verbById(v.id)).map((v) => v.id).slice(0, n);
}

const bare = (id: string) => (objectById(id)?.en ?? id).replace(/^(the|a|an|to the|to) /, "");

export function relatedTo(c: ShapeChoice, situation: Situation | null): Related[] {
  const out: Related[] = [];
  const add = (label: string, spec: LineSpec) => out.push({ label, c: spec });
  const base = { ...c } as LineSpec;

  switch (c.shape) {
    case "does": {
      if (c.question) add("Answer it", { ...base, who: "i", question: false });
      else add("Ask it", { ...base, who: c.who === "i" ? "youp" : c.who, question: true });
      add(c.negative ? "Say yes" : "Say no", { ...base, negative: !c.negative, question: false });
      const accident = ACCIDENTS.has(c.verb);
      const times = (accident ? ["past"] : ONE_OFF.has(c.verb) ? ["past", "future", "want"] : ["past", "present", "future", "cont"]) as When[];
      times.filter((w) => w !== c.when && w !== "want").slice(0, 3).forEach((w) => add(TIME_LABEL[w], { ...base, when: w, timeWord: w !== "past" || !accident, question: false }));
      if (!accident && c.when !== "want" && whenAllowed(c.verb, "want", c.object)) add("Want to", { ...base, when: "want", question: false, negative: false });
      add("Ask when", { shape: "whQuestion", qword: "when", who: "youp", verb: c.verb, when: accident || c.when === "past" ? "past" : c.when === "future" || ONE_OFF.has(c.verb) ? "future" : "present" });
      if (!accident) {
        add("Ask them to", { shape: "tell", verb: c.verb, object: c.object, polite: true });
        add("Let's", { shape: "lets", verb: c.verb, object: c.object });
      }
      siblingVerbs(c, 3).forEach((v) => add(verbById(v)?.en.base ?? v, { ...base, verb: v }));
      siblingObjects(c, situation, 3).forEach((o) => add(bare(o), { ...base, object: o }));
      break;
    }
    case "tell": {
      add(c.polite ? "To a friend" : "Politely", { ...base, polite: !c.polite });
      add(c.negative ? "Do it" : "Do not", { ...base, negative: !c.negative });
      add("I will do it", { shape: "does", who: "i", verb: c.verb, object: c.object, when: "future" });
      add("Did you do it?", { shape: "does", who: "youp", verb: c.verb, object: c.object, when: "past", question: true });
      if (!c.direction) siblingObjects(c, situation, 3).forEach((o) => add(bare(o), { ...base, object: o }));
      break;
    }
    case "whQuestion": {
      ["where", "when", "why", "how"].filter((q) => q !== c.qword).forEach((q) => add(`Ask ${q}`, { ...base, qword: q }));
      // Where are you going? gets a real place: one from this situation, or home.
      const goes = c.qword === "where" && (c.verb === "go" || c.verb === "come");
      const place = goes ? (situation?.lines.map((l) => l.c.object).find((o) => o && objectById(o)?.kind === "place") ?? "home") : null;
      add("Answer it", { shape: "does", who: "i", verb: c.verb, object: place, when: c.when, timeWord: !goes });
      break;
    }
    default: {
      // have, want, like, feel, isAdj, isNoun, thereIs, whereIs, howMuch, request, lets, goingTo
      const yesNo = ["have", "want", "like", "feel", "isAdj", "isNoun", "thereIs"].includes(c.shape);
      if (yesNo) {
        add(c.question ? "Answer it" : "Ask it", { ...base, question: !c.question, who: c.question ? "i" : c.who === "i" ? "youp" : c.who });
        add(c.negative ? "Say yes" : "Say no", { ...base, negative: !c.negative, question: false });
      }
      // A fever has no where, no price, and nobody wants one. A place only has a where.
      const o = objectById(c.object ?? "");
      const ill = Boolean(o?.ill) || o?.kind === "place";
      if (c.object && !o?.ill && o?.cat !== "money" && c.shape !== "whereIs") add("Where is it?", { shape: "whereIs", object: c.object, the: true });
      if (c.object && !ill && c.shape !== "howMuch" && c.shape !== "feel") add("How much?", { shape: "howMuch", object: c.object });
      if (c.object && !ill && o?.cat !== "money" && c.shape !== "want" && c.shape !== "feel") add("I want it", { shape: "want", who: "i", object: c.object });
      if (c.object && o?.kind !== "place" && c.shape !== "have") add(c.shape === "feel" ? "Do you have it?" : "Do you have it?", { shape: c.shape === "feel" ? "feel" : "have", who: "youp", object: c.object, question: true });
      const sib = c.shape === "isAdj" ? [] : siblingObjects(c, situation, 4);
      sib.forEach((o) => add(bare(o), { ...base, object: o }));
    }
  }
  return out;
}

// A little conversation around any everyday sentence: someone asks, you answer,
// they ask more, you say when, and it ends with a suggestion.
export function conversationAround(c: ShapeChoice): Line[] {
  if (c.shape !== "does") return [];
  const core = { shape: "does" as const, verb: c.verb, object: c.object, name: c.name, nameG: c.nameG };
  const lines: Line[] = [
    { by: "them", c: { ...core, who: "youp", when: c.when === "can" || c.when === "want" ? c.when : "present", question: true } },
    { by: "you", c: { ...core, who: "i", when: c.when, timeWord: c.when !== "want" && c.when !== "can" } },
    { by: "them", c: { shape: "whQuestion", qword: "when", who: "youp", verb: c.verb, when: "present" } },
    { by: "you", c: { ...core, who: "i", when: c.when === "past" ? "future" : "past", timeWord: true } },
  ];
  if (whenAllowed(c.verb, "want", c.object)) lines.push({ by: "them", c: { ...core, who: "i", when: "want" } });
  lines.push({ by: "you", c: { shape: "lets", verb: c.verb, object: c.object } });
  return lines;
}

// Surprise me: a real line from a real situation, or any everyday sentence.
export function surpriseLine(situation: Situation | null, rnd: () => number = Math.random): { line: Line; situation: Situation } {
  const s = situation ?? SITUATIONS[Math.floor(rnd() * SITUATIONS.length)];
  return { line: s.lines[Math.floor(rnd() * s.lines.length)], situation: s };
}
