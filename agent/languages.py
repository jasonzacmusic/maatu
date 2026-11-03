"""Reads languages.json, the one place every Maatu language is configured.

The worker, the teacher prompts and the web app all read the same file, so a
voice or recognition fix made there applies to every language at once.
No em dashes anywhere.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

_HERE = Path(__file__).resolve().parent
# The repo keeps the file at the root; the cloud image copies it beside agent/.
_CANDIDATES = [_HERE.parent / "languages.json", _HERE / "languages.json"]
_PATH = next((p for p in _CANDIDATES if p.exists()), _CANDIDATES[0])
LANGUAGES: dict[str, dict] = json.loads(_PATH.read_text(encoding="utf-8"))["languages"]


def short(code_or_short: str | None) -> str:
    """'kn-IN' or 'kn' -> 'kn'."""
    return (code_or_short or "kn")[:2].lower()


def lang(code_or_short: str | None) -> dict:
    key = short(code_or_short)
    if key not in LANGUAGES:
        raise ValueError(f"Language {key!r} is not in languages.json")
    return LANGUAGES[key]


def engine(code_or_short: str | None) -> str:
    """'sarvam' or 'gemini-live'. MAATU_ENGINE_KN etc. overrides one language."""
    key = short(code_or_short)
    return os.environ.get(f"MAATU_ENGINE_{key.upper()}") or lang(key)["engine"]


def call_voice(code_or_short: str | None, gender: str, persona_voice: str) -> tuple[str, str]:
    """The Sarvam model and speaker for a live call.

    A language with speakers listed uses them for every character of that
    gender; otherwise the character keeps its own Bulbul v3 voice.
    """
    cfg = lang(code_or_short)
    g = "male" if str(gender).lower().startswith("m") else "female"
    speaker = (cfg.get("speakers") or {}).get(g)
    if speaker:
        return cfg["voiceModel"], speaker
    return "bulbul:v3", persona_voice


LANG_CODE = {k: v["code"] for k, v in LANGUAGES.items()}
LANG_NAME = {k: v["name"] for k, v in LANGUAGES.items()}
CITY = {k: v["city"] for k, v in LANGUAGES.items()}
TEACHER = {k: {"name": v["teacher"]["name"], "voice": v["teacher"]["voice"]} for k, v in LANGUAGES.items()}
