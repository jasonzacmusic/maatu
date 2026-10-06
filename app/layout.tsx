import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, JetBrains_Mono, Newsreader } from "next/font/google";
import "./globals.css";
import "./sentence-lab.css";
import "./conversation-coach.css";
import RegisterServiceWorker from "./components/RegisterServiceWorker";

const bodyFont = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-hanken", display: "swap" });
const displayFont = Newsreader({ subsets: ["latin"], variable: "--font-newsreader", display: "swap" });
const monoFont = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  title: "Maatu",
  description: "Learn spoken Tamil, Kannada, Hindi, and French through live conversations, authentic scenarios, and a playful sentence lab.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Maatu",
  },
};

export const viewport: Viewport = {
  themeColor: "#FBF9F4",
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
        <template dangerouslySetInnerHTML={{ __html: "<!-- THESIS: A neighborhood conversation studio with a playable grammar board. OWN-WORLD: Daylight paper, purple, colored sentence roles, local photographs, Newsreader and Hanken. STORY: Start a thought, learn useful speech, and connect word types to build and hear sentences. FIRST VIEWPORT: Four languages, three modes, invitation beside city photography, voice and typed entry. The lab opens with a challenge, connected word roles, and Hear it. FORM: Grounded candidate 3, seed 030faa12; sentence lab is a precise local extension with a native grammar result. FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance -->" }} />
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
