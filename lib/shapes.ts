import {
  adjById,
  objectById,
  person as personOf,
  QUANTITIES,
  QUESTION_WORDS,
  SUBJECT_EXTRAS,
  TIMES,
  verbById,
  type Adjective,
  type Gender,
  type ObjectWord,
  type PersonId,
} from "./grammar";
import type { Lang } from "./maatu-design";
import type { Part, PathChoice, PathLang, PathResult, Role } from "./sentence-path";

// Sentence shapes. The builder used to make one shape only, "someone does
// something", and just swapped the words inside it. A beginner needs the other
// shapes too: this is hot, I have no change, where is the bus, please give me
// a little water, I am going to the market to buy vegetables.
//
// Each shape below is a vetted template per language, not a guess. The four
// Indian languages are covered; French keeps the does-shape only, and says so
// rather than inventing a line. No em dashes anywhere.

export type ShapeId =
  | "does" | "isAdj" | "isNoun" | "have" | "want" | "like"
  | "thereIs" | "whereIs" | "howMuch" | "request" | "goingTo" | "lets" | "whQuestion";

export type Slot =
  | "who" | "subject" | "verb" | "verb2" | "object" | "adj" | "quant"
  | "place" | "placeAt" | "time" | "qword";

export type Toggle = "negative" | "question" | "tense" | "register" | "timeWord";

export type Shape = {
  id: ShapeId;
  label: string;
  emoji: string;
  example: string;
  blurb: string;
  slots: Slot[];
  toggles: Toggle[];
};

export const SHAPES: Shape[] = [
  {
    id: "does", label: "Someone does something", emoji: "🎬",
    example: "I play the piano every day", blurb: "The everyday sentence. Any person, any action, any time.",
    slots: ["who", "verb", "object", "adj", "time"], toggles: ["negative", "question", "tense", "timeWord"],
  },
  {
    id: "whQuestion", label: "Ask where, what, why", emoji: "❓",
    example: "Where are you going?", blurb: "A real question, not just a yes or no one.",
    slots: ["qword", "who", "verb"], toggles: ["tense"],
  },
  {
    id: "isAdj", label: "Something is ___", emoji: "🌡️",
    example: "This tea is very hot", blurb: "Describe a thing. The word for hot changes shape here.",
    slots: ["subject", "adj"], toggles: ["negative", "question"],
  },
  {
    id: "isNoun", label: "This is a ___", emoji: "👉",
    example: "This is a mango", blurb: "Name a thing you are pointing at.",
    slots: ["subject", "object"], toggles: ["negative", "question"],
  },
  {
    id: "have", label: "I have ___", emoji: "🤲",
    example: "I do not have change", blurb: "Having something sits with the person in a special form.",
    slots: ["who", "quant", "adj", "object"], toggles: ["negative", "question"],
  },
  {
    id: "want", label: "I want ___", emoji: "🙏",
    example: "I want a little hot water", blurb: "Wanting a thing, not an action.",
    slots: ["who", "quant", "adj", "object"], toggles: ["negative", "question"],
  },
  {
    id: "like", label: "I like ___", emoji: "❤️",
    example: "I like this song", blurb: "Liking also sits with the person, never as the subject.",
    slots: ["who", "adj", "object"], toggles: ["negative", "question"],
  },
  {
    id: "thereIs", label: "Is there ___?", emoji: "🔍",
    example: "Is there hot water at home?", blurb: "Whether a thing exists, here or anywhere.",
    slots: ["placeAt", "quant", "adj", "object"], toggles: ["negative", "question"],
  },
  {
    id: "whereIs", label: "Where is ___?", emoji: "📍",
    example: "Where is my phone?", blurb: "The question you will ask most often.",
    slots: ["who", "adj", "object"], toggles: [],
  },
  {
    id: "howMuch", label: "How much is ___?", emoji: "💰",
    example: "How much is one kilo of tomatoes?", blurb: "The market question.",
    slots: ["quant", "adj", "object"], toggles: [],
  },
  {
    id: "request", label: "Please give me ___", emoji: "🫱",
    example: "Please give me a little water", blurb: "A polite ask, and the same ask to a friend.",
    slots: ["quant", "adj", "object"], toggles: ["register"],
  },
  {
    id: "goingTo", label: "Going somewhere to do something", emoji: "🛺",
    example: "I am going to the market to buy vegetables", blurb: "Two ideas in one line: where, and what for.",
    slots: ["who", "place", "verb2", "object"], toggles: ["tense"],
  },
  {
    id: "lets", label: "Let's ___", emoji: "🤝",
    example: "Let's drink tea", blurb: "Suggest something to the person in front of you.",
    slots: ["verb", "object", "adj"], toggles: [],
  },
];

export function shapeById(id: ShapeId): Shape {
  return SHAPES.find((s) => s.id === id) ?? SHAPES[0];
}

// ............................................................ choice
export type ShapeChoice = PathChoice & {
  shape: ShapeId;
  subject: string;   // "this", "that", or an object id
  adj: string | null;
  quant: string | null;
  place: string | null;
  verb2: string;
  qword: string;
  polite: boolean;
};

// ............................................................ negation
// Each language negates a predicate its own way. These rules were written
// against the exact predicate forms stored in grammar.json and every one of
// the 43 adjectives was read back in all four languages before shipping.
function negPred(lang: Lang, adj: Adjective): string {
  if (lang === "hi") return `${adj.hi.m} nahin`;
  const { attr, pred } = lang === "kn" ? adj.kn : lang === "ta" ? adj.ta : adj.ml;
  if (lang === "kn") {
    if (pred.endsWith("ide")) return pred.slice(0, -3) + "illa";
    if (pred.endsWith("du")) return `${attr} alla`;
    return `${pred} alla`;
  }
  if (lang === "ta") {
    if (pred.endsWith("irukku")) return pred.slice(0, -6).trim() + " illa";
    if (pred.endsWith("su") || pred.endsWith("dhu")) return `${attr} illa`;
    return `${pred} illa`;
  }
  if (pred.endsWith("aanu")) return pred.slice(0, -4) + "alla";
  if (pred.endsWith("und")) return pred.slice(0, -3) + "illa";
  return `${pred} alla`;
}

function predOf(lang: Lang, adj: Adjective, negative: boolean): string {
  if (negative) return negPred(lang, adj);
  if (lang === "hi") return `${adj.hi.m} hai`;
  return (lang === "kn" ? adj.kn : lang === "ta" ? adj.ta : adj.ml).pred;
}

// Hindi adjectives and possessives agree with the thing, so they need to know
// which thing: aam is masculine (bada aam), kitaab feminine (badi kitaab).
function hiForm(m: string, f: string, pl: string | undefined, obj: ObjectWord | null): string {
  if (!obj) return m;
  if (obj.hiPl && pl) return pl;
  return obj.hiG === "f" ? f : m;
}

function attrOf(lang: Lang, adj: Adjective, obj: ObjectWord | null): string {
  if (lang === "hi") return hiForm(adj.hi.m, adj.hi.f, adj.hi.m === adj.hi.f ? adj.hi.m : adj.hi.m.replace(/a$/, "e"), obj);
  return (lang === "kn" ? adj.kn : lang === "ta" ? adj.ta : adj.ml).attr;
}

function possOf(lang: Lang, p: PersonId, obj: ObjectWord | null): string {
  const pr = personOf(lang, p);
  if (lang === "hi") return hiForm(pr.possM ?? "", pr.possF ?? "", pr.possPl, obj);
  return pr.poss ?? "";
}

// ............................................................ pieces
const part = (word: string, role: Role): Part => ({ word, role });

function nounPhrase(lang: Lang, c: ShapeChoice, obj: ObjectWord | null, useQuant: boolean, useAdj: boolean): Part[] {
  const out: Part[] = [];
  if (useQuant && c.quant) {
    const q = QUANTITIES.find((x) => x.id === c.quant);
    if (q) out.push(part(q[lang], "when"));
  }
  if (useAdj && c.adj) {
    const a = adjById(c.adj);
    if (a) out.push(part(attrOf(lang, a, obj), "what"));
  }
  if (obj) out.push(part(obj[lang], "what"));
  return out;
}

function subjectWord(lang: Lang, c: ShapeChoice): { word: string; obj: ObjectWord | null } {
  const extra = SUBJECT_EXTRAS.find((s) => s.id === c.subject);
  if (extra) return { word: extra[lang], obj: null };
  const obj = objectById(c.subject);
  if (obj) return { word: obj[lang], obj };
  return { word: SUBJECT_EXTRAS[0][lang], obj: null };
}

// Existence and identity words, per language.
const IS: Record<Lang, { exist: string; notExist: string; identity: string; notIdentity: string }> = {
  kn: { exist: "ide", notExist: "illa", identity: "", notIdentity: "alla" },
  hi: { exist: "hai", notExist: "nahin hai", identity: "hai", notIdentity: "nahin hai" },
  ta: { exist: "irukku", notExist: "illa", identity: "", notIdentity: "illa" },
  ml: { exist: "und", notExist: "illa", identity: "aanu", notIdentity: "alla" },
};

const WANT: Record<Lang, [string, string]> = {
  kn: ["beku", "beda"], hi: ["chaahiye", "nahin chaahiye"],
  ta: ["venum", "vendaam"], ml: ["venam", "venda"],
};
const LIKE: Record<Lang, [string, string]> = {
  kn: ["ishta", "ishta illa"], hi: ["pasand hai", "pasand nahin"],
  ta: ["pudikkum", "pudikkaadhu"], ml: ["ishtamaanu", "ishtamalla"],
};
const WHERE: Record<Lang, string> = { kn: "elli ide", hi: "kahaan hai", ta: "enga irukku", ml: "evideyaanu" };
const HOWMUCH: Record<Lang, string> = { kn: "eshtu", hi: "kitne ka hai", ta: "evlo", ml: "ethrayaanu" };
// Please give me, polite then to a friend.
const GIVE: Record<Lang, [string, string]> = {
  kn: ["kodi", "kodu"], hi: ["dijiye", "do"], ta: ["kudunga", "kudu"], ml: ["tharoo", "thaa"],
};
const QMARK: Record<Lang, string> = { kn: "aa", hi: "kya", ta: "aa", ml: "o" };

// Turn a finished statement into a yes or no question, the way each language
// does it: Hindi puts kya at the front, the other three lean on the last word.
function askIt(lang: Lang, parts: Part[]): Part[] {
  if (lang === "hi") return [part("kya", "helper"), ...parts];
  const last = parts[parts.length - 1];
  if (!last) return parts;
  const w = last.word;
  let asked: string;
  if (lang === "ml") {
    asked = w.endsWith("und") || w.endsWith("um") || w.endsWith("aam") ? w + "o"
      : w.endsWith("illa") ? w.slice(0, -1) + "e"
      : w.endsWith("aanu") ? w.slice(0, -1) + "o"
      : /[aeiou]$/.test(w) ? w.slice(0, -1) + "o"
      : w + "o";
  } else if (lang === "ta") {
    asked = w.endsWith("illa") ? w.slice(0, -1) + "aiyaa"
      : /[ie]$/.test(w) ? w + "yaa"
      : w.endsWith("u") ? w.slice(0, -1) + "aa"
      : w + "aa";
  } else {
    asked = w === "ide" ? "ideyaa"
      : w.endsWith("lla") ? w.slice(0, -1) + "vaa"
      : w.endsWith("ku") ? w.slice(0, -1) + "aa"
      : /[ie]$/.test(w) ? w + "yaa"
      : /[aou]$/.test(w) ? w + "vaa"
      : w + "aa";
  }
  return [...parts.slice(0, -1), { ...last, word: asked }];
}

// ............................................................ compose
export function buildShape(lang: PathLang, c: ShapeChoice): PathResult | null {
  if (lang === "fr") {
    return {
      english: "", enParts: [], sentence: "", parts: [], say: "",
      unsupported: "French only has the first shape, someone does something. The other shapes are built from vetted Kannada, Hindi, Tamil and Malayalam tables that French does not have yet.",
    };
  }
  const L = lang as Lang;
  const neg = c.negative;
  const obj = c.object ? objectById(c.object) ?? null : null;
  const pr = personOf(L, c.who === "name" ? (c.nameG === "f" ? "she" : "he") : c.who);
  const who = c.who === "name" ? (c.name?.trim() || (c.nameG === "f" ? "Meera" : "Ravi")) : pr.sub;
  const is = IS[L];
  let parts: Part[] = [];
  let note: string | undefined;

  switch (c.shape) {
    case "isAdj": {
      const a = adjById(c.adj ?? "");
      if (!a) return null;
      const s = subjectWord(L, c);
      const pred = neg ? negPred(L, a) : predOf(L, a, false);
      // Hindi agrees with the thing being described.
      const hiPred = L === "hi" ? `${hiForm(a.hi.m, a.hi.f, undefined, s.obj)} ${neg ? "nahin hai" : "hai"}` : pred;
      parts = [part(s.word, "who"), part(L === "hi" ? hiPred : pred, "action")];
      note = L === "hi"
        ? "The describing word follows the thing: bada aam, badi kitaab."
        : "Notice the shape change: the word before a noun is not the word at the end of a sentence.";
      break;
    }
    case "isNoun": {
      const s = subjectWord(L, c);
      if (!obj) return null;
      const tail = neg ? is.notIdentity : is.identity;
      parts = [part(s.word, "who"), ...nounPhrase(L, c, obj, false, true)];
      if (tail) parts.push(part(tail, "action"));
      note = L === "kn" || L === "ta"
        ? "No word for is: the two things simply sit side by side."
        : undefined;
      break;
    }
    case "have": {
      parts = [part(c.who === "name" ? `${who} hatra` : pr.at, "who"), ...nounPhrase(L, c, obj, true, true), part(neg ? is.notExist : is.exist, "action")];
      note = "Having something is not I-have: it is at-me. That is why the person changes shape.";
      break;
    }
    case "want": {
      parts = [part(c.who === "name" ? who : pr.dat, "who"), ...nounPhrase(L, c, obj, true, true), part(WANT[L][neg ? 1 : 0], "action")];
      note = "A wish sits with the person in the to-form, never as a plain subject.";
      break;
    }
    case "like": {
      parts = [part(c.who === "name" ? who : pr.dat, "who"), ...nounPhrase(L, c, obj, false, true), part(LIKE[L][neg ? 1 : 0], "action")];
      break;
    }
    case "thereIs": {
      const place = c.place ? objectById(c.place) : null;
      if (place?.at) parts.push(part(place.at[L], "when"));
      parts = [...parts, ...nounPhrase(L, c, obj, true, true), part(neg ? is.notExist : is.exist, "action")];
      break;
    }
    case "whereIs": {
      const head: Part[] = [];
      if (c.who !== "name") head.push(part(possOf(L, c.who, obj), "who"));
      parts = [...head, ...nounPhrase(L, c, obj, false, true), part(WHERE[L], "action")];
      break;
    }
    case "howMuch": {
      parts = [...nounPhrase(L, c, obj, true, true), part(HOWMUCH[L], "action")];
      break;
    }
    case "request": {
      parts = [...nounPhrase(L, c, obj, true, true), part(GIVE[L][c.polite ? 0 : 1], "action")];
      note = c.polite
        ? "The polite ending is the one to use with a stranger or someone older."
        : "This is the shape you use with a friend or a child.";
      break;
    }
    case "lets": {
      const v = verbById(c.verb);
      if (!v) return null;
      let word: string;
      if (L === "kn") word = v.kn.inf.replace(/akke$/, "") + "ona";
      else if (L === "ta") word = v.ta.inf + "laam";
      else if (L === "ml") word = v.ml.fut.replace(/um$/, "") + "aam";
      else word = `${v.hi.stem}te hain`;
      parts = [...(L === "hi" ? [part("chalo", "helper")] : []), ...nounPhrase(L, c, obj, false, true), part(word, "action")];
      break;
    }
    case "goingTo": {
      const v2 = verbById(c.verb2);
      const go = verbById("go");
      if (!v2 || !go) return null;
      const place = c.place ? objectById(c.place) : null;
      const inf = L === "hi" ? `${v2.hi.stem}ne` : L === "kn" ? v2.kn.inf : L === "ta" ? v2.ta.inf : v2.ml.inf;
      const goForm = goVerb(L, c);
      parts = [
        part(who, "who"),
        ...nounPhrase(L, c, obj, false, true),
        part(inf, "action"),
        ...(place ? [part(place[L], "when")] : []),
        part(goForm, "action"),
      ];
      note = "Two ideas in one line: the reason comes first, the going comes last.";
      break;
    }
    default:
      return null;
  }

  if (c.question && shapeById(c.shape).toggles.includes("question")) parts = askIt(L, parts);
  // where-is and how-much are questions by their nature, with no toggle.
  const alwaysAsking: boolean = c.shape === "whereIs" || c.shape === "howMuch";
  const sentence = parts.map((p) => p.word).join(" ") + (c.question || alwaysAsking ? "?" : "");
  return { english: "", enParts: [], sentence, parts, say: "", note };
}

// The going verb, conjugated for the person and the tense.
function goVerb(lang: Lang, c: ShapeChoice): string {
  const go = verbById("go")!;
  const p: PersonId = c.who === "name" ? (c.nameG === "f" ? "she" : "he") : c.who;
  if (lang === "kn") return go.kn.pres + ["tini", "tiya", "tira", "tane", "tale", "tivi", "tare"][IDX[p]];
  if (lang === "ta") return go.ta.pres + ["ren", "re", "reenga", "raan", "raa", "rom", "raanga"][IDX[p]];
  if (lang === "ml") return go.ml.pres;
  // Going somewhere right now is the continuous in Hindi: jaa raha hoon.
  const fem = p === "she" || (p !== "he" && c.gender === "f");
  const cont = fem ? "rahi" : ["raha", "rahe", "rahe", "raha", "rahi", "rahe", "rahe"][IDX[p]];
  const aux = ["hoon", "ho", "hain", "hai", "hai", "hain", "hain"][IDX[p]];
  return `${go.hi.stem} ${cont} ${aux}`;
}

const IDX: Record<PersonId, number> = { i: 0, you: 1, youp: 2, he: 3, she: 4, we: 5, they: 6 };

// ............................................................ English
export function shapeEnglish(c: ShapeChoice, lang: PathLang): string {
  const obj = (c.object ? objectById(c.object) : null) ?? null;
  const a = c.adj ? adjById(c.adj) : null;
  const qn = c.quant ? QUANTITIES.find((x) => x.id === c.quant) : null;
  const subjExtra = SUBJECT_EXTRAS.find((s) => s.id === c.subject);
  const subjObj = objectById(c.subject) ?? null;
  const place = (c.place ? objectById(c.place) : null) ?? null;
  const third = c.who === "he" || c.who === "she" || c.who === "name";
  const who = c.who === "name" ? (c.name?.trim() || (c.nameG === "f" ? "Meera" : "Ravi")) : personOf("kn", c.who).en;
  const poss: Record<PersonId, string> = { i: "my", you: "your", youp: "your", he: "his", she: "her", we: "our", they: "their" };
  const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
  const bare = (o: ObjectWord | null) => (o ? o.en.replace(/^(the|a|an|to the|to) /, "") : "something");

  // With no quantity and no adjective the noun keeps the article it was
  // written with: "a mango", "the piano", "money". With either of them in
  // front, the article gets out of the way: "a little hot water".
  const thing = (o: ObjectWord | null): string => {
    if (!o) return "something";
    // Keep "a mango", drop "the" from "the change": you have change, not the change.
    if (!qn && !a) return /^an? /.test(o.en) ? o.en : bare(o);
    return [qn?.en, a?.en, bare(o)].filter(Boolean).join(" ");
  };
  const subject = subjExtra ? subjExtra.en : subjObj ? `the ${bare(subjObj)}` : "this";
  // Place words are written as destinations ("to the market", "home"); here
  // they describe where something sits, so they become "at the market".
  const at = place ? (/^to /.test(place.en) ? place.en.replace(/^to /, "at ") : `at ${place.en}`) : "";
  const not = c.negative;
  const q = c.question;
  const doDoes = third ? "does" : "do";

  switch (c.shape) {
    case "isAdj":
      return cap(q ? `is ${subject} ${not ? "not " : ""}${a?.en ?? "big"}?` : `${subject} is ${not ? "not " : ""}${a?.en ?? "big"}.`);
    case "isNoun":
      return cap(q ? `is ${subject} ${not ? "not " : ""}${thing(obj)}?` : `${subject} is ${not ? "not " : ""}${thing(obj)}.`);
    case "have":
      return cap(q ? `${doDoes} ${who} ${not ? "not " : ""}have ${thing(obj)}?` : `${who} ${not ? doDoes + " not have" : third ? "has" : "have"} ${thing(obj)}.`);
    case "want":
      return cap(q ? `${doDoes} ${who} ${not ? "not " : ""}want ${thing(obj)}?` : `${who} ${not ? doDoes + " not want" : third ? "wants" : "want"} ${thing(obj)}.`);
    case "like":
      return cap(q ? `${doDoes} ${who} ${not ? "not " : ""}like ${thing(obj)}?` : `${who} ${not ? doDoes + " not like" : third ? "likes" : "like"} ${thing(obj)}.`);
    case "thereIs":
      return cap(q ? `is there ${thing(obj)}${at ? " " + at : ""}?` : `there is ${not ? "no " : ""}${thing(obj)}${at ? " " + at : ""}.`);
    case "whereIs":
      return cap(`where is ${c.who === "name" ? who + "'s" : poss[c.who as PersonId]} ${[a?.en, bare(obj)].filter(Boolean).join(" ")}?`);
    case "howMuch":
      // A measure makes the phrase singular: one kilo of tomatoes IS.
      return cap(`how much ${!qn && obj && /s$/.test(bare(obj)) ? "are" : "is"} ${thing(obj)}?`);
    case "request":
      return cap(`please give me ${thing(obj)}.`);
    case "lets":
      return cap(`let's ${verbById(c.verb)?.en.base ?? "go"}${obj ? " " + thing(obj) : ""}.`);
    case "goingTo":
      return cap(`${who} ${third ? "is" : c.who === "i" ? "am" : "are"} going ${place ? place.en.replace(/^to the /, "to the ").replace(/^to /, "to ") : "out"} to ${verbById(c.verb2)?.en.base ?? "buy"} ${thing(obj)}.`);
    default:
      return "";
  }
}

export const SUBJECT_CHOICES = SUBJECT_EXTRAS;
export { QUANTITIES, QUESTION_WORDS };
export type { Adjective, ObjectWord };
export function timeById(id: string) {
  return TIMES.find((t) => t.id === id);
}
export function genderOf(g: Gender) {
  return g;
}
