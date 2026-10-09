import Sanscript from "@indic-transliteration/sanscript";

export const NATIVE_SCRIPT = /[ऀ-ॿ஀-௿ఀ-ൿ]/u;

// Captions show how a word SOUNDS to an English reader, not a scholarly
// transliteration. Tamil is spelled by its own sound rules; Hindi drops the
// vowels speakers drop; Kannada, Telugu and Malayalam go through Sanscript.
// Names and English stay unchanged. Runs locally for interim captions too.

// ---------------------------------------------------------------- Tamil
const TA_VOWEL: Record<string, string> = {
  "அ": "a", "ஆ": "aa", "இ": "i", "ஈ": "ee", "உ": "u", "ஊ": "oo",
  "எ": "e", "ஏ": "e", "ஐ": "ai", "ஒ": "o", "ஓ": "o", "ஔ": "au",
};
const TA_SIGN: Record<string, string> = {
  "ா": "aa", "ி": "i", "ீ": "ee", "ு": "u", "ூ": "oo",
  "ெ": "e", "ே": "e", "ை": "ai", "ொ": "o", "ோ": "o",
  "ௌ": "au", "ௗ": "",
};
// [word start, second of a doubled pair, after its own nasal, between vowels]
const TA_STOP: Record<string, [string, string, string, string]> = {
  "க": ["k", "k", "g", "g"],
  "ச": ["s", "ch", "j", "s"],
  "ட": ["t", "t", "d", "d"],
  "த": ["th", "th", "dh", "dh"],
  "ப": ["p", "p", "b", "p"],
  "ற": ["r", "tr", "dr", "r"],
};
// What the first, silent half of a doubled stop writes: kk, chch, tt, tth, pp, tr.
const TA_FIRST_HALF: Record<string, string> = {
  "க": "k", "ச": "ch", "ட": "t", "த": "t", "ப": "p", "ற": "",
};
const TA_NASAL_FOR: Record<string, string> = {
  "க": "ங", "ச": "ஞ", "ட": "ண", "த": "ந", "ப": "ம", "ற": "ன",
};
const TA_CONS: Record<string, string> = {
  "ங": "ng", "ஞ": "ny", "ண": "n", "ந": "n", "ம": "m", "ய": "y", "ர": "r",
  "ல": "l", "வ": "v", "ழ": "zh", "ள": "l", "ன": "n", "ஜ": "j", "ஷ": "sh",
  "ஸ": "s", "ஹ": "h",
};
const VIRAMA_TA = "\u0bcd";

function tamilWord(word: string) {
  type Unit = { c?: string; v: string; dead: boolean };
  const units: Unit[] = [];
  const chars = [...word];
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (TA_VOWEL[ch] !== undefined) units.push({ v: TA_VOWEL[ch], dead: false });
    else if (TA_STOP[ch] || TA_CONS[ch]) {
      const next = chars[i + 1];
      if (next === VIRAMA_TA) {
        units.push({ c: ch, v: "", dead: true });
        i++;
      } else if (next !== undefined && TA_SIGN[next] !== undefined) {
        units.push({ c: ch, v: TA_SIGN[next], dead: false });
        i++;
      } else units.push({ c: ch, v: "a", dead: false });
    } else if (ch === "ஃ") units.push({ v: "h", dead: false });
    else units.push({ v: ch, dead: false });
  }
  return units
    .map((u, i) => {
      if (!u.c) return u.v;
      const prev = units[i - 1];
      const next = units[i + 1];
      if (TA_STOP[u.c]) {
        if (u.dead && next?.c === u.c) return TA_FIRST_HALF[u.c];
        const [initial, doubled, nasal, between] = TA_STOP[u.c];
        const sound = !prev || (u.dead && !next)
          ? initial
          : prev?.dead && prev.c === u.c
            ? doubled
            : prev?.dead && prev.c === TA_NASAL_FOR[u.c]
              ? nasal
              : prev?.dead
                ? initial
                : between;
        return sound + u.v;
      }
      // ங்க, ஞ்ச, ந்த and friends: the nasal is written once as n or m.
      if (u.dead && next?.c && TA_NASAL_FOR[next.c] === u.c)
        return u.c === "ம" ? "m" : "n";
      return TA_CONS[u.c] + u.v;
    })
    .join("");
}

// ---------------------------------------------------------------- Hindi
const NUKTA: Record<string, string> = {
  "क़": "क़", "ख़": "ख़", "ग़": "ग़", "ज़": "ज़",
  "ड़": "ड़", "ढ़": "ढ़", "फ़": "फ़", "य़": "य़",
};
const DEV_CONS = /[क-हक़-य़]/u;
const DEV_SIGN = /[ा-ौॢॣ]/u;
const VIRAMA_DEV = "्";

// Drop the silent inherent vowel the way Delhi speakers do: at the end of a
// word, and between a vowel and a following consonant-vowel (kitnaa, samajhnaa).
function hindiSchwa(word: string) {
  const chars = [...word];
  type Tok = { text: string; consonant: boolean; inherent: boolean; vowel: boolean; afterCluster: boolean };
  const toks: Tok[] = [];
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (DEV_CONS.test(ch)) {
      let text = ch;
      let j = i + 1;
      if (chars[j] === "़") text += chars[j++];
      const afterCluster = toks.at(-1)?.text.endsWith(VIRAMA_DEV) ?? false;
      if (chars[j] === VIRAMA_DEV) {
        toks.push({ text: text + VIRAMA_DEV, consonant: true, inherent: false, vowel: false, afterCluster });
        i = j;
        continue;
      }
      let vowel = true;
      let inherent = true;
      if (chars[j] && DEV_SIGN.test(chars[j])) {
        text += chars[j++];
        inherent = false;
      }
      while (chars[j] && /[ऀ-ः]/u.test(chars[j])) {
        text += chars[j++];
        inherent = false;
      }
      toks.push({ text, consonant: true, inherent, vowel, afterCluster });
      i = j - 1;
    } else {
      const last = toks.at(-1);
      if (last && /[ऀ-ः]/u.test(ch)) {
        last.text += ch;
        last.inherent = false;
      } else toks.push({ text: ch, consonant: false, inherent: false, vowel: /[ऄ-औ]/u.test(ch), afterCluster: false });
    }
  }
  const drop = (t: Tok) => {
    t.text += VIRAMA_DEV;
    t.inherent = false;
    t.vowel = false;
  };
  const count = toks.filter((t) => t.consonant || t.vowel).length;
  const last = toks.at(-1);
  if (
    count > 1 &&
    last?.consonant &&
    last.inherent &&
    !(last.afterCluster && /[यरव]/u.test(last.text))
  )
    drop(last);
  for (let i = toks.length - 2; i > 0; i--) {
    const t = toks[i];
    const prev = toks[i - 1];
    const next = toks[i + 1];
    if (t.consonant && t.inherent && !t.afterCluster && (prev.vowel || prev.inherent || (prev.consonant && !prev.text.endsWith(VIRAMA_DEV))) && next.consonant && next.vowel && !next.text.endsWith(VIRAMA_DEV))
      drop(t);
  }
  return toks.map((t) => t.text).join("");
}

// ---------------------------------------------------------------- shared
const CHILLU: Record<string, string> = {
  "ൺ": "ണ്", "ൻ": "ന്", "ർ": "ര്", "ൽ": "ല്", "ൾ": "ള്", "ൿ": "ക്",
};

function latinize(latin: string) {
  return latin
    .replace(/ā/g, "aa")
    .replace(/ī/g, "ee")
    .replace(/ū/g, "oo")
    .replace(/ē/g, "e")
    .replace(/ō/g, "o")
    .replace(/[śṣ]/g, "sh")
    .replace(/[ṅñ]/g, "n")
    .replace(/[ṃṁ]/g, "m")
    .replace(/ṛ/g, "ru")
    .replace(/~/g, "n")
    .normalize("NFD")
    .replace(/\p{Mark}/gu, "")
    .replace(/[|]+/g, ".");
}

export function romanizeDisplay(text: string) {
  return text
    .replace(
      /[ऀ-ॿ]+|[஀-௿]+|[ಀ-೿]+|[ఀ-౿]+|[ഀ-ൿ]+/gu,
      (run) => {
        if (/[஀-௿]/u.test(run)) return tamilWord(run);
        const script = /[ಀ-೿]/u.test(run)
          ? "kannada"
          : /[ఀ-౿]/u.test(run)
            ? "telugu"
            : /[ഀ-ൿ]/u.test(run)
              ? "malayalam"
              : "devanagari";
        let source = run;
        if (script === "devanagari") {
          source = source
            // Hinglish spells the flapped ड़ and ढ़ as d and dh: gaadi, padhna.
            .replace(/\u0921\u093c|\u095c/gu, "\u0921")
            .replace(/\u0922\u093c|\u095d/gu, "\u0922")
            .replace(/[कखगजफय]\u093c/gu, (m) => NUKTA[m] ?? m)
            .replace(/ऑ/g, "ओ")
            .replace(/ऍ/g, "ए")
            .replace(/ॉ/g, "ो")
            .replace(/ॅ/g, "े");
          source = hindiSchwa(source);
        }
        if (script === "malayalam")
          source = source.replace(/[ൺ-ൿ]/gu, (m) => CHILLU[m] ?? m);
        let latin = Sanscript.t(source, script, "iast")
          .replace(/[|]+/g, ".")
          // IAST c is the English ch sound; its aspirate ch becomes chh.
          .replace(/ch/g, "chh")
          .replace(/c(?!h)/g, "ch")
          // A nasal vowel before n or m merges into it: maine, not mainne.
          .replace(/[ṃṁ](?=[nm])/g, "")
          .replace(/[ṃṁ](?=[kgcjtdnsśṣḍṭ])/g, "n");
        if (script === "devanagari")
          latin = latin
            .replace(/[ṃṁ](?=[.!?]*$)/g, "n");
        if (script === "malayalam")
          // Malayalam writes the t sound as a doubled r (stor, ente) and
          // softens a single retroflex t between vowels (evide, veedu).
          latin = latin
            .replace(/nṟ/g, "nt")
            .replace(/(?<=[^aeiouāīūēōè\s])ṟṟ/g, "t")
            .replace(/ṟṟ/g, "tt")
            .replace(/(?<=[aeiouāīūēōè])ṭ(?=[aeiouāīūēōè])/g, "d");
        return latinize(latin);
      },
    )
    .replace(/\u2014/gu, ",")
    // Zero-width joiners steer Indic rendering; in Latin captions they only
    // split words such as haaspital and ge.
    .replace(/[​-‍﻿]/gu, "");
}
