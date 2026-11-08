import { ALL_LESSONS, LANG_NAME, UNITS } from "./curriculum";
import { HOST, SCENARIO_ORDER, SCENARIO_TAGLINE, type Lang, type ShopId } from "./maatu-design";
import { PERSONAS, personaId } from "./personas.generated";

// Everything the public pages, structured data, sitemap and llms.txt say about
// Maatu. Counts and names are read from the same lessons, characters and
// teachers the app uses, so the public description cannot drift from the
// product. No em dashes anywhere.

export const SITE_URL = "https://maatu.nathanielschool.com";
export const SITE_NAME = "Maatu";
export const SITE_TITLE = "Maatu: speak Kannada, Hindi, Tamil, Malayalam and Telugu by talking";
export const SITE_DESCRIPTION =
  "Maatu is a speaking practice app for everyday Kannada, Hindi, Tamil, Malayalam and Telugu, with a French chat too. Talk out loud with a friendly AI teacher, act out real-life scenes, build your own sentences and follow a beginner course. No account needed.";
export const SCHOOL = {
  name: "Nathaniel School of Music",
  url: "https://www.nathanielschool.com",
  sameAs: ["https://www.youtube.com/@nathanielmusicschool", "https://www.instagram.com/nathanielschool/"],
};

/** The four languages with a course, scenes and a teacher, in app order. */
export const LANGS: Lang[] = ["kn", "hi", "ta", "ml", "te"];

export const SLUGS: Record<Lang, string> = { kn: "kannada", hi: "hindi", ta: "tamil", ml: "malayalam", te: "telugu" };
export function langFromSlug(slug: string): Lang | null {
  return LANGS.find((code) => SLUGS[code] === slug) ?? null;
}
export function learnPath(lang: Lang) {
  return `/learn/${SLUGS[lang]}`;
}

export const FRENCH = { name: "French", city: "Paris", teacher: "Camille" } as const;

const CITY: Record<Lang, string> = { kn: "Bengaluru", hi: "Delhi", ta: "Chennai", ml: "Kochi", te: "Hyderabad" };
const COLOR: Record<Lang, string> = { kn: "#6FD0A8", hi: "#FFB35C", ta: "#FF8B6B", ml: "#7FC4EE", te: "#F29BD0" };
const SCRIPT: Record<Lang, string> = { kn: "Kannada script", hi: "Devanagari", ta: "Tamil script", ml: "Malayalam script", te: "Telugu script" };
const STYLE: Record<Lang, string> = {
  kn: "the Kannada people speak in Bengaluru, in everyday colloquial forms rather than stiff textbook Kannada",
  hi: "the Hindi people speak in Delhi, with the ordinary Hinglish of daily life rather than heavily Sanskritized Hindi",
  ta: "the Tamil people speak in Chennai, in colloquial spoken forms rather than formal literary Tamil",
  ml: "the Malayalam people speak in Kochi, in colloquial spoken forms rather than formal literary Malayalam",
  te: "the Telugu people speak in Hyderabad, in everyday colloquial forms with the English words people really use, rather than bookish Telugu",
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Words for week one, read from the vetted lesson lexicon.
const FIRST_WORDS = ["hello", "how are you", "I am fine", "thank you", "I did not understand", "speak slowly", "too much", "stop here"];
function lexiconForm(lang: Lang, english: string): string | null {
  for (const lesson of ALL_LESSONS) {
    for (const entry of lesson.lexicon[lang] ?? []) {
      if (!entry.startsWith(`${english} = `)) continue;
      const form = entry
        .slice(english.length + 3)
        .replace(/\s*\(.*\)\s*$/, "")
        .split(",")[0]
        .trim();
      if (form) return form;
    }
  }
  return null;
}

export type Phrase = { say: string; meaning: string };
export function firstWords(lang: Lang): Phrase[] {
  const out: Phrase[] = [];
  for (const english of FIRST_WORDS) {
    const form = lexiconForm(lang, english);
    if (form) out.push({ say: cap(form), meaning: cap(english) });
  }
  return out;
}

export type HelloChat = { teacher: string; reply: string; replyMeaning: string };
/** A first exchange, built from the vetted words of lesson 1. */
export function helloChat(lang: Lang): HelloChat {
  const hello = cap(lexiconForm(lang, "hello") ?? "");
  const how = cap(lexiconForm(lang, "how are you") ?? "");
  const fine = cap(lexiconForm(lang, "I am fine") ?? "");
  return { teacher: `${hello}! ${how}?`, reply: `${fine}.`, replyMeaning: "I am fine." };
}

export type SceneInfo = { id: ShopId; place: string; partner: string; goal: string };
export function scenes(lang: Lang): SceneInfo[] {
  return SCENARIO_ORDER.flatMap((id) => {
    const pid = personaId(id, lang);
    const persona = pid ? PERSONAS[pid] : null;
    if (!persona) return [];
    return [{ id, place: persona.sceneLabel, partner: persona.name, goal: SCENARIO_TAGLINE[id] }];
  });
}

export function course() {
  return UNITS.map((u) => ({
    unit: u.unit,
    lessons: u.lessons.map((l) => ({ id: l.id, title: l.title, objective: l.objective })),
  }));
}

export type Faq = { q: string; a: string };

export type LanguagePage = {
  lang: Lang;
  slug: string;
  name: string;
  city: string;
  teacher: string;
  place: string;
  color: string;
  title: string;
  description: string;
  intro: string;
  faqs: Faq[];
};

export function languagePage(lang: Lang): LanguagePage {
  const name = LANG_NAME[lang];
  const teacher = HOST[lang].name;
  const city = CITY[lang];
  const sceneCount = scenes(lang).length;
  const lessonCount = ALL_LESSONS.length;
  const faqs: Faq[] = [
    {
      q: `Can I learn spoken ${name} online with Maatu?`,
      a: `Yes. Maatu runs in your web browser with no account and no sign-up. You can chat with ${teacher}, your AI ${name} teacher, build your own sentences, act out ${sceneCount} real-life scenes and follow a ${lessonCount}-lesson beginner course.`,
    },
    {
      q: `Do I need to read ${SCRIPT[lang]} to learn ${name} on Maatu?`,
      a: `No. Maatu shows every ${name} word in plain English letters, so you can start speaking before you learn to read ${SCRIPT[lang]}.`,
    },
    {
      q: `Which kind of ${name} does Maatu teach?`,
      a: `Everyday spoken ${name} as ${STYLE[lang]}.`,
    },
    {
      q: "I am a complete beginner. Where do I start?",
      a: `Open the Course tab. Lesson 1 teaches greetings and courtesies out loud with ${teacher}, one phrase at a time. When you know a little, go to the Talk tab and chat with ${teacher} about anything.`,
    },
    {
      q: "What if I do not know what to say?",
      a: `Ask in English. ${teacher} will help you with the words to say, and you can ask for slower speech at any time.`,
    },
    {
      q: `Can I practise ${name} for real situations?`,
      a: `Yes. Act it out puts you in ${sceneCount} everyday situations in ${city}, such as an auto ride, a vegetable market, a clinic or a call to customer care. Each character talks to you in ${name} and stays in role.`,
    },
    {
      q: "Does Maatu work on my phone?",
      a: "Yes. Maatu runs in your phone's browser and you can add it to your home screen like an app. Voice calls need your microphone.",
    },
  ];
  return {
    lang,
    slug: SLUGS[lang],
    name,
    city,
    teacher,
    place: HOST[lang].place,
    color: COLOR[lang],
    title: `Learn to speak ${name} online`,
    description: `Learn spoken ${name} by talking out loud with ${teacher}, a friendly AI teacher. Everyday ${city} ${name} in plain English letters, ${sceneCount} real-life scenes, a sentence builder and a ${lessonCount}-lesson beginner course. No account needed.`,
    intro: `Practise everyday ${city} ${name} out loud with ${teacher}, your AI teacher. Chat about anything, build your own sentences, or act out a real situation, one phrase at a time.`,
    faqs,
  };
}

export const GENERAL_FAQS: Faq[] = [
  {
    q: "What is Maatu?",
    a: "Maatu is an app for practising spoken Kannada, Hindi, Tamil, Malayalam and Telugu, with a French chat as well. You talk out loud with a friendly AI teacher, build your own sentences and act out real-life scenes such as an auto ride or a visit to the clinic.",
  },
  {
    q: "What does the word maatu mean?",
    a: "Maatu is the Kannada word for speech, or talk. The app is built around one idea: you learn a language by speaking it.",
  },
  {
    q: "Which languages can I practise?",
    a: `Kannada (Bengaluru), Hindi (Delhi), Tamil (Chennai) and Malayalam (Kochi) each have a teacher, ${scenes("kn").length} real-life scenes and a ${ALL_LESSONS.length}-lesson beginner course. French (Paris) is a chat with ${FRENCH.teacher}.`,
  },
  {
    q: "Do I need an account?",
    a: "No. There is no account, email or password to set up.",
  },
  {
    q: "Do I need to read the script?",
    a: "No. Maatu shows every word in plain English letters, so you can speak Kannada, Hindi, Tamil, Malayalam and Telugu before you learn to read them.",
  },
  {
    q: "How is Maatu different from other language apps?",
    a: "Most apps have you tap and type. Maatu has you speak. The phrases are the ones people really use in Bengaluru, Delhi, Chennai and Kochi, and the teacher answers in a live voice conversation.",
  },
  {
    q: "Who made Maatu?",
    a: "Maatu is made by Nathaniel School of Music in Bengaluru, India, led by Jason Zac.",
  },
];

export const MODES = [
  {
    id: "chat",
    title: "Chat",
    body: "Talk with your teacher about anything: your day, a film, how to order coffee. Ask in English whenever you are stuck.",
  },
  {
    id: "build",
    title: "Build",
    body: "Build any sentence yourself from who, action, what and when, see how it is put together, and flip the tense or the person.",
  },
  {
    id: "act",
    title: "Act it out",
    body: `Step into an auto, a vegetable market, a clinic or a customer care call and talk your way through it with a local character who stays in role. There are ${SCENARIO_ORDER.length} situations in each language.`,
  },
  {
    id: "course",
    title: "Beginner course",
    body: `${ALL_LESSONS.length} short spoken lessons, from greetings and numbers to the past and future tenses and getting around town.`,
  },
] as const;

const SHARE_IMAGE = {
  url: "/opengraph-image.png",
  width: 1200,
  height: 630,
  alt: "Maatu: a little conversation, a whole new language.",
};
/** Page-level Open Graph and Twitter tags that keep the site name and a share image. */
export function shareTags(page: {
  title: string;
  description: string;
  path: string;
  image?: { url: string; width: number; height: number; alt: string };
}) {
  const images = [page.image ?? SHARE_IMAGE];
  return {
    openGraph: {
      type: "website" as const,
      siteName: SITE_NAME,
      locale: "en_IN",
      title: page.title,
      description: page.description,
      url: page.path,
      images,
    },
    twitter: {
      card: "summary_large_image" as const,
      title: page.title,
      description: page.description,
      images,
    },
  };
}
