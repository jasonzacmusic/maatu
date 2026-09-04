import playbooks from "@/playbooks.json";
import type { Lang } from "./maatu-design";
import type { Gender } from "./grammar";

// Scenes (scripted conversations for real Bengaluru situations plus music
// teaching scripts), number blocks, and sound pairs for the Sentence Studio.
// All data lives in playbooks.json. No em dashes anywhere.

export type Line = { who: "you" | "them"; en: string; kn: string; hi: string; hiF?: string; ta: string; note?: string };
export type Beat = { beat: string; lines: Line[] };
export type SceneGroup = "street" | "food" | "shops" | "home" | "travel" | "music";
export type Scene = { id: string; group: SceneGroup; title: string; place: string; blurb: string; beats: Beat[] };
export type NumberBlocks = { units: string[]; teens: string[]; tens: string[]; tensJoin?: string[]; hundred: string; rule: string; table?: string[] };
export type SoundPair = { short: string; shortEn: string; long: string; longEn: string };

type Data = {
  scenes: Scene[];
  numbers: Record<Lang, NumberBlocks>;
  sounds: Record<Lang, SoundPair[]>;
  soundNote: Record<Lang, string>;
};

const DATA = playbooks as unknown as Data;
export const SCENES: Scene[] = DATA.scenes;
export const NUMBERS = DATA.numbers;
export const SOUNDS = DATA.sounds;
export const SOUND_NOTE = DATA.soundNote;

export const SCENE_GROUPS: { id: SceneGroup; label: string }[] = [
  { id: "music", label: "Teach music" },
  { id: "street", label: "On the street" },
  { id: "food", label: "Food" },
  { id: "shops", label: "Shops" },
  { id: "home", label: "Home" },
  { id: "travel", label: "Travel and calls" },
];

export function lineText(line: Line, lang: Lang, gender: Gender = "m"): string {
  if (lang === "hi" && gender === "f" && line.hiF) return line.hiF;
  return line[lang];
}

// Compose a two-digit number from blocks. Returns null for Hindi (each number
// is its own word; use the table) and for anything outside 1 to 100.
export function composeNumber(lang: Lang, n: number): string | null {
  const b = NUMBERS[lang];
  if (!b || n < 1 || n > 100) return null;
  if (n === 100) return b.hundred;
  if (n < 10) return b.units[n - 1];
  if (n < 20) return b.teens[n - 10];
  const tensIndex = Math.floor(n / 10) - 2;
  const unit = n % 10;
  if (lang === "hi") return unit === 0 ? b.tens[tensIndex] : b.table?.[n - 21] ?? null;
  if (unit === 0) return b.tens[tensIndex];
  const unitWord = b.units[unit - 1];
  if (lang === "kn") {
    const tens = b.tens[tensIndex];
    return /^[aeiou]/.test(unitWord) ? tens.slice(0, -1) + unitWord : tens.slice(0, -2) + unitWord;
  }
  return `${(b.tensJoin ?? b.tens)[tensIndex]} ${unitWord}`;
}

// Compact text for the voice tutor: the music scripts only.
export function musicScriptText(lang: Lang): string {
  const music = SCENES.filter((s) => s.group === "music");
  return music
    .map((s) => `${s.title}: ` + s.beats.flatMap((b) => b.lines).map((l) => `${l.who === "you" ? "teacher" : "student"}: ${l.en} = ${l[lang]}`).join("; "))
    .join("\n");
}
