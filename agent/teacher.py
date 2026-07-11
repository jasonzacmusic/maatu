"""Teacher and tutor personas for Maatu Classroom mode.

Unlike the scenario characters (who stay in role and never correct), the teacher
LEADS and CORRECTS. Two modes:
  teacher-<lang>-<lessonId> : a structured lesson from curriculum.json
  tutor-<lang>              : free conversation where mistakes are corrected on the fly

Both drive the interaction and make the learner speak. Every target-language
word comes from the vetted romanized lexicon in curriculum.json, never native
script. The teacher remembers past lessons via progress.json next to
curriculum.json (written here at session start, one file, no backend).
No em dashes anywhere.
"""

from __future__ import annotations

import datetime
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CURRICULUM = ROOT / "curriculum.json"
PROGRESS = ROOT / "progress.json"

LANG_CODE = {"kn": "kn-IN", "hi": "hi-IN", "ta": "ta-IN"}
LANG_NAME = {"kn": "Kannada", "hi": "Hindi", "ta": "Tamil"}

# Warm female teacher voices (valid bulbul:v3), distinct per language.
TEACHER = {
    "kn": {"name": "Meera", "voice": "shreya"},
    "hi": {"name": "Anjali", "voice": "pooja"},
    "ta": {"name": "Kavya", "voice": "ishita"},
}

_CORE_RULES = (
    "HARD RULES, every single turn:\n"
    "- This is a live voice call. Everything you write is spoken aloud by a "
    "text-to-speech voice. Write exactly what you would SAY and nothing else: no "
    "lists, no headings, no asterisks, no brackets, no emoji.\n"
    "- Latin letters ONLY. Never write {ln} in its native script, not one "
    "character, not even in brackets next to the romanized form. The student "
    "learns by ear and reads only romanized Latin spelling.\n"
    "- Keep every turn SHORT: at most two short sentences plus one {ln} word or "
    "phrase. If your turn is getting longer, cut it and let the student speak.\n"
    "- One new thing per turn, never two. End nearly every turn by asking the "
    "student to SAY something specific. Across the call the student must talk "
    "more than you.\n"
    "- Never ask if they are ready and never ask permission to continue. You "
    "lead. Just teach.\n"
    "- The student's speech reaches you as an imperfect machine transcript. If "
    "their attempt is close to the target, count it as CORRECT: praise briefly "
    "and move on. Only correct real mistakes: a wrong word, a wrong ending, or "
    "English where {ln} was asked for.\n"
    "- When you do correct, always this shape, warm and quick: acknowledge what "
    "they said, give the correct form once, ask them to say it one more time. "
    "When they retry, accept it and move forward even if imperfect. Never drill "
    "the same word more than twice in a row, and never stack a correction and a "
    "new word in the same turn.\n"
    "- Vary your praise and keep it small and specific. Do not gush every turn.\n"
    "- No em dashes."
)


def _load_curriculum() -> dict:
    return json.loads(CURRICULUM.read_text())


def _load_lesson(lesson_id: str):
    for unit in _load_curriculum()["units"]:
        for lesson in unit["lessons"]:
            if lesson["id"] == lesson_id:
                return unit["unit"], lesson
    return None, None


def _ordered_lessons() -> list[dict]:
    return [l for u in _load_curriculum()["units"] for l in u["lessons"]]


# ---------------------------------------------------------------------------
# Progress memory: {"kn": {"l4": {"visits": 2, "last": "2026-07-11"}}, ...}
# Lives next to curriculum.json so the launchd agent can read and write it.
# ---------------------------------------------------------------------------

def _load_progress() -> dict:
    try:
        return json.loads(PROGRESS.read_text())
    except Exception:
        return {}


def _record_visit(lang: str, lesson_id: str) -> None:
    prog = _load_progress()
    entry = prog.setdefault(lang, {}).setdefault(lesson_id, {"visits": 0, "last": ""})
    entry["visits"] += 1
    entry["last"] = datetime.date.today().isoformat()
    try:
        PROGRESS.write_text(json.dumps(prog, indent=2) + "\n")
    except Exception:
        pass  # memory is best effort, a class must never fail on it


def _history(lang: str, exclude: str | None = None):
    """Return (visited lessons in course order, most recent lesson) for a language."""
    prog = _load_progress().get(lang, {})
    visited = [l for l in _ordered_lessons() if l["id"] in prog and l["id"] != exclude]
    recent = None
    if visited:
        recent = max(visited, key=lambda l: prog[l["id"]].get("last", ""))
    return visited, recent, prog


def _lexicon_lines(lesson: dict, lang: str) -> list[str]:
    return lesson.get("lexicon", {}).get(lang, [])


def _first_recall_item(lesson: dict, lang: str):
    """First real 'english = form' pair of a lesson's lexicon, for warm-up recall."""
    for line in _lexicon_lines(lesson, lang):
        if line.startswith("note:"):
            continue
        if " = " in line:
            en, form = line.split(" = ", 1)
            return en.strip(), form.strip()
    return None


def _lesson_fields(lang: str, lesson_id: str) -> dict | None:
    ln = LANG_NAME.get(lang)
    if not ln:
        return None
    unit_name, lesson = _load_lesson(lesson_id)
    if not lesson:
        return None
    t = TEACHER[lang]
    rules = _CORE_RULES.format(ln=ln)

    visited, recent, prog = _history(lang, exclude=lesson_id)
    revisit = prog.get(lesson_id, {}).get("visits", 0) > 0
    _record_visit(lang, lesson_id)

    teach = "; ".join(lesson["teach"])
    lexicon = "\n".join("- " + x for x in _lexicon_lines(lesson, lang))
    examples = " / ".join(lesson["examples_en"])
    practice = "; ".join(lesson["practice"])

    memory = ""
    if visited:
        titles = ", ".join(f"'{l['title']}'" for l in visited)
        memory = (
            f"\nYou have taught this student before. They have already covered: {titles}. "
            f"Their most recent lesson was '{recent['title']}'. Weave in a quick recall of "
            f"earlier material when it fits naturally, and reuse words they already know in "
            f"your examples.\n"
        )
    if revisit:
        memory += (
            "\nThe student has ALREADY done today's lesson once, so run it as revision: for "
            "each item ask them to produce it from the English meaning FIRST, reteach only "
            "what they miss, move faster, and spend the saved time on the sentence-building "
            "and check questions.\n"
        )

    system = (
        f"You are {t['name']}, a warm, patient {ln} teacher on a one-on-one voice call with "
        f"an adult beginner whose first language is English. You speak in English and teach "
        f"{ln} in romanized form. You lead the whole class.\n\n"
        f"Today's class: '{lesson['title']}' (unit: {unit_name}). Goal: {lesson['objective']}\n"
        f"{memory}\n"
        f"VOCABULARY. Teach exactly these items, one at a time, in this order: {teach}.\n"
        f"Use ONLY these vetted romanized {ln} forms, exactly as written. Do not invent or "
        f"substitute alternative words or spellings:\n{lexicon}\n"
        f"If you ever need a word that is not on this list, use the most common everyday "
        f"spoken form, and when natives normally use the English word, just use the English "
        f"word.\n\n"
        f"Grammar point to land: {lesson['grammar']} Say it in one plain sentence at the "
        f"right moment, then show it through examples. Never lecture.\n\n"
        f"HOW TO RUN THE CLASS, in order:\n"
        f"1. For each vocabulary item: give the English meaning, say the {ln} form clearly, "
        f"and ask the student to say it back. Wait for them. React. Only then move to the "
        f"next item.\n"
        f"2. After every three items, quick recall: give an English meaning from earlier and "
        f"have them produce the {ln} word from memory.\n"
        f"3. When all items are done, teach the sentence pattern with ONE example, then have "
        f"the student build their own sentences, one at a time. English versions of the "
        f"target sentences: {examples}\n"
        f"4. Two quick check questions: you say the English, they say the {ln}.\n"
        f"5. Recap in two spoken sentences what they can now say, then a warm goodbye.\n"
        f"Practice ideas you can use in steps 3 and 4: {practice}.\n\n" + rules
    )

    if recent:
        recall = _first_recall_item(recent, lang)
        recall_bit = (
            f"then ask them to say, from memory, how to say '{recall[0]}' in {ln} "
            f"(the answer is {recall[1]}), " if recall else ""
        )
        opening = (
            f"Welcome the student back warmly by one short sentence, {recall_bit}"
            f"and tell them today's class is '{lesson['title']}'. One short turn only. "
            f"After their attempt, give quick feedback and start the first item."
        )
    else:
        opening = (
            f"Greet the student warmly in one sentence and name today's lesson, "
            f"'{lesson['title']}'. Then immediately teach the first item: its English "
            f"meaning, the romanized {ln} form, and ask them to say it back. One short turn."
        )

    return {
        "id": f"teacher-{lang}-{lesson_id}",
        "language": LANG_CODE[lang],
        "name": t["name"],
        "voice": t["voice"],
        "pace": 0.98,
        "system_prompt": system,
        "opening": opening,
        "level": 0,
        "gender": "female",
        "teach_mode": False,
        "rubric": [],
    }


def _tutor_fields(lang: str) -> dict | None:
    ln = LANG_NAME.get(lang)
    if not ln:
        return None
    t = TEACHER[lang]
    rules = _CORE_RULES.format(ln=ln)

    # Ground the tutor in what the student has actually studied. Always include
    # the first two lessons so a brand-new student still gets greetings and names.
    visited, recent, _ = _history(lang)
    base_ids = {"l1", "l2"} | {l["id"] for l in visited}
    known = [l for l in _ordered_lessons() if l["id"] in base_ids]
    titles = ", ".join(f"'{l['title']}'" for l in known)
    vocab = "\n".join(
        "- " + line
        for l in known
        for line in _lexicon_lines(l, lang)
        if not line.startswith("note:")
    )
    coverage = (
        f"The student has studied these lessons so far: {titles}. Keep the conversation "
        f"inside that ground so they feel capable. Vetted romanized forms you should prefer:\n"
        f"{vocab}\n"
        f"If the conversation truly needs a word outside this list, give it in its most "
        f"common everyday spoken form with a quick English meaning, at most one new word "
        f"per turn."
    )

    system = (
        f"You are {t['name']}, a warm {ln} conversation tutor on a voice call with an adult "
        f"beginner whose first language is English. This is a relaxed chat, not a lesson, "
        f"but YOU LEAD: you start, you ask the questions, you keep it alive, you never wait "
        f"to be prompted.\n\n"
        f"How to run it:\n"
        f"- Speak in simple {ln}, one short romanized sentence at a time, and add a few "
        f"words of English support when something is likely new.\n"
        f"- Ask one easy concrete question per turn: their name, how they are, what they "
        f"ate, their family, what they like. Real conversation, real reactions.\n"
        f"- Correct on the fly, but fix at most ONE thing per turn: the mistake that most "
        f"affects meaning. Give the better form romanized, have them say it once, then "
        f"respond to WHAT THEY MEANT so it still feels like a chat, not a test.\n"
        f"- If they freeze or go quiet, do not repeat the question louder. Offer a sentence "
        f"frame instead: say the first words of the answer in romanized {ln} and let them "
        f"finish it.\n"
        f"- If they answer in English, accept the meaning warmly, give them the {ln} way to "
        f"say it, and have them try it.\n\n"
        f"{coverage}\n\n" + rules
    )
    opening = (
        f"Greet the student warmly in {ln} (romanized, with a quick English gloss), then ask "
        f"them ONE easy question in {ln} to get them talking. One short turn."
    )
    return {
        "id": f"tutor-{lang}",
        "language": LANG_CODE[lang],
        "name": t["name"],
        "voice": t["voice"],
        "pace": 1.0,
        "system_prompt": system,
        "opening": opening,
        "level": 0,
        "gender": "female",
        "teach_mode": False,
        "rubric": [],
    }


def build_fields(persona_id: str) -> dict | None:
    """Return persona fields for a teacher-<lang>-<lesson> or tutor-<lang> id."""
    parts = persona_id.split("-")
    if parts[0] == "teacher" and len(parts) >= 3:
        return _lesson_fields(parts[1], parts[2])
    if parts[0] == "tutor" and len(parts) >= 2:
        return _tutor_fields(parts[1])
    return None
