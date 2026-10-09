@AGENTS.md

# Maatu: Standing Rules for Claude Code

Maatu (ಮಾತು, "speech"): spoken-language practice in Tamil, Kannada, Hindi, and French through ordinary voice and text conversation, local scenarios, and a reusable sentence lab. Live calls use AI practice partners. Full specs live in `docs/plan/`. Read `docs/plan/01_BUILD_SPEC_CLAUDE_CODE.md` before any build work.

## Who you are working with

Jason Zac (always "Jason Zac", never "Zak" or "Zach"): musician, educator, non-coder. He communicates in three phrases plus taste decisions. Never give him terminal instructions. Always commit and push yourself.

## Hard brand rule

**No em dashes anywhere.** Not in code, comments, UI copy, commit messages, or generated content. Use commas, colons, or periods.

## The three phrases

1. **"process inbox"**: read every file in `inbox/`, validate its REPORT footer, integrate it (research goes to persona and speech-style updates; content goes to corpora seeds; design goes to tokens and components), move the file to `inbox/processed/`, update `TASKS.md`, reply in max 5 lines.
2. **"status"**: summarize `TASKS.md` in max 10 lines.
3. **"done"**: mark the current milestone complete in `TASKS.md`, print the next milestone's one-line goal.

## Standing behavior

- Never paste large file contents back at Jason.
- Never ask a question that a reasonable default can answer. Make the call and log it in `DECISIONS.md` with a one-line reason.
- Every agent-delivered file must end with the REPORT footer (agent, task, status, files, open_questions). If the footer is missing, integrate anyway and note it in TASKS.md.
- Keys arrive once as a `keys.txt` (in `inbox/` or pasted in chat). Write them to `.env.local` and `agent/.env`, confirm which keys landed, then never print them again. `keys.txt` is gitignored.
- Commit as Jason Zac / music@nathanielschool.com (already set in this repo's git config; there is no global git identity on this Mac and Vercel rejects other authors).

## Repo layout

- `app/`, `lib/`: Next.js 16 PWA (frontend + API routes), deploys to Vercel from repo root.
- `agent/`: Python voice agent worker (livekit-agents), deployed to LiveKit Cloud with the dispatch name `maatu-studio`. Local LaunchAgents are legacy fallbacks.
- `personas/`: persona JSON files, data not code (schema in the build spec, section 4).
- `docs/plan/`: the six orchestra briefs, the source of truth.
- `inbox/`: drop zone for Grok, ChatGPT, and Claude Design deliverables.
- `TASKS.md`: milestone tracker plus "Coach's notes" from the nightly job.
- `DECISIONS.md`: every default you chose without asking.

## Stack decisions (locked)

- Frontend: Next.js + Tailwind, PWA, Vercel.
- Realtime: LiveKit Cloud, one room per session.
- Voice (since 2026-10-06, Jason requested fixed local voices and provider independence): Kannada, Tamil and Hindi use Sarvam Saaras v4 code-mixed recognition locked to the call language, the complete Gemini 3.5 Flash teaching brain, and a fixed Sarvam persona speaker with native-script input (Bulbul v4 flash for Kannada, v3 for Hindi and Tamil). French uses Gemini 3.8 Live. `agent/providers.py` pins one configured profile per room; operators can select live or fixed-native profiles without changing teaching, history or controls. There is no silent provider/voice fallback. `lib/model-adapters.ts` handles web model transport; `lib/speech.ts` handles exact phrase playback and the opposite-gender correction voice. Calls run in isolated prewarmed processes so a failed room connection cannot terminate another call. Deploy with `PRODUCTION=1 scripts/deploy_cloud_agent.sh`. Captions are romanized locally; native source is retained for speech, teaching and translation.
- DB: Neon Postgres + Drizzle.
- Latency budget: under 1.5s from user speech end to agent audio start. Log per turn.
- Personas are JSON data. `secret_agenda` is rewritten nightly. Characters never lecture or point out mistakes in scene; they echo the right form back naturally (soft recast) and step half out for one short English help sentence only when asked.
- Recognition is locked to the call language (codemix). Endpointing floor for beginners: min 0.8 s, max 2.0 s. Kannada voices are Bulbul v4 flash (chaitra / chetan); Hindi and Tamil stay on Bulbul v3.
- The front desk scene answers about Nathaniel School only from `knowledge/nsm-school.md`. Never add fees, discount codes or a founding year there; update `knowledge/SOURCES.md` when facts change, then run `agent/build_personas.py`.
- Captions: `lib/romanize-client.ts` owns the Tamil and Hindi sound rules. Run `npx tsx scripts/verify-romanize.ts` after any change.

## Teaching quality outranks latency (Jason's standing decision, 2026-07-31)

**Never shorten, thin, or strip the teacher and companion prompts in `agent/teacher.py` to buy speed.** Prompt size does cost time (measured: Gemini ttft 978ms at 1534 system tokens vs 711ms at 99), and that trade is explicitly refused. Chase latency in the pipeline instead: STT endpointing, VAD, TTS buffering, model choice.

Rewriting a prompt to be *clearer* is allowed. Removing teaching behaviour is not. Any prompt edit must still pass all of these, verified by running a real call, not by reading the code:
- a close-but-imperfect attempt is accepted as correct, not drilled again
- a wrong answer gets one warm correction, then moves on. In conversation and scenes the correction is a recast inside the reply and the follow-up question invites reuse; lessons, practice mode and lab sentences keep one explicit retry (Jason, 2026-10-09: "softly teach me, never stop the conversation to teach")
- English the learner says is answered AND given back in the target language, so they learn to say their own thought
- an English question gets the English meaning FIRST, never a pronunciation drill
- control phrases work: wait, stop, slow down, say that again, what does that mean, go back
- the learner only ever SEES romanized Latin (the app romanizes captions); the fixed Sarvam voice gets native script so it sounds local
- short turns that always end by asking the learner to say something

### Hard floors that crash the call if crossed
- `silero.VAD.load(min_silence_duration=...)` must be **>= 0.25**. Lower and `session.start` raises ValueError, so every call dies before the teacher speaks.
- `sarvam.TTS(min_buffer_size=...)` must be **>= 30**. Lower crashes the call.

## Conversation contracts (2026-10-06)

- Save every completed voice segment and submitted text turn immediately on this device. Preserve original language versions; switching a continuing conversation translates all turns in order and retains the character, place, prices and topic. Never erase a history to start a fresh conversation. Offer a download and expose storage failures.
- Side coaching is asynchronous and independent of the scene partner. Grammar checks may suggest a clear correction; pronunciation checks require an explicit request with actual audio. Uncertain audio must never become a confident pronunciation warning. Private recording is ephemeral and never published to the conversation room.
- Pause mutes local input and remote output immediately, then requires the worker acknowledgment before private practice. Resume restores the previous microphone choice. The sentence diagram freezes while paused.
- Sentence explanations must reproduce a phrase actually spoken. Semantic-role relationships and spoken word order are separate. Honorific addresses are not invented doers; requests do not acquire invented statement tenses. Coherent changes preserve topic and coordinate verb tense with time.

<!-- REPORT: agent=Codex; task=conversation-standing-contracts; status=complete; files=CLAUDE.md; open_questions=none -->
