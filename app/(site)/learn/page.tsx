import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LANGUAGE_ORDER, LANGUAGES } from "@/lib/languages";
import { MODES, helloChat, learnPath, scenes, shareTags } from "@/lib/site";
import { ALL_LESSONS } from "@/lib/curriculum";
import { learnIndexGraph } from "@/lib/structured-data";
import { JsonLd } from "../../components/JsonLd";

const DESCRIPTION =
  "Pick a language and start speaking: everyday Tamil, Kannada, Hindi or French, out loud, with a friendly AI teacher. Real-life scenes, a sentence lab and a beginner course. Free.";

export const metadata: Metadata = {
  title: "Learn Tamil, Kannada, Hindi or French by speaking",
  description: DESCRIPTION,
  alternates: { canonical: "/learn" },
  ...shareTags({ title: "Learn Tamil, Kannada, Hindi or French by speaking | Maatu", description: DESCRIPTION, path: "/learn" }),
};

export default function LearnIndex() {
  return (
    <article className="site-page">
      <JsonLd data={learnIndexGraph()} />
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">Maatu</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Learn</span>
      </nav>
      <header className="site-intro">
        <h1>
          Pick a language. <em>Start speaking.</em>
        </h1>
        <p className="lede">
          Maatu teaches the language people actually speak, out loud, from your very first minute. Every word is written in plain English letters, so you
          can talk before you can read.
        </p>
      </header>
      <ul className="lang-cards">
        {LANGUAGE_ORDER.map((code) => {
          const l = LANGUAGES[code];
          const chat = helloChat(code);
          return (
            <li key={code} style={{ "--lang": l.color, "--lang-tint": l.tint } as React.CSSProperties}>
              <Link href={learnPath(code)} className="lang-card">
                <span className="eyebrow">
                  <span className="lang-dot" />
                  {l.city}
                </span>
                <h2>Spoken {l.name}</h2>
                <p className="lang-card-line" lang={code === "fr" ? "fr" : `${code}-Latn`}>
                  {chat.teacher}
                </p>
                <p>
                  Talk with {l.teacher}, {scenes(code).length} real-life scenes, {ALL_LESSONS.length} beginner lessons.
                </p>
                <span className="mode-go">
                  Learn {l.name} <ArrowRight size={15} />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <section className="site-section">
        <h2>How Maatu works</h2>
        <div className="mode-grid">
          {MODES.map((m) => (
            <div key={m.id} className="mode-card static">
              <h3>{m.title}</h3>
              <p>{m.body}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="cta-band">
        <h2>
          Not sure yet? <em>Just say hello.</em>
        </h2>
        <p>Open Maatu, pick a language at the top and tap Start talking.</p>
        <Link className="button button-primary" href="/">
          Open Maatu <ArrowRight size={17} />
        </Link>
      </section>
    </article>
  );
}
