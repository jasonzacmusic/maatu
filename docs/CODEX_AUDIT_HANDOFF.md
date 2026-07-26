# Codex handoff: Maatu deep audit and improvement pass

Paste the block below into Codex. Written 2026-07-26 after the language-locked STT
fix (commit eda6e32). Keep this file so the brief is never lost.

---

Audit, fix and improve the Maatu voice language-learning app at ~/Documents/Claude/maatu.
Read CLAUDE.md, AGENTS.md, DECISIONS.md and TASKS.md first. Work only with the code and
the APIs that already exist in this repo. Do not add a new vendor or a new paid service.

WHAT MAATU IS
A spoken-only app for learning Kannada, Hindi and Tamil by live voice call. Two halves:
a 16-lesson beginner course taught by a teacher who leads and corrects (Meera for Kannada,
Anjali for Hindi, Kavya for Tamil), and 14 role-play scenarios with characters who stay in
role. There is also an open companion mode ("just talk") that can chat freely, teach any
topic on request, and act out any scene the learner invents. Next.js PWA on Vercel; the
Python livekit-agents worker runs on this Mac as LaunchAgent com.nsm.maatu.agent out of
~/.maatu-agent (NOT the repo, macOS TCC blocks launchd from ~/Documents).

GROUND TRUTH ABOUT THE APIs, ALL VERIFIED EMPIRICALLY ON 2026-07-26. Do not re-litigate
these; they cost real time to establish.

1. Sarvam is intact and is still both ears and voice.
   - STT: /speech-to-text, model saarika:v2.5. This is the ONLY valid saarika model;
     "saarika:v2x" is rejected with a 400. saaras:v3 also exists but it is speech-to-text
     TRANSLATE (returns English), so it is wrong for captions.
   - TTS: /text-to-speech, model bulbul:v3, one speaker per persona (agent/voices.py).
   - /translate and /transliterate both return 200 on our key. Transliterate is the right
     primitive for romanization.
2. STT IS NOW LANGUAGE AUTO-DETECT, ON PURPOSE. worker.py passes language="unknown".
   Do NOT revert this to the target language. Reason, proven with real audio: locked to
   kn-IN, the spoken English sentence "Wait, sorry, what does namaskara actually mean?"
   was transcribed as Kannada script gibberish, so the brain could not answer any English
   question. With auto-detect, pure kn/hi/ta transcribe identically to locked mode AND
   code-mixed speech returns clean romanized text. The streaming WebSocket accepts
   language-code=unknown exactly like the locked codes.
3. The brain is Gemini gemini-flash-lite-latest with NO thinking_config. Do NOT add
   thinking_budget or thinking_level back. Google repointed that alias to a model that
   rejects thinking_budget 0 with 400 INVALID_ARGUMENT, which silenced every reply in
   production on 2026-07-22. Treat any "-latest" alias as mutable and never pin tuning
   params to it.
4. Sarvam's own LLM (the plugin exports sarvam.LLM; models sarvam-30b and sarvam-105b,
   sarvam-m is deprecated) is NOT usable for a live turn. They are reasoning models: they
   burn 3000+ characters of reasoning_content and return EMPTY content at max_tokens 900,
   take 3.2 to 6.7 seconds, only accept reasoning_effort low/medium/high, and drop the
   connection at max_tokens 3000. You may evaluate it ONLY for the non-latency-critical
   coach/debrief in /api/report. Never for the live conversation.
5. Gemini native speech-to-speech (gemini-2.5-flash-native-audio-preview-09-2025 via
   google.beta.realtime.RealtimeModel, plugin already installed) DOES work for all three
   languages. It is deliberately NOT adopted because it is a preview model and preview
   dependencies already broke us once. Do not switch the app onto it in this pass.

YOUR JOB, IN THIS ORDER.

PART 1, AUDIT. Produce a table. For each item: PASS, FAIL, or NOT BUILT, plus one line of
concrete evidence (a file path and line, a log line, a measured number, an API response).
Never guess; if you cannot verify something, write NOT VERIFIED and say what you would need.
  a. End-to-end turn latency from user speech end to first agent audio, measured from
     ~/Library/Logs/maatu-agent.log across at least 5 real turns. Budget is under 1.5s.
     Report median and worst.
  b. Does the teacher actually answer an ENGLISH question mid-lesson instead of treating it
     as a pronunciation attempt? This was the headline bug. Prove it.
  c. Interruption handling: if the learner speaks while the agent is talking, does the agent
     stop cleanly and listen?
  d. Do all 14 scenarios and all 16 lessons load and open a real call, in all 3 languages?
     Anything that 404s, throws, or silently falls back to the default persona is a FAIL.
  e. Captions: never native script in the UI, correct speaker attribution, no lost turns.
  f. Lesson pass/fail gating: does a lesson only complete after a genuine speaking check?
  g. The coach debrief in /api/report: does it speak and render, and is its content actually
     grounded in the transcript rather than generic?
  h. Accuracy spot-check of the vetted romanized lexicon in curriculum.json against real
     colloquial usage, for all three languages. Flag anything bookish or wrong.
  i. Error and recovery paths: mic denied, agent offline (Mac asleep), network drop
     mid-call, LiveKit reconnect. What does the learner actually see?
  j. grep the whole repo for em dashes and report the count and locations. Hard brand rule.

PART 2, HONESTY. List everything that is stubbed, faked, hardcoded, demo data, or silently
degraded versus what the UI claims. Be blunt. Include anything the previous passes left half
done.

PART 3, FIX AND IMPROVE. Fix every FAIL and NOT BUILT, worst first. Then improve, using only
what is already here:
  - Reduce turn latency toward the 1.5s budget. Look at preemptive generation, VAD and
    endpointing settings in worker.py, TTS streaming buffer, and prompt size (the system
    prompts are large; the lesson prompt inlines the whole lexicon). Measure before and
    after and report both numbers. Do not sacrifice correctness for speed.
  - Make the open companion genuinely open: any topic, any invented scene, switch modes
    mid-call on request, and it must handle "wait", "slow down", "say that again",
    "what does that mean", "go back" and "stop" reliably.
  - Make correction feel human: catch a real mistake, give the natural form once, one retry,
    then move on warmly. Never drill the same word more than twice in a row. Tolerate
    imperfect speech recognition; a close attempt is correct.
  - Strengthen romanization using Sarvam /transliterate so no native script can ever reach
    the UI, including in the coach card and the transcript.
  - Add sensible per-scenario difficulty progression if it is cheap to do with existing data.

CONSTRAINTS.
  - Hard brand rule: NO EM DASHES anywhere, in code, comments, UI copy, commit messages or
    generated content. Use commas, colons or periods.
  - Romanized Latin only for target-language text shown to the learner. Never native script.
  - Jason Zac is a non-coder. Never leave him a terminal instruction. You run everything.
  - Commit as Jason Zac / music@nathanielschool.com (already this repo's git config).
  - After changing anything under agent/ or curriculum.json or personas/, you MUST run
    `bash agent/install_agent_service.sh` so the live worker picks it up, then confirm the
    worker re-registered in ~/Library/Logs/maatu-agent.log.
  - After changing the frontend, deploy with `vercel --prod --yes` and verify the live site.
  - Log every non-obvious decision in DECISIONS.md with a one-line reason.
  - Commit and push when done.

VERIFY LIKE YOU MEAN IT. Do not claim anything works because the code looks right. Open a
real call against the live site, read the agent log, and quote the actual evidence. If you
cannot test something (for example you cannot speak into a microphone), say so plainly and
say exactly what you did verify instead. Finish with the audit table showing what is now
PASS, and a short list of anything still open.
