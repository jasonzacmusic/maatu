// Maatu design system: "Night Bazaar", elevated (Claude Design redesign 2026-07).
// Single source of palette, fonts, and scenario dressing. The bazaar is carried
// through light and warmth, not literal scenery. No em dashes anywhere.

export const C = {
  night: "#0A0D16", // app canvas
  base: "#0C101D", // base surface behind cards
  tar: "#161B2B", // card / surface
  elevated: "#1E2438", // elevated surface, disabled
  milk: "#F2EDE2", // primary text
  muted: "#9AA4C0", // secondary text
  faint: "#59637F", // tertiary / disabled text
  mono: "#7E89A8", // mono labels
  sodium: "#FFB35C", // warm accent, primary CTA (dark text on fill)
  kumkum: "#E8503A", // record / end-call / danger (milk text on fill)
  tube: "#BFEFDB", // success / correct / caption highlight
  ink: "#0A0D16", // text on sodium fill
  onKumkum: "#FFF7F0", // text on kumkum fill
} as const;

// Common translucent lines and fills, so screens stay consistent.
export const LINE = "rgba(242,237,226,0.10)";
export const LINE_SOFT = "rgba(242,237,226,0.07)";

export const DISPLAY = "var(--font-newsreader), Georgia, serif";
export const BODY = "var(--font-hanken), system-ui, sans-serif";
export const MONO = "var(--font-jetbrains), ui-monospace, monospace";

export type Lang = "kn" | "hi" | "ta";
export type ShopId =
  | "auto"
  | "chai"
  | "gate"
  | "phone"
  | "music"
  | "airport"
  | "salon"
  | "market";

// The five launch scenarios plus Teach Mode are all live across the three
// languages. Salon and market stay shuttered. Routing to a real persona is
// decided by personaId() in lib/personas.generated.ts.
export const LIVE: Record<ShopId, boolean> = {
  auto: true,
  chai: true,
  gate: true,
  phone: true,
  music: true,
  airport: true,
  salon: false,
  market: false,
};

export const LABELS: Record<ShopId, string> = {
  auto: "AUTO STAND",
  chai: "CHAI",
  gate: "DELIVERY GATE",
  phone: "CUSTOMER CARE",
  music: "MUSIC SCHOOL",
  airport: "AIRPORT",
  salon: "SALON",
  market: "MARKET",
};

// Camera targets for the zoom into each shop (scene coordinates, viewBox 390x780).
export const STREET_CAM: Record<string, { x: number; y: number; s: number }> = {
  auto: { x: 84, y: 560, s: 2.5 },
  chai: { x: 307, y: 560, s: 2.5 },
  phone: { x: 80, y: 380, s: 2.8 },
  gate: { x: 312, y: 380, s: 2.8 },
  music: { x: 317, y: 250, s: 3.2 },
  airport: { x: 195, y: 165, s: 3.6 },
};

export const SLOW: Record<Lang, string> = {
  kn: "Nidhaanavaagi",
  hi: "Dheere dheere",
  ta: "Medhuvaa",
};

// Language dressing for the street: signage strings, fonts, sky tint, bulb warmth.
export const STREET_LANG: Record<
  Lang,
  {
    city: string;
    sky1: string;
    sky2: string;
    bulb: string;
    glow: string;
    shopFont: string;
    busFont: string;
    s: Record<string, string>;
  }
> = {
  kn: {
    city: "Gandhi Bazaar, Bengaluru",
    sky1: "#0A0E1B",
    sky2: "#1B2138",
    bulb: "#FFC97E",
    glow: "#FFB35C",
    shopFont: BODY,
    busFont: BODY,
    s: {
      auto: "Aato",
      chai: "Chaha",
      gate: "Gate",
      phone: "Phone",
      music: "Sangeeta",
      airport: "Vimaana Nildaana",
      salon: "Saloon",
      market: "Maarukatte",
      soon: "soon",
    },
  },
  hi: {
    city: "Purani Sadak, Dilli",
    sky1: "#120D1D",
    sky2: "#261B33",
    bulb: "#FFB98A",
    glow: "#FF9E6B",
    shopFont: BODY,
    busFont: BODY,
    s: {
      auto: "Auto",
      chai: "Chai",
      gate: "Gate",
      phone: "Phone",
      music: "Sangeet",
      airport: "Hawai Adda",
      salon: "Salon",
      market: "Bazaar",
      soon: "soon",
    },
  },
  ta: {
    city: "Mylapore, Chennai",
    sky1: "#081218",
    sky2: "#15292F",
    bulb: "#FFD189",
    glow: "#FFC46B",
    shopFont: BODY,
    busFont: BODY,
    s: {
      auto: "Aatto",
      chai: "Tea",
      gate: "Gate",
      phone: "Phone",
      music: "Isai",
      airport: "Vimaanam",
      salon: "Saloon",
      market: "Sandhai",
      soon: "soon",
    },
  },
};

export const LANG_PERSONA_PREFIX: Record<Lang, string> = {
  kn: "kn",
  hi: "hi",
  ta: "ta",
};

// Hub / scenario-card dressing. Order is the display order of the grid; each
// card reads its name, scene label and level from the generated persona meta.
export const SCENARIO_ORDER: ShopId[] = ["auto", "chai", "gate", "phone", "airport", "music"];

export const SCENARIO_TAGLINE: Record<ShopId, string> = {
  auto: "Haggle the fare",
  chai: "Pure small talk",
  gate: "Find the flat",
  phone: "Sort out the plan",
  airport: "Check in and board",
  music: "Teach a curious kid",
  salon: "A trim and a chat",
  market: "Buy the vegetables",
};

// A one-line brief for the pre-call screen, second person, warm.
export const SCENARIO_BRIEF: Record<ShopId, string> = {
  auto: "It is evening and you need a ride. The driver quotes a high fare. Greet him, name your stop, and haggle to a fair price. He stays in character and will not correct you.",
  chai: "You are both at the tea stall with a warm glass. No task tonight, just easy talk about the day, the weather, cricket. He keeps the chat alive and encourages you.",
  gate: "The delivery rider is at the gate and cannot find your flat. Confirm the order, then guide him in: block, floor, a landmark. He is polite but in a mild hurry.",
  phone: "You are calling broadband customer care for a new connection. Verify who you are, hear two plans, and book an installation slot. Formal, patient, number heavy.",
  airport: "You reach the airline check-in counter. Hand over ticket and ID, sort one baggage wrinkle, pick a seat, and follow what to do at the gate. Keep it moving.",
  music: "A curious child at their first class. You are the teacher. Explain a simple idea, answer their why, and gently fix them when they use a word wrong.",
  salon: "A relaxed trim and an easy chat while you wait. Small talk, no pressure.",
  market: "Buy a few vegetables and settle a price at the market stall.",
};

export const DIFFICULTY: Record<ShopId, string> = {
  auto: "Beginner",
  chai: "Beginner",
  gate: "Easy",
  phone: "Intermediate",
  airport: "Intermediate",
  music: "Teach mode",
  salon: "Beginner",
  market: "Beginner",
};

// The three teacher hosts, so onboarding and the hub can name them.
export const HOST: Record<Lang, { name: string; place: string }> = {
  kn: { name: "Meera", place: "Gandhi Bazaar, Bengaluru" },
  hi: { name: "Anjali", place: "Purani Sadak, Delhi" },
  ta: { name: "Kavya", place: "Mylapore, Chennai" },
};
