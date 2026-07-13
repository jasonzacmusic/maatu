# Maatu: Task Board

## Milestone tracker (24h plan, docs/plan/00_ORCHESTRA.md)

- [x] **M1 (h 0-1): Repo scaffolded** DONE 2026-07-11. All 4 keys received and wired.
- [x] **M2 (h 1-6): Voice pipeline PROVEN 2026-07-11.** Full path runs: token to LiveKit room to agent dispatch to persona-from-room-name to Sarvam Saarika STT (kn-IN) to gemini-flash-lite-latest to Sarvam Bulbul V3 TTS. A production LiveKit audio probe publishes spoken learner audio and verifies full replies; the latest Kannada run measured 223 ms externally, with first-audio worker lines of 23 ms and 35 ms for its two detected speech segments. Silero VAD logs every turn.
- [x] **M4 (h 12-18): Design applied.** Claude Design's "Night Bazaar" fully implemented: the Street (illustrated SVG, 3 languages re-dress live), Call, Debrief, Progress, PWA manifest + icons.
- [x] **M3 (h 6-12): Scenario engine DONE.** 18 personas across 6 scenarios (auto, delivery, customer care, airport, chai, teach) x kn/hi/ta, male and female Bulbul v3 voices, live romanized captions, debrief coach (gemini-3.5-flash on the real transcript) with spoken coach audio (Sarvam) saved to Neon. Verified end to end.
- [x] **M5 (h 18-22): Teach Mode DONE.** Music school = a student persona (Sharp Kid) in all three languages; captions toggle wired to real transcript; per-persona level shown on the nameplate.
- [x] **M6: Deployed.** Live at https://maatu.vercel.app (public). Agent runs on this Mac as a LaunchAgent (com.nsm.maatu.agent) from ~/.maatu-agent, auto-starts on login, and answers live calls.
- [x] **M7: Section 11 acceptance repaired 2026-07-12.** PWA service worker, three-language audio probes, Kannada Teach Mode, real Neon rows, spoken coach plus card payload, real per-device Street stats, Romanized captions, zero native-script UI copy, zero em dashes, and a production nightly agenda rewrite are verified.
- [x] **M8: Teacher-led beginner courses repaired 2026-07-12.** Kannada, Hindi, and Tamil each have the same 15-lesson spoken course, proactive teacher openings, chapter questions, correction and retry, a three-prompt final check, honest pass-gated completion, and an open Ask Your Teacher session.
- [x] **M9: Professional beginner learning experience completed 2026-07-13.** Course-first onboarding and return flow, in-class language switching, recommended lesson, previews, passed or paused results, three-language course progress, persistent accessibility settings, self-hosted fonts, native-script-free UI, and a real slow-down control.

## Live product

- URL: https://maatu.vercel.app (installable PWA)
- Agent service: `launchctl print gui/$(id -u)/com.nsm.maatu.agent`; logs at ~/Library/Logs/maatu-agent.log; reinstall/update with agent/install_agent_service.sh
- The Mac must be on for calls to work (the agent brain runs here). Vercel serves the app; LiveKit Cloud carries the audio; Neon stores debriefs.

## Waiting on Jason

No credential setup is pending. A physical phone ear test remains useful as a device check, but the production audio path is covered by the repeatable LiveKit probe.

## Waiting on other agents (briefs already written, in docs/plan/)

- Grok: research pack (02_RESEARCH_BRIEF_GROK.md)
- ChatGPT: dialogue corpora + vocab decks (03_CONTENT_BRIEF_CHATGPT.md)
- Claude Design: design tokens + 4 screen mocks (04_DESIGN_BRIEF_CLAUDE_DESIGN.md)

## Coach's notes

- Teacher-mode verification: all 45 language and lesson combinations validated against the curriculum. Live Lesson 1 rooms `teacher-kn-l1__e2e1783874470`, `teacher-hi-l1__e2e1783874507`, and `teacher-ta-l1__e2e1783874546` taught proactively; Tamil caught and corrected a pronunciation miss.
- Beginner UX verification: mobile browser confirmed course-first onboarding, language switching, lesson preview, honest paused result, zero completion after early hangup, three-language progress, and zero console warnings. LiveKit control logs confirm the slow-down request changes the live Sarvam pace after agent acknowledgment.
- Open tutoring verification: Tamil room `tutor-ta__e2e1783874827` answered the student's meaning question directly, gave a plain-English meaning, and requested one spoken use.
- Nightly repair run: 2026-07-12T15:21:54.403Z. The protected production route read 5 reports across 3 languages, rewrote 7 rows, learned only from exact-persona sessions, and restored unrelated Kannada agendas to their defaults.
- Cron authentication repaired: production `CRON_SECRET` is now non-empty and the authorized route returned 200 after the production redeploy.
- Acceptance rerun: 2026-07-12T15:16Z. Production mobile browser showed a live romanized Kannada caption with zero native-script characters; Kannada, Hindi, Tamil, and Kannada Teach Mode LiveKit probes all returned full replies.
- Latency instrumentation repaired and the LaunchAgent reinstalled. The fresh Kannada room kn-auto__e2e1783869287 logged only in-budget first-audio measurements.
- Nightly run: 2026-07-12T01:03:01.149Z.
- Source: 2 session reports from the last 7 days.
- Rewritten: 6 Kannada persona agendas.
- Sample: kn-auto now elicits "Extra kodalla, meter mele banni."
- Active agenda confirmed by the live worker at 2026-07-12T01:03:01.106Z.
