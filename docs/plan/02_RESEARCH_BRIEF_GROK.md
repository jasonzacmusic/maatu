# MAATU: Research Brief for Grok

You are the research arm of a product build. Deliver ONE markdown file per task below. Be exhaustive, cite sources where possible, and use romanization (Latin script) alongside any native script. The end user never reads native script, so romanization quality matters: use consistent, intuitive schemes (ISO-adjacent but readable, e.g. "swalpa adjust maadi", "thoda time lagega", "konjam porunga").

Hard rule: no em dashes anywhere in your output. Use commas, colons, or periods.

## Task G1: Authentic speech corpora (the big one)

For each language (Kannada: Bangalore register, Hindi: everyday urban north-Indian register, Tamil: Chennai spoken register) and each scenario below, deliver 50 real, natural utterances a native SERVICE-SIDE speaker would say, plus 30 utterances the CUSTOMER (learner) needs. Romanization + literal gloss + natural English meaning for every line. Mark code-mixed English words as they naturally occur (do not purify the language; "meter haaki straight hogi" is correct, textbook Kannada is wrong).

Scenarios: auto/cab (negotiation, directions, payment, UPI trouble), food/parcel delivery at the gate (finding the address, security, tips), customer care phone call (new broadband/SIM/gas connection: booking, ID requirements, appointment slots; plus a complaint variant), airport (check-in, security, gate change, delay, asking staff), home services (plumber, electrician, AC technician: describing a problem, supervising, negotiating price, paying), barber/salon (describing a haircut, length, beard, small talk), market bargaining, friendly neighbor/colleague chit-chat (weather, traffic, cricket, food), job interview (interviewER side: questions, probes, courtesy phrases).

## Task G2: Music pedagogy vocabulary

The founder teaches music. For Kannada, Hindi, and Tamil: the working vocabulary a teacher needs to explain rhythm, beat, taala, laya, melody, raga, swara, shruti, harmony, chords, scales, tempo, dynamics, practice instructions ("listen first, then clap", "sing this back to me", "you are rushing"). 120+ items per language, romanized, with the colloquial term actually used by music teachers (Carnatic and Hindustani terms where they ARE the colloquial term), not dictionary translations. Include 20 full teacher sentences per language.

## Task G3: Register and realism notes

Per language: politeness levels actually used with service people vs friends vs candidates in an interview; regional notes (Bangalore Kannada vs Mysore; how much Hindi works in Bangalore airports; Chennai auto realities); the 20 most common learner mistakes native speakers notice; filler words and backchannels natives use ("haan haan", "sari sari", "aacha").

## Task G4: Verification sweep

Current Sarvam pricing (STT streaming, Bulbul V3 TTS, voice cloning terms), Bulbul V3 voice catalog with IDs and character notes (which voices sound like an auto driver, a customer care agent, a 12-year-old), LiveKit Cloud free tier limits, and a competitor scan: every product doing spoken-only Indic language practice (include global ones like Speak, Praktika, TalkPal; note what none of them do that Maatu's Teach Mode does).

## Delivery format

One file per task: `G1_speech_corpora.md`, `G2_music_vocab.md`, `G3_register_notes.md`, `G4_verification.md`. Each ends with:

```
---
REPORT
agent: grok
task: G1 | G2 | G3 | G4
status: complete | partial | blocked
files: <filenames>
open_questions: <bullets or "none">
---
```
