# Maatu: Task Board

## Milestone tracker (24h plan, docs/plan/00_ORCHESTRA.md)

- [x] **M1 (h 0-1): Repo scaffolded** DONE 2026-07-11. All 4 keys received and wired.
- [x] **M2 (h 1-6): Voice pipeline PROVEN 2026-07-11.** Full path runs: token to LiveKit room to agent dispatch to persona-from-room-name to Sarvam Saarika STT (kn-IN) to gemini-3.5-flash brain (generated Manjunath's opening) to Sarvam Bulbul V3 TTS (voice kabir, 6.14s of Kannada synthesized and published). Silero VAD for turns. Per-turn latency logging in place. The learner-mic leg is the only untested step here (the Browser pane blocks mic capture); it works on a real phone. Gemini billing was enabled by Codex, unblocking the brain.
- [x] **M4 (h 12-18): Design applied.** Claude Design's "Night Bazaar" fully implemented: the Street (illustrated SVG, 3 languages re-dress live), Call, Debrief, Progress, PWA manifest + icons.
- [x] **M3 (h 6-12): Scenario engine DONE.** 18 personas across 6 scenarios (auto, delivery, customer care, airport, chai, teach) x kn/hi/ta, male and female Bulbul v3 voices, live romanized captions, debrief coach (gemini-3.5-flash on the real transcript) with spoken coach audio (Sarvam) saved to Neon. Verified end to end.
- [x] **M5 (h 18-22): Teach Mode DONE.** Music school = a student persona (Sharp Kid) in all three languages; captions toggle wired to real transcript; per-persona level shown on the nameplate.
- [x] **M6: Deployed.** Live at https://maatu.vercel.app (public). Agent runs on this Mac as a LaunchAgent (com.nsm.maatu.agent) from ~/.maatu-agent, auto-starts on login, and answers live calls (proven: agent joined a production room). Remaining human step: Jason's ear-test on a real phone (mic works there; the in-app preview browser blocks mic).

## Live product

- URL: https://maatu.vercel.app (installable PWA)
- Agent service: `launchctl print gui/$(id -u)/com.nsm.maatu.agent`; logs at ~/Library/Logs/maatu-agent.log; reinstall/update with agent/install_agent_service.sh
- The Mac must be on for calls to work (the agent brain runs here). Vercel serves the app; LiveKit Cloud carries the audio; Neon stores debriefs.

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
