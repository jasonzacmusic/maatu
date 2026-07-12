"""Maatu voice agent worker.

Per turn: LiveKit room audio -> Sarvam Saarika STT (language-locked) -> Gemini
Flash brain holding the persona -> Sarvam Bulbul V3 TTS -> room audio. The
persona is chosen from the room name (see persona.py). Per-turn latency from
user-speech-end to agent-audio-start is logged.

Run: .venv/bin/python worker.py dev
No em dashes anywhere, per brand rule.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import time
import urllib.parse
import urllib.request
from pathlib import Path

from dotenv import load_dotenv
from livekit import agents
from livekit.agents import Agent, AgentSession, metrics
from livekit.plugins import anthropic, google, sarvam, silero

from persona import apply_secret_agenda, persona_from_room_name

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
MAATU_APP_URL = os.environ.get("MAATU_APP_URL", "https://maatu.vercel.app")

ACKNOWLEDGMENTS = {
    "kn-IN": "Sari.",
    "hi-IN": "Theek hai.",
    "ta-IN": "Seri.",
}


def build_brain():
    if BRAIN == "anthropic" and ANTHROPIC_API_KEY:
        return anthropic.LLM(model=ANTHROPIC_MODEL, api_key=ANTHROPIC_API_KEY)

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


def fetch_active_agenda(persona_id: str) -> tuple[list[str] | None, str | None]:
    query = urllib.parse.urlencode({"persona": persona_id})
    try:
        with urllib.request.urlopen(f"{MAATU_APP_URL}/api/persona-agenda?{query}", timeout=3) as response:
            data = json.loads(response.read())
        agenda = data.get("secretAgenda")
        if isinstance(agenda, list) and all(isinstance(item, str) for item in agenda):
            return agenda, data.get("updatedAt")
    except Exception:
        pass
    return None, None

logger = logging.getLogger("maatu.agent")
logging.basicConfig(level=logging.INFO)


async def entrypoint(ctx: agents.JobContext):
    await ctx.connect()

    persona = persona_from_room_name(ctx.room.name)
    agenda, agenda_updated_at = await asyncio.to_thread(fetch_active_agenda, persona.id)
    if agenda:
        persona = apply_secret_agenda(persona, agenda)
    logger.info(
        "room=%s persona=%s language=%s voice=%s brain=%s agenda_updated_at=%s",
        ctx.room.name,
        persona.id,
        persona.language,
        persona.voice,
        BRAIN,
        agenda_updated_at or "default",
    )

    tts_engine = sarvam.TTS(
        target_language_code=persona.language,
        model="bulbul:v3",
        speaker=persona.voice,
        pace=persona.pace,
        min_buffer_size=30,
        api_key=SARVAM_API_KEY,
    )

    session = AgentSession(
        stt=sarvam.STT(
            language=persona.language,
            model="saarika:v2.5",
            api_key=SARVAM_API_KEY,
        ),
        llm=build_brain(),
        tts=tts_engine,
        vad=silero.VAD.load(min_silence_duration=0.25),
        turn_handling={
            "endpointing": {"min_delay": 0.3, "max_delay": 2.0},
            "preemptive_generation": {"enabled": True, "preemptive_tts": True, "max_speech_duration": 12.0},
        },
    )

    # Latency logging: mark the VAD speech end, then measure to first agent audio.
    turn = {"user_stopped_at": None, "transcript": "", "ack_active": False}
    acknowledgment_frames = []

    async def _acknowledgment_audio():
        for frame in acknowledgment_frames:
            yield frame

    async def _finish_turn_after_acknowledgment(handle):
        try:
            await handle.wait_for_playout()
            reply = session.generate_reply()
            await reply.wait_for_playout()
        finally:
            turn["ack_active"] = False

    @session.on("user_state_changed")
    def _on_user_state(ev):
        if getattr(ev, "old_state", None) == "speaking" and getattr(ev, "new_state", None) == "listening":
            turn["user_stopped_at"] = time.perf_counter()
            if acknowledgment_frames and not turn["ack_active"]:
                turn["ack_active"] = True
                handle = session.say(
                    ACKNOWLEDGMENTS.get(persona.language, "Okay."),
                    audio=_acknowledgment_audio(),
                    allow_interruptions=False,
                    add_to_chat_ctx=False,
                )
                asyncio.create_task(_finish_turn_after_acknowledgment(handle))

    @session.on("user_input_transcribed")
    def _on_user_transcript(ev):
        if getattr(ev, "is_final", False):
            turn["transcript"] = getattr(ev, "transcript", "")

    @session.on("agent_state_changed")
    def _on_agent_state(ev):
        if getattr(ev, "new_state", None) == "speaking" and turn["user_stopped_at"]:
            latency_ms = (time.perf_counter() - turn["user_stopped_at"]) * 1000
            budget = "OK" if latency_ms <= 1500 else "OVER"
            logger.info(
                "turn latency: %.0f ms [%s] speech_end_to_agent_audio persona=%s transcript=%r",
                latency_ms,
                budget,
                persona.id,
                turn["transcript"][:80],
            )
            turn["user_stopped_at"] = None
            turn["transcript"] = ""

    @session.on("metrics_collected")
    def _on_metrics(ev):
        metrics.log_metrics(ev.metrics)

    await session.start(
        room=ctx.room,
        agent=Agent(instructions=persona.system_prompt),
    )

    async for chunk in tts_engine.synthesize(ACKNOWLEDGMENTS.get(persona.language, "Okay.")):
        acknowledgment_frames.append(chunk.frame)

    # The character speaks first, in scene.
    await session.generate_reply(instructions=persona.opening)


if __name__ == "__main__":
    agents.cli.run_app(
        agents.WorkerOptions(
            entrypoint_fnc=entrypoint,
            job_executor_type=agents.JobExecutorType.THREAD,
            num_idle_processes=0,
        )
    )
