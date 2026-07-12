"""Persona loading and system-prompt construction for Maatu.

Personas are JSON data (see ../personas). This module turns one into a live
character brief the Brain LLM can hold, plus the STT/TTS settings for the turn.
No em dashes anywhere, per brand rule.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

PERSONA_DIR = Path(__file__).resolve().parent.parent / "personas"

LANG_NAMES = {
    "kn-IN": "Kannada",
    "hi-IN": "Hindi",
    "ta-IN": "Tamil",
    "en-IN": "Indian English",
}

DEFAULT_PERSONA = "kn-auto"


@dataclass
class Persona:
    id: str
    language: str
    name: str
    voice: str
    pace: float
    opening: str
    system_prompt: str
    level: int
    gender: str
    teach_mode: bool
    rubric: list
    raw: dict

    @property
    def language_name(self) -> str:
        return LANG_NAMES.get(self.language, self.language)


def _build_system_prompt(p: dict) -> str:
    lang = LANG_NAMES.get(p["language"], p["language"])
    parts = [
        f"You are {p['name']}. {p.get('character', '')}".strip(),
        f"How you speak: {p['speech_style']}",
        f"How you behave at this level: {p['level_behavior']}",
        f"What you want in this scene: {p['goals']}",
        f"Correction policy: {p['correction_policy']}",
        (
            f"The person you are talking to is practicing spoken {lang}, but you do NOT "
            "know that. To you they are just a normal person in this scene. Never mention "
            "that you are an AI, a bot, a teacher, or a language exercise. Never break "
            "character."
        ),
        (
            "This is a live spoken phone conversation. Never spell things out, never read "
            "out punctuation, never write in the native script. Keep every turn short, one "
            "or two sentences, the way people actually talk on the phone."
        ),
        (
            f"Speak ONLY in {lang}, using the natural code-mixing described above. Do not "
            "answer in full English sentences."
        ),
    ]
    agenda = p.get("secret_agenda") or []
    if agenda:
        parts.append(
            "Secret agenda, weave these into the conversation naturally and never announce "
            "them: " + "; ".join(agenda) + "."
        )
    parts.append(f"How the scene ends: {p['end_condition']}")
    return "\n\n".join(x for x in parts if x)


def _persona_from_fields(data: dict) -> Persona:
    """Build a Persona from a fully-formed fields dict (teacher/tutor path,
    where the system prompt and opening are already written)."""
    from voices import resolve

    gender = data.get("gender", "female")
    seed = sum(ord(c) for c in data["id"])
    return Persona(
        id=data["id"],
        language=data["language"],
        name=data["name"],
        voice=resolve(data.get("voice"), gender, seed),
        pace=float(data.get("pace", 1.0)),
        opening=data["opening"],
        system_prompt=data["system_prompt"],
        level=int(data.get("level", 0)),
        gender=gender,
        teach_mode=bool(data.get("teach_mode", False)),
        rubric=data.get("rubric", []),
        raw=data,
    )


def load_persona(persona_id: str | None) -> Persona:
    pid = persona_id or DEFAULT_PERSONA
    # Classroom mode: teacher-<lang>-<lesson> and tutor-<lang> are built, not files.
    if pid.startswith("teacher-") or pid.startswith("tutor-"):
        from teacher import build_fields

        fields = build_fields(pid)
        if fields:
            return _persona_from_fields(fields)
        pid = DEFAULT_PERSONA
    path = PERSONA_DIR / f"{pid}.json"
    if not path.exists():
        path = PERSONA_DIR / f"{DEFAULT_PERSONA}.json"
        pid = DEFAULT_PERSONA
    data = json.loads(path.read_text())
    tts = data.get("tts", {}) or {}
    gender = data.get("gender", "male")
    # Resolve to a valid Bulbul v3 voice, gender appropriate if none/invalid.
    from voices import resolve

    seed = sum(ord(c) for c in data["id"])
    voice = resolve(data.get("voice"), gender, seed)
    return Persona(
        id=data["id"],
        language=data["language"],
        name=data["name"],
        voice=voice,
        pace=float(tts.get("pace", 1.0)),
        opening=data.get(
            "opening",
            f"Greet the person naturally and start the scene, in your own {LANG_NAMES.get(data['language'], data['language'])}.",
        ),
        system_prompt=_build_system_prompt(data),
        level=int(data.get("level", 3)),
        gender=gender,
        teach_mode=bool(data.get("teach_mode", False)),
        rubric=data.get("debrief_rubric", []),
        raw=data,
    )


def persona_from_room_name(room_name: str) -> Persona:
    """Room names are '<persona-id>__<random>'. Fall back to the default."""
    persona_id = room_name.split("__", 1)[0] if room_name else None
    return load_persona(persona_id)


def apply_secret_agenda(persona: Persona, agenda: list[str]) -> Persona:
    """Apply the active nightly agenda to a file-backed persona."""
    if not agenda or persona.id.startswith("teacher-") or persona.id.startswith("tutor-"):
        return persona
    data = dict(persona.raw)
    data["secret_agenda"] = agenda
    persona.raw = data
    persona.system_prompt = _build_system_prompt(data)
    return persona
