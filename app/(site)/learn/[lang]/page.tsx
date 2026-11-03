import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LANG_NAME } from "@/lib/curriculum";
import { LANGS, MODES, SLUGS, course, firstWords, helloChat, langFromSlug, languagePage, learnPath, scenes, shareTags } from "@/lib/site";
import { languageGraph } from "@/lib/structured-data";
import { JsonLd } from "../../../components/JsonLd";

export const dynamicParams = false;
export function generateStaticParams() {
  return LANGS.map((code) => ({ lang: SLUGS[code] }));
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
    ...shareTags({ title: `${page.title} | Maatu`, description: page.description, path: learnPath(lang), image }),
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
  const lessonCount = units.reduce((n, u) => n + u.lessons.length, 0);
  // Romanized Indian languages are tagged as Latin script for screen readers.
  const tag = `${lang}-Latn`;

  return (
    <article className="site-page" style={{ "--lang": page.color } as React.CSSProperties}>
      <JsonLd data={languageGraph(page)} />
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">Maatu</Link>
        <span aria-hidden="true">/</span>
        <Link href="/learn">Learn</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{page.name}</span>
      </nav>

      <section className="site-hero">
        <div>
          <p className="eyebrow" style={{ marginTop: 18 }}>
            <span className="lang-dot" />
            Spoken {page.name} · {page.city}
          </p>
          <h1 style={{ marginTop: 10 }}>
            Learn to speak {page.name} <em>by talking.</em>
          </h1>
          <p className="lede">{page.intro}</p>
          <div className="cta-row">
            <Link className="button button-primary" href="/">
              Start talking with {page.teacher}
            </Link>
          </div>
          <p className="fine">No account needed · Works on your phone</p>
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
        </div>
      </section>

      <section className="site-section">
        <h2>Say these in your first week</h2>
        <p className="section-lede">Real {page.name} as people say it, written in plain English letters. No script needed to start.</p>
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
        <h2>
          {sceneList.length} real-life scenes in {page.city}
        </h2>
        <p className="section-lede">
          Each scene puts you face to face with a local character who talks to you in {page.name} and stays in role.
        </p>
        <ul className="scene-grid">
          {sceneList.map((s) => (
            <li key={s.id}>
              <h3>{s.place}</h3>
              <p className="scene-partner">with {s.partner}</p>
              <p className="scene-goals">{s.goal}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="site-section">
        <h2>A {lessonCount}-lesson spoken beginner course</h2>
        <p className="section-lede">{page.teacher} leads every lesson out loud, one phrase at a time.</p>
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
        <h2>Say hello to {page.teacher}.</h2>
        <p>Your first conversation takes a minute to start.</p>
        <Link className="button button-primary" href="/">
          Start talking
        </Link>
      </section>

      <section className="site-section other-langs">
        <h2>Also on Maatu</h2>
        <ul>
          {LANGS.filter((c) => c !== lang).map((c) => (
            <li key={c}>
              <Link href={learnPath(c)}>Learn spoken {LANG_NAME[c]}</Link>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
