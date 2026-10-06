# Maatu conversation release, 6 October 2026

Public site: [Maatu](https://maatu.vercel.app). Vercel production deployment `dpl_6p5ERv7iFKBVFCj3kYH6HpmhtWtG` is READY. LiveKit agent `CA_qEYzC3PqfR2e`, worker `maatu-studio`, version `okU5h6WJ3sY7` is Running in `ap-south`.

## Result

Final voice segments and submitted text turns persist immediately on this device. Ending calls, changing modes and reloading do not erase them. Conversation history exposes continuation and JSON download. Complete language translations preserve originals, turn IDs/order, scene character, place, prices and questions. A translated teaching turn has a separately localized practice sentence; its full historical explanation remains faithful. Older translated examples refresh on the next switch. Numeric facts are checked before a translation is published.

The asynchronous inspector teaches the exact completed phrase, actual word order and role dependencies, with alternate words and coherent time changes. Read-only roles, omitted parts and imperatives have distinct explanations. The travel examples cover seven tense/aspect forms and a two-days-ago past variant in every language. Alternatives remain practice selections rather than silently rewriting what was spoken.

The independent side coach provides grammar hints and an explicit audio pronunciation check. Its playback uses a configured opposite-gender persona voice in the same language/register. Audio checks require a recording and ambiguous evidence produces uncertainty. A proposed high-confidence Indian warning receives a second recognition check. Private practice pauses room input/output before recording; samples remain ephemeral and are uploaded only for the requested check.

Indian calls use native-script Sarvam Saaras v4 recognition, Gemini 3.5 Flash teaching and fixed Sarvam Bulbul v3 persona synthesis. French retains Gemini 3.8 Live. Transport adapters own provider/model configuration while teaching prompts, history, translation validation, diagrams and controls remain application contracts. Calls run in separate prewarmed worker processes to isolate connection failures.

## Verification

| Public call | Speech-end to first reply audio | Result |
| --- | --- | --- |
| Kannada `maatu-studio.tutor-kn__oyynineh` | 3,003 ms | Native answer to the meaning question; repeat, explain, slow-down, pause and resume acknowledged. Paused input did not produce a reply. |
| Tamil `maatu-studio.tutor-ta__em90ddis` | 3,209 ms | Native answer, English meaning and one learner follow-up. |
| Hindi `maatu-studio.tutor-hi__z8jv2kk2` | 3,105 ms | Native answer and correct English meaning despite imperfect quoted-word recognition. |
| French `maatu-studio.tutor-fr__t5rrb28d` | 2,275 ms | Meaning-first answer and learner follow-up. |

The four-language public API matrix passed exact source coaching, seven coherent travel tenses, complete ordered three-turn translations, a contradictory yesterday/continuous grammar correction, actual separate coach synthesis and assessment of its native reference audio without a warning. Indian uncached synthesis measured 3.811 to 3.874 seconds; French measured 9.917 seconds. These are phrase API measurements, separate from live reply latency.

A final teaching-translation regression passed publicly in all four languages. It verifies that a quoted Kannada explanation remains faithful in the full transcript, while the practice sentence uses the selected native language and retains its English meaning, names and numeric facts. Browser actions confirmed the original Kannada conversation after reload, Hindi translation with a Hindi flowchart, history after a mode change, continuation, and return to the untouched original Kannada version.

The production build and TypeScript checks pass. History tests cover immediate writes, segment deduplication, original retention, translation races, correction association, quota fallback and migration of old translated practice fields. Caption/coach invariants pass. The dependency audit records zero vulnerabilities. The source scan found no credential patterns or em dashes.

The complete course prompts were kept. Earlier real six-turn course-floor calls in every language tested close attempts, a wrong answer with one retry then continuation, meaning first, wait/stop, and repeat/slower/go-back. A full-prompt model comparison rejected Flash-Lite and retained the measured Gemini 3.5 Flash teaching brain.

The fresh independent visual review resolved all four scored fixes after two fix batches: narrow dependency label clearance, current live-language selection, concise history identity, and removal of correction stripes. Its ship verdict covers those fixes. Nine desktop/390px/635px text, history and call captures remain in `.impeccable/review/conversation/`. `DESIGN.md` and the sidecar document the local extension without replacing the studio identity.

## Evidence and limits

Machine records are under the task's `work` directory: `conversation-public-{kn,ta,hi,fr}.json`, `conversation-all-api.json`, `conversation-translation-regression-public.json`, `conversation-cloud-status.json`, `conversation-vercel-final-deploy.json` and `conversation-translation-final-build.log`. Public screenshots are in the task's `outputs` directory as `maatu-conversation-release.png` and `maatu-translated-conversation-release.png`.

History is device-local. Clearing browser data removes it; download is available. Cross-device cloud history is not claimed. Recognition and generated explanations can still be imperfect; fixed speaker identity does not certify native accent authenticity. Native listeners and physical-phone microphone checks remain useful. The final four-call live latency sample ranges from 2.275 to 3.209 seconds, median 3.054 seconds, and does not establish a worst-case bound. The standing 1.5-second target remains unmet; an earlier local recognition delay reached 10.3 seconds.

Provider coverage, rates, primary sources, configuration and comparison limits are recorded in [VOICE_PROVIDERS.md](VOICE_PROVIDERS.md). Source, generated configuration, screenshots and machine-readable evidence omit REPORT footers to preserve their formats.

<!-- REPORT: agent=Codex; task=conversation-production-release; status=complete; files=CONVERSATION_RELEASE_2026-10-06.md; open_questions=native-listener-evaluation-and-latency-target -->
