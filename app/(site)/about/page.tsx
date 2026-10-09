import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LANGUAGE_ORDER, LANGUAGES } from "@/lib/languages";
import { GENERAL_FAQS, MODES, learnPath, shareTags } from "@/lib/site";
import { aboutGraph } from "@/lib/structured-data";
import { JsonLd } from "../../components/JsonLd";

const DESCRIPTION =
  "Maatu is the Kannada word for speech. It is a free app from Nathaniel School of Music for speaking everyday Tamil, Kannada, Hindi and French out loud with a friendly AI teacher.";

export const metadata: Metadata = {
  title: "About Maatu",
  description: DESCRIPTION,
  alternates: { canonical: "/about" },
  ...shareTags({ title: "About Maatu", description: DESCRIPTION, path: "/about" }),
};

const PRINCIPLES = [
  { title: "Speak first", body: "Every part of Maatu ends with you saying something out loud. Reading and tapping come second." },
  { title: "Plain English letters", body: "Every Tamil, Kannada and Hindi word is written in the Latin alphabet, so the script never stands between you and your first conversation." },
  { title: "The way people really talk", body: "Chennai Tamil, Bengaluru Kannada, Delhi Hindi and Paris French as you hear them in an auto, a market or a café, not the stiff textbook kind." },
  { title: "Gentle teaching", body: "A close try counts. Your teacher slips the right way of saying it into the reply instead of drilling you, and a coach gives you a few notes after a call." },
  { title: "You stay in control", body: "Say wait, slow down, say that again, what does that mean or go back at any time. Ask in English whenever you are stuck." },
  { title: "Ready for real life", body: "Rehearse the conversations that matter: a fare, an OTP, a doctor's question, a grocery list, an insurance claim." },
];

export default function About() {
  return (
    <article className="site-page">
      <JsonLd data={aboutGraph()} />
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">Maatu</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">About</span>
      </nav>
      <header className="site-intro">
        <h1>
          Maatu means <em>speech.</em>
        </h1>
        <p className="lede">
          Maatu is the Kannada word for speech, or talk. It is a free app for speaking everyday Tamil, Kannada, Hindi and French out loud with a friendly
          AI teacher, from your very first minute. No account, no script, no perfect sentences needed.
        </p>
        <div className="cta-row">
          <Link className="button button-primary" href="/">
            Open Maatu <ArrowRight size={17} />
          </Link>
          <Link className="button button-outline" href="/learn">
            Choose a language
          </Link>
        </div>
      </header>

      <section className="site-section">
        <h2>Why speaking comes first</h2>
        <div className="prose">
          <p>
            Maatu is for adults who want to talk in everyday Tamil, Kannada, Hindi or French. Many apps teach you to tap the right answer; real life asks
            you to speak. So Maatu works the other way round: you talk first, and grammar, vocabulary and confidence follow.
          </p>
          <p>
            You choose what to talk about. Your teacher keeps the conversation going and teaches inside your topic, whether that is your day, your
            commute or the music you love. There is even a music class scene, because Maatu comes from a music school.
          </p>
        </div>
      </section>

      <section className="site-section">
        <h2>Four ways to learn</h2>
        <div className="mode-grid">
          {MODES.map((m) => (
            <div key={m.id} className="mode-card static">
              <h3>{m.title}</h3>
              <p>{m.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="site-section">
        <h2>How Maatu teaches</h2>
        <ul className="principles">
          {PRINCIPLES.map((p) => (
            <li key={p.title}>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="site-section">
        <h2>Four languages, four cities</h2>
        <ul className="other-langs-grid">
          {LANGUAGE_ORDER.map((code) => {
            const l = LANGUAGES[code];
            return (
              <li key={code} style={{ "--lang": l.color, "--lang-tint": l.tint } as React.CSSProperties}>
                <Link href={learnPath(code)}>
                  <span className="lang-dot" />
                  <strong>{l.name}</strong>
                  <span>
                    {l.city}, with {l.teacher}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="site-section">
        <h2>Questions</h2>
        <div className="faq-list">
          {GENERAL_FAQS.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="site-section">
        <h2>Who made Maatu</h2>
        <div className="prose">
          <p>
            Maatu is made by{" "}
            <a href="https://www.nathanielschool.com" rel="noopener">
              Nathaniel School of Music
            </a>{" "}
            in Bengaluru, India, led by Jason Zac. The school has taught music to students in more than 30 countries, and brings the same belief to
            languages: you learn by doing it out loud, a little every day.
          </p>
          <p>
            Street photographs are used under Creative Commons licences; see the <a href="/photo-credits.txt">photography credits</a>.
          </p>
        </div>
      </section>
    </article>
  );
}
