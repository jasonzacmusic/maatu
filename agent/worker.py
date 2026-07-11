"""Maatu voice agent worker.

Per turn: LiveKit room audio -> Sarvam Saarika STT (language-locked) -> Gemini
Flash brain holding the persona -> Sarvam Bulbul V3 TTS -> room audio. The
persona is chosen from the room name (see persona.py). Per-turn latency from
user-speech-end to agent-audio-start is logged.

Run: .venv/bin/python worker.py dev
No em dashes anywhere, per brand rule.
"""

from __future__ import annotations

import logging
import os
import time
from pathlib import Path

from dotenv import load_dotenv
from livekit import agents
from livekit.agents import Agent, AgentSession, metrics
from livekit.plugins import sarvam, silero

from persona import persona_from_room_name

load_dotenv(Path(__file__).resolve().parent / ".env")

SARVAM_API_KEY = os.environ.get("SARVAM_API_KEY")
# Our env names the brain key GEMINI_API_KEY; the Google plugin wants it passed
# explicitly (it only auto-reads GOOGLE_API_KEY).
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
# Flash-lite answers in about 1s (vs 5s+ for full flash), which keeps the
# conversation real time. 2.x flash is retired.
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-flash-lite-latest")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
ANTHROPIC_MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001")
# The Brain is provider flexible per the spec. Anthropic is preferred when its
# key is present (Gemini free tier is zero quota in some regions); otherwise
# Gemini. Force one with BRAIN=anthropic or BRAIN=gemini.
BRAIN = os.environ.get("BRAIN", "anthropic" if ANTHROPIC_API_KEY else "gemini")


def build_brain():
    if BRAIN == "anthropic" and ANTHROPIC_API_KEY:
        from livekit.plugins import anthropic

        return anthropic.LLM(model=ANTHROPIC_MODEL, api_key=ANTHROPIC_API_KEY)
    from livekit.plugins import google

    # Disable thinking for lower latency; these are quick spoken turns.
    try:
        return google.LLM(
            model=GEMINI_MODEL,
            temperature=0.8,
            api_key=GEMINI_API_KEY,
            thinking_config={"thinking_budget": 0},
        )
    except Exception:
        return google.LLM(model=GEMINI_MODEL, temperature=0.8, api_key=GEMINI_API_KEY)

logger = logging.getLogger("maatu.agent")
logging.basicConfig(level=logging.INFO)


async def entrypoint(ctx: agents.JobContext):
    await ctx.connect()

    persona = persona_from_room_name(ctx.room.name)
    logger.info(
        "room=%s persona=%s language=%s voice=%s brain=%s",
        ctx.room.name,
        persona.id,
        persona.language,
        persona.voice,
        BRAIN,
    )

    session = AgentSession(
        stt=sarvam.STT(
            language=persona.language,
            model="saarika:v2.5",
            api_key=SARVAM_API_KEY,
        ),
        llm=build_brain(),
        tts=sarvam.TTS(
            target_language_code=persona.language,
            model="bulbul:v3",
            speaker=persona.voice,
            pace=persona.pace,
            api_key=SARVAM_API_KEY,
        ),
        vad=silero.VAD.load(),
    )

    # Latency logging: mark when the user stops speaking, measure to first agent audio.
    turn = {"user_stopped_at": None}

    @session.on("user_input_transcribed")
    def _on_user_transcript(ev):
        if getattr(ev, "is_final", False):
            turn["user_stopped_at"] = time.perf_counter()

    @session.on("agent_state_changed")
    def _on_agent_state(ev):
        if getattr(ev, "new_state", None) == "speaking" and turn["user_stopped_at"]:
            latency_ms = (time.perf_counter() - turn["user_stopped_at"]) * 1000
            budget = "OK" if latency_ms <= 1500 else "OVER"
            logger.info("turn latency: %.0f ms [%s]", latency_ms, budget)
            turn["user_stopped_at"] = None

    @session.on("metrics_collected")
    def _on_metrics(ev):
        metrics.log_metrics(ev.metrics)

    await session.start(
        room=ctx.room,
        agent=Agent(instructions=persona.system_prompt),
    )

    # The character speaks first, in scene.
    await session.generate_reply(instructions=persona.opening)


if __name__ == "__main__":
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))
