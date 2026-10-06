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
    stt = sarvam.STT(language="unknown", model=plan.stt_model, mode="codemix", prompt=f"Conversation in {persona.language} and Indian English. Preserve English questions in English. Expected names and words: {persona.name}, Maatu, Kannada, Tamil, Hindi, namaskara, hegiddira, vanakkam, eppadi irukkeenga, namaste.", high_vad_sensitivity=True, api_key=os.environ.get("SARVAM_API_KEY"))
    tts = sarvam.TTS(target_language_code=persona.language, model=plan.tts_model, speaker=persona.voice, pace=persona.pace, min_buffer_size=30, max_chunk_length=50, output_audio_codec="mp3", api_key=os.environ.get("SARVAM_API_KEY"))
    return stt, build_brain(plan), tts

def build_live_engine(plan: VoicePlan, voice: str):
    return google.realtime.RealtimeModel(model=plan.live_model, voice=voice, temperature=0.8, api_key=os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY"))

def set_voice_pace(tts, pace: float):
    # Adapters normalize the common speed control to their provider option.
    tts.update_options(pace=pace)
