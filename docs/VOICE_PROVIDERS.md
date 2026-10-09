# Maatu voice providers

## Checked 9 October 2026

Measured from this Mac against the live keys:

| Service | Model | Result |
| --- | --- | --- |
| Sarvam speech | bulbul:v3, bulbul:v4-flash | Working. 0.7 to 0.9 s per phrase; streaming first audio 0.31 to 0.35 s. |
| Sarvam recognition | saaras:v4 (codemix) | Working. 0.27 to 0.36 s for a short phrase, exact Kannada round trip. Locked to the call language it keeps English questions in English. |
| Sarvam chat | sarvam-m | Deprecated by Sarvam (sarvam-105b replaces it). Maatu never used it. |
| Gemini text | gemini-3.5-flash | Working in all four languages, about 3.2 to 3.9 s per typed reply. |
| Gemini speech (French) | gemini-3.8-flash-tts | Working, about 5 s per French phrase. |
| Gemini Live (French calls) | gemini-3.8-live | Working, 1.3 to 2.0 s from learner speech end to reply audio. |
| LiveKit Cloud worker | maatu-studio, ap-south | Running; it sleeps when idle and wakes on the first call. |

Changes made: Kannada speaks with the Bulbul v4 flash conversational speakers (chaitra female, chetan male). A blind A/B with the clip order swapped preferred v4 for Kannada 4 of 4 times; Hindi tied 2 to 2 and Tamil has no conversational v4 speaker, so both stay on v3. Recognition is locked to the call language after auto-detect wrote Tamil speech in Telugu letters. Malayalam and Telugu phrases use Bulbul v3 for Say it in other languages.

Verdict: Sarvam is the right speech provider for Kannada, Tamil, Hindi, Malayalam and Telugu today. It is built for Indian languages and code-mixed speech, it was the fastest service measured here, and its rates are low. Keep Gemini for the teaching brain and for French. Credible alternatives if Sarvam ever degrades, each already fits the adapter design: Google Chirp 3 HD voices (lists kn, ta, ml, te), ElevenLabs v3 (lists Kannada, Tamil and Malayalam among 74 languages, at a higher price) and Microsoft Azure neural voices. None was measured to beat Sarvam on Indian accent; vendor language lists do not prove a local accent. A native listener should review recordings once a term.

Sources for the alternatives: [Google Chirp 3 HD](https://docs.cloud.google.com/text-to-speech/docs/chirp3-hd), [ElevenLabs models](https://elevenlabs.io/docs/overview/models), [Sarvam models](https://docs.sarvam.ai/api/getting-started/models).

## Earlier record, 6 October 2026

Maatu originally ran Gemini Live for all four languages. This release uses Sarvam Saaras v4 for Indian recognition, Gemini 3.5 Flash for the complete teaching brain, and fixed Sarvam Bulbul v3 persona voices for Kannada, Tamil and Hindi. French uses Gemini 3.8 Live. Phrase playback uses Sarvam for Indian languages and Gemini 3.8 Flash TTS for French. Explicit pronunciation assessments listen to audio through Gemini. A proposed high-confidence Indian pronunciation warning receives an independent Sarvam recognition check; uncertainty or a matching recognized phrase suppresses the warning. Text-only grammar checks never diagnose an accent.

| Option | Fit for Maatu | Published API rate |
| --- | --- | --- |
| Sarvam Saaras v4 + Bulbul v3 | Recommended Indian speech shortlist. Covers Kannada, Tamil, Hindi and code-mixed English; Bulbul does not cover French. | STT ₹30/hour of audio, Bulbul ₹30/10,000 characters. Sarvam 105B conversations: ₹29.28 input / ₹73.20 output per million tokens. |
| Gemini Live / Flash | Recommended for the conversation/teaching layer and French. Fixed Indian TTS gives more predictable speaker identity. | 3.8 Live audio: $0.005/input minute and $0.018/output minute, plus text. 3.5 Flash: $1.50 input / $9 output per million tokens. 3.8 Flash introductory text rates: $0.75 / $3.75 through 31 December 2026. |
| OpenAI Realtime / TTS | Worth a measured comparison. TTS lists all four languages, but its voices are optimized for English; language support alone does not establish a local accent. | Realtime 2.1 audio: $32 input / $64 output per million tokens; mini: $10 / $20. Compare actual usage, not token prices across different audio encodings. |
| ElevenLabs Scribe | Recognition shortlist; its current transcription language list includes all four. Evaluate speech output separately. | Pricing depends on product/plan and usage tier; no unverified single rate quoted. |

Sources: [Sarvam models](https://docs.sarvam.ai/api/getting-started/models), [Sarvam pricing](https://docs.sarvam.ai/api/getting-started/pricing), [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing), [Gemini latest model](https://ai.google.dev/gemini-api/docs/latest-model), [OpenAI pricing](https://developers.openai.com/api/docs/pricing), [OpenAI TTS language support](https://developers.openai.com/api/docs/guides/text-to-speech), [ElevenLabs transcription](https://elevenlabs.io/docs/overview/capabilities/speech-to-text).

These recommendations are an inference from documented coverage and Maatu's real-call tests, not a universal ranking. Native listeners should judge accent, colloquial grammar and code-mixing on the same recordings. Vendor claims are not independent evaluations. Rates exclude hosting, transport, taxes, additional model context and failed/retried requests.

Maatu's full-prompt comparison rejected Flash-Lite: it returned Latin words to a native-script speech pipeline and saved little time. The latest 3.8 Flash comparison was slower than 3.5 on the measured request, so this release keeps the tested teaching brain. Indian end-to-end live replies usually took about 4 to 5 seconds in the initial local sample, with a later 10.3-second recognition delay outlier. The final public four-language sample measured 2.275 to 3.209 seconds, median 3.054 seconds, from learner speech ending to first reply audio. This small sample does not establish a worst-case bound; the standing 1.5-second target is still unmet. Separate uncached phrase synthesis measured 3.811 to 3.874 seconds for Indian voices and 9.917 seconds for French in the public API matrix. Full teaching prompts were preserved.

# Configuration without changing teaching logic

`agent/providers.py` owns realtime adapters. A room selects and pins its plan once. Calls use isolated prewarmed worker processes; a failed connection cannot shut down the other rooms through a shared thread worker. `lib/model-adapters.ts` owns web model transport. `lib/speech.ts` owns pronunciation playback. History, translation validation, sentence roles, correction confidence, native speech, Latin captions and pause behavior remain application contracts.

| Operator setting | Choices / purpose |
| --- | --- |
| `MAATU_VOICE_PROFILE_KN`, `_TA`, `_HI`, `_FR` | `fixed-native` or `gemini-live`. French requires the live profile. |
| `MAATU_LIVE_MODEL_KN`, `_TA`, `_HI`, `_FR` | Live model per language. |
| `MAATU_BRAIN_PROVIDER` | `gemini`, `anthropic`, `openai-compatible`. |
| `MAATU_SPOKEN_BRAIN_MODEL` | Conversation brain model; default Gemini 3.5 Flash. |
| `MAATU_BRAIN_BASE_URL`, `MAATU_BRAIN_API_KEY` | Private compatible chat endpoint/key for the realtime brain. |
| `MAATU_SPOKEN_THINKING_LEVEL` | Supported thinking level for the selected model; default `minimal`. |
| `MAATU_STT_MODEL`, `MAATU_SARVAM_TTS_MODEL` | Sarvam recognition/synthesis model versions. |
| `MAATU_TEXT_PROVIDER`, `MAATU_TEXT_MODEL` | `gemini` or `openai-compatible` for chat, translations and text explanations. |
| `MAATU_TEXT_BASE_URL`, `MAATU_TEXT_API_KEY` | Private compatible chat endpoint/key for web routes. |
| `MAATU_TTS_PROVIDER` or `_KN`, `_TA`, `_HI`, `_FR` | `sarvam` or `gemini`, with no silent fallback. |
| `MAATU_TTS_MODEL`, `MAATU_ASSESSMENT_MODEL` | Gemini synthesis or recorded-audio assessment model. |

Compatible endpoints use the usual Bearer key and JSON chat response contract; an incompatible vendor needs a new transport adapter. The two shipping voice profiles are tested. Alternate compatible/Anthropic settings are available but are not presented as evaluated winners. No browser API keys or random per-turn provider selection. Cache identity includes language, pace, coach persona and provider/model settings.

Changing providers requires the same behavioral checks: close attempts accepted, one correction and retry for a wrong answer, English meaning first, coherent tenses, native speech matching Latin captions, organic scene continuation, pause isolation, and saved/translatable history. New provider configuration cannot relax those requirements. Cost routing must retain the complete teacher prompt.

History is stored on the current device, including original and translated versions. Browser data clearing removes it. Download is available. Microphone samples are ephemeral; only an explicit pronunciation check uploads a recent sample. Private practice pauses the scene before recording and does not publish that recording into the room.

<!-- REPORT: agent=Codex; task=voice-provider-research-and-contract; status=complete; files=VOICE_PROVIDERS.md; open_questions=native-listener-evaluation-and-latency-target -->
