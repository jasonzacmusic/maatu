import type { Metadata } from "next";
import Link from "next/link";
import { ALL_LESSONS, LANG_NAME } from "@/lib/curriculum";
import { HOST } from "@/lib/maatu-design";
import { FRENCH, GENERAL_FAQS, LANGS, MODES, learnPath, shareTags } from "@/lib/site";
import { aboutGraph } from "@/lib/structured-data";
import { JsonLd } from "../../components/JsonLd";

const DESCRIPTION =
  "Maatu is the Kannada word for speech. It is an app from Nathaniel School of Music for speaking everyday Kannada, Hindi, Tamil, Malayalam and Telugu out loud with a friendly AI teacher, with a French chat too.";

export const metadata: Metadata = {
  title: "About Maatu",
  description: DESCRIPTION,
  alternates: { canonical: "/about" },
  ...shareTags({ title: "About Maatu", description: DESCRIPTION, path: "/about" }),
};

const PRINCIPLES = [
  { title: "Speak first", body: "Every part of Maatu ends with you saying something out loud. Reading and tapping come second." },
  { title: "Plain English letters", body: "Every Kannada, Hindi, Tamil, Malayalam and Telugu word is written in the Latin alphabet, so the script never stands between you and your first conversation." },
  { title: "The way people really talk", body: "Bengaluru Kannada, Delhi Hindi, Chennai Tamil and Kochi Malayalam as you hear them in an auto, a market or a tea stall, not the stiff textbook kind." },
  { title: "Gentle teaching", body: "Your teacher keeps the conversation going and helps with the right way of saying it, and a coach gives you notes after a call." },
  { title: "You stay in control", body: "Ask in English whenever you are stuck, and ask your teacher to slow down at any time." },
  { title: "Ready for real life", body: "Rehearse the conversations that matter: a fare, a doctor's question, a grocery list, a repair call to the landlord." },
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
      <header>
        <h1>
          Maatu means <em>speech.</em>
        </h1>
        <p className="lede">
          Maatu is the Kannada word for speech, or talk. It is an app for speaking everyday Kannada, Hindi, Tamil, Malayalam and Telugu out loud with a friendly AI
          teacher, from your very first minute. No account, no script, no perfect sentences needed.
        </p>
        <div className="cta-row">
          <Link className="button button-primary" href="/">
            Open Maatu
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
            Maatu is for adults who want to talk in everyday Kannada, Hindi, Tamil, Malayalam or Telugu. Many apps teach you to tap the right answer; real life asks
            you to speak. So Maatu works the other way round: you talk first, and grammar, vocabulary and confidence follow.
          </p>
          <p>
            There is even a music school scene, because Maatu comes from a music school.
          </p>
        </div>
      </section>

      <section className="site-section">
        <h2>Four ways to learn</h2>
        <ul className="mode-grid">
          {MODES.map((m) => (
            <li key={m.id} className="mode-card">
              <h3>{m.title}</h3>
              <p>{m.body}</p>
            </li>
          ))}
        </ul>
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
        <h2>Five languages, five cities</h2>
        <p className="section-lede">
          Each has its own teacher and a {ALL_LESSONS.length}-lesson course. French, with {FRENCH.teacher} in {FRENCH.city}, is a chat only for now.
        </p>
        <ul className="lang-cards">
          {LANGS.map((code) => (
            <li key={code}>
              <Link href={learnPath(code)} className="lang-card">
                <h2>{LANG_NAME[code]}</h2>
                <p>{HOST[code].place}, with {HOST[code].name}</p>
              </Link>
            </li>
          ))}
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
            in Bengaluru, India, led by Jason Zac.
          </p>
        </div>
      </section>
    </article>
  );
}
