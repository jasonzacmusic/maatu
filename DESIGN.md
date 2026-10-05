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
rounded:
  compact: "6px"
  field: "7px"
  control: "8px"
  navigation: "10px"
  surface: "12px"
  feature: "16px"
  circle: "50%"
spacing:
  "4": "4px"
  "8": "8px"
  "12": "12px"
  "16": "16px"
  "20": "20px"
  "24": "24px"
  "28": "28px"
  "32": "32px"
  "42": "42px"
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
  sentence-step-who:
    backgroundColor: "{colors.mint}"
    textColor: "{colors.who-ink}"
    rounded: "{rounded.navigation}"
    padding: "14px 12px"
  sentence-word-who:
    backgroundColor: "{colors.mint}"
    textColor: "{colors.who-ink}"
    typography: "{typography.sentence}"
    rounded: "{rounded.compact}"
    padding: "9px 10px 7px"
---

# Design System: Maatu

## Overview

**Creative North Star: "The Neighborhood Conversation Studio"**

The Neighborhood Conversation Studio makes speaking feel like a small, useful part of the day. Warm paper, conversational purple and quiet colored sentence pieces give the interface a friendly daylight character. Actual city photographs bring local life into the studio, while fictional AI teachers and scene partners remain identified in text.

The system balances open space with practical controls. Newsreader frames invitations and phrases; Hanken Grotesk keeps messages, choices and actions clear. White fields and soft tinted panels organize the work without heavy elevation. Conversation, scenes, lessons and the sentence lab share the same restrained controls and visible feedback.

**Key Characteristics:**

- Daylight paper with purple actions and low saturation learning surfaces.
- Newsreader framing paired with clear Hanken Grotesk conversation and controls.
- Five connected sentence roles whose colors follow their words.
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

### Tertiary

The sentence algorithm uses fixed background and ink pairs. These are functional learning colors.

- **Who:** Mint Paper with `who-ink`, a quiet woodland green.
- **Does:** Lavender Paper with `action-ink`, a muted grape.
- **What:** `what-paper` with `what-ink`, pale peach with warm brown.
- **Describe:** `describe-paper` with `describe-ink`, rose paper with berry brown.
- **When:** `when-paper` with `when-ink`, pale blue with slate blue.
- **Helper:** `helper-paper` with `helper-ink`, neutral paper with olive gray for articles and other connecting words.

### Neutral

- **Daylight Paper** (`paper`): The page canvas and quiet hover surface in the sidebar.
- **White** (`white`): Inputs, sidebar, assistant messages, choice tiles and photograph speech bubbles.
- **Everyday Ink** (`ink`): Main text and the selected scene filter.
- **Muted Ink** (`muted`): Supporting sentences, field hints and secondary labels.
- **Paper Line** (`line`): Panel borders, content dividers and list rows.
- **Display Plum** (`display-emphasis`): The italic second part of page headings.
- **Error Paper / Error Ink** (`error-paper`, `error-ink`): Reusable error notices and audio recovery feedback.

### Named Rules

**The Role Continuity Rule.** Keep Who in mint, Does in lavender, What in peach, Describe in pink and When in blue. Carry each role's background and ink into matching output words when language, person or tense changes.

## Typography

**Display Font:** Newsreader with Georgia and serif fallbacks.

**Body Font:** Hanken Grotesk with a sans-serif fallback.

**Character:** The serif adds warmth to page framing and phrases worth carrying away. The sans-serif keeps dialogue, grammar pieces and controls practical. Both families are loaded through the root layout with Latin subsets and swap behavior.

### Hierarchy

- **Display:** Medium Newsreader page headings use the responsive display token. Compact layouts explicitly use headings around (36px to 40px), while the wide layout reaches (56px). Headings use tight leading and balanced wrapping; their emphasized line is italic and lighter (400).
- **Headline:** The conversation invitation uses bold Hanken with the headline token. It remains direct and conversational rather than adopting the serif page-heading treatment.
- **Title:** Medium Newsreader titles recur in course invitations, empty states and coach notes. Smaller sectional titles vary within the observed range (23px to 29px).
- **Body:** The base Hanken size is the body token. Supporting page and invitation copy uses `body-copy`; dialogue expands to (14px) with generous leading (1.65). Page supporting text is constrained to (66ch).
- **Label:** Actions use `label`; compact buttons use `label-small`. Secondary metadata is smaller and subordinate. Controls use sentence case and practical weights rather than a separate uppercase display style.
- **Sentence:** Role word blocks use `sentence`, growing to (20px to 21px) in narrower arrangements. Short serif phrase cards and live captions give a whole phrase room to be read aloud.

There is no single geometric type ratio. The observed hierarchy separates large page framing, phrase emphasis, readable conversation and compact controls.

### Named Rules

**The Frame and Speak Rule.** Newsreader frames pages and reusable phrases. Hanken Grotesk carries controls, sentence blocks and chat, with bold Hanken for the conversation invitation.

## Layout

The desktop studio has a fixed white sidebar (230px), with the main column offset by the same width. Content and the footer share a centered maximum width (1180px). The topbar, mode navigation and content align to a common desktop inset (42px). Content opens with vertical padding (40px) and working panels typically use padding around (20px to 24px).

The layout uses purposeful pairs: a conversation invitation beside a place photograph, a piece picker beside its sentence, and a phrase card beside next destinations. Scene features use three columns and ordinary scene rows use two. Internal control gaps recur at (8px to 12px); workspace gaps reach (30px to 32px). Dividers carry list structure instead of enclosing every row in a card.

Responsive rules are explicit. At the compact desktop boundary (1150px), the sidebar narrows to (208px) and the main inset to (28px). At the tablet boundary (850px), the sidebar narrows to (195px), the inset to (24px), the lab stacks, the home lower panels stack, and scene features become horizontal rows in one column. At the mobile boundary (680px), the sidebar becomes a closable drawer (242px); content uses a (20px) inset, the language picker spans the width, and the invitation stacks above its photograph. Mode labels remain visible. The wide boundary (1600px) increases headline sizes and top space.

On mobile the five-step algorithm turns through a three-column, two-row path: Who, Does and What across the first row; Describe below What; When to its left. Right, down and left chevrons preserve the sequence. Choice tiles retain two columns, the result stacks below the picker, and the practice action spans the result width. The tense ladder reduces from four columns to two as available width decreases.

## Elevation & Depth

Depth is mainly tonal: white fields, mint phrase cards, lavender conversation surfaces and a warm neutral sentence result sit on the paper canvas. Borders mark editable or grouped controls. Ordinary cards and working panels have no shadow. Actual photographs carry their own visual depth.

### Shadow Vocabulary

- **Speech Bubble:** A soft local shadow (`0 8px 24px #24141c25`) lifts the greeting over its city photograph.
- **Mobile Drawer:** A soft side shadow (`12px 0 34px #22193115`) separates the open navigation drawer from the scrim and studio.

### Named Rules

**The Quiet Surface Rule.** Keep working surfaces flat. Use soft shadow for an overlaid speech bubble or an open mobile navigation drawer.

State transitions are brief and functional: buttons and sidebar hover use (150ms), sentence selections and featured scene lift use (200ms), and the mobile drawer uses (250ms). The scene lift is small (3px). Voice bars animate only while the agent speaks; loading and thinking motion accompanies active work. System reduced motion and the saved stillness preference remove animation, transitions and smooth scrolling.

## Shapes

The common shape is a gently curved rectangle. Compact filters and role words use `compact`; fields and icon buttons use `field`; buttons and choice tiles use `control`; language groups, sidebar items and sentence stops use `navigation`; reusable panels and messages use `surface`. The larger invitation uses `feature`. Borders remain thin (1px), while the selected sentence stop uses its role ink in a stronger border (2px) with compensated padding so its size stays stable.

Circular avatars, goal numbers and call controls have a clear role, distinct from rectangular workspaces. The speech bubble adds a small triangular tail over the photograph. The five connected colored stops and matching word blocks are the system's recurring signature.

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

### Connected Sentence Path

The five numbered steps are Who, Does, What, Describe and When. Each shows its current choice; the selected stop uses a stronger role-colored border. Tiles echo that role's color on hover and selection, expose their pressed state, and visibly disable combinations the model cannot use. The tabs use one roving focus position and Arrow, Home and End navigation. The result carries the same role colors in language-specific word order, with plain-English meaning, pronunciation guidance, listening, saving, slower playback and a practice action. Helper words have their own quiet neutral pair. The colors and chosen pieces remain stable as language and time change.

### Conversation and Feedback

Assistant messages sit to the left in white; learner messages sit to the right in lavender. A useful phrase appears within the teacher's message, in green, with its English meaning and adjacent listening and saving controls. Initial avatars identify the AI teacher without a photographic portrait. Errors use a warm notice with text and a recovery action where available. Call connection and control acknowledgements, lesson outcomes and progress remain based on actual activity; the design does not add decorative online badges or invented metrics.

## Do's and Don'ts

### Do:

- **Do** carry the same role background and ink from a numbered sentence step into its output words.
- **Do** keep language names and mode labels visible in the studio shell as workspaces rearrange.
- **Do** use actual city photographs with captions that describe place and separate text that identifies AI partners.
- **Do** preserve the shared focus outline and clear selected borders or underlines.
- **Do** show useful speech and its English meaning together, with listening and practice actions nearby.
- **Do** tie loading, speaking, error and completion feedback to the activity that produced it and honor reduced motion.

### Don't:

- **Don't** remap a sentence role's color when changing language or tense.
- **Don't** present a city photograph as a portrait of a fictional AI teacher or scene partner.
- **Don't** use reduced text opacity on colored sentence labels or remove the visible keyboard focus treatment.
- **Don't** decorate ordinary working panels with hard offset shadows, heavy gradients or fabricated availability and progress.
