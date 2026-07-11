"""Bulbul V3 voice registry for Maatu, split by gender.

Every speaker here is confirmed compatible with the bulbul:v3 model (validated
against Sarvam's speaker list). Bulbul is multilingual: the same speaker works
across kn-IN, hi-IN, ta-IN by setting target_language_code, so voices are chosen
by gender and character, not by language. No em dashes anywhere.
"""

from __future__ import annotations

# Confirmed bulbul:v3 male speakers.
MALE = [
    "kabir",
    "amit",
    "rohan",
    "aditya",
    "varun",
    "dev",
    "sumit",
    "ratan",
    "manan",
    "shubh",
    "rahul",
    "aayan",
    "ashutosh",
    "advait",
]

# Confirmed bulbul:v3 female speakers.
FEMALE = [
    "priya",
    "kavya",
    "neha",
    "shreya",
    "pooja",
    "ishita",
    "roopa",
    "ritu",
    "simran",
    "suhani",
    "rupali",
    "tanya",
    "shruti",
    "kavitha",
]

ALL = set(MALE) | set(FEMALE)


def is_valid(speaker: str) -> bool:
    return speaker in ALL


def gender_of(speaker: str) -> str | None:
    if speaker in MALE:
        return "male"
    if speaker in FEMALE:
        return "female"
    return None


def pick(gender: str, seed: int = 0) -> str:
    """Deterministically pick a voice for a gender, so a persona keeps the same
    voice across runs. Falls back to male if gender is unknown."""
    pool = FEMALE if gender == "female" else MALE
    return pool[seed % len(pool)]


def resolve(voice: str | None, gender: str, seed: int = 0) -> str:
    """Use an explicit valid voice if given, else pick a gender-appropriate one."""
    if voice and is_valid(voice):
        return voice
    return pick(gender, seed)
