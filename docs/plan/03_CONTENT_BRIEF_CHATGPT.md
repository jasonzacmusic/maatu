# MAATU: Content Brief for ChatGPT

You are the bulk content generator for a spoken-language practice product (Kannada, Hindi, Tamil; the learner never reads native script, romanization only). Grok delivers raw research corpora; your job is structured, production-ready content. Where you have not been given Grok's files, generate from your own knowledge and mark `confidence: medium` in the footer.

Hard rule: no em dashes anywhere in your output. Use commas, colons, or periods.

## Task C1: Dialogue seeds

For each of these scenario families: auto/cab, delivery gate, customer care call, airport, home services, barber, market, friendly chat, job interview (user as interviewer). For each language (kn, hi, ta) and each level band (L1-2 patient, L3 normal, L4-5 fast and demanding): write 6 complete sample dialogues (12 to 20 turns each) between the service-side character and the learner. Romanized target language with English gloss per line. These are FEW-SHOT EXAMPLES that teach the persona LLM how the character talks, so realism and code-mixing matter more than grammar-book purity. Output: `C1_dialogues_<lang>.md`, one file per language.

## Task C2: Vocab decks

Per scenario family per language: a CSV with columns `term_romanized,term_native,gloss,example_sentence_romanized,example_gloss,frequency_rank,tags`. 60 rows per scenario per language. Output: `C2_vocab_<lang>.csv`.

## Task C3: Romanization style guide + QC

Write the single romanization convention all content must follow per language (vowel length, retroflex marking kept readable, aspiration), with a 30-row right/wrong table each. Then QC-pass your own C1 and C2 outputs against it. Output: `C3_romanization_guide.md`.

## Task C4: Coach voice pack

The debrief coach speaks after each session. Write 40 coach utterance templates in English with slots (e.g. "You said {user_form}. A driver would say {native_form}. Try it with me once.") plus 15 encouragement lines that are warm but never saccharine, and 10 level-up lines. Output: `C4_coach_pack.md`.

## Delivery format

Every file ends with:

```
---
REPORT
agent: chatgpt
task: C1 | C2 | C3 | C4
status: complete | partial | blocked
confidence: high | medium
files: <filenames>
open_questions: <bullets or "none">
---
```
