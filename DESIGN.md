---
name: "Maatu"
description: "A daylight neighborhood conversation studio for everyday spoken language."
colors:
  purple: "#6350c6"
  purple-dark: "#5140a8"
  lavender: "#eee8fa"
  green: "#38705b"
  mint: "#e0eee4"
  peach: "#fae4d3"
  who-ink: "#37614c"
  action-ink: "#635096"
  what-paper: "#fae5d5"
  what-ink: "#875736"
  describe-paper: "#f7e2e8"
  describe-ink: "#905263"
  when-paper: "#e1edf6"
  when-ink: "#43647e"
  helper-paper: "#f0f0ea"
  helper-ink: "#5f655c"
  paper: "#fbf9f4"
  white: "#fff"
  ink: "#292d2b"
  muted: "#626761"
  line: "#e5e6de"
  display-emphasis: "#655582"
  error-paper: "#fbece7"
  error-ink: "#843e2d"
  focus: "#9382df"
  lab-paper: "#f6f3eb"
  lab-result-paper: "#eeebe1"
  lab-muted: "#68604f"
  diagram-wire: "#82755f"
  diagram-wire-active: "#7356a5"
  diagram-label: "#665c49"
  challenge-ink: "#624897"
  completed-ink: "#325d47"
  tip-paper: "#fbf5e6"
  tip-ink: "#5b4a23"
  tip-icon: "#9b7a26"
typography:
  display:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(36px, 3.5vw, 51px)"
    fontWeight: 500
    lineHeight: 1.02
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Hanken Grotesk, sans-serif"
    fontSize: "clamp(34px, 3.5vw, 47px)"
    fontWeight: 700
    lineHeight: 1.03
    letterSpacing: "-0.032em"
  title:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "29px"
    fontWeight: 500
  body:
    fontFamily: "Hanken Grotesk, sans-serif"
    fontSize: "15px"
    fontWeight: 400
  body-copy:
    fontFamily: "Hanken Grotesk, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Hanken Grotesk, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.2
  label-small:
    fontFamily: "Hanken Grotesk, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.2
  sentence:
    fontFamily: "Hanken Grotesk, sans-serif"
    fontSize: "19px"
    fontWeight: 600
    lineHeight: 1.45
  body-detail:
    fontFamily: "Hanken Grotesk, sans-serif"
    fontSize: "12px"
    fontWeight: 400
  title-compact:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "26px"
    fontWeight: 500
  grammar-choice:
    fontFamily: "Hanken Grotesk, sans-serif"
    fontSize: "23px"
    fontWeight: 600
    lineHeight: 1.3
  sentence-lab:
    fontFamily: "Hanken Grotesk, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.45
  phrase-coach:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(25px, 2.8vw, 34px)"
    lineHeight: 1.2
  sentence-coach-word:
    fontFamily: "Hanken Grotesk, sans-serif"
    fontSize: "15px"
    fontWeight: 600
rounded:
  compact: "6px"
  field: "7px"
  control: "8px"
  navigation: "10px"
  surface: "12px"
  diagram: "14px"
  feature: "16px"
  circle: "50%"
spacing:
  "4": "4px"
  "8": "8px"
  "12": "12px"
  "16": "16px"
  "20": "20px"
  "22": "22px"
  "24": "24px"
  "28": "28px"
  "32": "32px"
  "36": "36px"
  "42": "42px"
  "64": "64px"
components:
  button-primary:
    backgroundColor: "{colors.purple}"
    textColor: "{colors.white}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "12px 17px"
  button-primary-hover:
    backgroundColor: "{colors.purple-dark}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "#50486b"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "12px 17px"
  button-outline-hover:
    backgroundColor: "#f2edf9"
  button-small:
    backgroundColor: "{colors.lavender}"
    textColor: "{colors.purple-dark}"
    typography: "{typography.label-small}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
  button-icon:
    backgroundColor: "transparent"
    textColor: "{colors.purple}"
    rounded: "{rounded.field}"
    padding: "0"
    height: "36px"
    width: "36px"
  input-message:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.navigation}"
    padding: "8px 10px 8px 17px"
  mode-navigation:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    height: "63px"
    padding: "0 42px"
  mode-navigation-active:
    textColor: "{colors.purple}"
  chip-filter:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.compact}"
    padding: "8px 13px"
  chip-filter-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
  card-phrase:
    backgroundColor: "{colors.mint}"
    rounded: "{rounded.surface}"
    padding: "23px"
  card-picker:
    backgroundColor: "{colors.white}"
    rounded: "{rounded.surface}"
    padding: "22px"
  sentence-node-who:
    backgroundColor: "{colors.mint}"
    textColor: "{colors.who-ink}"
    rounded: "{rounded.surface}"
    padding: "17px 18px 24px"
  sentence-word-who:
    backgroundColor: "{colors.mint}"
    textColor: "{colors.who-ink}"
    typography: "{typography.sentence-lab}"
    rounded: "{rounded.compact}"
    padding: "10px 12px 8px"
  sentence-challenge:
    backgroundColor: "{colors.lavender}"
    rounded: "{rounded.surface}"
    padding: "23px 25px"
  sentence-challenge-complete:
    backgroundColor: "{colors.mint}"
    textColor: "{colors.completed-ink}"
  coach-node-action:
    backgroundColor: "{colors.lavender}"
    textColor: "{colors.action-ink}"
    rounded: "{rounded.surface}"
    padding: "12px 12px 25px"
  coach-node-action-selected:
    padding: "11px 11px 24px"
  coach-word-helper:
    backgroundColor: "{colors.helper-paper}"
    textColor: "{colors.helper-ink}"
    typography: "{typography.sentence-coach-word}"
    rounded: "{rounded.navigation}"
    padding: "10px 12px"
  correction-result:
    backgroundColor: "{colors.mint}"
    textColor: "{colors.who-ink}"
    rounded: "{rounded.surface}"
    padding: "14px 16px"
  history-row:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    padding: "20px 8px"
  history-row-selected:
    backgroundColor: "{colors.lavender}"
---

# Design System: Maatu

## Overview

**Creative North Star: "The Neighborhood Conversation Studio"**

The Neighborhood Conversation Studio makes speaking feel like a small, useful part of the day. Warm paper, conversational purple and quiet colored sentence pieces give the interface a friendly daylight character. Actual city photographs bring local life into the studio, while fictional AI teachers and scene partners remain identified in text.

The system balances open space with practical controls. Newsreader frames invitations and phrases; Hanken Grotesk keeps messages, choices and actions clear. White fields and soft tinted panels organize the work without heavy elevation. Conversation, scenes, lessons and the sentence lab share the same restrained controls and visible feedback.

**Key Characteristics:**

- Daylight paper with purple actions and low saturation learning surfaces.
- Newsreader framing paired with clear Hanken Grotesk conversation and controls.
- Five grammar roles joined by meaningful dependencies, with colors that follow their words.
- Local photography, labeled AI partners and feedback grounded in actual activity.

## Colors

Purple gives actions a conversational voice; paper and white form the daylight base. Quiet mint, peach, pink and blue make sentence roles visible without competing with the words.

### Primary

- **Conversational Purple** (`purple`): Primary voice and listening actions, links, active mode underlines and the speech mark.
- **Deep Purple** (`purple-dark`): Primary hover and compact button text.
- **Lavender Paper** (`lavender`): Conversation invitation, learner messages, active language choices and the action role background.
- **Focus Lilac** (`focus`): The shared keyboard focus outline.

### Secondary

- **Speech Green** (`green`): Useful target phrases, saved or complete states and supportive practice icons.
- **Mint Paper** (`mint`): Phrase cards, course invitations, supportive icons and the Who role background.
- **Soft Peach** (`peach`): Scene and secondary destination surfaces.
- **Completed Woodland Ink** (`completed-ink`): Challenge headings, count and feedback after a verified successful build, on Mint Paper.

### Tertiary

The sentence algorithm uses fixed background and ink pairs. These are functional learning colors.

The Sentence lab exposes Who as Pronoun or Proper noun, Does as Verb, What as Noun, Describe as Adjective, and When as Time & tense. Grammar names change the labels, not their established role colors.

- **Who:** Mint Paper with `who-ink`, a quiet woodland green.
- **Does:** Lavender Paper with `action-ink`, a muted grape.
- **What:** `what-paper` with `what-ink`, pale peach with warm brown.
- **Describe:** `describe-paper` with `describe-ink`, rose paper with berry brown.
- **When:** `when-paper` with `when-ink`, pale blue with slate blue.
- **Helper:** `helper-paper` with `helper-ink`, neutral paper with olive gray for articles and other connecting words.
- **Challenge Grape Ink** (`challenge-ink`): Supporting challenge labels and actual build counts on Lavender Paper.
- **Active Diagram Grape** (`diagram-wire-active`): Connections touching the selected grammar role.

### Neutral

- **Daylight Paper** (`paper`): The page canvas and quiet hover surface in the sidebar.
- **White** (`white`): Inputs, sidebar, assistant messages, choice tiles and photograph speech bubbles.
- **Everyday Ink** (`ink`): Main text and the selected scene filter.
- **Muted Ink** (`muted`): Supporting sentences, field hints and secondary labels.
- **Paper Line** (`line`): Panel borders, content dividers and list rows.
- **Display Plum** (`display-emphasis`): The italic second part of page headings.
- **Error Paper / Error Ink** (`error-paper`, `error-ink`): Reusable error notices and audio recovery feedback.
- **Diagram Paper / Result Paper** (`lab-paper`, `lab-result-paper`): A dotted dependency canvas and the separate spoken-word-order result, respectively.
- **Lab Muted Ink** (`lab-muted`): Board captions and explanations of the selected language's word order.
- **Diagram Wire / Diagram Label** (`diagram-wire`, `diagram-label`): Meaningful inactive connectors and their relationship labels. Active state changes the wire color and thickness; omission adds dashes and explicit wording.

### Named Rules

**The Role Continuity Rule.** Keep Who in mint, Does in lavender, What in peach, Describe in pink and When in blue. Carry each role's background and ink into matching output words when language, person or tense changes.

## Typography

**Display Font:** Newsreader with Georgia and serif fallbacks.

**Body Font:** Hanken Grotesk with a sans-serif fallback.

**Character:** The serif adds warmth to page framing and phrases worth carrying away. The sans-serif keeps dialogue, grammar pieces and controls practical. Both families are loaded through the root layout with Latin subsets and swap behavior.

### Hierarchy

- **Display:** Medium Newsreader page headings use the responsive display token. Compact layouts explicitly use headings around (36px to 40px), while the wide layout reaches (56px). Headings use tight leading and balanced wrapping; their emphasized line is italic and lighter (400).
- **Headline:** The conversation invitation uses bold Hanken with the headline token. It remains direct and conversational rather than adopting the serif page-heading treatment.
- **Title:** Medium Newsreader titles recur in course invitations, empty states and coach notes. Smaller sectional titles vary within the observed range (23px to 29px); the lab's challenge and time-change headings use `title-compact`, with challenge headings reducing to (25px then 24px) at component widths (579px then 390px).
- **Body:** The base Hanken size is the body token. Supporting page and invitation copy uses `body-copy`; dialogue expands to (14px) with generous leading (1.65). Page supporting text is constrained to (66ch). The lab's explanations, pronunciation notes and secondary controls use `body-detail`.
- **Label:** Actions use `label`; compact buttons and meaningful diagram relationship labels use `label-small`. Secondary metadata is smaller and subordinate. Controls use sentence case and practical weights rather than a separate uppercase display style.
- **Grammar choice:** The dependency nodes give their chosen word the `grammar-choice` treatment, reducing to (21px then 19px) at component widths (579px then 390px). Type, target-language preview and the Choosing or Change state remain separate lines.
- **Sentence:** The shared role-word baseline remains `sentence`. The Sentence lab enlarges its tappable output words with `sentence-lab`, reducing to (21px) at component widths up to (390px). Short serif phrase cards and live captions give a whole phrase room to be read aloud.
- **Conversation phrase:** The sentence coach uses `phrase-coach` for the actual phrase, with a local phone size (28px). Its role words and alternative sentences use `sentence-coach-word`; role labels remain smaller (11px). Practice phrases use the compact serif size (26px), and side-coach models use serif emphasis (23px) with leading (1.35). These remain local conversation variants within the incumbent pairing.

The Sentence lab's Newsreader page heading uses (47px), leading (1.08) and purple italic emphasis; its component-width variants use (40px then 35px). These are local heading variants inside the existing serif hierarchy.

There is no single geometric type ratio. The observed hierarchy separates large page framing, phrase emphasis, readable conversation and compact controls.

### Named Rules

**The Frame and Speak Rule.** Newsreader frames pages and reusable phrases. Hanken Grotesk carries controls, sentence blocks and chat, with bold Hanken for the conversation invitation.

## Layout

The desktop studio has a fixed white sidebar (230px), with the main column offset by the same width. Content and the footer share a centered maximum width (1180px). The topbar, mode navigation and content align to a common desktop inset (42px). Content opens with vertical padding (40px) and working panels typically use padding around (20px to 24px).

The layout uses purposeful pairs: a conversation invitation beside a place photograph, a piece picker beside its sentence, and a phrase card beside next destinations. Scene features use three columns and ordinary scene rows use two. Internal control gaps recur at (8px to 12px); workspace gaps reach (30px to 32px). Dividers carry list structure instead of enclosing every row in a card.

Responsive rules are explicit. At the compact desktop boundary (1150px), the sidebar narrows to (208px) and the main inset to (28px). At the tablet boundary (850px), the sidebar narrows to (195px), the inset to (24px), the home lower panels stack, and scene features become horizontal rows in one column. At the mobile boundary (680px), the sidebar becomes a closable drawer (242px); content uses a (20px) inset, the language picker spans the width, and the invitation stacks above its photograph. Mode labels remain visible. The wide boundary (1600px) increases headline sizes and top space.

The Sentence lab uses a semantic dependency board above its word bank and result. On desktop, Pronoun or Proper noun, Verb and Noun occupy the first row; Time & tense sits below Verb and Adjective below Noun. The board has three equal columns with gaps (42px vertically, 52px horizontally), padding (24px) and nodes at least (117px) high. SVG connectors are measured from the actual nodes and updated on resize.

At a board component width up to (579px), the doer spans two columns above paired Verb / Time & tense and Noun / Adjective rows. The final column gap is (54px), with vertical gaps (37px), so horizontal labels have their own space. The doer is at least (99px) high and other nodes at least (106px). Board padding reduces to (19px), then (15px) at widths up to (390px). Relationship labels remain (11px) at every arrangement.

The word bank and result use a two-column ratio (1:1.1) with a (22px) gap. They stack when the lab component is at most (720px) wide, independently of the sidebar's viewport rules. Choice tiles retain two columns, the result's practice action spans its width, and the tense ladder reduces from four columns to two with the shell. The early Hear it action stays beside the heading; phone challenge controls wrap into a row, and activity, shuffle, challenge selection and check controls have minimum (44px) targets.

The local conversation extension pairs the speaker or text thread with a sentence inspector in a maximum width (1180px). Both use a (0.7:1.3) column ratio. The call's speaker column has a minimum width (270px) and a gap (42px); the text column starts at (280px), with a gap (38px). The speaking column is sticky at (24px) from the viewport top. At viewports up to (960px), both surfaces stack in document order with the conversation first, remove stickiness and introduce a thin divider above the coach.

The conversation inspector reuses the semantic board with its own compact density: node padding (12px 12px 25px), minimum height (108px), canvas padding (18px), and gaps (36px vertically, 64px horizontally). At inspector component widths up to (580px), Doer / Adjective occupy the first row, Verb / Time the second, and Object / place the third row's left cell. Nodes reduce to (98px), chosen words to (15px), and phone canvas padding to (16px). The Adjective-to-Object connector follows a separate outer right rail; its label uses the empty lower-right region while Time-to-Verb keeps the central gap. The reserved horizontal space keeps relationship labels clear of node edges. Actual spoken word order follows below the graph. Alternatives and time changes use equal columns, then one column at phone viewports up to (580px); practice controls also stack and wrap there.

History pairs an open conversation list with its selected transcript at a (0.8:1.2) ratio, a minimum list width (240px), and a gap (40px). At viewports up to (760px), the list comes first and the transcript follows with a gap (26px). The live language picker also occupies a full row there. History uses divider-led rows and open transcript articles, preserving the studio's flat working surfaces.

## Elevation & Depth

Depth is mainly tonal: white fields, mint phrase cards, lavender conversation surfaces and a warm neutral sentence result sit on the paper canvas. Borders mark editable or grouped controls. Ordinary cards and working panels have no shadow. Actual photographs carry their own visual depth.

### Shadow Vocabulary

- **Speech Bubble:** A soft local shadow (`0 8px 24px #24141c25`) lifts the greeting over its city photograph.
- **Mobile Drawer:** A soft side shadow (`12px 0 34px #22193115`) separates the open navigation drawer from the scrim and studio.

### Named Rules

**The Quiet Surface Rule.** Keep working surfaces flat. Use soft shadow for an overlaid speech bubble or an open mobile navigation drawer.

State transitions are brief and functional: buttons and sidebar hover use (150ms), featured scene lift uses (200ms), grammar-node background and border changes use (180ms), and the mobile drawer uses (250ms). The scene lift is small (3px). A successful challenge reveals its feedback once through a horizontal clip over (450ms), using `cubic-bezier(0.16, 1, 0.3, 1)`; it never animates the count or invents a reward. Voice bars animate only while the agent speaks; loading and thinking motion accompanies active work. System reduced motion and the saved stillness preference remove animation, transitions and smooth scrolling.

## Shapes

The common shape is a gently curved rectangle. Compact filters and role words use `compact`; fields and icon buttons use `field`; buttons and choice tiles use `control`; language groups and sidebar items use `navigation`; reusable panels, messages, challenge panels and grammar nodes use `surface`. The dependency canvas uses `diagram`, and the larger invitation uses `feature`. Borders remain thin (1px), while the selected grammar node uses its role ink in a stronger border (2px) with compensated padding so its size stays stable.

Conversation word chips use `navigation` corners and a thin transparent border that takes the role ink on hover. Pause notices and live correction models use `surface` corners. Saved corrections sit on an inset mint surface without a colored side stripe. Open history rows and transcript dividers retain their simple rectangular structure.

Circular avatars, scene goal numbers and call controls have a clear role, distinct from rectangular workspaces. Numbered challenge selectors are rounded square controls, becoming (44px) squares on phones. The speech bubble adds a small triangular tail over the photograph. Five colored grammar nodes, directed connections and matching word blocks form the lab's recurring signature.

## Components

### Buttons

Actions are clear, compact and softly rounded.

- **Primary:** Purple with white text, the standard action typography and control radius. Default minimum height is (43px), with room for inline SVG icons.
- **Outline:** A thin muted violet border and transparent surface. Hover gains a pale lavender tint.
- **Small:** Lavender with Deep Purple text, compact typography and a minimum height (36px).
- **Icon / Text:** Transparent purple controls keep secondary actions light. Icon controls are square (36px); text controls gain an underline on hover.
- **Focus / Disabled:** Keyboard focus uses the shared outline (3px) and offset (4px). Disabled controls show a not-allowed cursor and reduced opacity (0.46).

### Chips

Scene filters use compact curved rectangles with a thin Paper Line border. The active filter reverses to Everyday Ink with white text and exposes its pressed state. Conversation starters use a quiet outlined treatment that turns mint on hover. Negative and question variations gain lavender and a purple border when enabled.

### Cards / Containers

Phrase cards use Mint Paper and serif phrase emphasis. Conversation invitations and learner messages use Lavender Paper; assistant messages and choice pickers use white. Reusable panel corners use `surface`, with flat depth and padding around (22px to 24px). Scene features clip their photograph or contextual SVG above descriptive copy; the scene category sits below its heading. Course, saved-phrase and coach lists use dividers and open rows rather than repeated raised cards.

### Inputs / Fields

Typed conversation entry is a white, outlined container with the message icon, a flexible text input and a compact send control. Standalone search and name fields use white, a Paper Line border and the field radius. Text uses Everyday Ink, muted placeholders and a purple caret. The focus outline stays visible on the input itself. Inputs carry accessible labels even when their labels are visually hidden; busy chat disables entry and exposes thinking or recovery feedback nearby.

### Navigation

The studio combines a fixed desktop sidebar, a visible four-language segmented picker and three named mode entries. Active sidebar items use lavender; the active mode uses purple text and a short underline (3px); the active language is a filled segment. Tamil, Kannada, Hindi and French retain their language names alongside small identity dots. On mobile the sidebar becomes a scrim-backed drawer, while the language picker and mode row remain in the shell. Live calls use a separate focused layout with a visible return action.

### Sentence Dependency Board

The lab is a playable grammar diagram, with Pronoun or Proper noun, Verb, Noun, Adjective and Time & tense nodes. Each shows its chosen English piece and current target-language preview. The selected node gains its stronger role-colored border, and connected edges gain Active Diagram Grape and a thicker stroke (2.4px versus 1.6px). The dotted Diagram Paper canvas supplies working space, not additional decoration. Its relationship labels use Diagram Label ink and a paper-colored stroke behind the text for clearance.

The arrows express dependencies: the doer does the verb, the verb uses the noun, the adjective describes the noun, and time changes the verb form. With no object, the verb-to-noun arrow says omitted and the adjective-to-noun arrow says unused; both are dashed. The hidden description states the same conditional meaning. The board is independent of the selected language's spoken word order.

The tabs use one roving focus position, with Arrow, Home and End navigation and a labeled word-bank panel. Word-bank tiles echo the selected role on hover and selection, expose their pressed state, and visibly disable incompatible adjective or time choices. Changing a verb can select a matching noun; incompatible descriptions or skill forms are cleared or adjusted with an explanatory status. Free build, shuffle and the next-piece action retain access to every role.

### Sentence Challenges

Free build and Play a challenge share a visible activity switch. Challenge mode opens with a Newsreader meaning to construct, its selected language, four numbered selectors, an actual language-specific build count and Check build. A mismatch gives one targeted hint and opens the relevant word bank when a role needs changing. A semantically correct build turns the panel mint, shows success feedback and exposes Next challenge.

Completion is deduplicated per challenge and language, saved to optional device storage. Editing a choice, changing activity or challenge, or changing language clears the immediate feedback; changing language preserves each language's actual completion count. The single feedback reveal follows a successful check. This pattern represents assessed builds, without fluency, mastery or XP claims.

### Spoken Sentence Result

Result Paper separates the spoken output from the dependency diagram. The same role colors label tappable words in the selected language's native word order; tapping a word opens its role bank, and helper words open the verb bank. Visible underlining identifies a verb ending when the model supplies a stem. English meaning, a word-order explanation and pronunciation guidance stay beside the sentence.

Hear it appears early beside the page heading and again with the result. Its states follow actual audio work: Hear it when idle, Getting audio or Preparing voice while loading, Stop audio while playing, Audio is ready only when that exact language, sentence and pace is cached, and a visible recovery notice when requested audio or playback fails. A stable supported sentence prepares after a short pause (1s), without autoplay; a failed background preparation leaves the action available for a retry. Shared in-flight work and cache entries avoid duplicate preparation. Saved native-language clips cover the starter and four challenge goals at normal and slower pace in Tamil, Kannada, Hindi and French (40 clips); other supported sentences prepare on demand.

Saving, slower playback, speaking with the AI teacher, proper names and agreement, time words, negative and question variations, the tense ladder and sound help remain available. Changing sentence or language stops the old playback. Color continuity never substitutes for the language's own grammar.

### Conversation and Feedback

Assistant messages sit to the left in white; learner messages sit to the right in lavender. A useful phrase appears within the teacher's message, in green, with its English meaning and adjacent listening and saving controls. Initial avatars identify the AI teacher without a photographic portrait. Errors use a warm notice with text and a recovery action where available. Call connection and control acknowledgements, lesson outcomes and progress remain based on actual activity; the design does not add decorative online badges or invented metrics.

### Conversation Sentence Inspector

The inspector annotates a completed teacher phrase asynchronously. The large serif phrase, English meaning and Listen action come before the compact board. Display words use Latin learner captions; speech retains the exact native phrase. A validated breakdown must reconstruct the selected spoken phrase rather than substitute a new sentence. English-only explanations leave an honest waiting message, and failed analysis has a visible retry.

The five board tabs are Doer, Verb, Object / place, Adjective and Time. Selection reads Inspect or Exploring, opens role notes and highlights related edges; it does not edit the sentence or open the lab's choice bank. Empty roles explicitly say Not stated and No separate word. Dashed omitted, unused or not stated relationships retain visible labels. Arrow, Home and End navigation uses the same roving focus pattern as the lab.

The row below the board preserves spoken order and exposes each word's actual part of speech, English gloss and ending or agreement note. Pronouns and proper names use mint, verbs lavender, nouns/places/articles/prepositions peach, adjectives pink and time blue; remaining detail words use Helper Paper. A grammatical role and the word's semantic diagram slot are distinct, so an address does not automatically become the doer.

Alternative and tense rows are practice versions, with whole phrases and English meanings. A selected row gains a quiet mint tint and purple text, while the original spoken phrase remains visible above. Back to spoken phrase restores the original model. Time changes retain person, object or destination and topic, and align yesterday, now, tomorrow and already with the intended action. Requests, imperatives and fragments explain when a tense ladder is unsuitable instead of inventing one. The travel contrast has native examples in all four languages, including a past expression for two days ago without adding a return journey.

In a live call, Listen and Hear this pause the conversation before playback. Pause immediately mutes remote playback and learner input, then requests the agent pause; the visible notice acknowledges the paused state and the diagram freezes. Resume restores remote playback and the learner's earlier mute choice after acknowledgement. Slower stops the old clip before preparing another. Preparation follows a stable phrase after a short delay (700ms), without autoplay, and playback failure keeps a visible recovery message. The inspector's local focus uses Active Diagram Grape with the shared outline width (3px) and offset (4px).

### Independent Side Coach

The side coach is a quiet adjunct to the partner, separated by a Paper Line divider and identified in text. Completed learner turns receive automatic grammar analysis after a short delay (700ms), without stopping the partner. A clear issue exposes One small adjustment and one explanation; clear or uncertain automatic results do not manufacture a warning. Explicit Check my sentence can open the full result.

The model appears on mint with woodland ink, an English meaning and one useful explanation. Hear the correction pauses the live scene and speaks the native model through a separate fixed voice of the opposite gender from the scene persona, in the same language and register. This is configured voice identity; it does not establish accent authenticity.

Check pronunciation uses only a recent ephemeral recording when explicitly requested. Try it privately pauses input and remote playback before recording the learner's model attempt, with a visible recording acknowledgement of six seconds. The recording buffer captures approximately (6.5s) and remains on the device until an explicit check uploads it; raw audio is not part of saved history. Noisy or ambiguous evidence has an explicit uncertain result, and pronunciation warnings require conservative confidence and an independent recognition check where configured. Correction actions and playback targets have a minimum height (44px).

### Saved Conversation History

The selected list row gains Lavender Paper and exposes its pressed state. Its concise scene title, language, actual turn count and last date identify the record. Legacy scenario launch instructions map to the scene label without modifying the original transcript. Long general titles are shortened with a visible ellipsis, using a word boundary when available. The reading pane has a serif title, download control and Continue this conversation action before the open transcript.

Submitted text turns and each final live segment save immediately to device history, with stable turn identifiers and original source text. Translated turns are labeled. A language switch translates the complete saved thread in ordered batches, validates turn identity and speaker order, and publishes only a finished version; other language versions remain retained. The original partner, place, facts, prices and unfinished question supply continuation context instead of a fresh greeting. A translation failure preserves the original and shows a recovery notice.

Each saved correction is attributed to Side coach on mint without a colored side border. Assistant turns retain listening actions using their source phrase. Download exports the thread with its language versions as JSON. The reading pane states that records live on this device and clearing browser data removes them. If storage is full or blocked, the studio alerts the learner that the current visit remains in memory and points to history download before closing.

### Finish Layer (9 October 2026)

`app/finish.css` loads last and settles readability: nothing a learner must read sits below 12px, body copy stays at 14px or more, and controls are at least 40px (44px for call tools). On phones the four-tab row (Talk, Scenes, Lessons, Lab) is the main navigation with short labels; at 681px and wider the tab row is hidden because the sidebar lists every mode.

The home shows a mint **Start here** panel on a first visit (Start lesson 1, or I know a little) and a white **resume card** for the last conversation instead of reopening it. The home voice button always starts a fresh call.

The typed chat is a single centered column. A reply shows the phrase, its meaning prefixed with the language name, Hear and Save, an optional **tip** on Tip Paper with a lightbulb, the follow-up, then two text actions: **Say it in other languages** (a divider-led list with a voice per language) and **How this sentence works**. The explainer opens on demand: beside the chat on wide screens, under its message at 960px and below. On phones the chat log is part of the page scroll and the message box is sticky at the bottom.

Scene previews add **Choose what happens today**: wrapping situation buttons with a lavender selected state, Surprise me, and the situation brief. **A first line, if you need one** shows a translated opener on mint with Hear.

Calls drop the in-call language switch, name the back action End call, explain the first-call wake-up wait, and offer **Keep going by typing** whenever the microphone is blocked, silent or the partner does not join. On phones Mute, End and Captions sit in a sticky bottom bar. The explainer starts collapsed in calls.

## Do's and Don'ts

### Do:

- **Do** carry the same role background and ink from a grammar node into its output words.
- **Do** keep language names and mode labels visible in the studio shell as workspaces rearrange.
- **Do** use actual city photographs with captions that describe place and separate text that identifies AI partners.
- **Do** preserve the shared focus outline and clear selected borders or underlines.
- **Do** show useful speech and its English meaning together, with listening and practice actions nearby.
- **Do** tie loading, speaking, error and completion feedback to the activity that produced it and honor reduced motion.
- **Do** distinguish dependency meaning from spoken word order, and explicitly mark omitted relationships.
- **Do** prepare stable audio without autoplay and show readiness only for the current sentence, language and pace.
- **Do** preserve the actual spoken phrase above visibly separate practice versions, and keep inspector selection separate from lab editing.
- **Do** keep current live-language selection visibly filled as well as exposing its pressed state.
- **Do** attribute saved corrections to Side coach on mint and preserve original transcript versions when translating or shortening titles.

### Don't:

- **Don't** remap a sentence role's color when changing language or tense.
- **Don't** present a city photograph as a portrait of a fictional AI teacher or scene partner.
- **Don't** use reduced text opacity on colored sentence labels or remove the visible keyboard focus treatment.
- **Don't** decorate ordinary working panels with hard offset shadows, heavy gradients or fabricated availability and progress.
- **Don't** infer a pronunciation warning from a transcript alone or hide uncertainty behind a confident correction.

<!-- REPORT: agent=impeccable_conversation_documenter; task=conversation-coach-design-documentation; status=complete; files=DESIGN.md,.impeccable/design.json,.impeccable/conversation-coach-brief.md; open_questions=none -->
