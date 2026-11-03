import Link from "next/link";
import { LANG_NAME } from "@/lib/curriculum";
import { LANGS, SITE_DESCRIPTION, learnPath } from "@/lib/site";
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
          <Link href="/" className="site-brand" aria-label="Maatu, open the app">
            <BrandMark size={32} />
            <Wordmark />
          </Link>
          <nav className="site-nav" aria-label="Languages and about">
            {LANGS.map((code) => (
              <Link key={code} href={learnPath(code)}>
                {LANG_NAME[code]}
              </Link>
            ))}
            <Link href="/about">About</Link>
          </nav>
          <Link href="/" className="button button-primary">
            Open Maatu
          </Link>
        </div>
      </header>
      <main id="content">{children}</main>
      <footer className="site-footer">
        <div className="site-footer-inner">
          <div>
            <span className="site-brand">
              <BrandMark size={26} />
              <Wordmark />
            </span>
            <p>{SITE_DESCRIPTION}</p>
          </div>
          <nav aria-label="Learn">
            <strong>Learn</strong>
            {LANGS.map((code) => (
              <Link key={code} href={learnPath(code)}>
                Spoken {LANG_NAME[code]}
              </Link>
            ))}
          </nav>
          <nav aria-label="More">
            <strong>Maatu</strong>
            <Link href="/">Open the app</Link>
            <Link href="/learn">All languages</Link>
            <Link href="/about">About</Link>
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
