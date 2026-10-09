import Link from "next/link";
import { LANGUAGE_ORDER, LANGUAGES } from "@/lib/languages";
import { learnPath } from "@/lib/site";
import { BrandMark, Wordmark } from "../components/BrandMark";
import "../site.css";

// Shell for the public, crawlable pages (language guides and About).
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site">
      <a className="skip-link" href="#content">
        Skip to content
      </a>
      <header className="site-header">
        <div className="site-header-inner">
          <Link href="/" className="brand site-brand" aria-label="Maatu, open the app">
            <BrandMark size={32} />
            <Wordmark />
          </Link>
          <nav className="site-nav" aria-label="Languages and about">
            {LANGUAGE_ORDER.map((code) => (
              <Link key={code} href={learnPath(code)}>
                <span className="lang-dot" style={{ background: LANGUAGES[code].color }} />
                {LANGUAGES[code].name}
              </Link>
            ))}
            <Link href="/about">About</Link>
          </nav>
          <Link href="/" className="button button-primary site-open">
            Open Maatu
          </Link>
        </div>
      </header>
      <main id="content">{children}</main>
      <footer className="site-footer">
        <div className="site-footer-inner">
          <div>
            <span className="brand site-brand small">
              <BrandMark size={26} />
              <Wordmark />
            </span>
            <p>Speak everyday Tamil, Kannada, Hindi and French out loud with a friendly AI teacher. Free, no account needed.</p>
          </div>
          <nav aria-label="Footer">
            <strong>Learn</strong>
            {LANGUAGE_ORDER.map((code) => (
              <Link key={code} href={learnPath(code)}>
                Spoken {LANGUAGES[code].name}
              </Link>
            ))}
          </nav>
          <nav aria-label="More">
            <strong>Maatu</strong>
            <Link href="/">Open the app</Link>
            <Link href="/learn">All languages</Link>
            <Link href="/about">About</Link>
            <a href="/photo-credits.txt">Photography credits</a>
          </nav>
          <p className="site-made">
            A{" "}
            <a href="https://www.nathanielschool.com" rel="noopener">
              Nathaniel School of Music
            </a>{" "}
            project by Jason Zac, Bengaluru.
          </p>
        </div>
      </footer>
    </div>
  );
}
