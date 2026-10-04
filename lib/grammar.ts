import grammar from "@/grammar.json";
import type { IndianLang as Lang } from "./maatu-design";

// Sentence Studio engine: builds vetted colloquial sentences from grammar.json
// so the learner can assemble any sentence by tapping, see it word by word, and
// hear it. No LLM in this file; everything here is deterministic and checked.
// Romanized Latin only, never native script. No em dashes anywhere.

export type PersonId = "i" | "you" | "youp" | "he" | "she" | "we" | "they";
export type Tense = "present" | "cont" | "past" | "future" | "want" | "can";
export type Gender = "m" | "f";

export type Person = { id: PersonId; en: string; sub: string; dat: string; ne?: string; hint?: string };
export type VerbEn = { base: string; past: string; ing: string; s: string };
export type VerbKn = { dict: string; pres: string; past: string; cont: string; neg: string; pastNeg: string; inf: string; want: string };
export type VerbHi = { dict: string; stem: string; contStem?: string; fut?: { m: string[]; f: string[] }; perf: { m: string; f: string; pl: string }; ne: boolean };
export type VerbTa = { dict: string; pres: string; past: string; fut: string; cont: string; inf: string };
export type Verb = { id: string; group: "music" | "core"; en: VerbEn; note?: string; kn: VerbKn; hi: VerbHi; ta: VerbTa };
export type ObjectWord = { id: string; en: string; kn: string; hi: string; hiG: Gender; hiPl?: boolean; ta: string; kind: "thing" | "place" | "language"; enByLang?: Record<Lang, string> };
export type TimeWord = { id: string; en: string; kn: string; hi: string; ta: string; tense?: Tense };
export type DeckEntry = { en: string; kn: string; hi: string; ta: string; trick?: string };
export type Rule = { title: string; body: string; example: string };
export type Frame = { id: string; en: string; kn: string; hi: string; hiF?: string; ta: string; slot: "thing" | "place"; why: string };
export type Command = { en: string; kn: [string, string]; hi: [string, string]; ta: [string, string] };
export type DeckId = "music" | "numbers" | "fruits" | "vegetables" | "countries" | "questions" | "little" | "describe" | "time";

type Data = {
  persons: Record<Lang, Person[]>;
  suffix: {
    kn: { pres: string[]; past: string[]; contAux: string[] };
    hi: { aux: string[]; habM: string[]; habF: string[]; contM: string[]; contF: string[]; futM: string[]; futF: string[]; wantM: string[]; wantF: string[] };
    ta: { pres: string[]; pastFut: string[]; contAux: string[]; wont: string[] };
  };
  verbs: Verb[];
  objects: ObjectWord[];
  times: TimeWord[];
  frames: Frame[];
  commands: Command[];
  commandNote: Record<Lang, string>;
  decks: Record<DeckId, DeckEntry[]>;
  rules: Record<Lang, Rule[]>;
};

const DATA = grammar as unknown as Data;

export const PERSONS = DATA.persons;
export const VERBS: Verb[] = DATA.verbs;
export const OBJECTS: ObjectWord[] = DATA.objects;
export const TIMES: TimeWord[] = DATA.times;
export const FRAMES: Frame[] = DATA.frames;
export const COMMANDS: Command[] = DATA.commands;
export const COMMAND_NOTE = DATA.commandNote;
export const DECKS = DATA.decks;
export const RULES = DATA.rules;
export const DECK_ORDER: { id: DeckId; label: string; blurb: string }[] = [
  { id: "music", label: "Music", blurb: "The words you use every day in a music room." },
  { id: "questions", label: "Questions", blurb: "Thirteen words that open every conversation." },
  { id: "little", label: "Little words", blurb: "My, your, to, in, with, and, but, because. The glue." },
  { id: "describe", label: "Describe", blurb: "Big, small, good, hot, new, fast, enough." },
  { id: "time", label: "Time and days", blurb: "Morning to night, Monday to Sunday, o clock." },
  { id: "numbers", label: "Numbers", blurb: "Count, pay, and count in a band." },
  { id: "fruits", label: "Fruits", blurb: "Market words." },
  { id: "vegetables", label: "Vegetables", blurb: "Kaayi at the end means a raw vegetable." },
  { id: "countries", label: "Countries", blurb: "Where are you from, in three languages." },
];

export const TENSES: { id: Tense; label: string; en: string }[] = [
  { id: "present", label: "Every day", en: "present" },
  { id: "cont", label: "Right now", en: "doing it now" },
  { id: "past", label: "Past", en: "already happened" },
  { id: "future", label: "Future", en: "will happen" },
  { id: "want", label: "Want to", en: "wish" },
  { id: "can", label: "Know how to", en: "ability" },
];

const PERSON_INDEX: Record<PersonId, number> = { i: 0, you: 1, youp: 2, he: 3, she: 4, we: 5, they: 6 };
export const PERSON_ORDER: PersonId[] = ["i", "you", "youp", "he", "she", "we", "they"];

export function person(lang: Lang, id: PersonId): Person {
  return PERSONS[lang][PERSON_INDEX[id]];
}

export function verbById(id: string): Verb | undefined {
  return VERBS.find((v) => v.id === id);
}

export function objectLabel(o: ObjectWord, lang: Lang): string {
  return o.enByLang ? o.enByLang[lang] : o.en;
}

export type Choice = {
  person: PersonId;
  verb: string;
  tense: Tense;
  object?: string | null;
  time?: string | null;
  negative?: boolean;
  question?: boolean;
  // Hindi only: the gender of the subject (for I, you, we, they it is the
  // speaker's own gender; he and she are fixed).
  gender?: Gender;
};

// A verb form with the piece that stays (stem) and the piece that changes
// (ending), so the UI can light up exactly what the learner must listen for.
export type Form = { word: string; parts: string; stem?: string };
export type Piece = { word: string; meaning: string; role: "time" | "subject" | "object" | "verb" | "helper"; stem?: string };
export type Built = { sentence: string; english: string; pieces: Piece[]; note?: string };

// ............................................................ Kannada
function knQuestion(word: string): string {
  if (word.endsWith("lla")) return word.slice(0, -1) + "vaa";
  if (word.endsWith("tte")) return word.slice(0, -1) + "aa";
  if (word.endsWith("ku")) return word.slice(0, -1) + "aa";
  if (word.endsWith("de")) return word.slice(0, -1) + "yaa";
  if (/[aeiou]$/.test(word)) return word.slice(0, -1) + "aa";
  return word + "aa";
}

function knVerb(v: VerbKn, p: PersonId, t: Tense, neg: boolean): Form {
  const i = PERSON_INDEX[p];
  const s = DATA.suffix.kn;
  if (t === "present" || t === "future") {
    return neg ? { word: v.neg, parts: `${v.dict} + alla (not, every person)`, stem: v.neg.slice(0, -4) } : { word: v.pres + s.pres[i], parts: `${v.pres} + ${s.pres[i]}`, stem: v.pres };
  }
  if (t === "past") {
    return neg ? { word: v.pastNeg, parts: `${v.dict} + lilla (did not, every person)`, stem: v.pastNeg.slice(0, -5) } : { word: v.past + s.past[i], parts: `${v.past} + ${s.past[i]}`, stem: v.past };
  }
  if (t === "cont") {
    return neg ? { word: `${v.cont} illa`, parts: `${v.cont} + illa`, stem: v.cont } : { word: `${v.cont} ${s.contAux[i]}`, parts: `${v.cont} + ${s.contAux[i]}`, stem: v.cont };
  }
  if (t === "want") {
    return neg ? { word: `${v.inf} ishta illa`, parts: `${v.inf} + ishta illa (no wish)`, stem: v.inf } : { word: v.want, parts: `${v.dict} + beku`, stem: v.want.slice(0, -4) };
  }
  return neg ? { word: `${v.inf} baralla`, parts: `${v.inf} + baralla`, stem: v.inf } : { word: `${v.inf} barutte`, parts: `${v.inf} + barutte`, stem: v.inf };
}

// ............................................................ Hindi
// In a compound verb (practice karna, kaam karna, khaana banaana) "nahin" sits
// right before the doing part: practice nahin karta, not nahin practice karta.
function hiNot(phrase: string, v: VerbHi): string {
  const lead = v.dict.split(" ").length - 1;
  if (!phrase.startsWith("nahin ") || lead === 0) return phrase;
  const words = phrase.slice(6).split(" ");
  return [...words.slice(0, lead), "nahin", ...words.slice(lead)].join(" ");
}

function hiVerb(v: VerbHi, p: PersonId, t: Tense, neg: boolean, g: Gender, objG: Gender | "pl" | null): Form {
  const f = hiForm(v, p, t, neg, g, objG);
  if (!neg) return f;
  const word = hiNot(f.word, v);
  return word === f.word ? f : { word, parts: f.parts };
}

function hiForm(v: VerbHi, p: PersonId, t: Tense, neg: boolean, g: Gender, objG: Gender | "pl" | null): Form {
  const i = PERSON_INDEX[p];
  const s = DATA.suffix.hi;
  const fem = p === "she" || (p !== "he" && g === "f");
  const plural = p === "you" || p === "youp" || p === "we" || p === "they";
  const not = neg ? "nahin " : "";
  if (t === "present") {
    const hab = (fem ? s.habF : s.habM)[i];
    return neg ? { word: `${not}${v.stem}${hab}`, parts: `nahin + ${v.stem} + ${hab}`, stem: `${not}${v.stem}` } : { word: `${v.stem}${hab} ${s.aux[i]}`, parts: `${v.stem} + ${hab} + ${s.aux[i]}`, stem: v.stem };
  }
  if (t === "cont") {
    const c = (fem ? s.contF : s.contM)[i];
    const stem = v.contStem ?? v.stem;
    return { word: `${not}${stem} ${c} ${s.aux[i]}`, parts: `${stem} + ${c} + ${s.aux[i]}`, stem: `${not}${stem}` };
  }
  if (t === "future") {
    if (v.fut) {
      const irregular = (fem ? v.fut.f : v.fut.m)[i];
      return { word: `${not}${irregular}`, parts: `${irregular} (irregular future)` };
    }
    const f = (fem ? s.futF : s.futM)[i];
    return { word: `${not}${v.stem}${f}`, parts: `${v.stem} + ${f}`, stem: `${not}${v.stem}` };
  }
  if (t === "past") {
    if (v.ne) {
      const perf = objG === "pl" ? v.perf.pl : objG === "f" ? v.perf.f : v.perf.m;
      return { word: `${not}${perf}`, parts: `ne + ${perf} (matches the thing)` };
    }
    const perf = fem ? v.perf.f : plural ? v.perf.pl : v.perf.m;
    return { word: `${not}${perf}`, parts: `${perf} (matches the person)` };
  }
  if (t === "want") {
    const w = (fem ? s.wantF : s.wantM)[i];
    return neg ? { word: `${not}${v.dict} ${w}`, parts: `nahin + ${v.dict} + ${w}`, stem: `${not}${v.dict}` } : { word: `${v.dict} ${w} ${s.aux[i]}`, parts: `${v.dict} + ${w} + ${s.aux[i]}`, stem: v.dict };
  }
  return neg ? { word: `${v.dict} nahin aata`, parts: `${v.dict} + nahin aata`, stem: v.dict } : { word: `${v.dict} aata hai`, parts: `${v.dict} + aata hai`, stem: v.dict };
}

// ............................................................ Tamil
function taQuestion(word: string): string {
  if (word.endsWith("nga")) return word + "laa";
  if (word.endsWith("aa")) return word + "laa";
  if (word.endsWith("la")) return word + "iyaa";
  if (word.endsWith("re") || word.endsWith("tte")) return word.slice(0, -1) + "iyaa";
  if (word.endsWith("e")) return word.slice(0, -1) + "iyaa";
  if (word.endsWith("aaru")) return word.slice(0, -1) + "aa";
  if (word.endsWith("dhu")) return word.slice(0, -1) + "aa";
  return word + "aa";
}

function taVerb(v: VerbTa, p: PersonId, t: Tense, neg: boolean): Form {
  const i = PERSON_INDEX[p];
  const s = DATA.suffix.ta;
  if (t === "present") {
    return neg ? { word: `${v.inf} ${s.wont[i]}`, parts: `${v.inf} + ${s.wont[i]}`, stem: v.inf } : { word: v.pres + s.pres[i], parts: `${v.pres} + ${s.pres[i]}`, stem: v.pres };
  }
  if (t === "future") {
    return neg ? { word: `${v.inf} ${s.wont[i]}`, parts: `${v.inf} + ${s.wont[i]}`, stem: v.inf } : { word: v.fut + s.pastFut[i], parts: `${v.fut} + ${s.pastFut[i]}`, stem: v.fut };
  }
  if (t === "past") {
    return neg ? { word: `${v.inf}la`, parts: `${v.inf} + la (did not, every person)`, stem: v.inf } : { word: v.past + s.pastFut[i], parts: `${v.past} + ${s.pastFut[i]}`, stem: v.past };
  }
  if (t === "cont") {
    return neg ? { word: `${v.inf}la`, parts: `${v.inf} + la`, stem: v.inf } : { word: `${v.cont} ${s.contAux[i]}`, parts: `${v.cont} + ${s.contAux[i]}`, stem: v.cont };
  }
  if (t === "want") {
    return neg ? { word: `${v.inf} vendaam`, parts: `${v.inf} + vendaam`, stem: v.inf } : { word: `${v.inf}num`, parts: `${v.inf} + num`, stem: v.inf };
  }
  return neg ? { word: `${v.inf} theriyaadhu`, parts: `${v.inf} + theriyaadhu`, stem: v.inf } : { word: `${v.inf} theriyum`, parts: `${v.inf} + theriyum`, stem: v.inf };
}

export function verbForm(lang: Lang, verb: Verb, p: PersonId, t: Tense, neg = false, gender: Gender = "m", objG: Gender | "pl" | null = null): Form {
  if (lang === "kn") return knVerb(verb.kn, p, t, neg);
  if (lang === "hi") return hiVerb(verb.hi, p, t, neg, gender, objG);
  return taVerb(verb.ta, p, t, neg);
}

// ............................................................ English
function englishFor(c: Choice, verb: Verb, obj: ObjectWord | null, time: TimeWord | null, lang: Lang): string {
  const subj = person("kn", c.person).en;
  const third = c.person === "he" || c.person === "she";
  const be = c.person === "i" ? "am" : third ? "is" : "are";
  const objEn = obj ? objectLabel(obj, lang) : "";
  const timeEn = time ? time.en : "";
  const tail = [objEn, timeEn].filter(Boolean).join(" ");
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  let core = "";
  if (c.question) {
    const q =
      c.tense === "present" ? `${third ? "does" : "do"} ${subj} ${verb.en.base}`
      : c.tense === "cont" ? `${be} ${subj} ${verb.en.ing}`
      : c.tense === "past" ? `did ${subj} ${verb.en.base}`
      : c.tense === "future" ? `will ${subj} ${verb.en.base}`
      : c.tense === "want" ? `${third ? "does" : "do"} ${subj} want to ${verb.en.base}`
      : `can ${subj} ${verb.en.base}`;
    return cap(`${c.negative ? q.replace(/^(\w+)/, "$1 not") : q} ${tail}`.trim()) + "?";
  }
  if (c.tense === "present") core = c.negative ? `${third ? "does" : "do"} not ${verb.en.base}` : third ? verb.en.s : verb.en.base;
  else if (c.tense === "cont") core = `${be}${c.negative ? " not" : ""} ${verb.en.ing}`;
  else if (c.tense === "past") core = c.negative ? `did not ${verb.en.base}` : verb.en.past;
  else if (c.tense === "future") core = `will${c.negative ? " not" : ""} ${verb.en.base}`;
  else if (c.tense === "want") core = c.negative ? `${third ? "does" : "do"} not want to ${verb.en.base}` : `${third ? "wants" : "want"} to ${verb.en.base}`;
  else core = `${c.negative ? "cannot" : "can"} ${verb.en.base}`;
  return cap(`${subj} ${core} ${tail}`.trim()) + ".";
}

// ............................................................ Assemble
export function build(lang: Lang, c: Choice): Built | null {
  const verb = verbById(c.verb);
  if (!verb) return null;
  const obj = c.object ? OBJECTS.find((o) => o.id === c.object) ?? null : null;
  const time = c.time ? TIMES.find((t) => t.id === c.time) ?? null : null;
  const neg = Boolean(c.negative);
  const q = Boolean(c.question);
  const g: Gender = c.gender ?? "m";
  const pr = person(lang, c.person);
  const pieces: Piece[] = [];
  const objWord = obj ? obj[lang] : "";
  const objEn = obj ? objectLabel(obj, lang) : "";
  const english = englishFor(c, verb, obj, time, lang);
  let note = verb.note;

  if (time) pieces.push({ word: time[lang], meaning: time.en, role: "time" });

  if (lang === "kn") {
    const v = knVerb(verb.kn, c.person, c.tense, neg);
    const dative = c.tense === "want" || c.tense === "can";
    const subj = dative ? pr.dat : pr.sub;
    pieces.push({ word: subj, meaning: dative ? `to ${pr.en} (wish or ability sits with the person)` : pr.en, role: "subject" });
    if (obj) pieces.push({ word: objWord, meaning: objEn, role: "object" });
    const word = q ? knQuestion(v.word) : v.word;
    pieces.push({ word, meaning: `${v.parts}${q ? " + aa (question)" : ""}`, role: "verb", stem: v.stem });
    if (c.tense === "future" && !neg) note = "Spoken Kannada uses the present form for the future; the time word carries the meaning.";
    return { sentence: pieces.map((p) => p.word).join(" "), english, pieces, note };
  }

  if (lang === "hi") {
    const usesNe = c.tense === "past" && verb.hi.ne;
    const subj = c.tense === "can" ? pr.dat : usesNe ? pr.ne ?? pr.sub : pr.sub;
    const v = hiVerb(verb.hi, c.person, c.tense, neg, g, obj ? (obj.hiPl ? "pl" : obj.hiG) : null);
    pieces.push({
      word: subj,
      meaning: c.tense === "can" ? `to ${pr.en} (ability sits with the person)` : usesNe ? `${pr.en} + ne (past of a doing-verb)` : pr.en,
      role: "subject",
    });
    if (obj) pieces.push({ word: objWord, meaning: `${objEn}${obj.kind === "thing" || obj.kind === "language" ? (obj.hiG === "f" ? " (feminine word)" : " (masculine word)") : ""}`, role: "object" });
    pieces.push({ word: v.word, meaning: v.parts, role: "verb", stem: v.stem });
    const body = pieces.map((p) => p.word).join(" ");
    const sentence = q ? `kya ${body}` : body;
    if (q) pieces.unshift({ word: "kya", meaning: "question marker (yes or no question)", role: "helper" });
    if (usesNe && obj && obj.hiPl) note = `${objWord} counts as more than one, so the past verb ends in e.`;
    else if (usesNe && obj && obj.hiG === "f") note = `${objWord} is a feminine word, so the past verb ends in i.`;
    else if (c.person !== "he" && c.person !== "she" && c.tense !== "past" && c.tense !== "can") note = `Gender is yours: a ${g === "f" ? "woman" : "man"} says it this way. Flip the toggle to hear the other form.`;
    return { sentence, english, pieces, note };
  }

  const v = taVerb(verb.ta, c.person, c.tense, neg);
  // Want and ability both sit with the person: enakku vaasikkanum, enakku vaasikka theriyum.
  const dative = c.tense === "can" || c.tense === "want";
  const subj = dative ? pr.dat : pr.sub;
  pieces.push({ word: subj, meaning: dative ? `to ${pr.en} (${c.tense === "want" ? "a wish" : "ability"} sits with the person)` : pr.en, role: "subject" });
  if (obj) pieces.push({ word: objWord, meaning: objEn, role: "object" });
  const word = q ? taQuestion(v.word) : v.word;
  pieces.push({ word, meaning: `${v.parts}${q ? " + aa (question)" : ""}`, role: "verb", stem: v.stem });
  return { sentence: pieces.map((p) => p.word).join(" "), english, pieces, note };
}

// Split a verb word into the stem and the ending for display. Returns null when
// the form is irregular (no clean stem).
export function splitEnding(word: string, stem?: string): { stem: string; ending: string } | null {
  if (!stem || !word.startsWith(stem) || word.length === stem.length) return null;
  return { stem, ending: word.slice(stem.length) };
}

// Full person table for one verb, used by the flip card and by the checker
// prompt so the model corrects against the exact vetted forms.
export type TableRow = { person: string; sub: string; present: Form; past: Form; future: Form };
export function table(lang: Lang, verbId: string, gender: Gender = "m"): TableRow[] | null {
  const verb = verbById(verbId);
  if (!verb) return null;
  return PERSON_ORDER.map((p) => {
    const pr = person(lang, p);
    const label = pr.hint ? `${pr.sub} (${pr.en}, ${pr.hint})` : `${pr.sub} (${pr.en})`;
    return {
      person: label,
      sub: pr.sub,
      present: verbForm(lang, verb, p, "present", false, gender),
      past: verbForm(lang, verb, p, "past", false, gender),
      future: verbForm(lang, verb, p, "future", false, gender),
    };
  });
}

// A frame with its slot filled: "I like ___" + piano.
export function fillFrame(lang: Lang, frame: Frame, obj: ObjectWord, gender: Gender = "m"): { sentence: string; english: string } {
  const template = lang === "hi" && gender === "f" && frame.hiF ? frame.hiF : frame[lang];
  return {
    sentence: template.replace("___", obj[lang]),
    english: frame.en.replace("___", objectLabel(obj, lang)),
  };
}

// Three lines for today, seeded by the date so they change every day but stay
// stable through the day. Music verbs first, always.
export function todaysLines(lang: Lang, gender: Gender = "m"): Built[] {
  const day = Math.floor(Date.now() / 86_400_000);
  const music = VERBS.filter((v) => v.group === "music");
  const pick = <T,>(list: T[], salt: number) => list[(day * 7 + salt * 13) % list.length];
  const tenses: Tense[] = ["present", "past", "future", "can", "want", "cont"];
  const persons: PersonId[] = ["i", "she", "you", "we", "he", "they"];
  const out: Built[] = [];
  for (let n = 0; n < 3; n += 1) {
    const verb = pick(music, n + 1);
    const tense = pick(tenses, n + 2);
    const objects = OBJECTS.filter((o) => o.kind === "thing");
    const obj = verb.id === "listen" ? "music" : verb.id === "sing" ? "song" : verb.id === "learn" || verb.id === "teach" ? "language" : verb.id === "dance" ? null : pick(objects.filter((o) => ["piano", "guitar", "violin", "drums", "song", "music", "thissong"].includes(o.id)), n + 3).id;
    const time = tense === "past" ? "yesterday" : tense === "future" ? "tomorrow" : tense === "present" ? "everyday" : tense === "cont" ? "now" : null;
    const built = build(lang, { person: pick(persons, n + 4), verb: verb.id, tense, object: obj, time, gender, question: n === 2 });
    if (built) out.push(built);
  }
  return out;
}

// Compact reference text for the Gemini checker and the voice tutor.
export function referenceText(lang: Lang): string {
  const lines: string[] = [];
  lines.push(`RULES:`);
  for (const r of RULES[lang]) lines.push(`- ${r.title}: ${r.body} Example: ${r.example}`);
  lines.push(`\nVERB TABLES (present / past / future, persons in order I, you, you polite, he, she, we, they):`);
  for (const verb of VERBS) {
    const rows = table(lang, verb.id) ?? [];
    const pres = rows.map((r) => r.present.word).join(", ");
    const past = rows.map((r) => r.past.word).join(", ");
    const fut = rows.map((r) => r.future.word).join(", ");
    const sample = build(lang, { person: "i", verb: verb.id, tense: "present", negative: true });
    const want = build(lang, { person: "i", verb: verb.id, tense: "want" });
    const can = build(lang, { person: "i", verb: verb.id, tense: "can" });
    lines.push(`- ${verb.en.base} (${verb[lang].dict}): present ${pres}; past ${past}; future ${fut}; not: ${sample?.sentence}; want to: ${want?.sentence}; know how to: ${can?.sentence}`);
  }
  lines.push(`\nFRAMES: ${FRAMES.map((f) => `${f.en} = ${f[lang]}${f.hiF && lang === "hi" ? ` (woman: ${f.hiF})` : ""}`).join("; ")}`);
  lines.push(`COMMANDS (polite / friend): ${COMMANDS.map((c) => `${c.en} = ${c[lang][0]} / ${c[lang][1]}`).join("; ")}`);
  lines.push(`OBJECTS: ${OBJECTS.map((o) => `${objectLabel(o, lang)} = ${o[lang]}${lang === "hi" && o.kind !== "place" ? ` (${o.hiG})` : ""}`).join("; ")}`);
  lines.push(`TIME WORDS: ${TIMES.map((t) => `${t.en} = ${t[lang]}`).join("; ")}`);
  for (const deck of DECK_ORDER) {
    lines.push(`${deck.label.toUpperCase()}: ${DECKS[deck.id].map((d) => `${d.en} = ${d[lang]}`).join("; ")}`);
  }
  return lines.join("\n");
}
