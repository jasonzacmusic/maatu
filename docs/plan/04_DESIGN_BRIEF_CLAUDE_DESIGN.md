# MAATU: Design Brief for Claude Design

You are designing a public consumer product, not an internal tool. The founder will show this to family, friends, colleagues, and eventually the world. It must be stunning and unmistakable: nothing that could be confused with Duolingo, a SaaS dashboard, or a generic AI wrapper.

Hard rule: **no em dashes anywhere**, including UI copy, code comments, and placeholder text. Use commas, colons, or periods.

## The product in one breath

Maatu (ಮಾತು, "speech"): you practice Kannada, Hindi, and Tamil by TALKING, never reading, inside living Indian scenarios: haggling with an auto driver, taking a delivery at the gate, calling customer care for a new broadband connection, navigating an airport, supervising a plumber, teaching a music lesson to an AI student. Voice in, voice out. A coach debriefs you after every conversation.

## The signature concept: The Street

The home screen is not a menu. It is an illustrated Indian street you look down, and every scenario is a place on it: an auto stand, a delivery gate, a phone booth, an airport gate at the far end, a barber shop, a chai stall, and a music school with a shruti box in the window. Tap a place, the camera moves in, the conversation begins. Locked scenarios are shuttered shopfronts with their boards up. Progress lives in the world: streaks light up windows, mastered scenarios get busier and warmer. Switching language subtly reshapes the street's signage and palette (Bangalore, a north-Indian city, Chennai).

This is the one place to spend all your boldness. Everything else stays quiet and disciplined.

## Screens to design

1. **The Street** (home). The thesis screen. Must feel alive: subtle ambient motion (a passing auto, flickering tube light, steam off chai), time-of-day aware if cheap to do.
2. **The Call**. Voice-first, near-zero text. The character has presence (silhouette, nameboard, or environmental frame, your call) and a living voice visualization. Controls: mute, hang up, a "slow down" button phrased in the target language, and a captions toggle (romanized only, never native script). Under 5 words of visible UI text.
3. **The Debrief**. The coach's spoken summary plays over a card: three takeaways, an errors-to-natural-phrasing list, new words. Folded transcript. This card should be screenshot-worthy: people will share it.
4. **Progress**. Minutes spoken, streaks, weakness heatmap, review queue. Encode data in the Street's world-language where possible rather than generic charts.

## Direction guardrails

- Ground every choice in the subject's world: Indian street typography (hand-painted signboards, bus destination boards, lorry lettering), Indic script as ART and texture (murals, signage) even though the learner never has to read it. The script is scenery, not content.
- Avoid the three AI-design defaults: warm-cream + serif + terracotta; near-black + single acid accent; broadsheet hairlines. Avoid cartoon-mascot language-app cuteness entirely. This is warm, adult, cinematic.
- Typography: a characterful display face used with restraint plus a workhorse body face; type should carry personality. Deliver the pairing with rationale.
- Motion: one orchestrated moment (the camera move from Street into a Call) rather than scattered effects. Respect reduced-motion.
- Mobile-first: this is used standing at a real auto stand with one thumb. Then scale up.
- Quality floor: responsive, visible focus states, contrast-safe.

## Deliverables (drop into inbox/)

1. `D1_design_system.md`: palette (4 to 6 named hex values), type pairing, spacing scale, motion principles, the Street's visual grammar (how a shopfront, a locked shopfront, and a lit-up streak state look).
2. `D2_screens/`: high-fidelity HTML/CSS (or React + Tailwind) mocks of the four screens, mobile viewport first, self-contained so Claude Code can lift components directly.
3. `D3_street_assets.md`: how the Street is built technically (layered SVG scene recommended for crispness + animatable parts; note any asset Claude Code must generate).

Every file ends with:

```
---
REPORT
agent: claude-design
task: D1 | D2 | D3
status: complete | partial | blocked
files: <filenames>
open_questions: <bullets or "none">
---
```
