# Maatu

Learn everyday spoken Tamil, Kannada, Hindi, and French at [maatu.vercel.app](https://maatu.vercel.app).

Three ways to learn share the same language choices and teaching principles:

- **Just talk:** ordinary voice or text conversations about any topic, with useful phrases, English meanings, and a question that keeps the conversation going. Text history carries into a voice call.
- **Real-life scenes:** 14 practice scenarios per language, rooted in Chennai, Bengaluru, Delhi, and Paris. Speak or type with an AI scene partner, or invent a situation. City photographs document actual places; they do not depict the fictional characters.
- **Sentence lab:** five connected steps, Who, Does, What, Describe, When. Reuse pronouns, proper names, 30 actions, suitable nouns, adjectives, and time choices. Compare the same choices across all four languages, change gender, ask a question, make it negative, hear it, save it, and practise with your teacher.

Each language also has the same 16-lesson beginner course. Close attempts count; meaningful mistakes get one correction and one retry. English meaning questions come first. Pausing, repetition, explanation, slower speech, and going back keep the activity on track. Lesson completion requires a final speaking check, never merely opening a call.

Indian-language captions use romanized Latin. The voice receives native script or native speech, and French keeps its normal accents. Pronunciation follows Chennai Tamil, Bengaluru Kannada, Delhi Hindi, and Paris French. Model output still benefits from human native-speaker review.

## Runtime

Next.js PWA on Vercel, LiveKit Cloud for live audio, Gemini Live speech to speech, and Neon for grounded call reports. The named production worker is `maatu-studio`, hosted in LiveKit Cloud's India region. Calls work without an awake Mac. Sarvam remains the Indian-language fallback. Preview speech uses server-generated native-language audio for all four languages.

Vercel's production branch is `main`. Deploy from the repository root. Redeploy the cloud worker with `PRODUCTION=1 scripts/deploy_cloud_agent.sh`; its data includes `french-reference.txt`, all persona JSON, and the existing full teaching prompts.

## Verification and project records

- `scripts/verify-learning.ts`: 13 linguistic golden cases, 130,432 structurally valid combinations, 56 scenario records, and 64 lesson routes. Structural coverage is not an exhaustive native-speaker grammar certification.
- `scripts/e2e_voice_probe.py`: real LiveKit calls using synthetic spoken learner audio, multi-turn sequences, and reliable control acknowledgments.
- `.impeccable/review/`: production screenshots, visual review, and the ordered fix verdict.
- `PRODUCT.md` and `DESIGN.md`: product principles and the implemented design system.
- `TASKS.md` and `DECISIONS.md`: milestones and implementation choices.
- `public/photo-credits.txt`: photo sources and licenses, linked from settings.
- `docs/plan/`: the original briefs. `CLAUDE.md` contains standing project instructions.

Measured cloud turns remain around two seconds, above the strict 1.5-second budget. Preserve teaching quality while improving latency in the pipeline.

A Nathaniel School of Music project by Jason Zac.

<!-- REPORT: agent=Codex; task=spoken-studio-redesign; status=complete; files=README.md; open_questions=none -->
