import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildPath } from "../lib/sentence-path";
import { MISSIONS } from "../lib/sentence-game";
import clips from "../lib/lab-voice.generated.json";

const site = process.env.MAATU_SPEECH_SOURCE_URL || "http://127.0.0.1:3033";
function wav(bytes: Buffer) {
  assert.equal(bytes.toString("ascii", 0, 4), "RIFF");
  assert.equal(bytes.toString("ascii", 8, 12), "WAVE");
  assert.ok(bytes.length > 1000);
}
async function request(lang: string, text: string) {
  const start = performance.now();
  const response = await fetch(`${site}/api/say`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lang, text }),
  });
  assert.ok(response.ok, `Voice request failed for ${lang}`);
  const data = await response.json();
  const bytes = Buffer.from(data.audio, "base64");
  wav(bytes);
  return {
    seconds: Number(((performance.now() - start) / 1000).toFixed(3)),
    bytes,
  };
}
async function main() {
  assert.equal(clips.length, 40);
  for (const clip of clips) {
    wav(await readFile(`public${clip.url}`));
    const response = await fetch(`${site}${clip.url}`);
    assert.ok(response.ok, `Saved voice did not load for ${clip.lang}`);
    wav(Buffer.from(await response.arrayBuffer()));
  }
  const results = await Promise.all(
    (["ta", "kn", "hi", "fr"] as const).map(async (lang) => {
      const text = buildPath(lang, MISSIONS[1].target)!.sentence;
      const [first, shared] = await Promise.all([
        request(lang, text),
        request(lang, text),
      ]);
      assert.deepEqual(
        first.bytes,
        shared.bytes,
        `Concurrent previews must share audio for ${lang}`,
      );
      const repeat = await request(lang, text);
      assert.deepEqual(
        first.bytes,
        repeat.bytes,
        `A prepared preview must reuse audio for ${lang}`,
      );
      return {
        lang,
        fresh_seconds: first.seconds,
        concurrent_seconds: shared.seconds,
        cached_seconds: repeat.seconds,
        bytes: first.bytes.length,
      };
    }),
  );
  console.log(
    JSON.stringify(
      {
        stored_clips_verified: clips.length,
        concurrent_and_cached_audio_matches: true,
        measurements: results,
      },
      null,
      2,
    ),
  );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
