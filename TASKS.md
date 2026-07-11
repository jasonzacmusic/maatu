# Maatu: Task Board

## Milestone tracker (24h plan, docs/plan/00_ORCHESTRA.md)

- [x] **M1 (h 0-1): Repo scaffolded** DONE 2026-07-11. All 4 keys received and wired.
- [~] **M2 (h 1-6): Voice pipeline.** Proven end to end EXCEPT the brain LLM call. Token to LiveKit room to agent dispatch to persona routing to Sarvam STT + Bulbul V3 TTS (voice kabir) + Silero VAD all initialize; the agent joins as Manjunath and reaches the LLM. BLOCKED at the brain: the Gemini key has zero free-tier quota in region (429), needs billing. Worker is now provider flexible (Anthropic preferred when its key is present). See "Blocker" below.
- [x] **M4 (h 12-18): Design applied EARLY.** Claude Design's "Night Bazaar" fully implemented: the Street (illustrated SVG, 3 languages re-dress live), Call (wired to the real pipeline), Debrief card, Progress, PWA manifest + icons. Verified in browser.
- [ ] **M3 (h 6-12): Scenario engine.** 6 launch personas x 3 languages, debrief system, session reports to Neon.
- [ ] **M5 (h 18-22): Teach Mode.** Music student persona, romanized caption toggle wired to real transcripts, level dial.
- [ ] **M6 (h 22-24): Ear-test, punch list, deploy to domain.**

## Blocker (needs Jason or Codex, one step)

The brain LLM cannot generate: the Gemini key's free tier is zero quota in India (Google restricts it). Two unlock paths, pick one:
1. Enable billing on the Google Cloud project behind the Gemini key (Gemini Flash is nearly free per call). Then everything runs with the existing key.
2. Add a billed ANTHROPIC_API_KEY line to keys.txt (from console.anthropic.com). The worker prefers Anthropic automatically when that key is present.

## Waiting on Jason (the only human steps)

1. Sarvam AI key: dashboard.sarvam.ai
2. LiveKit Cloud: cloud.livekit.io (URL + API key + secret)
3. Gemini API key (or Anthropic)
4. Neon connection string (database name: maatu)

Put all of them in one keys.txt, drop it in `inbox/` or paste in chat, then say "process inbox".

## Waiting on other agents (briefs already written, in docs/plan/)

- Grok: research pack (02_RESEARCH_BRIEF_GROK.md)
- ChatGPT: dialogue corpora + vocab decks (03_CONTENT_BRIEF_CHATGPT.md)
- Claude Design: design tokens + 4 screen mocks (04_DESIGN_BRIEF_CLAUDE_DESIGN.md)

## Coach's notes

(The nightly self-improving job writes its 5-line digest here from M3 onward.)
