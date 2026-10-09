---
target: whole Maatu app
total_score: 19
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
timestamp: 2026-10-09T06-55-04Z
slug: app-components-maatuapp-tsx
---
Method: dual-agent (A: design review sub-agent · B: detector and browser sub-agent)

## Design Health Score
| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 2 | Progress shows 0 conversations while History lists 3; muted and blocked mic messages conflict |
| 2 | Match System / Real World | 1 | Inspector jargon (indirect dative subject, nominative target); Tamil captions garbled (jh for ச) |
| 3 | User Control and Freedom | 2 | Back to your studio silently ends a call; Just talk always reopens the last chat |
| 4 | Consistency and Standards | 2 | Sentence lab has three names; inspector spelling differs from chat |
| 5 | Error Prevention | 2 | No mic check before a call; in-call language switch has no confirmation |
| 6 | Recognition Rather Than Recall | 3 | Scene goals give no starter words |
| 7 | Flexibility and Efficiency | 2 | Support level buried in settings |
| 8 | Aesthetic and Minimalist Design | 1 | Every reply adds a ~2,500px grammar panel on phones |
| 9 | Error Recovery | 2 | Blocked mic offers no carry on by typing |
| 10 | Help and Documentation | 2 | No first-run guide, no per-phone mic help |
| **Total** | | **19/40** | **Poor** |

## Design Specificity Verdict
Content is specific (real city photos, local scenes, five grammar role colours, Newsreader and Hanken); structure is a generic sidebar + topbar + tabs + cards frame, and the inspector reads like a linguistics tool. Detector: 92 advisory findings, all design-system drift in legacy dark-theme components (ClassroomScreen, StudioRooms, LessonPreviewScreen, LessonResultScreen, ReviewRoom, studio-bits, CallBackdrop, LanguageSelector, CourseProgressCard), none of which are imported by the live app. Browser detector: tiny-text and undersized-ui-text on every view (9 to 11px captions, chips, scene subtitles), one skipped heading level on Scenes, cream palette is intentional. 12 of 38 controls under 40px on a phone; one nested scroll area (chat log); no horizontal overflow; no contrast failures.

## Priority Issues
- [P0] Tamil romanization garbles ச as jh (romanize-client.ts). Fix the Tamil rules and test common words.
- [P1] Voice call dead end without a mic; call controls below the fold on phones (CallRoom.tsx). Add carry on by typing, sticky controls.
- [P1] Grammar inspector buries the conversation; three different correction voices (ConversationCoach, CorrectionCoach, reply). Collapse by default, one correction voice, plain labels.
- [P1] No beginner path; duplicate navigation (MaatuApp.tsx). First-visit start here, remove duplicated mode navigation.
- [P2] Progress and recap claim things that did not happen. Count device conversations; honest recap headline.

## Persona Red Flags
First-time beginner on a phone: nested chat scroll, 29px icon buttons, header wraps one word per line, End off-screen in a call. NSM parent: garbled Tamil, a fresh call referencing last time, progress 0 vs history 3, jargon. Impatient speaker: no mic check, no way forward when blocked, too many competing help panels, Back silently ends the call.

## Minor Observations
Scroll position kept between screens; 10 to 13px text on desktop; missing Tamil auto photo; unclear copy (romanized captions, same local register, another voice); history translation unexplained; scene goals without starter phrases.

## Questions to Consider
What if the first screen asked one question and sent beginners into Lesson 1? Does anyone need the diagram during a conversation? Would a grandmother in Chennai recognise these captions?
