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


def build_brain():
    if BRAIN == "anthropic" and ANTHROPIC_API_KEY:
        return anthropic.LLM(model=ANTHROPIC_MODEL, api_key=ANTHROPIC_API_KEY)

    # No thinking_config here, on purpose. Google repointed gemini-flash-lite-latest
    # to a model that rejects thinking_budget 0 with a 400 INVALID_ARGUMENT, which
    # silenced every reply in production (2026-07-22). The current lite model spends
    # zero thought tokens on these short spoken turns anyway (~1s replies).
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

    async def _apply_slow_down():
        slower_pace = max(0.72, persona.pace - 0.18)
        tts_engine.update_options(pace=slower_pace)
        logger.info(
            "control=slow-down persona=%s pace=%.2f",
            persona.id,
            slower_pace,
        )
        try:
            await ctx.room.local_participant.publish_data(
                json.dumps({"action": "slow-down-applied", "pace": slower_pace}),
                reliable=True,
                topic="maatu.control",
            )
        except Exception:
            logger.exception("slow-down acknowledgment failed persona=%s", persona.id)
        try:
            await session.interrupt(force=True)
        except Exception:
            pass
        try:
            reply = session.generate_reply(
                instructions=(
                    "The learner tapped the slow down control. Acknowledge it in one short "
                    "romanized target-language phrase, then repeat your most recent teaching "
                    "point, question, or scene prompt more slowly. Use very short chunks and "
                    "full-stop pauses. Stay at the same point in the lesson or scene."
                )
            )
            await reply.wait_for_playout()
        except Exception:
            logger.exception("slow-down reply failed persona=%s", persona.id)

    @ctx.room.on("data_received")
    def _on_data_received(packet):
        if packet.topic != "maatu.control":
            return
        try:
            payload = json.loads(packet.data.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            return
        if payload.get("action") == "slow-down":
            asyncio.create_task(_apply_slow_down())

    # Latency logging: mark the VAD speech end, then measure to first agent audio.
    # The canned one-word acknowledgment that used to play here is gone for good:
    # when the brain broke it was the ONLY thing the learner ever heard, and even
    # healthy it made the teacher sound robotic. Preemptive generation above keeps
    # latency inside the budget without faking a reply.
    turn = {
        "user_stopped_at": None,
        "awaiting_first_audio": False,
    }

    @session.on("user_state_changed")
    def _on_user_state(ev):
        speech_ended = (
            getattr(ev, "old_state", None) == "speaking"
            and getattr(ev, "new_state", None) == "listening"
        )
        if speech_ended:
            turn["user_stopped_at"] = time.perf_counter()
            turn["awaiting_first_audio"] = True

    @session.on("agent_state_changed")
    def _on_agent_state(ev):
        if (
            getattr(ev, "new_state", None) == "speaking"
            and turn["awaiting_first_audio"]
            and turn["user_stopped_at"]
        ):
            latency_ms = (time.perf_counter() - turn["user_stopped_at"]) * 1000
            budget = "OK" if latency_ms <= 1500 else "OVER"
            logger.info(
                "turn latency: %.0f ms [%s] speech_end_to_agent_audio persona=%s",
                latency_ms,
                budget,
                persona.id,
            )
            turn["user_stopped_at"] = None
            turn["awaiting_first_audio"] = False

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
    agents.cli.run_app(
        agents.WorkerOptions(
            entrypoint_fnc=entrypoint,
            job_executor_type=agents.JobExecutorType.THREAD,
            num_idle_processes=0,
        )
    )
