// Maatu design system: "Night Bazaar". Ported from Claude Design D1/D2/D3.
// Single source of palette, fonts, and street dressing. No em dashes anywhere.

export const C = {
  night: "#0C101D",
  tar: "#161B2B",
  milk: "#F2EDE2",
  sodium: "#FFB35C",
  kumkum: "#E8503A",
  tube: "#BFEFDB",
  muted: "#7E89A8",
} as const;

export const DISPLAY = "'Anek Latin', sans-serif";
export const BODY = "'Instrument Sans', sans-serif";
export const KN = "'Baloo Tamma 2', 'Anek Kannada', sans-serif";

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
    shopFont: "'Baloo Tamma 2','Anek Kannada',sans-serif",
    busFont: "'Anek Kannada',sans-serif",
    s: {
      auto: "ಆಟೋ",
      chai: "ಚಹಾ",
      gate: "ಗೇಟ್",
      phone: "ಫೋನ್",
      music: "ಸಂಗೀತ",
      airport: "ವಿಮಾನ ನಿಲ್ದಾಣ",
      salon: "ಸಲೂನ್",
      market: "ಮಾರ್ಕೆಟ್",
      soon: "soon",
    },
  },
  hi: {
    city: "Purani Sadak, Dilli",
    sky1: "#120D1D",
    sky2: "#261B33",
    bulb: "#FFB98A",
    glow: "#FF9E6B",
    shopFont: "'Anek Devanagari',sans-serif",
    busFont: "'Anek Devanagari',sans-serif",
    s: {
      auto: "ऑटो",
      chai: "चाय",
      gate: "गेट",
      phone: "फ़ोन",
      music: "संगीत",
      airport: "हवाई अड्डा",
      salon: "सैलून",
      market: "मार्केट",
      soon: "soon",
    },
  },
  ta: {
    city: "Mylapore, Chennai",
    sky1: "#081218",
    sky2: "#15292F",
    bulb: "#FFD189",
    glow: "#FFC46B",
    shopFont: "'Anek Tamil',sans-serif",
    busFont: "'Anek Tamil',sans-serif",
    s: {
      auto: "ஆட்டோ",
      chai: "டீ",
      gate: "கேட்",
      phone: "ஃபோன்",
      music: "இசை",
      airport: "விமானம்",
      salon: "சலூன்",
      market: "மார்க்கெட்",
      soon: "soon",
    },
  },
};

export const LANG_PERSONA_PREFIX: Record<Lang, string> = {
  kn: "kn",
  hi: "hi",
  ta: "ta",
};
