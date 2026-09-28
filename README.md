# Maatu

Learn to speak Kannada, Hindi, and Tamil. Two halves that feed each other:

**Talk.** Live voice calls with AI characters in real Indian situations (auto stand, delivery gate, chai stall, kirana, market, clinic, landlord, salon, airport, customer care, music classroom), plus a 16 lesson beginner course and an open companion who will chat, teach any topic on request, or act out any scene you invent. Sarvam Saarika hears you, Sarvam Bulbul V3 answers, over LiveKit.

**Build.** The Sentence Path: tap who, action, what, when with emoji tiles and get the spoken line in Kannada, Hindi, Tamil, or French, in beats you can read aloud, then flip the tense or the person. Below it, one practice tool at a time:

- **Review** saved lines on a spaced schedule (0, 1, 3, 7, 14 days)
- **Check** any line you type or speak; every fix is tagged (tense, gender, verb, word order, missing word) with the reusable rule
- **Build** a sentence by tapping who, what, when; the verb ending lights up
- **Shapes** dock a stem to an ending, tens to units, short vowel to long
- **Frames** 20 everyday sentence shapes with a slot for any word
- **Scenes** 16 scripted two-sided conversations, including teaching the major scale and the circle of fifths
- **Commands** what a teacher says, polite and to a friend
- **Flip** one verb through every person and tense
- **Rules** eight per language
- **Decks** 167 words with memory tricks, music first

Everything is romanized Latin, colloquial spoken register (Bangalore, Delhi, Chennai), never native script and no plural endings for beginners. Every studio form comes from vetted tables in `grammar.json` and `playbooks.json`, which the voice teacher reads too, so the class and the studio can never disagree.

## Where things live

- Plan and briefs: `docs/plan/`
- Standing rules: `CLAUDE.md`
- Status and milestones: `TASKS.md`
- Every default chosen without asking: `DECISIONS.md`
- Frontend: Next.js PWA at the repo root, deploys to Vercel from the `redesign/night-bazaar` branch
- Voice agent: `agent/` (Python, livekit-agents). It runs on the always-on Mac mini as a LaunchAgent from `~/.maatu-agent` (reinstall with `agent/install_agent_service.sh`). A free LiveKit Cloud copy is deployed for tests (`scripts/deploy_cloud_agent.sh`) and can take live calls with `PRODUCTION=1`.

Live at https://maatu.vercel.app

A Nathaniel School of Music project by Jason Zac.
