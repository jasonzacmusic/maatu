import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, JetBrains_Mono, Newsreader } from "next/font/google";
import "./globals.css";
import RegisterServiceWorker from "./components/RegisterServiceWorker";
import { SCHOOL, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from "@/lib/site";

const bodyFont = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-hanken", display: "swap" });
const displayFont = Newsreader({ subsets: ["latin"], variable: "--font-newsreader", display: "swap" });
const monoFont = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: "%s | Maatu" },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "learn Kannada",
    "learn Hindi",
    "learn Tamil",
    "learn Malayalam",
    "spoken Kannada",
    "spoken Hindi",
    "spoken Tamil",
    "spoken Malayalam",
    "speak Kannada",
    "Kannada conversation practice",
    "Hindi speaking practice",
    "Tamil conversation practice",
    "Malayalam conversation practice",
    "AI language teacher",
    "language learning app India",
  ],
  authors: [{ name: SCHOOL.name, url: SCHOOL.url }],
  creator: SCHOOL.name,
  publisher: SCHOOL.name,
  category: "education",
  alternates: { canonical: "/" },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: "/",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Maatu",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0D16",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${displayFont.variable} ${monoFont.variable} h-full antialiased`}>
      <body className="min-h-full">
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
