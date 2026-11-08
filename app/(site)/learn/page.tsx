import type { Metadata } from "next";
import Link from "next/link";
import { ALL_LESSONS, LANG_NAME } from "@/lib/curriculum";
import { HOST } from "@/lib/maatu-design";
import { FRENCH, LANGS, MODES, helloChat, languagePage, learnPath, scenes, shareTags } from "@/lib/site";
import { learnIndexGraph } from "@/lib/structured-data";
import { JsonLd } from "../../components/JsonLd";

const DESCRIPTION =
  "Pick a language and start speaking: everyday Kannada, Hindi, Tamil, Malayalam or Telugu, out loud, with a friendly AI teacher. Chat, build sentences, act out real-life scenes and follow a beginner course.";

export const metadata: Metadata = {
  title: "Learn Kannada, Hindi, Tamil, Malayalam or Telugu by speaking",
  description: DESCRIPTION,
  alternates: { canonical: "/learn" },
  ...shareTags({ title: "Learn Kannada, Hindi, Tamil, Malayalam or Telugu by speaking | Maatu", description: DESCRIPTION, path: "/learn" }),
};

const ACCENT: Record<string, string> = { kn: "#6FD0A8", hi: "#FFB35C", ta: "#FF8B6B", ml: "#7FC4EE", te: "#F29BD0" };

export default function LearnIndex() {
  return (
    <article className="site-page">
      <JsonLd data={learnIndexGraph()} />
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">Maatu</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Learn</span>
      </nav>
      <header>
        <h1>
          Pick a language. <em>Start speaking.</em>
        </h1>
        <p className="lede">
          Maatu teaches the language people actually speak, out loud, from your very first minute. Every word is written in plain English letters, so you
          can talk before you can read.
        </p>
      </header>
      <ul className="lang-cards">
        {LANGS.map((code) => {
          const page = languagePage(code);
          const chat = helloChat(code);
          return (
            <li key={code}>
              <Link href={learnPath(code)} className="lang-card" style={{ "--lang": ACCENT[code] } as React.CSSProperties}>
                <span className="eyebrow">
                  <span className="lang-dot" />
                  {page.city}
                </span>
                <h2>Spoken {LANG_NAME[code]}</h2>
                <p className="lang-card-line">{chat.teacher}</p>
                <p>
                  Talk with {HOST[code].name}, {scenes(code).length} real-life scenes, {ALL_LESSONS.length} beginner lessons.
                </p>
                <span className="mode-go">Learn {LANG_NAME[code]} &rarr;</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="section-lede">
        Want French? Open Maatu and chat with {FRENCH.teacher} in everyday {FRENCH.city} French. French is a chat only for now, with no course or scenes yet.
      </p>
      <section className="site-section">
        <h2>How Maatu works</h2>
        <ul className="mode-grid">
          {MODES.map((m) => (
            <li key={m.id} className="mode-card">
              <h3>{m.title}</h3>
              <p>{m.body}</p>
            </li>
          ))}
        </ul>
      </section>
      <section className="cta-band">
        <h2>Not sure yet? Just say hello.</h2>
        <p>Open Maatu, pick a language and start talking.</p>
        <Link className="button button-primary" href="/">
          Open Maatu
        </Link>
      </section>
    </article>
  );
}
