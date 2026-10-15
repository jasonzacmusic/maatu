import { build, OBJECTS, person as personOf, TIMES, verbById, type Gender, type ObjectCat, type ObjectWord, type PersonId, type Tense } from "./grammar";
import type { Lang } from "./maatu-design";

// The Sentence Studio engine: pick who, the action, what and when, and get the
// English line plus the spoken line in Kannada, Hindi, Tamil, Malayalam or
// French at once. The four Indian languages come from the vetted tables in
// grammar.json through lib/grammar.ts. French lives here as explicit tables in
// the spoken register: the ne is dropped, on means we, and the near future is
// aller plus the verb. Romanized only for the Indian languages, never native
// script. No em dashes anywhere.

export type PathLang = Lang | "fr";
export type Role = "who" | "action" | "what" | "when" | "helper";
export type Part = { word: string; role: Role; stem?: string; say?: string };
export type When = "past" | "cont" | "present" | "future" | "want" | "can";
export type Who = PersonId | "name";

export type PathChoice = {
  who: Who;
  name?: string; // when who is "name"
  nameG?: Gender; // he or she, for a name
  verb: string;
  object: string | null;
  when: When;
  timeWord: boolean;
  negative: boolean;
  question: boolean;
  gender: Gender; // the speaker's own, for Hindi and French agreement
};

export type PathResult = {
  english: string;
  enParts: Part[];
  sentence: string;
  parts: Part[];
  say: string; // how to say it, syllables for Indian languages, sounds-like for French
  note?: string;
  unsupported?: string; // shown instead of a sentence when a combination does not exist
};

export const PATH_LANGS: { id: PathLang; label: string; flag: string; city: string }[] = [
  { id: "kn", label: "Kannada", flag: "🌼", city: "Bengaluru" },
  { id: "hi", label: "Hindi", flag: "🪔", city: "Delhi" },
  { id: "ta", label: "Tamil", flag: "🌺", city: "Chennai" },
  { id: "ml", label: "Malayalam", flag: "🌴", city: "Kochi" },
  { id: "fr", label: "French", flag: "🥐", city: "Paris" },
];

// ............................................................ tiles
export const WHO_TILES: { id: Who; emoji: string; en: string; hint?: string }[] = [
  { id: "i", emoji: "🙋", en: "I" },
  { id: "you", emoji: "👉", en: "you", hint: "a friend" },
  { id: "youp", emoji: "🙏", en: "you", hint: "polite" },
  { id: "he", emoji: "👨", en: "he" },
  { id: "she", emoji: "👩", en: "she" },
  { id: "we", emoji: "👫", en: "we" },
  { id: "they", emoji: "👥", en: "they" },
  { id: "name", emoji: "✨", en: "a name", hint: "Ravi, Meera, you" },
];

export const WHEN_TILES: { id: When; emoji: string; en: string; time?: string; blurb: string }[] = [
  { id: "past", emoji: "⏪", en: "Did", time: "yesterday", blurb: "already happened" },
  { id: "cont", emoji: "▶️", en: "Doing now", time: "now", blurb: "happening right now" },
  { id: "present", emoji: "🔁", en: "Every day", time: "everyday", blurb: "a habit" },
  { id: "future", emoji: "⏩", en: "Will do", time: "tomorrow", blurb: "going to happen" },
  { id: "want", emoji: "💫", en: "Want to", blurb: "a wish or a need" },
  { id: "can", emoji: "💪", en: "Know how", blurb: "a skill you have" },
];

type VerbTile = { id: string; emoji: string; en: string; short?: string; objects: string[]; music?: boolean; trick?: boolean };
export const VERB_TILES: VerbTile[] = [
  // ................................................ the music room
  { id: "play", emoji: "🎹", en: "play music", short: "play", objects: ["piano", "guitar", "violin", "drums", "keyboard", "flute", "tabla", "veena", "harmonium"], music: true },
  { id: "sing", emoji: "🎤", en: "sing", objects: ["song", "thissong", "newsong", "raga"], music: true },
  { id: "practise", emoji: "🔂", en: "practise", objects: ["piano", "guitar", "violin", "drums", "thissong", "scale", "raga", "taala", "maths"], music: true },
  { id: "listen", emoji: "🎧", en: "listen", objects: ["music", "thissong", "song", "podcast", "news", "raga"], music: true },
  { id: "learn", emoji: "📚", en: "learn", objects: ["language", "english", "piano", "guitar", "music", "scale", "raga", "taala", "maths", "chess"], music: true },
  { id: "teach", emoji: "🧑‍🏫", en: "teach", objects: ["language", "english", "piano", "guitar", "music", "scale", "raga", "maths"], music: true },
  { id: "tune", emoji: "🎛️", en: "tune", objects: ["piano", "guitar", "violin", "veena", "harmonium", "mic"], music: true },
  { id: "record", emoji: "🎙️", en: "record", objects: ["song", "thissong", "music", "video", "lesson", "recording"], music: true },
  { id: "count", emoji: "🔢", en: "count", objects: ["swara", "taala", "money", "number"], music: true },
  { id: "clap", emoji: "👏", en: "clap", objects: [], music: true },
  { id: "explain", emoji: "🗯️", en: "explain", objects: ["lesson", "scale", "raga", "taala", "chord", "homework"], music: true },
  { id: "repeat", emoji: "🔄", en: "repeat", objects: ["song", "thissong", "lesson", "scale", "swara"], music: true },
  { id: "dance", emoji: "💃", en: "dance", objects: [], music: true },
  // ................................................ the one that unlocks hundreds
  { id: "do", emoji: "🪄", en: "do (the magic verb)", short: "do", objects: ["shopping", "exercise", "cleaning", "homework", "order", "download", "booking", "recording", "meeting", "payment", "upload", "laundry", "packing"], trick: true },
  // ................................................ everyday
  { id: "go", emoji: "🛺", en: "go", objects: ["home", "class", "school", "shop", "market", "office", "temple", "church", "hospital", "station", "airport", "bank", "hotel", "park", "beach", "cinema", "gym", "village", "concert", "city"] },
  { id: "come", emoji: "👋", en: "come", objects: ["home", "class", "school", "office", "market", "temple", "park", "station"] },
  { id: "eat", emoji: "🍽️", en: "eat", objects: ["rice", "dosa", "idli", "chapati", "biryani", "vada", "curdrice", "egg", "chicken", "fish", "fruit", "banana", "mango", "sweet", "snack", "lunch", "vegetables", "sambar"] },
  { id: "drink", emoji: "🥤", en: "drink", objects: ["tea", "coffee", "water", "juice", "milk", "buttermilk", "lemonsoda", "hotwater"] },
  { id: "cook", emoji: "🍲", en: "cook", objects: ["rice", "chapati", "sambar", "biryani", "egg", "fish", "chicken", "vegetables", "lunch"] },
  { id: "buy", emoji: "🛒", en: "buy", objects: ["vegetables", "fruit", "banana", "mango", "milk", "coffee", "book", "clothes", "shirt", "shoes", "watch", "phone", "laptop", "guitar", "ticket", "flower", "medicine"] },
  { id: "sell", emoji: "🏷️", en: "sell", objects: ["guitar", "bike", "car", "vegetables", "fruit", "phone", "house"] },
  { id: "pay", emoji: "💳", en: "pay", objects: ["bill", "rent", "fees", "money", "salary"] },
  { id: "order", emoji: "📲", en: "order", objects: ["dosa", "biryani", "coffee", "juice", "medicine", "cab", "food"] },
  { id: "book", emoji: "🎫", en: "book", objects: ["ticket", "flight", "train", "cab", "room", "booking"] },
  { id: "cancel", emoji: "❌", en: "cancel", objects: ["ticket", "booking", "order", "meeting", "flight"] },
  { id: "playgame", emoji: "⚽", en: "play a game", short: "play", objects: ["football", "cricket", "chess", "badminton", "carrom", "game"] },
  { id: "speak", emoji: "🗣️", en: "speak", objects: ["language", "english"] },
  { id: "ask", emoji: "🙋", en: "ask", objects: ["name", "address", "number", "bill"] },
  { id: "answer", emoji: "💬", en: "answer", objects: [] },
  { id: "say", emoji: "📢", en: "say", objects: [] },
  { id: "see", emoji: "👀", en: "watch", objects: ["movie", "film", "series", "news", "video", "photo", "podcast"] },
  { id: "read", emoji: "📖", en: "read", objects: ["book", "notebook", "newspaper", "letter", "story", "poem", "message", "email"] },
  { id: "write", emoji: "✍️", en: "write", objects: ["song", "newsong", "letter", "story", "poem", "notebook", "email", "message"] },
  { id: "give", emoji: "🤲", en: "give", objects: ["money", "water", "coffee", "book", "key", "gift", "flower", "medicine", "bill"] },
  { id: "take", emoji: "🫴", en: "take", objects: ["key", "phone", "bag", "medicine", "auto", "bus", "train", "cab", "water", "photo"] },
  { id: "bring", emoji: "🎁", en: "bring", objects: ["water", "coffee", "book", "bag", "key", "medicine", "gift"] },
  { id: "send", emoji: "📤", en: "send", objects: ["message", "email", "photo", "video", "money", "letter"] },
  { id: "show", emoji: "👉", en: "show", objects: ["photo", "video", "notebook", "ticket", "address", "number"] },
  { id: "put", emoji: "📥", en: "keep", objects: ["bag", "key", "phone", "box", "plate", "flower"] },
  { id: "open", emoji: "🚪", en: "open", objects: ["door", "window", "box", "bag", "laptop", "app"] },
  { id: "close", emoji: "🔒", en: "close", objects: ["door", "window", "box", "bag", "laptop", "app"] },
  { id: "wash", emoji: "🧼", en: "wash", objects: ["clothes", "plate", "cup", "car", "bike", "vegetables"] },
  { id: "clean", emoji: "🧹", en: "clean", objects: ["room", "house", "car", "bike", "guitar", "plate"] },
  { id: "cut", emoji: "🔪", en: "cut", objects: ["vegetables", "fruit", "mango", "banana", "paper"] },
  { id: "repair", emoji: "🔧", en: "repair", objects: ["phone", "laptop", "bike", "car", "fan", "guitar"] },
  { id: "change", emoji: "🔀", en: "change", objects: ["clothes", "shirt", "room", "scale", "raga", "password"] },
  { id: "search", emoji: "🔎", en: "look for", objects: ["key", "phone", "bag", "address", "song", "house"] },
  { id: "start", emoji: "🟢", en: "start", objects: ["song", "lesson", "car", "bike", "laptop", "work", "recording"] },
  { id: "stop", emoji: "🛑", en: "stop", objects: ["song", "music", "car", "bike", "work"] },
  { id: "finish", emoji: "🏁", en: "finish", objects: ["lunch", "homework", "lesson", "work", "exam"] },
  { id: "try", emoji: "🧪", en: "try", objects: ["dosa", "biryani", "sweet", "guitar", "scale", "song"] },
  { id: "wear", emoji: "👕", en: "wear", objects: ["shirt", "saree", "shoes", "watch", "clothes"] },
  { id: "drive", emoji: "🚗", en: "drive", objects: ["car", "bike", "auto", "bus", "cab"] },
  { id: "travel", emoji: "✈️", en: "travel", objects: ["city", "village", "beach", "airport", "station"] },
  { id: "call", emoji: "📞", en: "call", objects: ["cab", "auto"] },
  { id: "work", emoji: "💼", en: "work", objects: [] },
  { id: "help", emoji: "🤝", en: "help", objects: [] },
  { id: "wait", emoji: "⏳", en: "wait", objects: [] },
  { id: "rest", emoji: "🛋️", en: "rest", objects: [] },
  { id: "sleep", emoji: "😴", en: "sleep", objects: [] },
  { id: "bathe", emoji: "🛁", en: "have a bath", short: "bath", objects: [] },
  { id: "sit", emoji: "🪑", en: "sit", objects: ["chair"] },
  { id: "stand", emoji: "🧍", en: "stand", objects: [] },
  { id: "walk", emoji: "🚶", en: "walk", objects: [] },
  { id: "run", emoji: "🏃", en: "run", objects: [] },
  { id: "swim", emoji: "🏊", en: "swim", objects: [] },
  { id: "laugh", emoji: "😄", en: "laugh", objects: [] },
  { id: "cry", emoji: "😢", en: "cry", objects: [] },
  { id: "think", emoji: "🤔", en: "think", objects: [] },
];

export const OBJECT_EMOJI: Record<string, string> = {
  // instruments and music
  piano: "🎹", guitar: "🎸", violin: "🎻", drums: "🥁", keyboard: "🎛️", flute: "🪈", tabla: "🪘",
  mridangam: "🪘", veena: "🪕", harmonium: "🪗", mic: "🎙️",
  song: "🎵", thissong: "🎶", newsong: "🆕", music: "🎼", scale: "📐", raga: "🌀", taala: "🫱",
  swara: "🎼", chord: "🎚️", lesson: "📗", exam: "📝",
  // language and study
  language: "💬", english: "🇬🇧", book: "📘", notebook: "📒", maths: "➗", newspaper: "📰",
  letter: "✉️", story: "📕", poem: "🪶", name: "🪪", address: "📍", number: "🔢",
  // food
  rice: "🍚", dosa: "🥞", idli: "🍥", chapati: "🫓", sambar: "🥣", curdrice: "🍚", vada: "🍩",
  biryani: "🍛", egg: "🥚", chicken: "🍗", fish: "🐟", vegetables: "🥬", fruit: "🍎",
  banana: "🍌", mango: "🥭", sweet: "🍬", snack: "🥨", lunch: "🍱", salt: "🧂", sugar: "🍬",
  milk: "🥛", food: "🍛",
  // drink
  tea: "🍵", coffee: "☕", water: "💧", juice: "🧃", buttermilk: "🥛", lemonsoda: "🍋", hotwater: "♨️",
  // places
  home: "🏠", class: "🎓", school: "🏫", shop: "🏪", concert: "🎙️", city: "🌆", office: "🏢",
  market: "🧺", temple: "🛕", church: "⛪", hospital: "🏥", station: "🚉", airport: "🛫",
  bank: "🏦", hotel: "🍽️", park: "🌳", beach: "🏖️", cinema: "🎬", gym: "🏋️", village: "🌾",
  // things
  phone: "📱", chair: "🪑", key: "🔑", time: "🕰️", bag: "🎒", door: "🚪", window: "🪟",
  light: "💡", fan: "🌀", room: "🛏️", house: "🏡", cup: "🥤", plate: "🍽️", box: "📦",
  paper: "📄", pen: "🖊️", medicine: "💊", gift: "🎁", flower: "🌸",
  // clothes
  clothes: "👚", shirt: "👔", saree: "🥻", shoes: "👟", watch: "⌚",
  // transport
  car: "🚙", bike: "🏍️", bus: "🚌", auto: "🛺", train: "🚆", cab: "🚕", flight: "✈️",
  // tech and media
  laptop: "💻", tv: "📺", photo: "🖼️", video: "📹", message: "💬", email: "📧",
  password: "🔐", app: "📲", charger: "🔌", movie: "🎬", film: "🎬", series: "📺",
  news: "📰", podcast: "🎧",
  // money and work
  money: "💰", work: "💼", rent: "🏠", bill: "🧾", salary: "💵", fees: "🧾", change: "🪙",
  // sport
  football: "⚽", cricket: "🏏", chess: "♟️", badminton: "🏸", carrom: "🎯", game: "🎮",
  // chores
  shopping: "🛍️", exercise: "🏋️", cleaning: "🧹", homework: "📝", order: "📦", download: "⬇️",
  ticket: "🎫", recording: "🎙️", meeting: "🗓️", payment: "💳", booking: "📒", upload: "⬆️",
  laundry: "🧺", packing: "🧳",
};

// English for the magic-verb objects: English uses a real verb where the
// Indian languages use the English word plus maadu, karna, or pannu.
const DO_EN: Record<string, { base: string; past: string; ing: string; s: string; tail?: string }> = {
  shopping: { base: "shop", past: "shopped", ing: "shopping", s: "shops" },
  exercise: { base: "exercise", past: "exercised", ing: "exercising", s: "exercises" },
  cleaning: { base: "clean up", past: "cleaned up", ing: "cleaning up", s: "cleans up" },
  homework: { base: "do", past: "did", ing: "doing", s: "does", tail: "{poss} homework" },
  order: { base: "order", past: "ordered", ing: "ordering", s: "orders" },
  download: { base: "download", past: "downloaded", ing: "downloading", s: "downloads" },
  recording: { base: "record", past: "recorded", ing: "recording", s: "records" },
  meeting: { base: "have", past: "had", ing: "having", s: "has", tail: "a meeting" },
  payment: { base: "make", past: "made", ing: "making", s: "makes", tail: "the payment" },
  booking: { base: "make", past: "made", ing: "making", s: "makes", tail: "the booking" },
  upload: { base: "upload", past: "uploaded", ing: "uploading", s: "uploads" },
  laundry: { base: "do", past: "did", ing: "doing", s: "does", tail: "the laundry" },
  packing: { base: "do", past: "did", ing: "doing", s: "does", tail: "the packing" },
};

// "Know how to" is a skill, so it only makes sense for skill verbs: I know how
// to play the piano, not I know how to sleep. The Indian forms (barutte, aata
// hai, theriyum) and French savoir all mean exactly this.
export const SKILL_VERBS = new Set(["play", "sing", "dance", "speak", "read", "write", "cook", "playgame", "teach", "do",
  "tune", "record", "count", "clap", "explain", "repeat", "drive", "swim", "repair", "wash", "clean", "cut", "sell"]);
export function whenAllowed(verb: string, when: When, object: string | null = null): boolean {
  if (when !== "can") return true;
  if (verb === "do") return object === "exercise" || object === "homework";
  return SKILL_VERBS.has(verb);
}

export function objectsFor(verb: string): string[] {
  return VERB_TILES.find((v) => v.id === verb)?.objects ?? [];
}

export function objectEnglish(id: string, lang: PathLang): string {
  if (id === "language") return lang === "fr" ? "French" : lang === "hi" ? "Hindi" : lang === "ta" ? "Tamil" : lang === "ml" ? "Malayalam" : "Kannada";
  const o = OBJECTS.find((x) => x.id === id);
  return o ? o.en : id;
}

// ............................................................ English
const EN_POSS: Record<PersonId, string> = { i: "my", you: "your", youp: "your", he: "his", she: "her", we: "our", they: "their" };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function asPerson(c: PathChoice): PersonId {
  if (c.who === "name") return c.nameG === "f" ? "she" : "he";
  return c.who;
}

function cleanName(c: PathChoice): string {
  const n = (c.name ?? "").trim().replace(/[^\p{L}\s'-]/gu, "").slice(0, 24);
  return n ? n.charAt(0).toUpperCase() + n.slice(1) : c.nameG === "f" ? "Meera" : "Ravi";
}

export function englishParts(c: PathChoice, lang: PathLang): Part[] {
  const p = asPerson(c);
  const verb = verbById(c.verb);
  if (!verb) return [];
  const doEn = c.verb === "do" && c.object ? DO_EN[c.object] : undefined;
  const en = doEn ?? (c.verb === "see" ? { base: "watch", past: "watched", ing: "watching", s: "watches" } : verb.en);
  const subject = c.who === "name" ? cleanName(c) : p === "i" ? "I" : personOf("kn", p).en;
  const third = p === "he" || p === "she";
  let what = "";
  if (doEn) what = (doEn.tail ?? "").replace("{poss}", EN_POSS[p]);
  else if (c.object) what = objectEnglish(c.object, lang);
  if (c.object && !doEn && c.object !== "language" && c.object !== "english" && (c.verb === "learn" || c.verb === "teach" || c.verb === "practise") && what.startsWith("the ")) what = what.slice(4);
  const tile = WHEN_TILES.find((w) => w.id === c.when);
  const when = c.timeWord && tile?.time ? (TIMES.find((t) => t.id === tile.time)?.en ?? "") : "";
  const be = p === "i" ? "am" : third ? "is" : "are";
  const s = subject;
  const parts: Part[] = [];
  const push = (word: string, role: Role) => word && parts.push({ word, role });

  if (c.question) {
    const aux =
      c.when === "present" || c.when === "want" ? (third ? (c.negative ? "Doesn't" : "Does") : c.negative ? "Don't" : "Do")
      : c.when === "cont" ? cap(be) + (c.negative ? "n't" : "")
      : c.when === "past" ? (c.negative ? "Didn't" : "Did")
      : c.when === "future" ? (c.negative ? "Won't" : "Will")
      : third ? (c.negative ? "Doesn't" : "Does") : c.negative ? "Don't" : "Do";
    const main = c.when === "cont" ? en.ing : c.when === "want" ? `want to ${en.base}` : c.when === "can" ? `know how to ${en.base}` : en.base;
    push(c.when === "cont" && p === "i" && c.negative ? "Am" : aux, "action");
    push(c.when === "cont" && p === "i" && c.negative ? `${s} not` : s, "who");
    push(main, "action");
  } else {
    let action = "";
    if (c.when === "present") action = c.negative ? `${third ? "doesn't" : "don't"} ${en.base}` : third ? en.s : en.base;
    else if (c.when === "cont") action = `${be}${c.negative ? " not" : ""} ${en.ing}`;
    else if (c.when === "past") action = c.negative ? `didn't ${en.base}` : en.past;
    else if (c.when === "future") action = `${c.negative ? "won't" : "will"} ${en.base}`;
    else if (c.when === "want") action = c.negative ? `${third ? "doesn't" : "don't"} want to ${en.base}` : `${third ? "wants" : "want"} to ${en.base}`;
    else action = c.negative ? `${third ? "doesn't" : "don't"} know how to ${en.base}` : `${third ? "knows" : "know"} how to ${en.base}`;
    push(s, "who");
    push(action, "action");
  }
  push(what, "what");
  push(when, "when");
  return parts;
}

// The English gloss is spoken English too: I'm, you're, he isn't, I'll.
export function englishLine(parts: Part[], question: boolean): string {
  let text = parts.map((p) => p.word).join(" ");
  if (!question) {
    text = text
      .replace(/^I am/, "I'm")
      .replace(/^(you|we|they) are not\b/i, "$1 aren't")
      .replace(/^(he|she) is not\b/i, "$1 isn't")
      .replace(/^(you|we|they) are\b/i, "$1're")
      .replace(/^(he|she) is\b/i, "$1's")
      .replace(/^(I|you|he|she|we|they) will\b/i, "$1'll");
  }
  return cap(text) + (question ? "?" : ".");
}

// ............................................................ names
function nameForms(lang: Lang, name: string): { sub: string; dat: string; ne: string } {
  const vowel = /[aeiou]$/i.test(name);
  if (lang === "kn") return { sub: name, dat: vowel ? `${name}ge` : `${name}-ge`, ne: name };
  if (lang === "hi") return { sub: name, dat: `${name} ko`, ne: `${name} ne` };
  if (lang === "ml") return { sub: name, dat: vowel ? `${name}kku` : `${name}inu`, ne: name };
  return { sub: name, dat: vowel ? `${name}kku` : `${name}ukku`, ne: name };
}

// ............................................................ Indian languages
function indian(lang: Lang, c: PathChoice): PathResult | null {
  const p = asPerson(c);
  const tile = WHEN_TILES.find((w) => w.id === c.when);
  const time = c.timeWord && tile?.time ? tile.time : null;
  // The speaker's gender only shapes "I". You, we and they take the everyday
  // default (masculine plural in Hindi: hum ja rahe hain, even for women).
  const built = build(lang, { person: p, verb: c.verb, tense: c.when as Tense, object: c.object, time, negative: c.negative, question: c.question, gender: p === "i" ? c.gender : "m" });
  if (!built) return null;
  // Kannada past questions: neenu kaltyaa? (did you learn?), naanu helidnaa? (did I say?).
  if (lang === "kn" && c.question && c.when === "past" && !c.negative && (p === "i" || p === "you")) {
    const v = verbById(c.verb);
    const piece = built.pieces.find((x) => x.role === "verb");
    if (v && piece) piece.word = v.kn.past + (p === "i" ? "naa" : "yaa");
  }
  const pr = personOf(lang, p);
  const parts: Part[] = built.pieces.map((piece) => {
    let word = piece.word;
    if (piece.role === "subject" && c.who === "name") {
      const n = nameForms(lang, cleanName(c));
      word = word === pr.dat ? n.dat : word === pr.ne ? n.ne : n.sub;
    }
    const role: Role = piece.role === "subject" ? "who" : piece.role === "verb" ? "action" : piece.role === "object" ? "what" : piece.role === "time" ? "when" : "helper";
    return { word, role, stem: piece.stem };
  });
  // Everyday speech puts the person first, then the time: naanu dina piano
  // nudistini, main roz piano bajaata hoon. Kya stays at the front.
  const t = parts.findIndex((x) => x.role === "when");
  const w = parts.findIndex((x) => x.role === "who");
  if (t >= 0 && w > t) {
    const [timePart] = parts.splice(t, 1);
    parts.splice(w, 0, timePart);
  }
  const sentence = parts.map((x) => x.word).join(" ") + (c.question ? "?" : "");
  const verbNote = verbById(c.verb)?.note;
  let note = built.note === verbNote ? PATH_NOTES[c.verb]?.[lang] : built.note;
  if (p !== "i" && note?.startsWith("Gender is yours")) note = undefined;
  if (c.verb === "do") note = lang === "kn" ? "The Bangalore trick: any English word plus maadu. Shopping maadu, order maadu, homework maadu." : lang === "hi" ? "The Hinglish trick: any English word plus karna. Shopping karna, order karna, download karna." : lang === "ml" ? "The Kochi trick: any English word plus cheyyuka. Shopping cheyyum, order cheyyum, download cheythu." : "The Chennai trick: any English word plus pannu. Shopping pannu, order pannu, download pannu.";
  return { english: "", enParts: [], sentence, parts, say: parts.map((x) => syllables(x.word)).join("  "), note };
}

// Short notes per verb and language, shown under the sentence.
const trick = (w: string) => `An English word plus ${w}. This one pattern works for hundreds of actions.`;
const PATH_NOTES: Record<string, Partial<Record<Lang, string>>> = {
  play: { kn: "Nudisu is for instruments. In Bangalore you also hear piano play maadtini.", hi: "Bajaana is for instruments. Games and sports take khelna.", ta: "Vaasi is for instruments. Games and sports take velaiyaadu.", ml: "Vaayikkuka is for instruments, and it is also the word for read. The rest of the sentence tells you which." },
  playgame: { kn: "Aadu is for games and sports. An instrument takes nudisu.", hi: "Khelna is for games and sports. An instrument takes bajaana.", ta: "Velaiyaadu is for games and sports. An instrument takes vaasi.", ml: "Kalikkuka is for games and sports. An instrument takes vaayikkuka." },
  sing: { kn: "Haadu is both the song and to sing.", hi: "Gaana is both the song and to sing.", ml: "Paattu is the song, paaduka is to sing. One letter apart." },
  practise: { kn: trick("maadu"), hi: trick("karna"), ta: trick("pannu"), ml: trick("cheyyuka") },
  listen: { kn: "Kelu means listen and also ask. Tamil has the same word: kekku.", ta: "Kekku means listen and also ask. Kannada has the same word: kelu.", ml: "Kelkkuka is listen; asking is chodikkuka, a separate word. Kannada and Tamil reuse one word for both." },
  read: { ml: "Vaayikkuka means both read and play an instrument in Malayalam. Pusthakam vaayikkum is read a book; piano vaayikkum is play the piano." },
  ask: { kn: "Kelu means ask and also listen; the sentence tells you which.", ta: "Kekku means ask and also listen; the sentence tells you which.", ml: "Chodikkuka is ask. Listening is kelkkuka, a different word." },
  travel: { kn: "The formal word is pravaasa; on the street everyone says travel maadu.", hi: "The formal word is safar; everyday Hindi says travel karna.", ta: "The formal word is payanam; everyday Tamil says travel pannu.", ml: "The formal word is yaathra; everyday Malayalam says travel cheyyum." },
  wait: { kn: "Kaayu is the Kannada word; wait maadu is just as common.", ml: "Kaathirikkuka is the Malayalam word; wait cheyyum is just as common." },
  call: { kn: trick("maadu"), hi: trick("karna"), ta: trick("pannu"), ml: "Vilikkuka is both to call out and to phone someone." },
  help: { kn: trick("maadu"), hi: trick("karna"), ta: trick("pannu"), ml: "Sahaayikkuka is the Malayalam word; help cheyyum is just as common." },
  run: { kn: "Watch the spelling: odu is read, oodu with the long oo is run. Two different words." },
  pay: { kn: trick("maadu"), hi: trick("karna"), ta: trick("pannu"), ml: trick("cheyyuka") },
  stand: { ml: "Nilkkuka is to stand and also to stop. Nirthuka is to stop something else." },
};

// ............................................................ syllables
// Split a romanized word into spoken beats so a beginner can read it aloud:
// nudistini becomes nu·dis·ti·ni. English loanwords are left whole.
const LOAN = new Set(
  "piano guitar violin drums music english coffee tea phone time football cricket shopping exercise cooking cleaning homework order download ticket book practice dance travel wait help call class concert school film key bangalore kannada hindi tamil".split(" "),
);
const VOWELS = ["aa", "ae", "ee", "ii", "oo", "uu", "ai", "au", "a", "e", "i", "o", "u"];
const DIGRAPHS = ["kh", "gh", "ch", "jh", "th", "dh", "ph", "bh", "sh", "zh"];

export function syllables(word: string): string {
  return word
    .split(" ")
    .map((w) => {
      if (!w || w.includes("-") || LOAN.has(w.toLowerCase().replace(/[?.,]/g, "")) || /^[A-Z]/.test(w)) return w;
      const units: { t: string; v: boolean }[] = [];
      let i = 0;
      const lw = w.toLowerCase();
      while (i < lw.length) {
        const v = VOWELS.find((x) => lw.startsWith(x, i));
        if (v) {
          units.push({ t: w.slice(i, i + v.length), v: true });
          i += v.length;
          continue;
        }
        const d = DIGRAPHS.find((x) => lw.startsWith(x, i));
        const len = d ? d.length : 1;
        units.push({ t: w.slice(i, i + len), v: false });
        i += len;
      }
      const nuclei = units.map((u, idx) => (u.v ? idx : -1)).filter((x) => x >= 0);
      if (nuclei.length < 2) return w;
      const out: string[] = [];
      let start = 0;
      for (let n = 0; n < nuclei.length - 1; n += 1) {
        const a = nuclei[n];
        const b = nuclei[n + 1];
        const between = b - a - 1;
        const cut = between <= 1 ? a + 1 : a + 2;
        out.push(units.slice(start, cut).map((u) => u.t).join(""));
        start = cut;
      }
      out.push(units.slice(start).map((u) => u.t).join(""));
      return out.join("·");
    })
    .join(" ");
}

// ............................................................ French
type FrVerb = { inf: string; infSay: string; pres: string[]; presSay: string[]; pp: string; ppSay: string; aux: "a" | "e"; refl?: boolean };
// Persons in order: je, tu, vous, il, elle, on (we, the spoken way), ils.
const same = (x: string) => [x, x, "", x, x, x, ""];
function reg(stem: string, say: string, vousSay: string, ilsSay?: string, ppSay?: string, pp?: string): Pick<FrVerb, "pres" | "presSay" | "pp" | "ppSay"> {
  const e = `${stem}e`;
  return {
    pres: [e, `${stem}es`, `${stem}ez`, e, e, e, `${stem}ent`],
    presSay: same(say).map((s, i) => (i === 2 ? vousSay : i === 6 ? ilsSay ?? say : s)),
    pp: pp ?? `${stem}é`,
    ppSay: ppSay ?? vousSay,
  };
}
const FR_VERBS: Record<string, FrVerb> = {
  play: { inf: "jouer", infSay: "zhoo-ay", aux: "a", ...reg("jou", "zhoo", "zhoo-ay") },
  playgame: { inf: "jouer", infSay: "zhoo-ay", aux: "a", ...reg("jou", "zhoo", "zhoo-ay") },
  sing: { inf: "chanter", infSay: "shahn-tay", aux: "a", ...reg("chant", "shahnt", "shahn-tay") },
  practise: { inf: "travailler", infSay: "tra-va-yay", aux: "a", ...reg("travaill", "tra-vy", "tra-va-yay") },
  work: { inf: "travailler", infSay: "tra-va-yay", aux: "a", ...reg("travaill", "tra-vy", "tra-va-yay") },
  listen: { inf: "écouter", infSay: "ay-koo-tay", aux: "a", ...reg("écout", "ay-koot", "ay-koo-tay") },
  teach: { inf: "enseigner", infSay: "ahn-sen-yay", aux: "a", ...reg("enseign", "ahn-seny", "ahn-sen-yay") },
  dance: { inf: "danser", infSay: "dahn-say", aux: "a", ...reg("dans", "dahns", "dahn-say") },
  travel: { inf: "voyager", infSay: "vwa-ya-zhay", aux: "a", ...reg("voyag", "vwa-yazh", "vwa-ya-zhay") },
  speak: { inf: "parler", infSay: "par-lay", aux: "a", ...reg("parl", "parl", "par-lay") },
  eat: { inf: "manger", infSay: "mahn-zhay", aux: "a", ...reg("mang", "mahnzh", "mahn-zhay") },
  give: { inf: "donner", infSay: "do-nay", aux: "a", ...reg("donn", "don", "do-nay") },
  walk: { inf: "marcher", infSay: "mar-shay", aux: "a", ...reg("march", "marsh", "mar-shay") },
  cook: { inf: "cuisiner", infSay: "kwee-zee-nay", aux: "a", ...reg("cuisin", "kwee-zeen", "kwee-zee-nay") },
  help: { inf: "aider", infSay: "ay-day", aux: "a", ...reg("aid", "ed", "ay-day") },
  learn: {
    inf: "apprendre", infSay: "a-prahndr", aux: "a",
    pres: ["apprends", "apprends", "apprenez", "apprend", "apprend", "apprend", "apprennent"],
    presSay: ["a-prahn", "a-prahn", "a-pruh-nay", "a-prahn", "a-prahn", "a-prahn", "a-pren"], pp: "appris", ppSay: "a-pree",
  },
  do: {
    inf: "faire", infSay: "fehr", aux: "a",
    pres: ["fais", "fais", "faites", "fait", "fait", "fait", "font"], presSay: ["feh", "feh", "fet", "feh", "feh", "feh", "fohn"], pp: "fait", ppSay: "feh",
  },
  go: {
    inf: "aller", infSay: "a-lay", aux: "e",
    pres: ["vais", "vas", "allez", "va", "va", "va", "vont"], presSay: ["vay", "vah", "a-lay", "vah", "vah", "vah", "vohn"], pp: "allé", ppSay: "a-lay",
  },
  come: {
    inf: "venir", infSay: "vuh-neer", aux: "e",
    pres: ["viens", "viens", "venez", "vient", "vient", "vient", "viennent"], presSay: ["vyan", "vyan", "vuh-nay", "vyan", "vyan", "vyan", "vyen"], pp: "venu", ppSay: "vuh-new",
  },
  think: {
    inf: "réfléchir", infSay: "ray-flay-sheer", aux: "a",
    pres: ["réfléchis", "réfléchis", "réfléchissez", "réfléchit", "réfléchit", "réfléchit", "réfléchissent"],
    presSay: ["ray-flay-shee", "ray-flay-shee", "ray-flay-shee-say", "ray-flay-shee", "ray-flay-shee", "ray-flay-shee", "ray-flay-sheess"], pp: "réfléchi", ppSay: "ray-flay-shee",
  },
  drink: {
    inf: "boire", infSay: "bwar", aux: "a",
    pres: ["bois", "bois", "buvez", "boit", "boit", "boit", "boivent"], presSay: ["bwa", "bwa", "bew-vay", "bwa", "bwa", "bwa", "bwav"], pp: "bu", ppSay: "bew",
  },
  see: { inf: "regarder", infSay: "ruh-gar-day", aux: "a", ...reg("regard", "ruh-gard", "ruh-gar-day") },
  rentrer: { inf: "rentrer", infSay: "rahn-tray", aux: "e", ...reg("rentr", "rahntr", "rahn-tray") },
  read: {
    inf: "lire", infSay: "leer", aux: "a",
    pres: ["lis", "lis", "lisez", "lit", "lit", "lit", "lisent"], presSay: ["lee", "lee", "lee-zay", "lee", "lee", "lee", "leez"], pp: "lu", ppSay: "lew",
  },
  write: {
    inf: "écrire", infSay: "ay-kreer", aux: "a",
    pres: ["écris", "écris", "écrivez", "écrit", "écrit", "écrit", "écrivent"], presSay: ["ay-kree", "ay-kree", "ay-kree-vay", "ay-kree", "ay-kree", "ay-kree", "ay-kreev"], pp: "écrit", ppSay: "ay-kree",
  },
  sleep: {
    inf: "dormir", infSay: "dor-meer", aux: "a",
    pres: ["dors", "dors", "dormez", "dort", "dort", "dort", "dorment"], presSay: ["dor", "dor", "dor-may", "dor", "dor", "dor", "dorm"], pp: "dormi", ppSay: "dor-mee",
  },
  take: {
    inf: "prendre", infSay: "prahndr", aux: "a",
    pres: ["prends", "prends", "prenez", "prend", "prend", "prend", "prennent"], presSay: ["prahn", "prahn", "pruh-nay", "prahn", "prahn", "prahn", "pren"], pp: "pris", ppSay: "pree",
  },
  buy: {
    inf: "acheter", infSay: "ash-tay", aux: "a",
    pres: ["achète", "achètes", "achetez", "achète", "achète", "achète", "achètent"], presSay: ["a-shet", "a-shet", "ash-tay", "a-shet", "a-shet", "a-shet", "a-shet"], pp: "acheté", ppSay: "ash-tay",
  },
  wait: {
    inf: "attendre", infSay: "a-tahndr", aux: "a",
    pres: ["attends", "attends", "attendez", "attend", "attend", "attend", "attendent"], presSay: ["a-tahn", "a-tahn", "a-tahn-day", "a-tahn", "a-tahn", "a-tahn", "a-tahnd"], pp: "attendu", ppSay: "a-tahn-dew",
  },
  call: {
    inf: "appeler", infSay: "ap-lay", aux: "a",
    pres: ["appelle", "appelles", "appelez", "appelle", "appelle", "appelle", "appellent"], presSay: ["a-pel", "a-pel", "ap-lay", "a-pel", "a-pel", "a-pel", "a-pel"], pp: "appelé", ppSay: "ap-lay",
  },
  sit: {
    inf: "asseoir", infSay: "a-swar", aux: "e", refl: true,
    pres: ["assois", "assois", "asseyez", "assoit", "assoit", "assoit", "assoient"], presSay: ["a-swa", "a-swa", "a-say-yay", "a-swa", "a-swa", "a-swa", "a-swa"], pp: "assis", ppSay: "a-see",
  },
  // ................................................ added with the bigger word bank
  open: {
    inf: "ouvrir", infSay: "oo-vreer", aux: "a",
    pres: ["ouvre", "ouvres", "ouvrez", "ouvre", "ouvre", "ouvre", "ouvrent"],
    presSay: ["oovr", "oovr", "oo-vray", "oovr", "oovr", "oovr", "oovr"], pp: "ouvert", ppSay: "oo-vehr",
  },
  close: { inf: "fermer", infSay: "fehr-may", aux: "a", ...reg("ferm", "fehrm", "fehr-may") },
  start: { inf: "commencer", infSay: "ko-mahn-say", aux: "a", ...reg("commenc", "ko-mahns", "ko-mahn-say") },
  stop: { inf: "arrêter", infSay: "a-ray-tay", aux: "a", ...reg("arrêt", "a-ret", "a-ray-tay") },
  finish: {
    inf: "finir", infSay: "fee-neer", aux: "a",
    pres: ["finis", "finis", "finissez", "finit", "finit", "finit", "finissent"],
    presSay: ["fee-nee", "fee-nee", "fee-nee-say", "fee-nee", "fee-nee", "fee-nee", "fee-neess"], pp: "fini", ppSay: "fee-nee",
  },
  ask: { inf: "demander", infSay: "duh-mahn-day", aux: "a", ...reg("demand", "duh-mahnd", "duh-mahn-day") },
  answer: {
    inf: "répondre", infSay: "ray-pohndr", aux: "a",
    pres: ["réponds", "réponds", "répondez", "répond", "répond", "répond", "répondent"],
    presSay: ["ray-pohn", "ray-pohn", "ray-pohn-day", "ray-pohn", "ray-pohn", "ray-pohn", "ray-pohnd"], pp: "répondu", ppSay: "ray-pohn-dew",
  },
  show: { inf: "montrer", infSay: "mohn-tray", aux: "a", ...reg("montr", "mohntr", "mohn-tray") },
  send: {
    inf: "envoyer", infSay: "ahn-vwa-yay", aux: "a",
    pres: ["envoie", "envoies", "envoyez", "envoie", "envoie", "envoie", "envoient"],
    presSay: ["ahn-vwa", "ahn-vwa", "ahn-vwa-yay", "ahn-vwa", "ahn-vwa", "ahn-vwa", "ahn-vwa"], pp: "envoyé", ppSay: "ahn-vwa-yay",
  },
  bring: { inf: "apporter", infSay: "a-por-tay", aux: "a", ...reg("apport", "a-port", "a-por-tay") },
  put: {
    inf: "mettre", infSay: "metr", aux: "a",
    pres: ["mets", "mets", "mettez", "met", "met", "met", "mettent"],
    presSay: ["meh", "meh", "meh-tay", "meh", "meh", "meh", "met"], pp: "mis", ppSay: "mee",
  },
  wash: { inf: "laver", infSay: "la-vay", aux: "a", ...reg("lav", "lav", "la-vay") },
  cut: { inf: "couper", infSay: "koo-pay", aux: "a", ...reg("coup", "koop", "koo-pay") },
  run: {
    inf: "courir", infSay: "koo-reer", aux: "a",
    pres: ["cours", "cours", "courez", "court", "court", "court", "courent"],
    presSay: ["koor", "koor", "koo-ray", "koor", "koor", "koor", "koor"], pp: "couru", ppSay: "koo-rew",
  },
  laugh: {
    inf: "rire", infSay: "reer", aux: "a",
    pres: ["ris", "ris", "riez", "rit", "rit", "rit", "rient"],
    presSay: ["ree", "ree", "ree-yay", "ree", "ree", "ree", "ree"], pp: "ri", ppSay: "ree",
  },
  cry: { inf: "pleurer", infSay: "pluh-ray", aux: "a", ...reg("pleur", "pluhr", "pluh-ray") },
  bathe: { inf: "doucher", infSay: "doo-shay", aux: "e", refl: true, ...reg("douch", "doosh", "doo-shay") },
  rest: { inf: "reposer", infSay: "ruh-po-zay", aux: "e", refl: true, ...reg("repos", "ruh-poz", "ruh-po-zay") },
  swim: { inf: "nager", infSay: "na-zhay", aux: "a", ...reg("nag", "nazh", "na-zhay") },
  try: {
    inf: "essayer", infSay: "ay-say-yay", aux: "a",
    pres: ["essaie", "essaies", "essayez", "essaie", "essaie", "essaie", "essaient"],
    presSay: ["ay-say", "ay-say", "ay-say-yay", "ay-say", "ay-say", "ay-say", "ay-say"], pp: "essayé", ppSay: "ay-say-yay",
  },
  search: { inf: "chercher", infSay: "shehr-shay", aux: "a", ...reg("cherch", "shehrsh", "shehr-shay") },
  change: { inf: "changer", infSay: "shahn-zhay", aux: "a", ...reg("chang", "shahnzh", "shahn-zhay") },
  repair: { inf: "réparer", infSay: "ray-pa-ray", aux: "a", ...reg("répar", "ray-par", "ray-pa-ray") },
  clean: {
    inf: "nettoyer", infSay: "nay-twa-yay", aux: "a",
    pres: ["nettoie", "nettoies", "nettoyez", "nettoie", "nettoie", "nettoie", "nettoient"],
    presSay: ["nay-twa", "nay-twa", "nay-twa-yay", "nay-twa", "nay-twa", "nay-twa", "nay-twa"], pp: "nettoyé", ppSay: "nay-twa-yay",
  },
  pay: {
    inf: "payer", infSay: "pay-yay", aux: "a",
    pres: ["paie", "paies", "payez", "paie", "paie", "paie", "paient"],
    presSay: ["peh", "peh", "pay-yay", "peh", "peh", "peh", "peh"], pp: "payé", ppSay: "pay-yay",
  },
  sell: {
    inf: "vendre", infSay: "vahndr", aux: "a",
    pres: ["vends", "vends", "vendez", "vend", "vend", "vend", "vendent"],
    presSay: ["vahn", "vahn", "vahn-day", "vahn", "vahn", "vahn", "vahnd"], pp: "vendu", ppSay: "vahn-dew",
  },
  order: { inf: "commander", infSay: "ko-mahn-day", aux: "a", ...reg("command", "ko-mahnd", "ko-mahn-day") },
  book: { inf: "réserver", infSay: "ray-zehr-vay", aux: "a", ...reg("réserv", "ray-zehrv", "ray-zehr-vay") },
  cancel: { inf: "annuler", infSay: "a-new-lay", aux: "a", ...reg("annul", "a-newl", "a-new-lay") },
  drive: {
    inf: "conduire", infSay: "kohn-dweer", aux: "a",
    pres: ["conduis", "conduis", "conduisez", "conduit", "conduit", "conduit", "conduisent"],
    presSay: ["kohn-dwee", "kohn-dwee", "kohn-dwee-zay", "kohn-dwee", "kohn-dwee", "kohn-dwee", "kohn-dweez"], pp: "conduit", ppSay: "kohn-dwee",
  },
  wear: { inf: "porter", infSay: "por-tay", aux: "a", ...reg("port", "port", "por-tay") },
  count: { inf: "compter", infSay: "kohn-tay", aux: "a", ...reg("compt", "kohnt", "kohn-tay") },
  explain: { inf: "expliquer", infSay: "eks-plee-kay", aux: "a", ...reg("expliqu", "eks-pleek", "eks-plee-kay") },
  repeat: {
    inf: "répéter", infSay: "ray-pay-tay", aux: "a",
    pres: ["répète", "répètes", "répétez", "répète", "répète", "répète", "répètent"],
    presSay: ["ray-pet", "ray-pet", "ray-pay-tay", "ray-pet", "ray-pet", "ray-pet", "ray-pet"], pp: "répété", ppSay: "ray-pay-tay",
  },
  record: { inf: "enregistrer", infSay: "ahn-ruh-zhee-stray", aux: "a", ...reg("enregistr", "ahn-ruh-zheestr", "ahn-ruh-zhee-stray") },
  tune: { inf: "accorder", infSay: "a-kor-day", aux: "a", ...reg("accord", "a-kord", "a-kor-day") },
  clap: {
    inf: "applaudir", infSay: "a-plo-deer", aux: "a",
    pres: ["applaudis", "applaudis", "applaudissez", "applaudit", "applaudit", "applaudit", "applaudissent"],
    presSay: ["a-plo-dee", "a-plo-dee", "a-plo-dee-say", "a-plo-dee", "a-plo-dee", "a-plo-dee", "a-plo-deess"], pp: "applaudi", ppSay: "a-plo-dee",
  },
};

const FR_IDX: Record<PersonId, number> = { i: 0, you: 1, youp: 2, he: 3, she: 4, we: 5, they: 6 };
const FR_PRO = [
  { w: "je", say: "zhuh" },
  { w: "tu", say: "tew" },
  { w: "vous", say: "voo" },
  { w: "il", say: "eel" },
  { w: "elle", say: "el" },
  { w: "on", say: "ohn" },
  { w: "ils", say: "eel" },
];
const FR_REFL = [
  { w: "me", say: "muh" },
  { w: "te", say: "tuh" },
  { w: "vous", say: "voo" },
  { w: "se", say: "suh" },
  { w: "se", say: "suh" },
  { w: "se", say: "suh" },
  { w: "se", say: "suh" },
];
const AVOIR = { w: ["ai", "as", "avez", "a", "a", "a", "ont"], say: ["ay", "ah", "a-vay", "ah", "ah", "ah", "ohn"] };
const ETRE = { w: ["suis", "es", "êtes", "est", "est", "est", "sont"], say: ["swee", "ay", "et", "ay", "ay", "ay", "sohn"] };
const ALLER = { w: ["vais", "vas", "allez", "va", "va", "va", "vont"], say: ["vay", "vah", "a-lay", "vah", "vah", "vah", "vohn"] };
const VOULOIR = { w: ["veux", "veux", "voulez", "veut", "veut", "veut", "veulent"], say: ["vuh", "vuh", "voo-lay", "vuh", "vuh", "vuh", "vuhl"] };
const SAVOIR = { w: ["sais", "sais", "savez", "sait", "sait", "sait", "savent"], say: ["say", "say", "sa-vay", "say", "say", "say", "sahv"] };

type FrObj = { w: string; say: string; neg?: string; negSay?: string };
// Each object in the frame its verb needs: jouer du piano, apprendre le piano,
// aller au magasin, faire les courses. "neg" is the form after "pas" when the
// article changes (du riz becomes de riz).
const FR_OBJ: Record<string, Partial<Record<"part" | "def" | "bare" | "place" | "sport" | "indef" | "faire", FrObj>>> = {
  piano: { part: { w: "du piano", say: "dew pya-no" }, def: { w: "le piano", say: "luh pya-no" } },
  guitar: { part: { w: "de la guitare", say: "duh la gee-tar" }, def: { w: "la guitare", say: "la gee-tar" } },
  violin: { part: { w: "du violon", say: "dew vyo-lohn" }, def: { w: "le violon", say: "luh vyo-lohn" } },
  drums: { part: { w: "de la batterie", say: "duh la bat-ree" }, def: { w: "la batterie", say: "la bat-ree" } },
  song: { indef: { w: "une chanson", say: "ewn shahn-sohn", neg: "de chanson", negSay: "duh shahn-sohn" } },
  thissong: { def: { w: "cette chanson", say: "set shahn-sohn" } },
  music: { part: { w: "de la musique", say: "duh la mew-zeek", neg: "de musique", negSay: "duh mew-zeek" }, def: { w: "la musique", say: "la mew-zeek" } },
  language: { bare: { w: "français", say: "frahn-say" }, def: { w: "le français", say: "luh frahn-say" } },
  english: { bare: { w: "anglais", say: "ahn-gleh" }, def: { w: "l'anglais", say: "lahn-gleh" } },
  rice: { part: { w: "du riz", say: "dew ree", neg: "de riz", negSay: "duh ree" } },
  tea: { part: { w: "du thé", say: "dew tay", neg: "de thé", negSay: "duh tay" } },
  coffee: { part: { w: "du café", say: "dew ka-fay", neg: "de café", negSay: "duh ka-fay" } },
  water: { part: { w: "de l'eau", say: "duh loh", neg: "d'eau", negSay: "doh" } },
  movie: { indef: { w: "un film", say: "uhn feelm", neg: "de film", negSay: "duh feelm" } },
  book: { indef: { w: "un livre", say: "uhn leevr", neg: "de livre", negSay: "duh leevr" } },
  money: { part: { w: "de l'argent", say: "duh lar-zhahn", neg: "d'argent", negSay: "dar-zhahn" } },
  phone: { def: { w: "le téléphone", say: "luh tay-lay-fon" } },
  key: { def: { w: "la clé", say: "la klay" } },
  football: { sport: { w: "au foot", say: "oh foot" } },
  cricket: { sport: { w: "au cricket", say: "oh kree-ket" } },
  home: { place: { w: "à la maison", say: "a la may-zohn" } },
  class: { place: { w: "en classe", say: "ahn klass" } },
  school: { place: { w: "à l'école", say: "a lay-kol" } },
  shop: { place: { w: "au magasin", say: "oh ma-ga-zan" } },
  concert: { place: { w: "au concert", say: "oh kohn-sehr" } },
  city: { place: { w: "à Bangalore", say: "a bahn-ga-lor" } },
  shopping: { faire: { w: "les courses", say: "lay koors" } },
  exercise: { faire: { w: "du sport", say: "dew spor", neg: "de sport", negSay: "duh spor" } },
  cooking: { faire: { w: "la cuisine", say: "la kwee-zeen" } },
  cleaning: { faire: { w: "le ménage", say: "luh may-nazh" } },
  homework: { faire: { w: "{poss} devoirs", say: "{possSay} duh-vwar" } },
  // ................................................ added with the bigger word bank
  keyboard: { part: { w: "du clavier", say: "dew kla-vyay" }, def: { w: "le clavier", say: "luh kla-vyay" } },
  flute: { part: { w: "de la flûte", say: "duh la flewt" }, def: { w: "la flûte", say: "la flewt" } },
  harmonium: { part: { w: "de l'harmonium", say: "duh lar-mo-nyom" }, def: { w: "l'harmonium", say: "lar-mo-nyom" } },
  mic: { def: { w: "le micro", say: "luh mee-kro" } },
  scale: { def: { w: "la gamme", say: "la gam" }, indef: { w: "une gamme", say: "ewn gam", neg: "de gamme", negSay: "duh gam" } },
  swara: { def: { w: "la note", say: "la not" }, indef: { w: "une note", say: "ewn not", neg: "de note", negSay: "duh not" } },
  chord: { def: { w: "l'accord", say: "la-kor" }, indef: { w: "un accord", say: "uhn a-kor", neg: "d'accord", negSay: "da-kor" } },
  newsong: { indef: { w: "une nouvelle chanson", say: "ewn noo-vel shahn-sohn", neg: "de nouvelle chanson", negSay: "duh noo-vel shahn-sohn" } },
  lesson: { def: { w: "la leçon", say: "la luh-sohn" }, indef: { w: "une leçon", say: "ewn luh-sohn", neg: "de leçon", negSay: "duh luh-sohn" } },
  notebook: { def: { w: "le cahier", say: "luh ka-yay" }, indef: { w: "un cahier", say: "uhn ka-yay", neg: "de cahier", negSay: "duh ka-yay" } },
  maths: { bare: { w: "les maths", say: "lay mat" }, def: { w: "les maths", say: "lay mat" } },
  newspaper: { def: { w: "le journal", say: "luh zhoor-nal" }, indef: { w: "le journal", say: "luh zhoor-nal" } },
  letter: { indef: { w: "une lettre", say: "ewn letr", neg: "de lettre", negSay: "duh letr" } },
  story: { indef: { w: "une histoire", say: "ewn ees-twar", neg: "d'histoire", negSay: "dees-twar" } },
  poem: { indef: { w: "un poème", say: "uhn po-em", neg: "de poème", negSay: "duh po-em" } },
  name: { def: { w: "le nom", say: "luh nohn" } },
  address: { def: { w: "l'adresse", say: "la-dress" } },
  number: { def: { w: "le numéro", say: "luh new-may-ro" } },
  milk: { part: { w: "du lait", say: "dew leh", neg: "de lait", negSay: "duh leh" } },
  juice: { part: { w: "du jus", say: "dew zhew", neg: "de jus", negSay: "duh zhew" } },
  egg: { indef: { w: "un oeuf", say: "uhn uhf", neg: "d'oeuf", negSay: "duhf" } },
  chicken: { part: { w: "du poulet", say: "dew poo-leh", neg: "de poulet", negSay: "duh poo-leh" } },
  fish: { part: { w: "du poisson", say: "dew pwa-sohn", neg: "de poisson", negSay: "duh pwa-sohn" } },
  vegetables: { part: { w: "des légumes", say: "day lay-gewm", neg: "de légumes", negSay: "duh lay-gewm" } },
  fruit: { part: { w: "des fruits", say: "day frwee", neg: "de fruits", negSay: "duh frwee" } },
  banana: { indef: { w: "une banane", say: "ewn ba-nan", neg: "de banane", negSay: "duh ba-nan" } },
  mango: { indef: { w: "une mangue", say: "ewn mahng", neg: "de mangue", negSay: "duh mahng" } },
  sweet: { indef: { w: "un gâteau", say: "uhn ga-toh", neg: "de gâteau", negSay: "duh ga-toh" } },
  lunch: { def: { w: "le déjeuner", say: "luh day-zhuh-nay" } },
  food: { part: { w: "de la nourriture", say: "duh la noo-ree-tewr", neg: "de nourriture", negSay: "duh noo-ree-tewr" } },
  office: { place: { w: "au bureau", say: "oh bew-roh" } },
  market: { place: { w: "au marché", say: "oh mar-shay" } },
  church: { place: { w: "à l'église", say: "a lay-gleez" } },
  hospital: { place: { w: "à l'hôpital", say: "a lo-pee-tal" } },
  station: { place: { w: "à la gare", say: "a la gar" } },
  airport: { place: { w: "à l'aéroport", say: "a la-ay-ro-por" } },
  bank: { place: { w: "à la banque", say: "a la bahnk" } },
  hotel: { place: { w: "au restaurant", say: "oh res-to-rahn" } },
  park: { place: { w: "au parc", say: "oh park" } },
  beach: { place: { w: "à la plage", say: "a la plazh" } },
  cinema: { place: { w: "au cinéma", say: "oh see-nay-ma" } },
  gym: { place: { w: "à la salle de sport", say: "a la sal duh spor" } },
  village: { place: { w: "au village", say: "oh vee-lazh" } },
  bag: { def: { w: "le sac", say: "luh sak" } },
  door: { def: { w: "la porte", say: "la port" } },
  window: { def: { w: "la fenêtre", say: "la fuh-netr" } },
  light: { def: { w: "la lumière", say: "la lew-myehr" } },
  room: { def: { w: "la chambre", say: "la shahmbr" } },
  house: { def: { w: "la maison", say: "la may-zohn" } },
  cup: { def: { w: "la tasse", say: "la tass" } },
  plate: { def: { w: "l'assiette", say: "la-syet" } },
  box: { def: { w: "la boîte", say: "la bwat" } },
  paper: { def: { w: "le papier", say: "luh pa-pyay" } },
  pen: { def: { w: "le stylo", say: "luh stee-lo" } },
  medicine: { def: { w: "le médicament", say: "luh may-dee-ka-mahn" } },
  gift: { indef: { w: "un cadeau", say: "uhn ka-doh", neg: "de cadeau", negSay: "duh ka-doh" } },
  flower: { indef: { w: "une fleur", say: "ewn fluhr", neg: "de fleur", negSay: "duh fluhr" } },
  clothes: { def: { w: "les vêtements", say: "lay vet-mahn" } },
  shirt: { def: { w: "la chemise", say: "la shuh-meez" } },
  shoes: { def: { w: "les chaussures", say: "lay sho-sewr" } },
  watch: { def: { w: "la montre", say: "la mohntr" } },
  car: { def: { w: "la voiture", say: "la vwa-tewr" } },
  bike: { def: { w: "la moto", say: "la mo-to" } },
  bus: { def: { w: "le bus", say: "luh bewss" } },
  train: { def: { w: "le train", say: "luh tran" } },
  cab: { def: { w: "le taxi", say: "luh tak-see" } },
  flight: { def: { w: "le vol", say: "luh vol" } },
  laptop: { def: { w: "l'ordinateur", say: "lor-dee-na-tuhr" } },
  tv: { def: { w: "la télé", say: "la tay-lay" } },
  photo: { def: { w: "la photo", say: "la fo-to" } },
  video: { def: { w: "la vidéo", say: "la vee-day-o" } },
  message: { def: { w: "le message", say: "luh may-sazh" } },
  email: { def: { w: "l'email", say: "lee-mel" } },
  password: { def: { w: "le mot de passe", say: "luh mo duh pass" } },
  app: { def: { w: "l'appli", say: "la-plee" } },
  film: { indef: { w: "un film", say: "uhn feelm", neg: "de film", negSay: "duh feelm" } },
  series: { def: { w: "la série", say: "la say-ree" } },
  news: { def: { w: "les infos", say: "layz an-fo" } },
  podcast: { def: { w: "le podcast", say: "luh pod-kast" } },
  work: { def: { w: "le travail", say: "luh tra-vye" } },
  rent: { def: { w: "le loyer", say: "luh lwa-yay" } },
  bill: { def: { w: "l'addition", say: "la-dee-syohn" } },
  salary: { def: { w: "le salaire", say: "luh sa-lehr" } },
  chess: { sport: { w: "aux échecs", say: "ohz ay-shek" } },
  badminton: { sport: { w: "au badminton", say: "oh bad-meen-tohn" } },
  game: { sport: { w: "à un jeu", say: "a uhn zhuh" } },
  recording: { faire: { w: "un enregistrement", say: "uhn ahn-ruh-zhee-struh-mahn" } },
  meeting: { faire: { w: "une réunion", say: "ewn ray-ew-nyohn" } },
  payment: { faire: { w: "le paiement", say: "luh peh-mahn" } },
  booking: { faire: { w: "la réservation", say: "la ray-zehr-va-syohn" } },
  laundry: { faire: { w: "la lessive", say: "la lay-seev" } },
  packing: { faire: { w: "les valises", say: "lay va-leez" } },
};
const FR_FRAME: Record<string, "part" | "def" | "bare" | "place" | "sport" | "indef" | "faire"> = {
  play: "part", practise: "def", learn: "def", teach: "def", speak: "bare", listen: "part", sing: "indef", write: "indef",
  eat: "part", drink: "part", buy: "part", give: "part", take: "def", see: "indef", read: "indef", go: "place", come: "place", playgame: "sport", do: "faire",
  tune: "def", record: "def", count: "def", explain: "def", repeat: "def", cook: "part", sell: "def", order: "part",
  travel: "place", bring: "def", send: "def", show: "def", put: "def", open: "def", close: "def", wash: "def",
  clean: "def", cut: "part", repair: "def", change: "def", search: "def", start: "def", stop: "def",
  finish: "def", try: "part", wear: "def", drive: "def", pay: "def", book: "def", cancel: "def",
  ask: "def", answer: "def", sit: "def",
};
const FR_POSS = [
  { w: "mes", say: "may" },
  { w: "tes", say: "tay" },
  { w: "vos", say: "voh" },
  { w: "ses", say: "say" },
  { w: "ses", say: "say" },
  { w: "nos", say: "noh" },
  { w: "leurs", say: "luhr" },
];
const FR_TIME: Record<string, FrObj> = {
  yesterday: { w: "hier", say: "ee-yehr" },
  now: { w: "maintenant", say: "man-tuh-nahn" },
  everyday: { w: "tous les jours", say: "too lay zhoor" },
  tomorrow: { w: "demain", say: "duh-man" },
};

export function frenchHasVerb(verb: string): boolean {
  return Boolean(FR_VERBS[verb]);
}

export function frenchHasObject(object: string): boolean {
  return Boolean(FR_OBJ[object]);
}

const startsVowel = (w: string) => /^[aeiouéèêh]/i.test(w);

function frObject(c: PathChoice, idx: number, negForm: boolean): FrObj | null {
  if (!c.object) return null;
  const frame = FR_FRAME[c.verb];
  const forms = FR_OBJ[c.object] ?? {};
  // The verb's own frame first; otherwise the form the noun naturally takes.
  const obj = (frame ? forms[frame] : undefined) ?? forms.def ?? forms.indef ?? forms.part ?? forms.bare;
  if (!obj) return null;
  const poss = FR_POSS[idx];
  const w = obj.w.replace("{poss}", poss.w);
  const say = obj.say.replace("{possSay}", poss.say);
  if (negForm && obj.neg) return { w: obj.neg, say: obj.negSay ?? say };
  return { w, say };
}

function french(c: PathChoice): PathResult {
  const p = asPerson(c);
  const idx = FR_IDX[p];
  // Going or coming home is rentrer in French: je rentre à la maison.
  const home = (c.verb === "go" || c.verb === "come") && c.object === "home";
  const v = FR_VERBS[home ? "rentrer" : c.verb];
  const english = "";
  if (!v) return { english, enParts: [], sentence: "", parts: [], say: "", unsupported: "This verb is not in the French set yet." };
  if (c.verb === "do" && c.object && !FR_OBJ[c.object]?.faire) {
    return {
      english, enParts: [], sentence: "", parts: [], say: "",
      unsupported: "French has no magic verb for this one. The Indian trick (English word plus maadu, karna, pannu) does not work in French: ordering is commander, downloading is télécharger, booking is réserver, each its own verb.",
    };
  }
  const fem = p === "she" || (p === "i" && c.gender === "f");
  const plural = p === "we" || p === "they";
  const agree = (pp: string) => (v.aux === "e" ? pp + (fem ? "e" : "") + (plural && !pp.endsWith("s") ? "s" : "") : pp);
  const who: Part = c.who === "name" ? { word: cleanName(c), role: "who", say: cleanName(c) } : { word: FR_PRO[idx].w, role: "who", say: FR_PRO[idx].say };
  const parts: Part[] = [];
  const neg = c.negative;
  // Only a conjugated verb that takes the object directly turns du into de.
  const negObj = neg && c.when !== "cont";
  // Verbs of motion are never "en train de" in speech: je vais à l'école, là.
  const motion = c.when === "cont" && (c.verb === "go" || c.verb === "come");
  const obj = frObject(c, idx, negObj);
  if (c.object && !obj) {
    return {
      english, enParts: [], sentence: "", parts: [], say: "",
      unsupported: `${objectEnglish(c.object, "fr").replace(/^(the|a|an|to the|to) /, "")} is not in the French word set yet. Pick another word, or switch to Kannada, Hindi, Tamil or Malayalam where every word in the bank works.`,
    };
  }
  const refl = v.refl ? FR_REFL[idx] : null;
  const reflBefore = (next: string) => (refl ? (startsVowel(next) && refl.w !== "vous" ? { w: refl.w[0] + "'", say: refl.say[0] } : refl) : null);
  const pas: Part = { word: "pas", role: "helper", say: "pah" };
  const infinitive = (): Part[] => {
    const r = reflBefore(v.inf);
    const inf: Part = { word: v.inf, role: "action", say: v.infSay };
    return r ? [{ word: r.w, role: "action", say: r.say }, inf] : [inf];
  };
  const helperVerb = (table: { w: string[]; say: string[] }): Part => ({ word: table.w[idx], role: "action", say: table.say[idx] });

  if (c.when === "present" || motion) {
    const r = reflBefore(v.pres[idx]);
    if (r) parts.push({ word: r.w, role: "action", say: r.say });
    parts.push({ word: v.pres[idx], role: "action", say: v.presSay[idx] });
    if (neg) parts.push(pas);
  } else if (c.when === "cont" && c.verb === "sit") {
    // Sitting right now is a state in French: je suis assis.
    parts.push(helperVerb(ETRE));
    if (neg) parts.push(pas);
    parts.push({ word: agree(v.pp), role: "action", say: v.ppSay });
  } else if (c.when === "cont") {
    parts.push(helperVerb(ETRE));
    if (neg) parts.push(pas);
    const inf = infinitive();
    const first = inf[0].word;
    parts.push({ word: startsVowel(first) ? "en train d'" : "en train de", role: "helper", say: startsVowel(first) ? "ahn tran d" : "ahn tran duh" });
    parts.push(...inf);
  } else if (c.when === "past") {
    const r = reflBefore(ETRE.w[idx]);
    if (r) parts.push({ word: r.w, role: "action", say: r.say });
    parts.push(helperVerb(v.aux === "e" || refl ? ETRE : AVOIR));
    if (neg) parts.push(pas);
    parts.push({ word: agree(v.pp), role: "action", say: v.ppSay });
  } else if (c.when === "future") {
    parts.push(helperVerb(ALLER));
    if (neg) parts.push(pas);
    parts.push(...infinitive());
  } else if (c.when === "want") {
    parts.push(helperVerb(VOULOIR));
    if (neg) parts.push(pas);
    parts.push(...infinitive());
  } else {
    parts.push(helperVerb(SAVOIR));
    if (neg) parts.push(pas);
    parts.push(...infinitive());
  }

  // je becomes j' before a vowel sound, in speech and in writing.
  const all: Part[] = [who, ...parts];
  if (who.word === "je" && startsVowel(parts[0].word)) all[0] = { word: "j'", role: "who", say: "zh" };
  if (obj) all.push({ word: obj.w, role: "what", say: obj.say });
  const tile = WHEN_TILES.find((w) => w.id === c.when);
  if (c.timeWord && tile?.time && FR_TIME[tile.time]) all.push({ word: FR_TIME[tile.time].w, role: "when", say: FR_TIME[tile.time].say });

  // Written form joins the elisions (j'ai, m'assois, d'écouter).
  const sentence = all.reduce((acc, part, i) => (i === 0 ? part.word : acc.endsWith("'") ? acc + part.word : `${acc} ${part.word}`), "") + (c.question ? " ?" : "");
  // Sounds-like joins liaison: vous avez is voo-za-vay, ils ont is eel-zohn.
  const say = all
    .map((part, i) => {
      const prev = all[i - 1];
      if (prev && (prev.word === "vous" || prev.word === "ils" || prev.word === "on") && startsVowel(part.word)) return `${prev.word === "on" ? "n" : "z"}${part.say ?? ""}`;
      return part.say ?? "";
    })
    .reduce((acc, s, i) => (i === 0 ? s : all[i - 1].word.endsWith("'") || all[i - 1].say === "zh" ? `${acc}${s}` : `${acc}  ${s}`), "");
  let note: string | undefined;
  if (neg) note = "Spoken French drops the ne: people say je joue pas, not je ne joue pas. Written French keeps it.";
  else if (c.who === "we") note = "In everyday French, we is on, and it takes the same verb as il. Nous is for writing and speeches.";
  else if (c.when === "future") note = "Spoken French builds the future with aller: je vais jouer, I am going to play.";
  else if (motion) note = "For going and coming, French uses the plain present even for right now: je vais, je viens.";
  else if (c.when === "cont") note = "En train de means in the middle of. French also uses the plain present for right now: je joue du piano.";
  else if (c.question) note = "No word order change: just lift your voice at the end.";
  else if (c.verb === "do") note = "Faire is French's own magic verb for chores: faire les courses, faire le ménage, faire la cuisine, faire du sport.";
  return { english, enParts: [], sentence, parts: all, say, note };
}

// ............................................................ surprise me
// A random but sensible sentence: any action, a fitting object, any person, any
// time. Used for the example chips and the dice, then the learner rebuilds it.
export function randomChoice(gender: Gender, lang: PathLang = "kn", rnd: () => number = Math.random): PathChoice {
  const pick = <T,>(list: T[]) => list[Math.floor(rnd() * list.length)];
  const pool = VERB_TILES.filter((v) => verbInLang(v.id, lang));
  const tile = pick(pool.length ? pool : VERB_TILES);
  const objects = tile.objects.filter((o) => wordInLang(o, lang));
  const object = objects.length ? (rnd() < 0.85 ? pick(objects) : null) : null;
  const who = pick(WHO_TILES.filter((t) => t.id !== "name")).id;
  const whens = WHEN_TILES.filter((w) => whenAllowed(tile.id, w.id, object)).map((w) => w.id);
  const when = rnd() < 0.8 ? pick(LADDER) : pick(whens);
  return { who, verb: tile.id, object, when: whenAllowed(tile.id, when, object) ? when : "present", timeWord: rnd() < 0.7, negative: rnd() < 0.2, question: rnd() < 0.15, gender };
}

// ............................................................ one call
export function buildPath(lang: PathLang, c: PathChoice): PathResult | null {
  const enParts = englishParts(c, lang);
  const english = englishLine(enParts, c.question);
  const res = lang === "fr" ? french(c) : indian(lang, c);
  if (!res) return null;
  return { ...res, english, enParts };
}

// The same choice in every tense, for the "change one thing" ladder.
export const LADDER: When[] = ["past", "cont", "present", "future"];

// How to read the spelling, per language.
export const HOW_TO_SAY: Record<PathLang, { k: string; v: string }[]> = {
  kn: [
    { k: "aa, ee, oo", v: "hold it long: father, see, moon" },
    { k: "a, e, i, o, u", v: "keep it short: about, bed, sit, go, put" },
    { k: "tt, dd, ll", v: "a double letter is held for a beat: id·di·ni" },
    { k: "t, d", v: "curl the tongue back a little; th, dh touch the teeth" },
    { k: "·", v: "a dot is a beat. Say every beat evenly, no stress" },
  ],
  hi: [
    { k: "aa, ee, oo", v: "hold it long: father, see, moon" },
    { k: "a", v: "short, like the u in but" },
    { k: "main, hain", v: "the n at the end is nasal: stop before you touch it" },
    { k: "kh, gh, bh", v: "a puff of air after the sound" },
    { k: "·", v: "a dot is a beat. Say every beat evenly" },
  ],
  ta: [
    { k: "aa, ee, oo", v: "hold it long: father, see, moon" },
    { k: "a, e, i, o, u", v: "keep it short; a final u is almost silent" },
    { k: "zh", v: "curl the tongue far back: between an r and an l" },
    { k: "kk, tt, pp", v: "a double letter is held for a beat: ir·uk·ken" },
    { k: "·", v: "a dot is a beat. Say every beat evenly" },
  ],
  ml: [
    { k: "aa, ee, oo", v: "hold it long: father, see, moon" },
    { k: "nj", v: "one sound, like the ny in canyon: njaan is nyaan" },
    { k: "zh", v: "curl the tongue far back: between an r and an l" },
    { k: "kk, tt, ll, nn", v: "a double letter is held for a beat: vaa·yik·ku·nnu" },
    { k: "·", v: "a dot is a beat. Say every beat evenly, no stress" },
  ],
  fr: [
    { k: "zh", v: "the s in measure: je is zhuh" },
    { k: "ew", v: "say ee with your lips rounded: tu is tew" },
    { k: "ahn, ohn, an", v: "nasal: stop before the n, let it ring in the nose" },
    { k: "r", v: "a soft gargle at the back of the throat" },
    { k: "uh", v: "the a in about. Final consonants are mostly silent" },
  ],
};

// ............................................................ the word bank
// Every noun in grammar.json, grouped so the learner can build any sentence
// from scratch instead of only the handful each verb suggests.
export const CAT_ORDER: { id: ObjectCat; label: string; emoji: string }[] = [
  { id: "instrument", label: "Instruments", emoji: "🎸" },
  { id: "music", label: "Music", emoji: "🎼" },
  { id: "food", label: "Food", emoji: "🍛" },
  { id: "drink", label: "Drinks", emoji: "☕" },
  { id: "place", label: "Places", emoji: "📍" },
  { id: "thing", label: "Things", emoji: "🔑" },
  { id: "study", label: "Reading", emoji: "📖" },
  { id: "clothes", label: "Clothes", emoji: "👕" },
  { id: "transport", label: "Getting around", emoji: "🚕" },
  { id: "tech", label: "Phone and screen", emoji: "📱" },
  { id: "media", label: "Watch and listen", emoji: "🎬" },
  { id: "money", label: "Money and work", emoji: "💰" },
  { id: "sport", label: "Games", emoji: "⚽" },
  { id: "chore", label: "Jobs to do", emoji: "🪄" },
  { id: "language", label: "Languages", emoji: "💬" },
];

export type BankGroup = { id: ObjectCat; label: string; emoji: string; words: ObjectWord[] };

export function wordBank(): BankGroup[] {
  return CAT_ORDER.map((c) => ({ ...c, words: OBJECTS.filter((o) => o.cat === c.id) })).filter((g) => g.words.length > 0);
}

// Searching the bank: match the English, the target word, or the category.
export function searchWords(query: string, lang: PathLang): ObjectWord[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return OBJECTS.filter((o) => {
    const target = lang === "fr" ? "" : o[lang as Lang];
    return objectEnglish(o.id, lang).toLowerCase().includes(q) || target.toLowerCase().includes(q) || o.cat.includes(q);
  }).slice(0, 40);
}

export function searchVerbs(query: string): typeof VERB_TILES {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return VERB_TILES.filter((v) => v.en.toLowerCase().includes(q) || v.id.includes(q)).slice(0, 40);
}

// French carries its own hand-built verb and noun tables, so some of the bank
// is not there yet. The picker greys those out rather than letting the learner
// walk into a dead end.
export function verbInLang(verb: string, lang: PathLang): boolean {
  return lang !== "fr" || frenchHasVerb(verb);
}

export function wordInLang(object: string | null, lang: PathLang): boolean {
  if (!object) return true;
  return lang !== "fr" || frenchHasObject(object);
}
