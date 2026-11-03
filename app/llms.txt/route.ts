import { ALL_LESSONS, LANG_NAME } from "@/lib/curriculum";
import { HOST, LABELS, SCENARIO_ORDER } from "@/lib/maatu-design";
import { FRENCH, GENERAL_FAQS, LANGS, MODES, SITE_DESCRIPTION, SITE_URL, course, languagePage, learnPath, scenes } from "@/lib/site";

// A plain-text guide for AI answer engines (llmstxt.org), built from the same
// data as the app. No em dashes anywhere.
export const dynamic = "force-static";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function GET() {
  const lines: string[] = [
    "# Maatu",
    "",
    `> ${SITE_DESCRIPTION}`,
    "",
    "Maatu (the Kannada word for speech) is a web app by Nathaniel School of Music in Bengaluru, India. It needs no account and runs in any modern browser on a phone or computer. Learners speak out loud with an AI teacher in a live voice call. Every word is shown in plain English letters (romanized), so no script is needed to start.",
    "",
    "## Ways to learn",
    ...MODES.map((m) => `- ${m.title}: ${m.body}`),
    "",
    "## Languages",
    ...LANGS.map((code) => {
      const page = languagePage(code);
      return `- [Learn spoken ${LANG_NAME[code]}](${SITE_URL}${learnPath(code)}): everyday ${page.city} ${LANG_NAME[code]} with ${HOST[code].name}, the AI teacher. ${scenes(code).length} real-life scenes and a ${ALL_LESSONS.length}-lesson beginner course.`;
    }),
    `- French: a chat with ${FRENCH.teacher}, the AI teacher, in Paris French. French has no course or scenes yet.`,
    "",
    `## Beginner course (the same ${ALL_LESSONS.length} lessons in each of the four Indian languages)`,
    ...course().map((u) => `- ${u.unit}: ${u.lessons.map((l) => l.title).join("; ")}`),
    "",
    "## Real-life scenes",
    `- ${SCENARIO_ORDER.map((id) => cap(LABELS[id].toLowerCase())).join("; ")}`,
    "",
    "## Frequently asked questions",
    ...GENERAL_FAQS.flatMap((f) => [`### ${f.q}`, f.a, ""]),
    ...LANGS.flatMap((code) => languagePage(code).faqs.slice(0, 3).flatMap((f) => [`### ${f.q}`, f.a, ""])),
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
