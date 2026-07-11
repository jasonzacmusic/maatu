# MAATU: Build Spec for Claude Code (Orchestrator)

You are the orchestrator and builder. You own the repo, integrate every file that lands in `inbox/`, and ship a working product in 24 hours. Jason communicates in three phrases: "process inbox", "status", "done". Never require more from him than that plus taste decisions.

Hard brand rule: **no em dashes anywhere**. Not in code, comments, UI copy, commit messages, or generated content. Use commas, colons, or periods.

## 1. Product

Maatu: spoken-only practice of Kannada, Hindi, and Tamil through live voice conversations with AI characters in real Indian scenarios. The user never reads the native script. Optional romanized captions only. The experience is a phone call with a person who stays in character, followed by a coach debrief.

## 2. Stack

- **Frontend**: Next.js 15 + Tailwind, deployed on Vercel, PWA (manifest + service worker, installable). LiveKit JS client for the call screen.
- **Realtime**: LiveKit Cloud (WebRTC rooms, one room per session).
- **Agent worker**: Python, `livekit-agents` framework, runs on the Mac mini via LaunchAgent (containerize later). Pipeline per turn:
  1. STT: Sarvam Saarika, streaming, language-locked per session (`kn-IN`, `hi-IN`, `ta-IN`), code-mixing on.
  2. Brain: fast LLM (default `gemini-2.x-flash` class; abstract behind a `Brain` interface with an Anthropic fallback so we can A/B). Receives persona system prompt + rolling transcript + learner profile snippet.
  3. TTS: Sarvam Bulbul V3, streaming WebSocket, voice fixed per persona, pace/pitch/emotion parameters from persona config.
- **Latency budget**: under 1.5s user-speech-end to agent-audio-start. Measure and log per turn. If Sarvam STT streaming endpointing is slow, tune VAD (LiveKit turn detector) before blaming the model.
- **DB**: Neon Postgres + Drizzle. Tables: `users`, `sessions`, `turns`, `session_reports`, `learner_profiles`, `personas`, `vocab_items`, `review_queue`.
- **Auth**: single shared magic-link auth, minimal. Family multi-user is a name picker + row scoping, nothing more in v1.

## 3. Core loop

Pick language → pick scenario (shopfront on the Street) → pick level 1 to 5 → live call → hang up → coach debrief (spoken + card) → report saved → Street shows progress.

## 4. Persona engine

Personas are data, not code. JSON schema:

```json
{
  "id": "kn-auto-driver-l3",
  "language": "kn-IN",
  "scenario": "transport.auto",
  "level": 3,
  "name": "Manjunath",
  "voice": "<bulbul voice id, male, energetic>",
  "tts": {"pace": 1.05, "emotion": "casual"},
  "character": "Auto driver, 15 years in Bangalore, opinionated about traffic and cricket, fair but firm on fare.",
  "speech_style": "Bangalore spoken Kannada with natural English code-mixing (meter, signal, left-right, adjust maadi). Short sentences. Never literary Kannada.",
  "level_behavior": "L3: normal speed, repeats once if asked (kannada for 'say again' triggers patient repeat), mild impatience if user stalls twice.",
  "goals": "Negotiate fare, confirm destination, small talk about traffic, arrive, handle payment including UPI confusion.",
  "secret_agenda": ["past continuous tense", "numbers 40 to 90", "polite imperative 'maadi' forms"],
  "correction_policy": "NEVER correct in character. Stay in the scene. Comprehension failure is handled as a real person would: 'enu?', repeat, rephrase simpler.",
  "end_condition": "Ride ends or 8 minutes, whichever first.",
  "debrief_rubric": ["fare negotiation success", "tense accuracy", "number fluency", "response latency"]
}
```

`secret_agenda` is rewritten nightly by the self-improving job from the learner profile. The character naturally steers conversation into those constructions without ever announcing it.

## 5. The two coaches

- **Debrief coach** (every session): after hangup, run the full transcript through the Brain LLM with the rubric. Produce a structured JSON report (errors by category with the exact utterance and the natural native version, new vocab with romanization, fluency metrics: words per minute, hesitation count from STT timestamps, comprehension repairs). Render as a beautiful card AND speak a 45-second spoken summary via a dedicated warm coach voice. Three takeaways max. The coach speaks mostly in English with target-language examples, at levels 1 to 3; majority target language at levels 4 to 5.
- **Drill mode** (separate entry, not inside scenarios): shadow drills. Bulbul speaks a line from the user's own past mistakes, user repeats, app records and plays both back overlaid. No AI scoring in v1: self-judgment by ear, with a "nailed it / again" button feeding the review queue (FSRS scheduling).

## 6. Teach Mode (the differentiator, do not cut)

Jason is a music educator. Teach Mode reverses the roles: the AI is a curious student and Jason must TEACH a musical concept (rhythm, taala, melody, harmony, shruti, chords) in the target language.

- Student personas: a sharp 12-year-old, a confused adult beginner, a skeptical parent asking why their kid should learn taala. Each asks realistic follow-up questions, mishears things, asks "why" twice.
- The debrief coach evaluates TEACHING in that language: clarity, vocabulary gaps (flag every time Jason had to fall back to English for a concept word), pacing, whether the student's questions got real answers. It supplies the missing target-language vocabulary for music concepts in the report (Grok's research pack has the corpus).
- This mode is the public product's headline story: "an app where you learn a language by teaching what you love in it."

## 7. Scenario engine

Load `05_SCENARIO_LIBRARY.md` scenarios as the master list. Launch set live, everything else rendered as locked shopfronts. Each scenario family defines: setting audio bed (subtle ambience: street noise for auto, ring tone + hold music for customer care, terminal announcements for airport, at low volume under the voice), persona set across levels, end conditions, rubric.

## 8. Frontend screens (Claude Design supplies the system; you implement faithfully)

1. **The Street** (home): an illustrated Indian street. Auto stand, delivery gate, phone booth (customer care), airport gate, barber shop, chai stall (friendly chat), music school (Teach Mode). Language switch changes the street's signage language flavor. Progress lives in the world: shopfronts light up with streaks.
2. **The Call**: voice-first, near-zero text. Big living waveform or character presence, mute, hang up, "solpa nidhaanavaagi" panic button (asks the character to slow down, in character), captions toggle (romanized only).
3. **The Debrief**: spoken summary plays, card with three takeaways, transcript accessible but folded away.
4. **Progress**: streaks, minutes spoken per language, weakness heatmap, review queue entry point.

## 9. Self-improving loop (nightly LaunchAgent job)

Read last 7 days of `session_reports` per language. Then: (1) rewrite every active persona's `secret_agenda`, (2) regenerate the review queue with FSRS, (3) update `learner_profiles`, (4) write a 5-line human digest to `TASKS.md` under "Coach's notes" so Jason sees what the system decided. All of this is a Claude Code scheduled run on the Max plan: zero API cost for the loop itself.

## 10. Inbox protocol (standing rules for your CLAUDE.md)

- On "process inbox": read every file in `inbox/`, validate its REPORT footer, integrate (research → persona/speech-style updates; content → corpora seeds; design → tokens and components), move to `inbox/processed/`, update `TASKS.md`, reply in max 5 lines.
- On "status": summarize TASKS.md in max 10 lines.
- On "done": mark current milestone complete, print the next milestone's one-line goal.
- Never paste large file contents back at Jason. Never ask a question that a reasonable default can answer; make the call, log it in `DECISIONS.md`.

## 11. Definition of done (hour 24)

- From a phone browser: install PWA, tap the auto stand, haggle with Manjunath in Kannada for 5 minutes, hang up, hear the coach, see the card.
- Same flow works in Hindi and Tamil with their personas.
- Teach Mode works in Kannada with the 12-year-old student.
- Sessions and reports are in Neon; the nightly job runs and visibly rewrites one secret_agenda.
- The Street looks like nothing else on the internet.
