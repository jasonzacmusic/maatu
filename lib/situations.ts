import type { ShapeChoice, ShapeId } from "./shapes";

// Real life, one place. Each situation is a short conversation written ONCE as
// engine choices (a shape plus its words), never as a sentence in one language.
// The engine then builds every line in Kannada, Hindi, Tamil, Malayalam, Telugu
// and French from grammar.json, so adding a situation here adds it everywhere, and
// fixing a word in grammar.json fixes it in every situation that uses it.
// scripts/check_situations.ts builds every line in every language and fails
// on any line a language cannot make. No em dashes anywhere.

export type LineSpec = Partial<ShapeChoice> & { shape: ShapeId };
export type Line = { by: "you" | "them"; c: LineSpec };
export type Situation = {
  id: string;
  emoji: string;
  title: string;
  them: string; // who you are talking to
  blurb: string;
  lines: Line[];
  words?: string[]; // extra words worth having to hand, beyond the lines
};

const you = (c: LineSpec): Line => ({ by: "you", c });
const them = (c: LineSpec): Line => ({ by: "them", c });
const tell = (verb: string, more: Partial<ShapeChoice> = {}): LineSpec => ({ shape: "tell", verb, polite: true, ...more });
const does = (verb: string, more: Partial<ShapeChoice> = {}): LineSpec => ({ shape: "does", who: "i", verb, when: "present", ...more });

export const SITUATIONS: Situation[] = [
  {
    id: "auto", emoji: "🛺", title: "Auto and cab", them: "Driver",
    blurb: "Where to, how much, go straight, stop here.",
    words: ["auto", "cab", "meter", "fare", "signal", "mainroad", "change", "cash", "upi"],
    lines: [
      them({ shape: "whQuestion", qword: "where", who: "youp", verb: "go", when: "cont" }),
      you(does("go", { object: "station", when: "cont" })),
      you({ shape: "howMuch", object: "fare" }),
      you(tell("go", { direction: "straight" })),
      you(tell("turn", { direction: "left" })),
      you(tell("drive", { direction: "slowly" })),
      you(tell("stop", { direction: "here" })),
      them({ shape: "have", who: "youp", object: "change", question: true }),
      you({ shape: "have", who: "i", object: "change", negative: true }),
      you(does("pay", { object: "cash", when: "future" })),
    ],
  },
  {
    id: "passport", emoji: "🛂", title: "Passport office", them: "Officer",
    blurb: "Forms, proofs, signatures and coming back tomorrow.",
    words: ["passport", "form", "aadhaar", "idproof", "addressproof", "appointment", "token", "fees", "counter", "photo"],
    lines: [
      them(tell("show", { object: "token" })),
      you(does("renew", { object: "passport", when: "want" })),
      them(tell("fill", { object: "form" })),
      them(tell("sign", { direction: "here" })),
      them({ shape: "have", who: "youp", object: "aadhaar", question: true }),
      you({ shape: "have", who: "i", object: "aadhaar" }),
      them({ shape: "want", who: "i", object: "addressproof", need: true }),
      you({ shape: "howMuch", object: "fees" }),
      them(tell("wait", { direction: "there" })),
      them(tell("comeback", { direction: "tomorrow" })),
    ],
  },
  {
    id: "doctor", emoji: "🩺", title: "Doctor and hospital", them: "Doctor",
    blurb: "Say what hurts, answer the doctor, follow the advice.",
    words: ["fever", "cough", "cold", "headache", "stomachache", "vomiting", "bp", "diabetes", "report", "bloodtest", "tablet"],
    lines: [
      you({ shape: "feel", who: "i", object: "fever" }),
      you({ shape: "feel", who: "i", object: "headache" }),
      them({ shape: "feel", who: "youp", object: "cough", question: true }),
      you({ shape: "feel", who: "i", object: "cough", negative: true }),
      you({ shape: "feel", who: "i", object: "diabetes" }),
      them(tell("show", { object: "report" })),
      them(tell("take", { object: "tablet" })),
      them(tell("drink", { object: "water", quant: "alot" })),
      them(tell("eat", { object: "sugar", negative: true })),
      them(tell("rest")),
      you({ shape: "whereIs", object: "pharmacy", the: true }),
    ],
  },
  {
    id: "pharmacy", emoji: "💊", title: "Medical shop", them: "Chemist",
    blurb: "Ask for a medicine, show the prescription, pay.",
    words: ["medicine", "tablet", "syrup", "prescription", "cold", "cough", "fever"],
    lines: [
      you({ shape: "feel", who: "i", object: "cold" }),
      you({ shape: "have", who: "youp", object: "syrup", question: true }),
      them({ shape: "have", who: "youp", object: "prescription", question: true }),
      you({ shape: "have", who: "i", object: "prescription" }),
      you({ shape: "request", object: "medicine" }),
      you({ shape: "howMuch", object: "medicine" }),
      them({ shape: "thereIs", object: "change", negative: true }),
      you(does("pay", { object: "cash", when: "future" })),
    ],
  },
  {
    id: "bank", emoji: "🏦", title: "Bank and ATM", them: "Bank officer",
    blurb: "Cash, cheques, balance, OTP and signing in the right place.",
    words: ["account", "cheque", "cash", "balance", "otp", "loan", "atm", "form", "idproof", "pancard"],
    lines: [
      you(does("deposit", { object: "cheque", when: "want" })),
      you(does("withdraw", { object: "cash", when: "want" })),
      them(tell("fill", { object: "form" })),
      them(tell("sign", { direction: "here" })),
      them(tell("show", { object: "idproof" })),
      them(tell("say", { object: "otp" })),
      you(does("check", { object: "balance", when: "want" })),
      you({ shape: "whereIs", object: "atm", the: true }),
    ],
  },
  {
    id: "police", emoji: "🚓", title: "Police station", them: "Police",
    blurb: "Report a loss, give a complaint, show your ID.",
    words: ["complaint", "phone", "bag", "idproof", "aadhaar", "form"],
    lines: [
      you(does("register", { object: "complaint", when: "want" })),
      you(does("lose", { object: "phone", when: "past" })),
      you(does("lose", { object: "bag", when: "past" })),
      them(tell("sit", { direction: "there" })),
      them(tell("fill", { object: "form" })),
      them(tell("show", { object: "idproof" })),
      them(tell("wait", { direction: "outside" })),
      them(tell("comeback", { direction: "tomorrow" })),
    ],
  },
  {
    id: "traffic", emoji: "🚦", title: "Traffic police", them: "Traffic police",
    blurb: "Licence, helmet, the fine and where not to park.",
    words: ["licence", "helmet", "fine", "signal", "bike", "scooter", "parking"],
    lines: [
      them(tell("show", { object: "licence" })),
      you({ shape: "have", who: "i", object: "licence" }),
      them(tell("wear", { object: "helmet" })),
      them(tell("park", { direction: "here", negative: true })),
      them(tell("pay", { object: "fine" })),
      you({ shape: "howMuch", object: "fine" }),
    ],
  },
  {
    id: "travel", emoji: "🚉", title: "Train, bus and metro", them: "Conductor",
    blurb: "Find the stop, book the ticket, find a seat.",
    words: ["ticket", "seat", "bus", "train", "metro", "busstand", "metrostation", "station", "luggage"],
    lines: [
      you({ shape: "whereIs", object: "busstand", the: true }),
      you({ shape: "whereIs", object: "metrostation", the: true }),
      you({ shape: "howMuch", object: "ticket" }),
      you(does("book", { object: "ticket", when: "past" })),
      them(tell("show", { object: "ticket" })),
      you({ shape: "thereIs", object: "seat", question: true }),
      them(tell("sit", { direction: "here" })),
    ],
  },
  {
    id: "airport", emoji: "✈️", title: "Airport", them: "Airport staff",
    blurb: "Counters, luggage, passports and phones off.",
    words: ["passport", "ticket", "flight", "luggage", "counter", "visa"],
    lines: [
      them(tell("show", { object: "passport" })),
      you({ shape: "whereIs", object: "counter", the: true }),
      you(does("book", { object: "flight", when: "past" })),
      you({ shape: "isAdj", subject: "luggage", adj: "heavy" }),
      them(tell("put", { object: "luggage", direction: "here" })),
      them(tell("switchoff", { object: "phone" })),
      them(tell("wait", { direction: "there" })),
    ],
  },
  {
    id: "market", emoji: "🧺", title: "Vegetable market", them: "Vendor",
    blurb: "How much a kilo, too expensive, is it fresh.",
    words: ["tomato", "onion", "potato", "chilli", "vegetables", "fruit", "banana", "mango", "change"],
    lines: [
      you({ shape: "howMuch", object: "tomato", quant: "onekilo" }),
      you({ shape: "howMuch", object: "onion", quant: "onekilo" }),
      you({ shape: "isAdj", subject: "this", adj: "expensive" }),
      them({ shape: "isAdj", subject: "this", adj: "fresh" }),
      you({ shape: "request", object: "chilli", quant: "alittle" }),
      them({ shape: "have", who: "youp", object: "change", question: true }),
      you({ shape: "thereIs", object: "change", negative: true }),
    ],
  },
  {
    id: "restaurant", emoji: "🍽️", title: "Restaurant", them: "Waiter",
    blurb: "Menu, water, is it spicy, pack it, the bill.",
    words: ["menu", "meals", "biryani", "dosa", "water", "curd", "parcel", "bill", "spoon"],
    lines: [
      you({ shape: "request", object: "menu" }),
      you({ shape: "want", who: "i", object: "meals" }),
      you({ shape: "isAdj", subject: "this", adj: "spicy", question: true }),
      you(tell("bring", { object: "water" })),
      you({ shape: "want", who: "i", object: "curd" }),
      you(tell("pack", { object: "biryani" })),
      you({ shape: "request", object: "bill" }),
    ],
  },
  {
    id: "landlord", emoji: "🏠", title: "Landlord and rent", them: "Landlord",
    blurb: "Rent, advance, water, current and parking.",
    words: ["rent", "advance", "maintenance", "current", "water", "parking", "house", "apartment"],
    lines: [
      you({ shape: "howMuch", object: "rent" }),
      you({ shape: "howMuch", object: "advance" }),
      you({ shape: "thereIs", object: "parking", question: true }),
      you({ shape: "thereIs", object: "water", negative: true }),
      you({ shape: "thereIs", object: "current", negative: true }),
      them(tell("pay", { object: "rent", direction: "tomorrow" })),
      you(does("pay", { object: "maintenance", when: "past" })),
      them(tell("lock", { object: "door" })),
    ],
  },
  {
    id: "repairs", emoji: "🔧", title: "Repairs at home", them: "Plumber",
    blurb: "It is broken, please fix it, when will you come.",
    words: ["tap", "fan", "light", "bulb", "ac", "fridge", "current", "plumber", "electrician"],
    lines: [
      you({ shape: "isAdj", subject: "tap", adj: "broken" }),
      you({ shape: "isAdj", subject: "fan", adj: "broken" }),
      you(tell("repair", { object: "tap" })),
      you({ shape: "whQuestion", qword: "when", who: "youp", verb: "come", when: "future" }),
      you(tell("come", { direction: "tomorrow" })),
      them(tell("switchoff", { object: "current" })),
      you({ shape: "howMuch", object: "bill" }),
    ],
  },
  {
    id: "courier", emoji: "📦", title: "Delivery at the door", them: "Delivery person",
    blurb: "The OTP, where to leave it, come upstairs.",
    words: ["parcel", "otp", "address", "house", "cash", "watchman"],
    lines: [
      them({ shape: "whereIs", who: "youp", object: "house" }),
      you(tell("come", { direction: "upstairs" })),
      them(tell("say", { object: "otp" })),
      you(tell("put", { object: "parcel", direction: "outside" })),
      you(does("pay", { object: "cash", when: "future" })),
    ],
  },
  {
    id: "phone", emoji: "📱", title: "Phone and internet", them: "Phone shop",
    blurb: "No network, recharge, a new SIM, charging.",
    words: ["sim", "network", "wifi", "internet", "battery", "charger", "phone", "aadhaar"],
    lines: [
      you({ shape: "thereIs", object: "network", negative: true }),
      you(does("recharge", { object: "phone", when: "want" })),
      you({ shape: "howMuch", object: "sim" }),
      them(tell("show", { object: "aadhaar" })),
      you(tell("charge", { object: "phone" })),
      you(does("forget", { object: "password", when: "past" })),
    ],
  },
  {
    id: "office", emoji: "💼", title: "Office", them: "Manager",
    blurb: "Running late, the meeting, the email, finishing work.",
    words: ["office", "meeting", "email", "work", "manager", "laptop"],
    lines: [
      you(does("reach", { object: "office", when: "cont" })),
      you(does("send", { object: "email", when: "past" })),
      them(tell("attend", { object: "meeting" })),
      you({ shape: "thereIs", object: "meeting", question: true }),
      you(does("finish", { object: "work", when: "future" })),
      them(tell("call", { object: "manager" })),
    ],
  },
  {
    id: "music", emoji: "🎹", title: "Music class", them: "Teacher",
    blurb: "Practise, play it again, explain the scale.",
    words: ["piano", "guitar", "song", "thissong", "scale", "raga", "taala", "lesson"],
    lines: [
      them(does("practise", { who: "youp", object: "piano", when: "past", question: true, timeWord: true })),
      you(does("practise", { object: "piano", when: "present", timeWord: true })),
      them(tell("play", { object: "thissong", direction: "again" })),
      them(tell("play", { object: "piano", direction: "slowly" })),
      you(tell("speak", { direction: "slowly" })),
      you(tell("explain", { object: "scale", direction: "again" })),
      you(does("perform", { object: "song", when: "future" })),
      them({ shape: "lets", verb: "sing", object: "thissong" }),
    ],
  },
  {
    id: "family", emoji: "🏡", title: "Guests and family", them: "Neighbour",
    blurb: "Come in, sit, coffee, come again.",
    words: ["coffee", "tea", "water", "friend", "neighbour", "child", "mother", "father"],
    lines: [
      you(tell("come", { direction: "inside" })),
      you(tell("sit")),
      you({ shape: "want", who: "youp", object: "coffee", question: true }),
      them({ shape: "want", who: "i", object: "tea" }),
      you({ shape: "like", who: "youp", object: "coffee", question: true }),
      them(tell("pickup", { object: "child", direction: "today" })),
      you(tell("come", { direction: "again" })),
    ],
  },
  {
    id: "kirana", emoji: "🛒", title: "Kirana and groceries", them: "Shopkeeper",
    blurb: "Is there milk, a kilo of rice, a little sugar, pay by UPI.",
    words: ["rice", "oil", "sugar", "milk", "bread", "biscuit", "salt", "dal", "curd", "upi", "change"],
    lines: [
      you({ shape: "thereIs", object: "milk", question: true }),
      them({ shape: "thereIs", object: "bread", negative: true }),
      you({ shape: "request", object: "rice", quant: "onekilo" }),
      you({ shape: "howMuch", object: "oil" }),
      you({ shape: "want", who: "i", object: "sugar", quant: "alittle" }),
      you({ shape: "request", object: "biscuit" }),
      them({ shape: "have", who: "youp", object: "change", question: true }),
      you(does("pay", { object: "bill", when: "future" })),
    ],
  },
  {
    id: "petrol", emoji: "⛽", title: "Petrol bunk", them: "Attendant",
    blurb: "Fill petrol, check the tyres, a puncture, pay.",
    words: ["petrol", "tyre", "puncture", "bike", "scooter", "car", "cash", "upi", "petrolbunk"],
    lines: [
      you({ shape: "whereIs", object: "petrolbunk", the: true }),
      you({ shape: "request", object: "petrol" }),
      them(tell("switchoff", { object: "bike" })),
      you(tell("check", { object: "tyre" })),
      you({ shape: "have", who: "i", object: "puncture" }),
      you({ shape: "howMuch", object: "bill" }),
      you(does("pay", { object: "cash", when: "future" })),
    ],
  },
  {
    id: "school", emoji: "🎒", title: "School and college", them: "Teacher",
    blurb: "Homework, the exam, the fees, the uniform.",
    words: ["school", "college", "class", "exam", "homework", "notebook", "maths", "fees", "uniform"],
    lines: [
      them(does("finish", { who: "youp", object: "homework", when: "past", question: true })),
      you(does("finish", { object: "homework", when: "past" })),
      them(tell("submit", { object: "homework" })),
      you({ shape: "thereIs", object: "exam", question: true }),
      them(tell("bring", { object: "notebook", direction: "tomorrow" })),
      them(tell("wear", { object: "uniform" })),
      you({ shape: "howMuch", object: "fees" }),
      you(does("study", { object: "maths", when: "cont" })),
    ],
  },
  {
    id: "temple", emoji: "🛕", title: "Temple and festivals", them: "Neighbour",
    blurb: "Where is the temple, it is crowded, take the sweet.",
    words: ["temple", "church", "flower", "sweet", "friend", "neighbour"],
    lines: [
      you({ shape: "whereIs", object: "temple", the: true }),
      them({ shape: "lets", verb: "go", object: "temple" }),
      you(does("buy", { object: "flower", when: "want" })),
      them({ shape: "isAdj", subject: "temple", adj: "crowded" }),
      you(does("pray", { when: "present", timeWord: true })),
      them(tell("take", { object: "sweet" })),
      you({ shape: "isAdj", subject: "sweet", adj: "tasty" }),
    ],
  },
  {
    id: "hotel", emoji: "🏨", title: "Hotel stay", them: "Receptionist",
    blurb: "The booking, the room, the Wi-Fi, the AC is broken.",
    words: ["hotel", "room", "key", "wifi", "ac", "hotwater", "bathroom", "idproof", "booking"],
    lines: [
      you(does("book", { object: "room", when: "past" })),
      them(tell("show", { object: "idproof" })),
      you({ shape: "howMuch", object: "room" }),
      you({ shape: "thereIs", object: "wifi", question: true }),
      you({ shape: "request", object: "key" }),
      you({ shape: "isAdj", subject: "ac", adj: "broken" }),
      you({ shape: "thereIs", object: "hotwater", negative: true }),
      you(tell("clean", { object: "room" })),
    ],
  },
  {
    id: "househelp", emoji: "🧹", title: "House help", them: "House help",
    blurb: "Wash, iron, clean the kitchen, the salary.",
    words: ["clothes", "shirt", "kitchen", "bathroom", "vegetables", "milk", "salary", "advance"],
    lines: [
      you(tell("wash", { object: "clothes" })),
      you(tell("iron", { object: "shirt" })),
      you(tell("clean", { object: "kitchen" })),
      you(tell("cook", { object: "rice" })),
      them({ shape: "thereIs", object: "milk", negative: true }),
      you(tell("buy", { object: "vegetables" })),
      them({ shape: "want", who: "i", object: "advance" }),
      you(does("pay", { object: "salary", when: "future" })),
    ],
  },
  {
    id: "cinema", emoji: "🎬", title: "Cinema and going out", them: "Friend",
    blurb: "Let's see a movie, book tickets, was it good.",
    words: ["movie", "cinema", "ticket", "snack", "friend", "film"],
    lines: [
      them({ shape: "lets", verb: "see", object: "movie" }),
      you(does("book", { object: "ticket", when: "past" })),
      you({ shape: "howMuch", object: "ticket" }),
      you({ shape: "whereIs", object: "cinema", the: true }),
      them({ shape: "want", who: "youp", object: "snack", question: true }),
      them({ shape: "isAdj", subject: "movie", adj: "good", question: true }),
      you({ shape: "isAdj", subject: "movie", adj: "good" }),
    ],
  },
  {
    id: "post", emoji: "📮", title: "Post office", them: "Clerk",
    blurb: "Send a parcel, write the address, the receipt.",
    words: ["parcel", "letter", "address", "form", "receipt", "postoffice"],
    lines: [
      you({ shape: "whereIs", object: "postoffice", the: true }),
      you(does("send", { object: "parcel", when: "want" })),
      them(tell("write", { object: "address" })),
      them(tell("fill", { object: "form" })),
      you({ shape: "howMuch", object: "fees" }),
      you(does("collect", { object: "letter", when: "want" })),
      them(tell("show", { object: "receipt" })),
    ],
  },
  {
    id: "power", emoji: "💡", title: "Gas and power", them: "Electrician",
    blurb: "No gas, a power cut, the bulb is gone.",
    words: ["cylinder", "current", "powercut", "bulb", "light", "fan", "electrician"],
    lines: [
      you({ shape: "thereIs", object: "cylinder", negative: true }),
      you(does("book", { object: "cylinder", when: "want" })),
      you({ shape: "thereIs", object: "current", negative: true }),
      you({ shape: "isAdj", subject: "bulb", adj: "broken" }),
      you(tell("call", { object: "electrician" })),
      them(tell("switchon", { object: "light" })),
    ],
  },
  {
    id: "clothes", emoji: "👗", title: "Clothes shop", them: "Shopkeeper",
    blurb: "Show me that, it is too small, can I exchange it.",
    words: ["shirt", "saree", "kurta", "pants", "shoes", "chappal", "clothes"],
    lines: [
      you(tell("show", { object: "saree" })),
      you({ shape: "howMuch", object: "kurta" }),
      you({ shape: "isAdj", subject: "this", adj: "expensive" }),
      you({ shape: "isAdj", subject: "shirt", adj: "small" }),
      you({ shape: "want", who: "i", object: "pants" }),
      you(does("exchange", { object: "shirt", when: "want" })),
      you(does("pay", { object: "bill", when: "future" })),
    ],
  },
];

export function situationById(id: string | null): Situation | null {
  return SITUATIONS.find((s) => s.id === id) ?? null;
}

// Every word and action a situation touches, so the pickers can put them first.
export function situationWords(s: Situation): { objects: string[]; verbs: string[] } {
  const objects = new Set<string>(s.words ?? []);
  const verbs = new Set<string>();
  for (const l of s.lines) {
    if (l.c.object) objects.add(l.c.object);
    if (l.c.subject && l.c.subject !== "this" && l.c.subject !== "that") objects.add(l.c.subject);
    if (l.c.verb) verbs.add(l.c.verb);
  }
  return { objects: [...objects], verbs: [...verbs] };
}
