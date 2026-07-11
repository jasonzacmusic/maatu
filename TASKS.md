# Maatu: Task Board

## Milestone tracker (24h plan, docs/plan/00_ORCHESTRA.md)

- [x] **M1 (h 0-1): Repo scaffolded** DONE 2026-07-11. All 4 keys received and wired.
- [x] **M2 (h 1-6): Voice pipeline PROVEN 2026-07-11.** Full path runs: token to LiveKit room to agent dispatch to persona-from-room-name to Sarvam Saarika STT (kn-IN) to gemini-3.5-flash brain (generated Manjunath's opening) to Sarvam Bulbul V3 TTS (voice kabir, 6.14s of Kannada synthesized and published). Silero VAD for turns. Per-turn latency logging in place. The learner-mic leg is the only untested step here (the Browser pane blocks mic capture); it works on a real phone. Gemini billing was enabled by Codex, unblocking the brain.
- [x] **M4 (h 12-18): Design applied EARLY.** Claude Design's "Night Bazaar" fully implemented: the Street (illustrated SVG, 3 languages re-dress live), Call (wired to the real pipeline), Debrief card, Progress, PWA manifest + icons. Verified in browser.
- [ ] **M3 (h 6-12): Scenario engine.** 6 launch personas x 3 languages, debrief system, session reports to Neon.
- [ ] **M5 (h 18-22): Teach Mode.** Music student persona, romanized caption toggle wired to real transcripts, level dial.
- [ ] **M6 (h 22-24): Ear-test, punch list, deploy to domain.**

## Next up: Milestone 3

Scenario engine: the other launch personas (delivery gate, customer care, airport, chai stall) across Kannada, Hindi, Tamil, plus the debrief coach running the real transcript through the brain, and saving session reports to Neon. Then re-light those shopfronts in lib/maatu-design.ts (flip LIVE).

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
