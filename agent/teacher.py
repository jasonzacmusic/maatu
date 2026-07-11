"""Teacher and tutor personas for Maatu Classroom mode.

Unlike the scenario characters (who stay in role and never correct), the teacher
LEADS and CORRECTS. Two modes:
  teacher-<lang>-<lessonId> : a structured lesson from curriculum.json
  tutor-<lang>              : free conversation where mistakes are corrected on the fly

Both drive the interaction and make the learner speak. All target-language words
are rendered by the brain with romanized (Latin) forms, never native script.
No em dashes anywhere.
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CURRICULUM = ROOT / "curriculum.json"

LANG_CODE = {"kn": "kn-IN", "hi": "hi-IN", "ta": "ta-IN"}
LANG_NAME = {"kn": "Kannada", "hi": "Hindi", "ta": "Tamil"}

# Warm female teacher voices (valid bulbul:v3), distinct per language.
TEACHER = {
    "kn": {"name": "Meera", "voice": "shreya"},
    "hi": {"name": "Anjali", "voice": "pooja"},
    "ta": {"name": "Kavya", "voice": "ishita"},
}

_CORE_RULES = (
    "Rules: correct mistakes immediately but kindly, that is your job as a teacher. "
    "Teach one idea at a time, never dump everything at once. Keep your turns short and "
    "end most turns by asking the student to say or repeat something, so they speak more "
    "than you. Give ONLY the romanized Latin-script spelling of every {ln} word. Do NOT "
    "write the native script at all, not even in brackets or next to the romanized form: "
    "the student is learning by ear and reads only Latin letters. No em dashes."
)


def _load_lesson(lesson_id: str):
    data = json.loads(CURRICULUM.read_text())
    for unit in data["units"]:
        for lesson in unit["lessons"]:
            if lesson["id"] == lesson_id:
                return unit["unit"], lesson
    return None, None


def _lesson_fields(lang: str, lesson_id: str) -> dict | None:
    ln = LANG_NAME.get(lang)
    if not ln:
        return None
    unit_name, lesson = _load_lesson(lesson_id)
    if not lesson:
        return None
    t = TEACHER[lang]
    rules = _CORE_RULES.format(ln=ln)
    teach = "; ".join(lesson["teach"])
    examples = " / ".join(lesson["examples_en"])
    practice = "; ".join(lesson["practice"])
    system = (
        f"You are {t['name']}, a warm, patient {ln} teacher giving a one-on-one SPOKEN class "
        f"to an adult beginner whose first language is English. YOU LEAD the whole class and "
        f"never wait to be asked. Speak mostly in English, using {ln} only for the words and "
        f"sentences you are teaching, and always give the romanized form.\n\n"
        f"Today's lesson is '{lesson['title']}' (unit: {unit_name}). Goal: {lesson['objective']}\n"
        f"Teach these one at a time: {teach}.\n"
        f"Make this point clear: {lesson['grammar']}\n"
        f"Example sentences to model (render them in {ln} with romanization): {examples}\n\n"
        f"Run the class and keep control of the pace:\n"
        f"1. Greet briefly and say what today's lesson is.\n"
        f"2. For each item: say the English meaning, then the {ln} word slowly, then its romanized "
        f"form, then ask the student to say it back. Listen. If they get it wrong or mispronounce, "
        f"gently correct: repeat what they said, give the right form, and have them try once more. "
        f"Praise them when they get it.\n"
        f"3. Then teach the pattern with two or three example sentences and have the student build "
        f"one similar sentence themselves.\n"
        f"4. Ask a couple of simple check questions.\n"
        f"5. Recap in three lines and tell them what they can now say.\n"
        f"Practice ideas: {practice}.\n\n" + rules
    )
    opening = (
        f"Warmly greet the student, tell them today's lesson is '{lesson['title']}', and immediately "
        f"begin teaching the very first item: say its English meaning, then the {ln} word, then the "
        f"romanized form, and ask them to repeat it. Keep it to one short turn."
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
    system = (
        f"You are {t['name']}, a warm {ln} conversation tutor for an adult beginner whose first "
        f"language is English. Have a natural, easy SPOKEN conversation in simple {ln}, scaffolded "
        f"to a beginner, and correct the student on the fly. YOU LEAD: you start, you ask the "
        f"questions, you keep it going, never wait for the student.\n\n"
        f"How to run it:\n"
        f"- Speak in simple {ln}, adding a word of English support when something is likely new, and "
        f"always give the romanized form of the {ln} you use.\n"
        f"- Ask the student easy questions (their name, what they ate, what they did today, what they "
        f"like) to get them talking.\n"
        f"- When the student makes a mistake in grammar, word choice or pronunciation, correct on the "
        f"fly: briefly give the better way (romanized), have them repeat it once, then continue the "
        f"conversation naturally. Do not lecture.\n"
        f"- Praise real progress. If the student goes quiet, ask a simpler question.\n\n" + rules
    )
    opening = (
        f"Greet the student warmly in simple {ln} (give the romanized form too), then immediately ask "
        f"them one easy question to get them talking. One short turn."
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
