import type { Metadata, Viewport } from "next";
import "./globals.css";
import RegisterServiceWorker from "./components/RegisterServiceWorker";

export const metadata: Metadata = {
  title: "Maatu",
  description: "Learn to speak Kannada, Hindi, and Tamil by talking to people.",
  manifest: "/manifest.webmanifest",
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
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&family=Hanken+Grotesk:wght@400;500;600;700;800&family=Anek+Kannada:wght@400..800&family=Anek+Devanagari:wght@400..800&family=Anek+Tamil:wght@400..800&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full">
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
