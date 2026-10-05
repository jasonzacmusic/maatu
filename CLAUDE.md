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

- `app/`, `lib/`: Next.js 15 PWA (frontend + API routes), deploys to Vercel from repo root.
- `agent/`: Python voice agent worker (livekit-agents), deployed to LiveKit Cloud with the dispatch name `maatu-studio`. Local LaunchAgents are legacy fallbacks.
- `personas/`: persona JSON files, data not code (schema in the build spec, section 4).
- `docs/plan/`: the six orchestra briefs, the source of truth.
- `inbox/`: drop zone for Grok, ChatGPT, and Claude Design deliverables.
- `TASKS.md`: milestone tracker plus "Coach's notes" from the nightly job.
- `DECISIONS.md`: every default you chose without asking.

## Stack decisions (locked)

- Frontend: Next.js + Tailwind, PWA, Vercel.
- Realtime: LiveKit Cloud, one room per session.
- Voice (since 2026-09-28): every Kannada, Hindi, Tamil and French call runs on Gemini Live (`gemini-3.8-live`, speech to speech) in `agent/worker.py` `run_live` / `run_french`, because Sarvam Bulbul reading romanized text sounded like an outsider and replies took 2 to 3 s. The Sarvam pipeline (saaras:v4 translit STT, Bulbul v3 TTS, Gemini flash-lite brain) stays in the code as the fallback: set `MAATU_LIVE_LANGS=""`. The agent is hosted on LiveKit Cloud (`PRODUCTION=1 scripts/deploy_cloud_agent.sh`). Learners only ever see romanized captions; the app romanizes native-script text.
- DB: Neon Postgres + Drizzle.
- Latency budget: under 1.5s from user speech end to agent audio start. Log per turn.
- Personas are JSON data. `secret_agenda` is rewritten nightly. Characters NEVER correct the learner in scene.

## Teaching quality outranks latency (Jason's standing decision, 2026-07-31)

**Never shorten, thin, or strip the teacher and companion prompts in `agent/teacher.py` to buy speed.** Prompt size does cost time (measured: Gemini ttft 978ms at 1534 system tokens vs 711ms at 99), and that trade is explicitly refused. Chase latency in the pipeline instead: STT endpointing, VAD, TTS buffering, model choice.

Rewriting a prompt to be *clearer* is allowed. Removing teaching behaviour is not. Any prompt edit must still pass all of these, verified by running a real call, not by reading the code:
- a close-but-imperfect attempt is accepted as correct, not drilled again
- a wrong answer gets one warm correction, one retry, then moves on
- an English question gets the English meaning FIRST, never a pronunciation drill
- control phrases work: wait, stop, slow down, say that again, what does that mean, go back
- the learner only ever SEES romanized Latin (the app romanizes captions); the Sarvam fallback voice gets native script so it sounds local
- short turns that always end by asking the learner to say something

### Hard floors that crash the call if crossed
- `silero.VAD.load(min_silence_duration=...)` must be **>= 0.25**. Lower and `session.start` raises ValueError, so every call dies before the teacher speaks.
- `sarvam.TTS(min_buffer_size=...)` must be **>= 30**. Lower crashes the call.
