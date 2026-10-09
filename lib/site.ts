import { LANGUAGES, LANGUAGE_ORDER } from "./languages";
import { ALL_LESSONS, UNITS } from "./curriculum";
import { PERSONAS, personaId } from "./personas.generated";
import { SCENARIO_ORDER, type Lang, type ShopId } from "./maatu-design";
import { SCENE_NAMES, SCENE_TASKS } from "./scenes";

// Everything the public pages, structured data and llms.txt say about Maatu.
// Built from the same lessons, scenes and characters the app uses, so the
// public description can never drift from the product. No em dashes anywhere.

export const SITE_URL = "https://maatu.nathanielschool.com";
export const SITE_NAME = "Maatu";
export const SITE_TITLE = "Maatu: speak Tamil, Kannada, Hindi and French by talking";
export const SITE_DESCRIPTION =
  "Maatu is a free speaking practice app for everyday Tamil, Kannada, Hindi and French. Talk out loud with a friendly AI teacher, rehearse real-life scenes and build your own sentences. No account needed.";
export const SCHOOL = {
  name: "Nathaniel School of Music",
  url: "https://www.nathanielschool.com",
  sameAs: [
    "https://www.youtube.com/@nathanielmusicschool",
    "https://www.instagram.com/nathanielschool/",
  ],
};

export const SLUGS: Record<Lang, string> = {
  ta: "tamil",
  kn: "kannada",
  hi: "hindi",
  fr: "french",
};
export function langFromSlug(slug: string): Lang | null {
  const hit = LANGUAGE_ORDER.find((code) => SLUGS[code] === slug);
  return hit ?? null;
}
export function learnPath(lang: Lang) {
  return `/learn/${SLUGS[lang]}`;
}
/** Opens the studio in this language (and optionally a mode). */
export function studioPath(lang: Lang, mode?: "scenes" | "build" | "course") {
  return `/?lang=${lang}${mode ? `&mode=${mode}` : ""}`;
}

const REGION: Record<Lang, string> = {
  ta: "Chennai Tamil",
  kn: "Bengaluru Kannada",
  hi: "Delhi Hindi",
  fr: "Paris French",
};
const SCRIPT: Record<Lang, string | null> = {
  ta: "Tamil script",
  kn: "Kannada script",
  hi: "Devanagari",
  fr: null,
};
const STYLE: Record<Lang, string> = {
  ta: "the Tamil people speak at a tea stall in Mylapore, with natural contractions like naan poren and konjam, never formal literary Tamil",
  kn: "the Kannada people speak in Basavanagudi, with everyday forms like swalpa and maadi and the English words locals really use, never stiff textbook Kannada",
  hi: "the Hindi people speak in Delhi, with ordinary Hinglish, aap for strangers and tum for friends, never heavy Sanskritized Hindi",
  fr: "the French people speak in a Paris café, with on for we and the casually dropped ne, tu for friends and vous for strangers",
};

// Words to say in week one, taken from the vetted lesson lexicon.
const FIRST_WORDS: Record<Lang, string[]> = {
  ta: ["hello", "how are you", "I am fine", "thank you", "I did not understand", "speak slowly", "too much", "stop here"],
  kn: ["hello", "how are you", "I am fine", "thank you", "I did not understand", "speak slowly", "too much", "stop here"],
  hi: ["hello", "how are you", "I am fine", "thank you", "I did not understand", "speak slowly", "too much", "stop here"],
  fr: ["hello", "how are you", "I am fine", "thank you", "I did not understand", "speak slowly please", "can you say it again", "go straight"],
};
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
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export type Phrase = { say: string; meaning: string };
export function firstWords(lang: Lang): Phrase[] {
  const out: Phrase[] = [];
  for (const english of FIRST_WORDS[lang]) {
    const form = lexiconForm(lang, english);
    if (form) out.push({ say: cap(form), meaning: cap(english) });
  }
  const l = LANGUAGES[lang];
  out.push({ say: l.phrase, meaning: l.meaning });
  return out;
}

export type SceneInfo = { id: ShopId; title: string; partner: string; goals: string[] };
export function scenes(lang: Lang): SceneInfo[] {
  return SCENARIO_ORDER.flatMap((id) => {
    const pid = personaId(id, lang);
    const persona = pid ? PERSONAS[pid] : null;
    if (!persona) return [];
    return [{ id, title: SCENE_NAMES[id], partner: persona.name, goals: SCENE_TASKS[id] ?? [] }];
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
  color: string;
  tint: string;
  greeting: string;
  title: string;
  description: string;
  intro: string;
  style: string;
  faqs: Faq[];
};

export function languagePage(lang: Lang): LanguagePage {
  const l = LANGUAGES[lang];
  const script = SCRIPT[lang];
  const sceneCount = scenes(lang).length;
  const lessonCount = ALL_LESSONS.length;
  const faqs: Faq[] = [
    {
      q: `Can I learn spoken ${l.name} online for free?`,
      a: `Yes. Maatu is free to use in your web browser, with no account and no sign-up. You can talk with ${l.teacher}, your AI ${l.name} teacher, practise ${sceneCount} real-life scenes and follow a ${lessonCount}-lesson beginner course.`,
    },
    script
      ? {
          q: `Do I need to read ${script} to learn ${l.name} on Maatu?`,
          a: `No. Maatu shows every ${l.name} word in plain English letters, so you can start speaking before you learn to read ${script}. You learn by listening and talking, the way children learn to speak.`,
        }
      : {
          q: "Do I need to know any French grammar first?",
          a: "No. You start with greetings and short everyday phrases, and grammar comes in naturally as you talk. The sentence lab shows how a French sentence is put together when you are curious.",
        },
    {
      q: `Which kind of ${l.name} does Maatu teach?`,
      a: `Everyday spoken ${REGION[lang]}: ${STYLE[lang]}.`,
    },
    {
      q: `I am a complete beginner. Where do I start?`,
      a: `Open Your first words. Lesson 1 teaches hello, how are you, please and thank you out loud, one phrase at a time, and takes about ten minutes. When you know a little, switch to Just talk and chat with ${l.teacher} about anything.`,
    },
    {
      q: "What if I do not know what to say?",
      a: `Ask in English. ${l.teacher} gives you the meaning in English first, then the words to say. At any time you can say wait, slow down, say that again, what does that mean or go back. You can also type instead of speaking.`,
    },
    {
      q: "Will the teacher correct my mistakes?",
      a: `Gently. ${l.teacher} answers naturally and slips the right way of saying it into the reply, so you hear it without being drilled. A close try counts. In real-life scenes the characters stay in the scene, and a coach gives you a few notes after the call.`,
    },
    {
      q: `Can I practise ${l.name} for real situations?`,
      a: `Yes. Real-life scenes let you rehearse ${sceneCount} everyday situations in ${l.city}, from taking an auto or a cab to buying vegetables, visiting a clinic or calling customer care. Each character talks to you in ${l.name}, just like the real thing.`,
    },
    {
      q: "Does Maatu work on my phone?",
      a: "Yes. Maatu runs in your phone's browser and you can add it to your home screen like an app. Voice calls need your microphone; if the microphone is not available you can keep going by typing.",
    },
  ];
  return {
    lang,
    slug: SLUGS[lang],
    name: l.name,
    city: l.city,
    teacher: l.teacher,
    color: l.color,
    tint: l.tint,
    greeting: l.greeting,
    title: `Learn to speak ${l.name} online, free`,
    description: `Learn spoken ${l.name} by talking out loud with ${l.teacher}, a friendly AI teacher. Everyday ${REGION[lang]} in plain English letters, ${sceneCount} real-life scenes and a ${lessonCount}-lesson beginner course. Free, no account needed.`,
    intro: `Practise everyday ${REGION[lang]} out loud with ${l.teacher}, your AI teacher. Say ${l.greeting.toLowerCase()}, order at a café, take a ride across town and talk your way through real life, one phrase at a time.`,
    style: STYLE[lang],
    faqs,
  };
}

export const GENERAL_FAQS: Faq[] = [
  {
    q: "What is Maatu?",
    a: "Maatu is a free app for practising spoken Tamil, Kannada, Hindi and French. You talk out loud with a friendly AI teacher, rehearse real-life scenes like an auto ride or a doctor's visit, and build your own sentences in a playful sentence lab.",
  },
  {
    q: "What does the word maatu mean?",
    a: "Maatu is the Kannada word for speech, or talk. The app is built around one idea: you learn a language by speaking it.",
  },
  {
    q: "Is Maatu free?",
    a: "Yes. Maatu is free to use in any modern web browser. There is no account, no email and no password.",
  },
  {
    q: "Which languages can I practise?",
    a: "Tamil (Chennai), Kannada (Bengaluru), Hindi (Delhi) and French (Paris). The Say it in other languages feature also shows a sentence in Malayalam and Telugu.",
  },
  {
    q: "Do I need to read the script?",
    a: "No. Maatu shows every word in plain English letters, so you can speak Tamil, Kannada and Hindi before you learn to read them.",
  },
  {
    q: "How is Maatu different from other language apps?",
    a: "Most apps have you tap and type. Maatu has you speak. Every mode ends with you saying something out loud, the phrases are the ones people really use in Chennai, Bengaluru, Delhi and Paris, and the teacher answers in a live voice conversation.",
  },
  {
    q: "What happens to my conversations?",
    a: "Your conversation history is saved in your own browser so you can pick up where you left off. You can download any conversation, and clearing your browser data removes them. Voice calls are processed by speech and AI services to run the conversation, and an anonymous practice report is kept so your coach can give you notes. There is no account and no personal profile.",
  },
  {
    q: "Who made Maatu?",
    a: "Maatu is made by Nathaniel School of Music in Bengaluru, India, led by Jason Zac.",
  },
];

export const MODES = [
  {
    id: "talk",
    title: "Just talk",
    body: "Chat with your teacher about anything: your day, a film, the best way to order coffee. Speak or type. Ask in English whenever you are stuck.",
  },
  {
    id: "scenes",
    title: "Real-life scenes",
    body: "Step into an auto, a vegetable market, a clinic or a cab pickup, and talk your way through it with a local character. Pick a situation or just start.",
  },
  {
    id: "build",
    title: "Sentence lab",
    body: "Snap together who, action, what and when, and see how the sentence is built. Hear it spoken, change the tense or the person, and say it yourself.",
  },
  {
    id: "course",
    title: "Your first words",
    body: "A gentle beginner course of short spoken lessons, from hello and thank you to numbers, food, tenses and getting around town.",
  },
] as const;

export type HelloChat = { teacher: string; reply: string; replyMeaning: string };
/** A first exchange in the language, built from lesson 1's vetted words. */
export function helloChat(lang: Lang): HelloChat {
  const hello = cap(lexiconForm(lang, "hello") ?? LANGUAGES[lang].greeting);
  const how = lexiconForm(lang, "how are you") ?? "";
  const fine = cap(lexiconForm(lang, "I am fine") ?? "");
  // French sets a narrow space before ! and ?.
  const mark = (p: string) => (lang === "fr" ? ` ${p}` : p);
  return {
    teacher: `${hello}${mark("!")} ${cap(how)}${mark("?")}`,
    reply: `${fine}.`,
    replyMeaning: "I am fine.",
  };
}

const SHARE_IMAGE = {
  url: "/opengraph-image.png",
  width: 1200,
  height: 630,
  alt: "Maatu: a little conversation, a whole new language.",
};
/** Page-level Open Graph that keeps the site name, type and a share image. */
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
