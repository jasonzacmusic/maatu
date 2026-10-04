import type { Lang } from "./maatu-design";

export const LANGUAGE_ORDER: Lang[] = ["ta", "kn", "hi", "fr"];
export const LANGUAGES = {
  ta: { name: "Tamil", city: "Chennai", neighborhood: "Mylapore", teacher: "Kavya", code: "ta-IN", color: "#CD6347", tint: "#FAE1D5", greeting: "Vanakkam", hello: "Hello", phrase: "Konjam tea kudunga.", meaning: "A little tea, please.", imagePosition: "0% 0%", culture: "Chennai spoken Tamil. Natural contractions such as naan poren, saapdren, enna and konjam. Never formal literary Tamil or borrowed Hindi. Preserve long vowels and doubled consonants." },
  kn: { name: "Kannada", city: "Bengaluru", neighborhood: "Basavanagudi", teacher: "Meera", code: "kn-IN", color: "#39705C", tint: "#DDEEE2", greeting: "Namaskara", hello: "Hello", phrase: "Ondu coffee kodi.", meaning: "One coffee, please.", imagePosition: "100% 0%", culture: "Bengaluru spoken Kannada. Everyday forms such as naanu hogtini, swalpa and maadi. Natural local English loanwords. Never stiff literary Kannada or Tamil words." },
  hi: { name: "Hindi", city: "Delhi", neighborhood: "Your neighborhood", teacher: "Anjali", code: "hi-IN", color: "#9C5A31", tint: "#F7E5C9", greeting: "Namaste", hello: "Hello", phrase: "Ek chai dena, please.", meaning: "One tea, please.", imagePosition: "0% 100%", culture: "Delhi spoken Hindi with ordinary Hinglish loanwords. Use aap politely, tum with friends. Respect speaker, noun and verb gender and past ne where appropriate. Never highly Sanskritized or exaggerated slang." },
  fr: { name: "French", city: "Paris", neighborhood: "Le quartier", teacher: "Camille", code: "fr-FR", color: "#6653AA", tint: "#E9E1F7", greeting: "Bonjour", hello: "Hello", phrase: "Un café, s’il vous plaît.", meaning: "A coffee, please.", imagePosition: "100% 100%", culture: "Natural Paris French. Use on for we, near future with aller and naturally dropped ne in casual conversation. Tu with friends, vous with strangers. Teach real liaison, nasal vowels, rounded u and the French r without caricature." },
} as const;

export function isLang(value: unknown): value is Lang {
  return typeof value === "string" && LANGUAGE_ORDER.includes(value as Lang);
}
