# Maatu: Decision Log

Defaults chosen without asking, per standing rules. Newest first.

- 2026-07-11: Brain is provider flexible (spec section 2). Anthropic is preferred when ANTHROPIC_API_KEY is present, else Gemini. Reason: the supplied Gemini key returns 429 with zero free-tier quota (regional restriction in India), so the brain needs either Gemini billing or an Anthropic key. Override with BRAIN=gemini|anthropic.
- 2026-07-11: Gemini model is gemini-2.0-flash (was gemini-2.5-flash, which 404s for new keys: "no longer available to new users"). Configurable via GEMINI_MODEL.
- 2026-07-11: Manjunath's Bulbul voice is "kabir" (a valid bulbul:v3 speaker). "hitesh" is not compatible with v3. Valid v3 male voices for future personas: shubh, rahul, amit, ratan, rohan, dev, manan, sumit, aditya, kabir, varun, aayan, ashutosh, advait.
- 2026-07-11: google.LLM needs the key passed explicitly (it only auto-reads GOOGLE_API_KEY, our env uses GEMINI_API_KEY). Sarvam STT/TTS keys are also passed explicitly for safety.
- 2026-07-11: Design applied as a single client-side app with screen state (Street/Call/Debrief/Progress), faithful to Claude Design's mock, so the camera-zoom and fade transitions survive intact. The mock's iOS device frame is dropped in production. The Call screen is the only screen wired to real data in M2; Debrief and Progress carry the design's demo data until M3.
- 2026-07-11: Fonts load via a Google Fonts stylesheet link (not next/font) to preserve the literal family names the ported components use (Anek Latin/Kannada/Devanagari/Tamil, Baloo Tamma 2, Instrument Sans). Can move to next/font later for offline PWA.
- 2026-07-11: Only the auto stand in Kannada starts a real call in M2 (the one wired persona). Other shopfronts stay lit in the illustration but show "opening soon" on tap until their personas land in M3. Toggle via LIVE in lib/maatu-design.ts.
- 2026-07-11: Agent worker runs on Python 3.12 (Homebrew). System Python 3.9 is too old for livekit-agents (needs TypeAlias, 3.10+).

- 2026-07-11: Next.js app lives at the repo ROOT (not a `web/` subfolder) so Vercel deploys with zero root-directory configuration. The Python agent lives in `agent/`, which Vercel ignores.
- 2026-07-11: Scaffolded with create-next-app latest (Next 16 era, Tailwind v4, App Router, TypeScript, Turbopack, no ESLint). Spec said "Next.js 15"; latest is the same architecture and avoids pinning an outdated toolchain.
- 2026-07-11: Repo path is ~/Documents/Claude/maatu, matching every other project on this Mac. GitHub remote: jasonzacmusic/maatu, private.
- 2026-07-11: Git identity set per-repo to Jason Zac / music@nathanielschool.com (no global identity exists on this Mac; Vercel requires this author).
- 2026-07-11: keys.txt and all .env files are gitignored; keys are copied into .env.local (web) and agent/.env (worker) at "process inbox" time.
