## verdict

1. **Resolved : language-scoped feedback.** language-feedback.png visibly shows French selected, 0 of 4 built, and no carried green success panel or success message. SentencePath.tsx now clears feedback on language change; functional-verification.json records the same transition. The principal captures retain two genuine Tamil completions without asserting current success.
2. **Resolved : truthful omitted-noun relationships.** omitted-object.png shows “No object,” dashed “omitted” and “unused” relationships, and a sentence with no noun token. The principal captures use “uses” when a noun is present. SentenceBoard.tsx now updates these edges with hasObject and provides the matching conditional hidden explanation with explicit word separation.
3. **Resolved : relationship legibility.** desktop.png, mobile.png and user-635.png show larger relationship labels and distinct arrowheads with clearance between nodes. Source and fix-verification.json confirm 11px labels at all three widths and #82755f inactive connectors at 4.06:1 against the board, exceeding the requested 3:1 minimum. All four arrows and five roles remain present, with no measured horizontal overflow.
4. **Resolved : changed-surface documentation.** DESIGN.md now describes the dependency board, conditional omitted/unused edges, component-width reflow, separate spoken result, per-language assessed completion, feedback clearing, prepared/saved-audio states, motion behavior and intentional token additions. The superseded numbered-path guidance is replaced. The updated .impeccable/design.json parses with schemaVersion 2; source-contract and reference validation are reported by the documenter.

## remaining

Clear. No regression attributable to this correction batch is visible in the supplied recaptures. This ship disposition covers the four scored fixes, not a new review of the whole surface. It makes no claim about native accent quality or physical microphone verification.



disposition: ship

<!-- REPORT: agent=impeccable_lab_reviewer; task=sentence-lab-verdict; status=complete; files=.impeccable/review/sentence-lab/verdict.md; open_questions=none -->
