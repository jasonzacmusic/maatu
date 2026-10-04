"use client";
import type { Lang } from "@/lib/maatu-design";
import type { PracticeLine } from "./useMaatuCall";
import SentencePath from "./SentencePath";
export function BuildScreen({ lang, onTalk }: { lang: Lang; onLanguageChange?: (lang: Lang) => void; seed?: unknown; rm?: boolean; onTalk: (line: PracticeLine, french?: boolean) => void }) {
  return <SentencePath lang={lang} onTalk={onTalk}/>;
}
