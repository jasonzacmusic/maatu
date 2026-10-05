import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { buildPath } from "../lib/sentence-path";
import { MISSIONS, STARTER } from "../lib/sentence-game";

async function main() {
  const site = process.env.MAATU_SPEECH_SOURCE_URL || "http://127.0.0.1:3033";
  const clips: { lang: string; text: string; pace: number; url: string }[] = [];
  await mkdir("public/voices/lab", { recursive: true });
  await Promise.all(
    (["ta", "kn", "hi", "fr"] as const).map(async (lang) => {
      for (const choice of [
        STARTER,
        ...MISSIONS.map((mission) => mission.target),
      ]) {
        for (const pace of [0.9, 0.72]) {
          const text = buildPath(lang, choice)!.sentence;
          const response = await fetch(`${site}/api/say`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lang, text, pace }),
          });
          const body = await response.json();
          if (!response.ok || !body.audio)
            throw new Error(`Voice preparation failed for ${lang}`);
          const audio = Buffer.from(body.audio, "base64");
          if (
            audio.toString("ascii", 0, 4) !== "RIFF" ||
            audio.toString("ascii", 8, 12) !== "WAVE"
          )
            throw new Error(`Expected playable WAV for ${lang}`);
          const name =
            createHash("sha256").update(audio).digest("hex").slice(0, 16) +
            ".wav";
          await writeFile(`public/voices/lab/${name}`, audio);
          clips.push({ lang, text, pace, url: `/voices/lab/${name}` });
          console.log(JSON.stringify({ lang, pace, bytes: audio.length }));
        }
      }
    }),
  );
  clips.sort(
    (a, b) =>
      a.lang.localeCompare(b.lang) ||
      a.text.localeCompare(b.text) ||
      a.pace - b.pace,
  );
  await writeFile(
    "lib/lab-voice.generated.json",
    JSON.stringify(clips, null, 2) + "\n",
  );
  await writeFile(
    "public/voices/lab/README.md",
    `# Maatu sentence lab audio\n\nGenerated with Maatu's native-language pronunciation pipeline. The manifest in lib/lab-voice.generated.json records the exact romanized input, language, pace and audio URL. The starter sentence and every challenge goal have normal and slower audio in all four languages. Their playback does not require an AI request. Other sentences are prepared after the learner pauses building. No audio autoplays. Regenerate with scripts/prepare-lab-voices.ts when the starter grammar or challenge goals change.\n\n<!-- REPORT: agent=Codex; task=sentence-lab-audio; status=complete; files=${clips.length}-native-language-WAV-clips; open_questions=none -->\n`,
  );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
