import { LANGUAGE_ORDER, LANGUAGES } from "./languages";
import { ALL_LESSONS } from "./curriculum";
import {
  GENERAL_FAQS,
  SCHOOL,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  course,
  learnPath,
  type Faq,
  type LanguagePage,
} from "./site";

// schema.org graphs for search engines and answer engines. No em dashes anywhere.

const ORG_ID = `${SCHOOL.url}/#organization`;
const SITE_ID = `${SITE_URL}/#website`;
const APP_ID = `${SITE_URL}/#app`;

const organization = {
  "@type": "Organization",
  "@id": ORG_ID,
  name: SCHOOL.name,
  url: SCHOOL.url,
  sameAs: SCHOOL.sameAs,
  address: { "@type": "PostalAddress", addressLocality: "Bengaluru", addressCountry: "IN" },
};

const website = {
  "@type": "WebSite",
  "@id": SITE_ID,
  url: SITE_URL,
  name: SITE_NAME,
  description: SITE_DESCRIPTION,
  inLanguage: "en",
  publisher: { "@id": ORG_ID },
};

const app = {
  "@type": "WebApplication",
  "@id": APP_ID,
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  applicationCategory: "EducationalApplication",
  applicationSubCategory: "Language learning",
  operatingSystem: "Any (runs in a web browser)",
  browserRequirements: "A modern web browser. A microphone for voice conversations.",
  isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
  image: `${SITE_URL}/opengraph-image.png`,
  screenshot: `${SITE_URL}/opengraph-image.png`,
  inLanguage: "en",
  publisher: { "@id": ORG_ID },
  creator: { "@id": ORG_ID },
  featureList: [
    "Live voice conversations with an AI teacher",
    "Real-life scenes with local characters",
    "Sentence lab for building and hearing sentences",
    "A 16-lesson spoken beginner course",
    "Romanized captions in plain English letters",
    "Conversation history saved on your device",
  ],
  about: LANGUAGE_ORDER.map((code) => ({ "@type": "Language", name: LANGUAGES[code].name })),
};

function faqPage(faqs: Faq[], url: string) {
  return {
    "@type": "FAQPage",
    "@id": `${url}#faq`,
    url,
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

function breadcrumbs(items: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

export function homeGraph() {
  return { "@context": "https://schema.org", "@graph": [organization, website, app] };
}

export function aboutGraph() {
  const url = `${SITE_URL}/about`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      organization,
      website,
      app,
      {
        "@type": "AboutPage",
        "@id": url,
        url,
        name: "About Maatu",
        isPartOf: { "@id": SITE_ID },
        about: { "@id": APP_ID },
      },
      faqPage(GENERAL_FAQS, url),
      breadcrumbs([
        { name: "Maatu", path: "/" },
        { name: "About", path: "/about" },
      ]),
    ],
  };
}

export function learnIndexGraph() {
  const url = `${SITE_URL}/learn`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      organization,
      website,
      {
        "@type": "CollectionPage",
        "@id": url,
        url,
        name: "Learn a language by speaking it",
        isPartOf: { "@id": SITE_ID },
        hasPart: LANGUAGE_ORDER.map((code) => ({
          "@type": "Course",
          name: `Spoken ${LANGUAGES[code].name}`,
          url: `${SITE_URL}${learnPath(code)}`,
        })),
      },
      breadcrumbs([
        { name: "Maatu", path: "/" },
        { name: "Learn", path: "/learn" },
      ]),
    ],
  };
}

export function languageGraph(page: LanguagePage) {
  const url = `${SITE_URL}${learnPath(page.lang)}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      organization,
      website,
      {
        "@type": "Course",
        "@id": `${url}#course`,
        url,
        name: `Spoken ${page.name} for beginners`,
        description: page.description,
        provider: { "@id": ORG_ID },
        inLanguage: "en",
        teaches: `Spoken ${page.name}`,
        educationalLevel: "Beginner",
        isAccessibleForFree: true,
        image: `${SITE_URL}/og/${page.slug}.png`,
        offers: { "@type": "Offer", category: "Free", price: "0", priceCurrency: "INR" },
        hasCourseInstance: {
          "@type": "CourseInstance",
          courseMode: "Online",
          courseWorkload: `${ALL_LESSONS.length} short spoken lessons`,
        },
        syllabusSections: course().map((u) => ({
          "@type": "Syllabus",
          name: u.unit,
          description: u.lessons.map((l) => l.title).join(", "),
        })),
      },
      faqPage(page.faqs, url),
      breadcrumbs([
        { name: "Maatu", path: "/" },
        { name: "Learn", path: "/learn" },
        { name: page.name, path: learnPath(page.lang) },
      ]),
    ],
  };
}
