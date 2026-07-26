@AGENTS.md

# Maatu: Standing Rules for Claude Code

Maatu (ಮಾತು, "speech"): spoken-only practice of Kannada, Hindi, and Tamil through live voice calls with AI characters in real Indian scenarios. Full specs live in `docs/plan/`. Read `docs/plan/01_BUILD_SPEC_CLAUDE_CODE.md` before any build work.

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
- `agent/`: Python voice agent worker (livekit-agents), runs on this Mac mini via LaunchAgent.
- `personas/`: persona JSON files, data not code (schema in the build spec, section 4).
- `docs/plan/`: the six orchestra briefs, the source of truth.
- `inbox/`: drop zone for Grok, ChatGPT, and Claude Design deliverables.
- `TASKS.md`: milestone tracker plus "Coach's notes" from the nightly job.
- `DECISIONS.md`: every default you chose without asking.

## Stack decisions (locked)

- Frontend: Next.js + Tailwind, PWA, Vercel.
- Realtime: LiveKit Cloud, one room per session.
- STT: Sarvam Saarika v2.5 streaming with `language="unknown"` auto-detect for every call, so English questions and code-mixed speech remain understandable. TTS: Sarvam Bulbul V3 (streaming WS, voice per persona). Brain: Gemini Flash class behind a `Brain` interface with Anthropic fallback.
- DB: Neon Postgres + Drizzle.
- Latency budget: under 1.5s from user speech end to agent audio start. Log per turn.
- Personas are JSON data. `secret_agenda` is rewritten nightly. Characters NEVER correct the learner in scene.
