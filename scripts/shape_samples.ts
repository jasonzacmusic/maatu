// Prints one example of every sentence shape in every language, so the forms
// can be read and checked by eye before any of them reaches a learner.
import { buildShape, shapeEnglish, SHAPES, type ShapeChoice, type ShapeId } from "../lib/shapes";
import type { Lang } from "../lib/maatu-design";

const LANGS: Lang[] = ["kn", "hi", "ta", "ml"];
const base: ShapeChoice = {
  shape: "isAdj", who: "i", name: "", nameG: "m", verb: "drink", object: "tea", when: "present",
  timeWord: false, negative: false, question: false, gender: "m",
  subject: "this", adj: null, quant: null, place: null, verb2: "buy", qword: "where", polite: true,
};

const CASES: { shape: ShapeId; over: Partial<ShapeChoice>; title: string }[] = [
  { shape: "isAdj", over: { subject: "tea", adj: "hot" }, title: "the tea is hot" },
  { shape: "isAdj", over: { subject: "tea", adj: "hot", negative: true }, title: "the tea is NOT hot" },
  { shape: "isAdj", over: { subject: "this", adj: "expensive", question: true }, title: "is this expensive?" },
  { shape: "isNoun", over: { subject: "this", object: "mango" }, title: "this is a mango" },
  { shape: "isNoun", over: { subject: "this", object: "mango", negative: true }, title: "this is not a mango" },
  { shape: "have", over: { who: "i", object: "money", negative: true }, title: "I do not have money" },
  { shape: "have", over: { who: "youp", object: "change", question: true }, title: "do you have change?" },
  { shape: "want", over: { who: "i", object: "water", quant: "alittle", adj: "hot" }, title: "I want a little hot water" },
  { shape: "want", over: { who: "i", object: "tea", negative: true }, title: "I do not want tea" },
  { shape: "like", over: { who: "i", object: "thissong" }, title: "I like this song" },
  { shape: "like", over: { who: "he", object: "coffee", negative: true }, title: "he does not like coffee" },
  { shape: "thereIs", over: { object: "milk", negative: true }, title: "there is no milk" },
  { shape: "thereIs", over: { object: "water", adj: "hot", place: "home", question: true }, title: "is there hot water at home?" },
  { shape: "whereIs", over: { who: "i", object: "phone" }, title: "where is my phone?" },
  { shape: "whereIs", over: { who: "youp", object: "house" }, title: "where is your house?" },
  { shape: "howMuch", over: { object: "tomato", quant: "onekilo" }, title: "how much is one kilo of tomatoes?" },
  { shape: "request", over: { object: "water", quant: "alittle", polite: true }, title: "please give me a little water" },
  { shape: "request", over: { object: "tea", polite: false }, title: "give me tea (to a friend)" },
  { shape: "lets", over: { verb: "drink", object: "tea" }, title: "let's drink tea" },
  { shape: "lets", over: { verb: "go", object: null }, title: "let's go" },
  { shape: "goingTo", over: { who: "i", place: "market", verb2: "buy", object: "vegetables" }, title: "I am going to the market to buy vegetables" },
  { shape: "goingTo", over: { who: "she", place: "shop", verb2: "buy", object: "milk" }, title: "she is going to the shop to buy milk" },
];

for (const c of CASES) {
  const choice: ShapeChoice = { ...base, shape: c.shape, ...c.over };
  console.log(`\n### ${c.title}`);
  console.log(`    EN  ${shapeEnglish(choice, "kn")}`);
  for (const l of LANGS) {
    const r = buildShape(l, choice);
    console.log(`    ${l}  ${r ? r.sentence : "NULL"}`);
  }
}
