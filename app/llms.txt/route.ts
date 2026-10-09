import { LANGUAGE_ORDER, LANGUAGES } from "@/lib/languages";
import {
  GENERAL_FAQS,
  MODES,
  SITE_DESCRIPTION,
  SITE_URL,
  course,
  languagePage,
  learnPath,
  scenes,
} from "@/lib/site";

// A plain-text guide for AI answer engines (llmstxt.org), built from the same
// data as the app. No em dashes anywhere.
export const dynamic = "force-static";

export function GET() {
  const lines: string[] = [
    "# Maatu",
    "",
    `> ${SITE_DESCRIPTION}`,
    "",
    "Maatu (the Kannada word for speech) is a web app by Nathaniel School of Music in Bengaluru, India. It is free, needs no account, and runs in any modern browser on a phone or computer. Learners speak out loud with an AI teacher in a live voice call, or type. Every word is shown in plain English letters (romanized), so no script is needed to start.",
    "",
    "## Ways to learn",
    ...MODES.map((m) => `- ${m.title}: ${m.body}`),
    "",
    "## Languages",
    ...LANGUAGE_ORDER.map((code) => {
      const l = LANGUAGES[code];
      return `- [Learn spoken ${l.name}](${SITE_URL}${learnPath(code)}): everyday ${l.city} ${l.name} with ${l.teacher}, the AI teacher. Try saying "${l.phrase}" (${l.meaning})`;
    }),
    "",
    "## Beginner course (the same 16 lessons in every language)",
    ...course().flatMap((u) => [`- ${u.unit}: ${u.lessons.map((l) => l.title).join("; ")}`]),
    "",
    "## Real-life scenes",
    `- ${scenes("kn").map((s) => s.title).join("; ")}`,
    "",
    "## Frequently asked questions",
    ...GENERAL_FAQS.flatMap((f) => [`### ${f.q}`, f.a, ""]),
    ...LANGUAGE_ORDER.flatMap((code) =>
      languagePage(code).faqs.slice(0, 3).flatMap((f) => [`### ${f.q}`, f.a, ""]),
    ),
    "## Links",
    `- [Open the app](${SITE_URL})`,
    `- [About Maatu](${SITE_URL}/about)`,
    `- [All languages](${SITE_URL}/learn)`,
    "- [Nathaniel School of Music](https://www.nathanielschool.com)",
    "",
  ];
  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
