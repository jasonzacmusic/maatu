disposition: fix

No QUALITY BAR card or decision raster was supplied; this code-led build has no approved comp.

## persistence

Pass: PRODUCT.md exists; the studio brief and compiled layout carry grounded candidate 3 and seed 030faa12, matching the supplied packet. No prior DESIGN.md existed, so documentation correctly follows review. A comp approval record and hero reproduction checkpoint do not apply to this code-led build. The seven declared photographs have credits and sidecars; one sidecar needs the truth correction below. All seven production captures pass the evidence gate, including the complete 635 × 958 home capture with scrollbar-excluded image width.

## fidelity

| Element or promise | Finding | Evidence |
| --- | --- | --- |
| THESIS: conversation and teaching share one activity | match | The invitation, free typed entry, retained chat history, teaching phrase and continuation into voice implement this in the supplied front end. |
| OWN-WORLD: daylight neighborhood studio | match | Warm paper, purple controls, quiet word-role colors and visible Chennai photography carry the selected world. |
| TYPE | match | Newsreader supplies the contrasting serif and italic display voice; Hanken supplies readable controls and the direct conversational invitation. |
| MATERIAL | match | The focal photograph is visibly present as a real WebP with documented origin. The speech-bubble tail is crisp conversational geometry, consistent with the world; the detector warning does not describe a thick card accent here. |
| Navigation and responsive topology | adaptation | Four languages and three modes remain exposed; the sidebar becomes a mobile menu and the invitation/photo stack. These adaptations follow the studio brief's responsive rearrangement requirement. |
| STORY: thought → useful speech → scene or sentence experiment | match | Both entry mechanisms, topic starters, scene/text actions and shared sentence choices are present in the supplied components. Runtime pronunciation and agent parity cannot be certified from this visual/source packet. |
| FIRST VIEWPORT | contradicted | At 390 × 844, the typed first-thought entry begins around y946, below the photo and outside the promised first viewport. Desktop and the actual 635 px viewport expose it. |
| FORM: five connected colored sentence stops | contradicted | All five roles and matching word colors exist, but mobile hides every connector and turns the signature into disconnected 3+2 tiles. |
| Truth of named conversation partners | missing | Named teachers and scenario partners have no visible AI/fictional-role cue; “Meena is waiting” beside real people in a photograph permits the character and photographed person to be conflated. |
| Asset provenance | contradicted | fr.webp.json contains both the Paris café attribution and an unrelated Chennai tea-stall attribution. |
| Craft floor and keyboard states | contradicted | Labels sit above headings; three primary inputs reset the focus outline; small word-role captions lose required contrast through opacity; the tablist omits its keyboard interaction pattern. |

## ceiling

The supplied world uses editorial lettering, real place photography, quiet page rules and colored word roles. Its connected diagram device remains unused on mobile. Call motion is tied to speaking in the supplied CSS. Without a QUALITY BAR card, the ceiling cannot be independently calibrated.

## material_fixes

1. FORM/signature: restore a visible continuous route between all five mobile sentence stops; the 680 px rule in [globals.css](/Users/jasonzac/Documents/Codex/2026-10-05/audit-the-flowchart-modes-of-maato/work/maatu/app/globals.css) hides .flow-connector and leaves the 3+2 tiles disconnected.
2. FIRST VIEWPORT: move the typed first-thought entry into the 390 × 844 first viewport, for example before the stacked photo; preserve the readable voice action and visible city photograph in [ConversationStudio.tsx](/Users/jasonzac/Documents/Codex/2026-10-05/audit-the-flowchart-modes-of-maato/work/maatu/app/components/ConversationStudio.tsx).
3. Truth: identify the named teachers and scenario partners as AI practice roles in their ordinary introduction copy; keep the photo captions about place rather than the named character in [ConversationStudio.tsx](/Users/jasonzac/Documents/Codex/2026-10-05/audit-the-flowchart-modes-of-maato/work/maatu/app/components/ConversationStudio.tsx) and [ScenarioStudio.tsx](/Users/jasonzac/Documents/Codex/2026-10-05/audit-the-flowchart-modes-of-maato/work/maatu/app/components/ScenarioStudio.tsx).
4. Floor/Refuse: delete the teacher-tag eyebrow, move scene categories below their headings, and move course progress below its heading in [ConversationStudio.tsx](/Users/jasonzac/Documents/Codex/2026-10-05/audit-the-flowchart-modes-of-maato/work/maatu/app/components/ConversationStudio.tsx), [ScenarioStudio.tsx](/Users/jasonzac/Documents/Codex/2026-10-05/audit-the-flowchart-modes-of-maato/work/maatu/app/components/ScenarioStudio.tsx) and [MaatuApp.tsx](/Users/jasonzac/Documents/Codex/2026-10-05/audit-the-flowchart-modes-of-maato/work/maatu/app/components/MaatuApp.tsx).
5. Floor/states: preserve a visible keyboard focus treatment for .quick-composer input, .composer input and .custom-scene input; their later outline resets override the shared input:focus-visible rule in [globals.css](/Users/jasonzac/Documents/Codex/2026-10-05/audit-the-flowchart-modes-of-maato/work/maatu/app/globals.css).
6. Floor/contrast: remove .word small opacity:.9 or darken the affected role-caption colors in [globals.css](/Users/jasonzac/Documents/Codex/2026-10-05/audit-the-flowchart-modes-of-maato/work/maatu/app/globals.css); the composited what, when and detail captions measure about 4.11:1, 4.28:1 and 3.95:1 against a required 4.5:1.
7. Floor/keyboard: implement arrow/Home/End navigation and roving tabIndex for the step tablist, or expose the steps as ordinary buttons; [SentencePath.tsx](/Users/jasonzac/Documents/Codex/2026-10-05/audit-the-flowchart-modes-of-maato/work/maatu/app/components/SentencePath.tsx) currently gives every role=tab button a tab stop and no keyboard handlers.
8. Truth/provenance: remove the unrelated ta-chai attribution from [fr.webp.json](/Users/jasonzac/Documents/Codex/2026-10-05/audit-the-flowchart-modes-of-maato/work/maatu/public/scenes/fr.webp.json) so the Paris café asset has one unambiguous source record.

## keep

Keep the exposed four-language/three-mode navigation, ordinary open-conversation entry, real place photography, Newsreader/Hanken hierarchy and the same reusable colored sentence roles across languages and time.
