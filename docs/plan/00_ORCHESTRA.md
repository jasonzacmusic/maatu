# MAATU: Orchestra Master Plan

Working title: **Maatu** (ಮಾತು, "speech"). Rename anytime; the codebase uses `maatu` throughout.

One line: a spoken-only language practice product where you live real Indian scenarios (auto stand, delivery gate, customer care call, airport, plumber visit, music classroom) with AI characters voiced by Sarvam, in Kannada, Hindi, and Tamil. No reading. No script. Just talk.

Decision, locked: **web app (PWA)**, installable on any phone from a link. Native app only if the PWA ever hits a wall. Reason: LiveKit works in mobile browsers, family and friends onboard with one URL, no App Store delay, and it ships in 24 hours.

---

## The Orchestra

| Player | Role | Gets | Returns |
|---|---|---|---|
| **Claude Code** (Mac mini) | ORCHESTRATOR + builder. Owns the repo, integrates everything, deploys. | `01_BUILD_SPEC_CLAUDE_CODE.md` + everything in `inbox/` | Working product, one-line status reports |
| **Grok 4.5** | Deep research: authentic speech, phrase corpora, regional realism, pricing verification | `02_RESEARCH_BRIEF_GROK.md` | One markdown file per task, dropped in `inbox/` |
| **ChatGPT** | Bulk content: dialogue seed corpora, vocab decks, romanization QC | `03_CONTENT_BRIEF_CHATGPT.md` | Markdown/CSV files, dropped in `inbox/` |
| **Claude Design** | The visual system and key screens, stunning and unique | `04_DESIGN_BRIEF_CLAUDE_DESIGN.md` | Design tokens + HTML/React mocks, dropped in `inbox/` |
| **Claude (chat)** | Architect, spec author, reviewer, tie-breaker | Your questions, agents' outputs for review | Specs, verdicts, next briefs |
| **Jason** | API signups, ear-testing every voice, taste decisions, saying "done" | Signup checklist below | Files into `inbox/`, three magic words |

## The Reporting Protocol (so you barely type)

Every agent output file MUST end with this exact footer:

```
---
REPORT
agent: grok | chatgpt | claude-design
task: <task id from the brief>
status: complete | partial | blocked
files: <list of filenames delivered>
open_questions: <bullet list or "none">
---
```

Your workflow is three phrases, nothing else:

1. Drop any delivered file into the repo's `inbox/` folder (drag and drop, or attach in Claude Code).
2. Say **"process inbox"**. Claude Code reads every new file, integrates it, moves it to `inbox/processed/`, updates `TASKS.md`, and replies with max 5 lines of status.
3. Say **"status"** for the current TASKS.md summary, or **"done"** to approve and move to the next milestone.

Claude Code's CLAUDE.md will contain these standing rules, so you never re-explain.

## Jason's signup checklist (only human-required steps, ~20 min)

1. **Sarvam AI**: dashboard.sarvam.ai, create API key. Free credits exist; add a small balance. Grab the key.
2. **LiveKit Cloud**: cloud.livekit.io, free tier is plenty for one user. Grab URL + API key + secret.
3. **LLM brain key**: one of Gemini API (recommended for latency + cost) or Anthropic API. Grab the key.
4. **Neon**: you know the drill. One `maatu` database, grab the connection string.
5. Put all four in a `keys.txt` and hand to Claude Code once. It writes `.env` and never shows them again.

Note on credentials: do these signups yourself. Browser agents should not be handed passwords or payment details; it is 20 minutes and it is the only typing-heavy thing you do all day.

## 24-Hour Timeline

| Hours | Milestone | Owner |
|---|---|---|
| 0 to 1 | Signups done, keys handed over, repo scaffolded | Jason + Claude Code |
| 0 to 3 (parallel) | Research pack delivered | Grok |
| 0 to 3 (parallel) | Design system + 4 screen mocks delivered | Claude Design |
| 0 to 4 (parallel) | Dialogue corpora + vocab decks delivered | ChatGPT |
| 1 to 6 | Voice pipeline proven: mic in browser → Sarvam STT → LLM persona → Bulbul V3 → speakers. The Kannada auto driver speaks. | Claude Code |
| 6 to 12 | Scenario engine + 6 launch personas × 3 languages, debrief system, session reports to DB | Claude Code |
| 12 to 18 | Design applied, home screen (the Street), live call screen, debrief card, PWA install | Claude Code |
| 18 to 22 | Teach Mode (music student persona), romanized caption toggle, level dial | Claude Code |
| 22 to 24 | Jason ear-tests everything, punch list, deploy to your domain | Jason + Claude Code |

Launch scope (day one): Kannada, Hindi, Tamil × {Auto/Cab, Delivery Gate, Customer Care Call, Friendly Chat, Airport} + Teach Mode in Kannada. Everything else in the Scenario Library ships as locked shopfronts, visible but "opening soon", which also makes the product feel bigger than day one.

## Parking Lot (in the brain, not in the sprint)

- **Sarvam voice cloning**: consent-based, needs a 30 to 60 second sample of your voice. Use cases queued: (a) your cloned voice delivering music lessons in Hindi/Tamil/Kannada, (b) dubbing your existing YouTube teaching content into Indic languages (Sarvam translate + your cloned Bulbul voice; ElevenLabs dubbing is the global alternative to benchmark against), (c) the in-app coach speaking in YOUR voice, which is a wild and lovely idea for a public product built by a teacher.
- **Sarvam beyond TTS/STT**: translation API, document digitization, and batch transcription of your multilingual class recordings.
- **Subjects wing** (physics, chemistry, biology, math, astronomy, Big Bang, evolution): separate build, separate spec, after the language product stands. The plan remains curriculum map first, rolling frontier of lessons, encyclopedia bank of concept pages generated end-to-end by Claude Code batches. No open-source self-training model: a small local model retraining itself produces worse lessons than scheduled Claude Code batches and adds an ops burden. The "free ever-learning AI" is Claude Code on your Max plan, on a schedule, reading your data. That fight is settled unless you reopen it.
- Spanish and other non-Indic languages: same architecture, swap Sarvam for a multilingual stack. Later.

## Self-Improving Loop (v1, ships in the 24h)

Every session writes a structured report (errors by category, vocab encountered, fluency metrics, transcript) to Neon. A nightly Claude Code job reads the last 7 days and (1) rewrites each persona's secret agenda so characters naturally steer conversations into your weak constructions, (2) rebuilds your review prompts, (3) appends to `learner_profile.json` per language. The characters conspire against your weaknesses. That is the brilliance requirement, mechanized.
