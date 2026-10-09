"""Provider adapters. Teaching and scene logic must not depend on vendors.

Profiles are operator configuration, never learner-provided API keys. A room
pins its plan once. There is no silent cross-provider or cross-voice fallback.
"""
from __future__ import annotations
import os
from dataclasses import dataclass
from livekit.plugins import google, sarvam, anthropic

@dataclass(frozen=True)
class VoicePlan:
    mode: str
    brain: str
    stt_model: str
    tts_model: str
    live_model: str

def voice_plan(lang: str) -> VoicePlan:
    default = "gemini-live" if lang == "fr" else "fixed-native"
    mode = os.environ.get(f"MAATU_VOICE_PROFILE_{lang.upper()}", default)
    if mode not in {"fixed-native", "gemini-live"}:
        raise ValueError(f"Unknown voice adapter profile: {mode}")
    if lang == "fr" and mode == "fixed-native":
        raise ValueError("Sarvam native profile does not support French; select gemini-live")
    return VoicePlan(mode, os.environ.get("MAATU_BRAIN_PROVIDER", os.environ.get("BRAIN", "gemini")), os.environ.get("MAATU_STT_MODEL", "saaras:v4"), os.environ.get("MAATU_SARVAM_TTS_MODEL", "bulbul:v3"), os.environ.get(f"MAATU_LIVE_MODEL_{lang.upper()}", os.environ.get("MAATU_FRENCH_MODEL", "gemini-3.8-live")))

def build_brain(plan: VoicePlan):
    if plan.brain == "anthropic":
        return anthropic.LLM(model=os.environ.get("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001"), api_key=os.environ.get("ANTHROPIC_API_KEY"))
    if plan.brain == "openai-compatible":
        from livekit.plugins import openai
        return openai.LLM(model=os.environ["MAATU_SPOKEN_BRAIN_MODEL"], base_url=os.environ["MAATU_BRAIN_BASE_URL"], api_key=os.environ["MAATU_BRAIN_API_KEY"])
    if plan.brain != "gemini":
        raise ValueError(f"Unknown brain adapter: {plan.brain}")
    return google.LLM(model=os.environ.get("MAATU_SPOKEN_BRAIN_MODEL", "gemini-3.5-flash"), thinking_config={"thinking_level": os.environ.get("MAATU_SPOKEN_THINKING_LEVEL", "minimal")}, api_key=os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY"))

def build_native_engines(plan: VoicePlan, persona):
    # Native script is a teaching output contract, independent of transport.
    # The room's language is known, so recognition is locked to it. Auto-detect
    # once heard Tamil as Telugu and the character scolded the learner
    # (9-Oct-2026 probe). Codemix mode still keeps English words in English.
    stt_language = os.environ.get("MAATU_STT_LANGUAGE") or persona.language
    stt = sarvam.STT(language=stt_language, model=plan.stt_model, mode="codemix", prompt=f"Conversation in {persona.language} and Indian English. Preserve English questions in English. Expected names and words: {persona.name}, Maatu, Kannada, Tamil, Hindi, namaskara, hegiddira, vanakkam, eppadi irukkeenga, namaste.", high_vad_sensitivity=True, api_key=os.environ.get("SARVAM_API_KEY"))
    model, speaker = native_voice(persona, plan.tts_model)
    tts = sarvam.TTS(target_language_code=persona.language, model=model, speaker=speaker, pace=persona.pace, min_buffer_size=30, max_chunk_length=50, output_audio_codec="mp3", api_key=os.environ.get("SARVAM_API_KEY"))
    return stt, build_brain(plan), tts

# Bulbul v4 conversational speakers. Kannada moved to v4 on 9-Oct-2026: a
# blind native-listener style comparison preferred it 4 of 4 times over v3
# (v3 sounded slow and segmented). Hindi tied and Tamil has no conversational
# v4 voice yet, so both stay on v3. Override per language with
# MAATU_SARVAM_TTS_MODEL_KN / _HI / _TA.
V4_SPEAKERS = {
    "kn": {"female": "chaitra_kn_conversation", "male": "chetan_kn_conversation"},
}
DEFAULT_TTS_MODEL = {"kn": "bulbul:v4-flash"}


def native_voice(persona, configured_model: str) -> tuple[str, str]:
    lang = (persona.language or "kn-IN")[:2]
    model = os.environ.get(f"MAATU_SARVAM_TTS_MODEL_{lang.upper()}") or DEFAULT_TTS_MODEL.get(lang) or configured_model
    if model.startswith("bulbul:v4"):
        gender = "male" if str(getattr(persona, "gender", "female")).lower().startswith("m") else "female"
        speaker = V4_SPEAKERS.get(lang, {}).get(gender)
        if speaker:
            return model, speaker
        model = configured_model
    return model, persona.voice


def build_live_engine(plan: VoicePlan, voice: str):
    return google.realtime.RealtimeModel(model=plan.live_model, voice=voice, temperature=0.8, api_key=os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY"))

def set_voice_pace(tts, pace: float):
    # Adapters normalize the common speed control to their provider option.
    tts.update_options(pace=pace)
