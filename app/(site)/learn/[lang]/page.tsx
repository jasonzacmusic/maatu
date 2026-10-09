import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BookOpen, Coffee, GitBranch, MessageCircle } from "lucide-react";
import { LANGUAGE_ORDER, LANGUAGES } from "@/lib/languages";
import {
  MODES,
  SLUGS,
  course,
  firstWords,
  helloChat,
  langFromSlug,
  languagePage,
  learnPath,
  scenes,
  shareTags,
  studioPath,
} from "@/lib/site";
import { languageGraph } from "@/lib/structured-data";
import { JsonLd } from "../../../components/JsonLd";

const MODE_ICON = { talk: MessageCircle, scenes: Coffee, build: GitBranch, course: BookOpen } as const;

export const dynamicParams = false;
export function generateStaticParams() {
  return LANGUAGE_ORDER.map((code) => ({ lang: SLUGS[code] }));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const lang = langFromSlug((await params).lang);
  if (!lang) return {};
  const page = languagePage(lang);
  const image = { url: `/og/${page.slug}.png`, width: 1200, height: 630, alt: `Learn to speak ${page.name} by talking, on Maatu` };
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: learnPath(lang) },
    ...shareTags({ title: `Learn to speak ${page.name} by talking | Maatu`, description: page.description, path: learnPath(lang), image }),
  };
}

export default async function LanguagePage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = langFromSlug((await params).lang);
  if (!lang) notFound();
  const page = languagePage(lang);
  const words = firstWords(lang);
  const sceneList = scenes(lang);
  const units = course();
  const chat = helloChat(lang);
  const l = LANGUAGES[lang];
  const accent = { "--lang": page.color, "--lang-tint": page.tint } as React.CSSProperties;
  const lessonCount = units.reduce((n, u) => n + u.lessons.length, 0);
  // Romanized Indian languages are tagged as Latin script for screen readers.
  const tag = lang === "fr" ? "fr" : `${lang}-Latn`;

  return (
    <article className="site-page" style={accent}>
      <JsonLd data={languageGraph(page)} />
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">Maatu</Link>
        <span aria-hidden="true">/</span>
        <Link href="/learn">Learn</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{page.name}</span>
      </nav>

      <section className="site-hero">
        <div className="site-hero-copy">
          <p className="eyebrow">
            <span className="lang-dot" />
            Spoken {page.name} · {page.city}
          </p>
          <h1>
            Learn to speak {page.name} <em>by talking.</em>
          </h1>
          <p className="lede">{page.intro}</p>
          <div className="cta-row">
            <Link className="button button-primary" href={studioPath(lang)}>
              Start talking with {page.teacher} <ArrowRight size={17} />
            </Link>
            <Link className="button button-outline" href={studioPath(lang, "course")}>
              Begin lesson 1
            </Link>
          </div>
          <p className="fine">Free · No account needed · Works on your phone</p>
        </div>
        <div className="hero-chat" aria-label={`A first conversation in ${page.name}`}>
          <div className="bubble teacher">
            <span className="who">
              <span className="lang-dot" />
              {page.teacher}
            </span>
            <strong lang={tag}>{chat.teacher}</strong>
            <small>Hello! How are you?</small>
          </div>
          <div className="bubble learner">
            <strong lang={tag}>{chat.reply}</strong>
            <small>{chat.replyMeaning}</small>
          </div>
          <div className="bubble learner">
            <strong lang={tag}>{l.phrase}</strong>
            <small>{l.meaning}</small>
          </div>
        </div>
      </section>

      <section className="site-section">
        <h2>Say these in your first week</h2>
        <p className="section-lede">
          Real {page.name} as people say it, written in plain English letters. No {lang === "fr" ? "grammar tables" : "script"} needed to start.
        </p>
        <ul className="phrase-grid">
          {words.map((w) => (
            <li key={w.say}>
              <strong lang={tag}>{w.say}</strong>
              <span>{w.meaning}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="site-section">
        <h2>Four ways to practise {page.name}</h2>
        <div className="mode-grid">
          {MODES.map((m) => {
            const Icon = MODE_ICON[m.id];
            return (
              <Link key={m.id} className="mode-card" href={m.id === "talk" ? studioPath(lang) : studioPath(lang, m.id)}>
                <Icon size={22} />
                <h3>{m.title}</h3>
                <p>{m.body}</p>
                <span className="mode-go">
                  Open <ArrowRight size={15} />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="site-section">
        <h2>
          {sceneList.length} real-life scenes in {page.city}
        </h2>
        <p className="section-lede">
          Each scene puts you face to face with a local character who talks to you in {page.name}. Rehearse it here, then say it for real.
        </p>
        <ul className="scene-grid">
          {sceneList.map((s) => (
            <li key={s.id}>
              <h3>{s.title}</h3>
              <p className="scene-partner">with {s.partner}</p>
              {s.goals.length > 0 && <p className="scene-goals">{s.goals.join(" · ")}</p>}
            </li>
          ))}
        </ul>
      </section>

      <section className="site-section">
        <h2>A {lessonCount}-lesson spoken beginner course</h2>
        <p className="section-lede">
          {page.teacher} leads every lesson out loud, one phrase at a time. Each lesson ends with a short speaking check.
        </p>
        <ol className="course-units">
          {units.map((u) => (
            <li key={u.unit}>
              <h3>{u.unit}</h3>
              <ul>
                {u.lessons.map((lesson) => (
                  <li key={lesson.id}>
                    <strong>{lesson.title}</strong>
                    <span>{lesson.objective}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      <section className="site-section">
        <h2>Questions about learning {page.name}</h2>
        <div className="faq-list">
          {page.faqs.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="cta-band">
        <h2>
          Say <em>{page.greeting}</em> to {page.teacher}.
        </h2>
        <p>Your first conversation takes a minute to start and costs nothing.</p>
        <Link className="button button-primary" href={studioPath(lang)}>
          Start talking <ArrowRight size={17} />
        </Link>
      </section>

      <section className="site-section other-langs">
        <h2>Also on Maatu</h2>
        <ul>
          {LANGUAGE_ORDER.filter((c) => c !== lang).map((c) => (
            <li key={c}>
              <Link href={learnPath(c)} style={{ "--lang": LANGUAGES[c].color } as React.CSSProperties}>
                <span className="lang-dot" />
                Learn spoken {LANGUAGES[c].name}
                <ArrowRight size={15} />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
