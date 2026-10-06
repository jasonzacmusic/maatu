"""Maatu voice agent worker.

Per turn: LiveKit room audio -> Sarvam Saarika STT (auto-detect) -> Gemini
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
from livekit.agents import Agent, AgentSession
from livekit.plugins import anthropic, google, sarvam, silero

from speech_contract import NativeSpeechAgent
from providers import voice_plan, build_native_engines, build_live_engine, set_voice_pace
from persona import apply_practice_metadata, apply_secret_agenda, persona_from_room_name

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
# Empty (the default) means automatic dispatch: this worker answers every
# production room. A test worker sets a name so it only joins rooms that are
# explicitly dispatched to it and never steals a real learner's call.
# 'production' also means automatic dispatch (a cloud secret cannot be empty).
AGENT_NAME = os.environ.get("MAATU_AGENT_NAME", "")
if AGENT_NAME == "production":
    AGENT_NAME = ""


def fetch_active_agenda(persona_id: str) -> tuple[list[str] | None, str | None]:
    query = urllib.parse.urlencode({"persona": persona_id})
    try:
        with urllib.request.urlopen(f"{MAATU_APP_URL}/api/persona-agenda?{query}", timeout=3) as response:
            data = json.loads(response.read())
        agenda = data.get("secretAgenda")
        if isinstance(agenda, list) and all(isinstance(item, str) for item in agenda):
            return agenda, data.get("updatedAt")
    except Exception as exc:
        logger.warning("active agenda unavailable persona=%s error=%s", persona_id, exc)
    return None, None

logger = logging.getLogger("maatu.agent")
logging.basicConfig(level=logging.INFO)

# Profile selection is pinned per room in providers.py. The controller below
# owns interruption, pause, resume, teaching and progress for every profile.
LIVE_VOICES = {"female": ["Kore", "Aoede", "Leda", "Zephyr"], "male": ["Puck", "Charon", "Orus", "Fenrir"]}
CITY = {"kn": "Bengaluru", "hi": "Delhi", "ta": "Chennai", "fr": "Paris"}


def persona_lang(persona) -> str:
    return (persona.language or "kn-IN")[:2]


async def run_live(ctx: agents.JobContext, persona, plan) -> None:
    lang = persona_lang(persona)
    gender = "male" if str(getattr(persona, "gender", "female")).lower().startswith("m") else "female"
    voices = LIVE_VOICES[gender]
    voice = voices[sum(map(ord, persona.id)) % len(voices)] if not persona.id.startswith(("tutor-", "teacher-")) else {"kn": "Kore", "hi": "Aoede", "ta": "Leda", "fr": "Aoede"}[lang]
    logger.info("room=%s persona=%s engine=gemini-live model=%s voice=%s", ctx.room.name, persona.id, plan.live_model, voice)
    # The script rule in the prompts exists for a text voice; a speaking model
    # just speaks, so tell it how to sound.
    instructions = persona.system_prompt + (
        f"\n\nYou are speaking out loud yourself. Pronounce every word the way a local from {CITY.get(lang, 'India')} "
        "says it, in the everyday spoken register. Keep the same local accent, vocal identity and dialect across every turn, including English support. Never imitate the learner's accent or switch to American English. "
        "Speak at a relaxed, clear pace for a learner. Say only your direct conversational reply, never narrate instructions or describe what you plan to say."
    )
    session = AgentSession(
        llm=build_live_engine(plan, voice),
    )

    @ctx.room.on("track_subscribed")
    def _on_track(track, publication, participant):
        logger.info("heard track room=%s kind=%s from=%s", ctx.room.name, getattr(track, "kind", "?"), getattr(participant, "identity", "?"))

    @session.on("conversation_item_added")
    def _on_item(ev):
        item = getattr(ev, "item", None)
        role = getattr(item, "role", None)
        text = getattr(item, "text_content", None)
        if role in ("user", "assistant") and text:
            logger.info("transcript room=%s %s: %s", ctx.room.name, "learner" if role == "user" else "agent", " ".join(text.split()))

    turn = {"ended_at": None}

    @session.on("user_state_changed")
    def _user_state(ev):
        if getattr(ev, "old_state", None) == "speaking" and getattr(ev, "new_state", None) == "listening":
            turn["ended_at"] = time.perf_counter()

    @session.on("agent_state_changed")
    def _agent_state(ev):
        if getattr(ev, "new_state", None) == "speaking" and turn["ended_at"]:
            ms = (time.perf_counter() - turn["ended_at"]) * 1000
            logger.info("turn latency: %.0f ms [%s] speech_end_to_agent_audio persona=%s", ms, "OK" if ms <= 1500 else "OVER", persona.id)
            turn["ended_at"] = None

    async def _control(action):
        language_name = {"kn": "Kannada", "hi": "Hindi", "ta": "Tamil", "fr": "French"}[lang]
        commands = {
            "slow-down": f"Please slow down and keep that slower pace. Say the most recent {language_name} phrase you taught me again, slowly. Repeat that same phrase, not the English follow-up question. Do not add a new exercise.",
            "repeat": f"Please repeat the most recent {language_name} phrase you taught me, exactly. I want to hear that phrase again, not the English follow-up question. Do not add a new exercise.",
            "explain": "What is the English meaning of the last target-language phrase you taught me?",
            "resume": "I am ready. Let us continue where we left off.",
        }
        if action not in commands and action != "pause":
            return
        try:
            if action == "pause":
                session.input.set_audio_enabled(False)
                await session.interrupt(force=True)
            else:
                if action == "resume": session.input.set_audio_enabled(True)
                await session.interrupt(force=True)
            if action == "slow-down":
                await session.current_agent.update_instructions(instructions + "\n\nThe learner wants a slower pace for this call. Use wider pauses and short phrases while keeping the topic and teaching behavior.")
            if action != "pause": session.generate_reply(user_input=commands[action])
            await ctx.room.local_participant.publish_data(
                json.dumps({"action": "slow-down-applied" if action == "slow-down" else "control-applied", "control": action, "pace": 0.8}),
                reliable=True, topic="maatu.control"
            )
        except Exception:
            logger.exception("control failed persona=%s action=%s", persona.id, action)

    @ctx.room.on("data_received")
    def _on_data(packet):
        if getattr(packet, "topic", None) != "maatu.control":
            return
        try:
            payload = json.loads(bytes(packet.data).decode())
        except (ValueError, UnicodeDecodeError):
            return
        if isinstance(payload, dict):
            asyncio.create_task(_control(payload.get("action")))

    await session.start(room=ctx.room, agent=Agent(instructions=instructions))
    await session.generate_reply(instructions=persona.opening)

    # A learner whose microphone never arrives cannot talk; do not hold the
    # call (and cloud minutes) open forever.
    async def _close_if_no_mic():
        await asyncio.sleep(90)
        has_mic = any(
            pub.kind == 1
            for p in ctx.room.remote_participants.values()
            for pub in p.track_publications.values()
        )
        if not has_mic:
            logger.warning("no learner microphone after 90 s, closing room=%s", ctx.room.name)
            ctx.shutdown(reason="no learner microphone")

    asyncio.create_task(_close_if_no_mic())




async def entrypoint(ctx: agents.JobContext):
    await ctx.connect()

    room_name = ctx.room.name
    # A named test worker serves rooms called '<agent name>.<persona>__<id>'.
    # The production worker rejects that prefix as an unknown persona, so a
    # test call is answered by exactly one voice.
    if AGENT_NAME and room_name.startswith(AGENT_NAME + "."):
        room_name = room_name[len(AGENT_NAME) + 1 :]
    try:
        persona = persona_from_room_name(room_name)
    except ValueError as exc:
        logger.error("rejecting room=%s error=%s", ctx.room.name, exc)
        return
    learner_metadata = None
    if not persona.id.startswith("teacher-"):
        # The Build tab starts a companion call with the sentence the learner
        # just built in their participant metadata. Read it before the
        # greeting so the companion opens on that line.
        try:
            learner = await asyncio.wait_for(ctx.wait_for_participant(), timeout=10)
            learner_metadata = learner.metadata
        except asyncio.TimeoutError:
            logger.warning("no learner joined within 10 s room=%s", ctx.room.name)
        except Exception:
            logger.exception("practice metadata read failed room=%s", ctx.room.name)
    classroom_mode = persona.id.startswith("teacher-") or persona.id.startswith("tutor-")
    agenda, agenda_updated_at = (
        (None, None)
        if classroom_mode
        else await asyncio.to_thread(fetch_active_agenda, persona.id)
    )
    if agenda:
        persona = apply_secret_agenda(persona, agenda)
    persona = apply_practice_metadata(persona, learner_metadata)
    line = persona.raw.get("practice_line")
    if line:
        logger.info("practice line room=%s practice=%s practice_en=%s", ctx.room.name, line["practice"], line["practiceEn"])
    plan = voice_plan(persona_lang(persona))
    if plan.mode == "gemini-live":
        await run_live(ctx, persona, plan)
        return
    logger.info(
        "room=%s persona=%s language=%s voice=%s brain=%s difficulty=%s agenda_updated_at=%s",
        ctx.room.name,
        persona.id,
        persona.language,
        persona.voice,
        BRAIN,
        persona.raw.get("_difficulty_stage", 2),
        agenda_updated_at or "default",
    )

    stt_engine, brain_engine, tts_engine = build_native_engines(plan, persona)
    session = AgentSession(
        stt=stt_engine,
        llm=brain_engine,
        tts=tts_engine,
        # 0.25 is the FLOOR the TurnDetector allows. Anything lower makes
        # session.start raise ValueError and every call crashes before the
        # teacher speaks. Do not lower this while the turn detector is in use.
        vad=silero.VAD.load(min_silence_duration=0.25),
        turn_handling={
            "endpointing": {"min_delay": 0.4, "max_delay": 0.7},
            "interruption": {
                "enabled": True,
                "mode": "vad",
                "min_duration": 0.25,
                "min_words": 1,
                "resume_false_interruption": False,
            },
            "preemptive_generation": {"enabled": True, "preemptive_tts": True, "max_speech_duration": 12.0},
        },
        aec_warmup_duration=0.75,
    )

    async def _apply_slow_down():
        slower_pace = max(0.72, persona.pace - 0.18)
        set_voice_pace(tts_engine, slower_pace)
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
                    "The learner tapped slow down. Repeat ONLY the most recent target-language "
                    "teaching phrase exactly, in native script, not the English follow-up. Use very short chunks and "
                    "full-stop pauses. Stay at the same point in the lesson or scene."
                )
            )
            await reply.wait_for_playout()
        except Exception:
            logger.exception("slow-down reply failed persona=%s", persona.id)

    async def _native_control(action):
        language_name = {"kn": "Kannada", "hi": "Hindi", "ta": "Tamil"}[persona_lang(persona)]
        commands = {
            "repeat": f"Repeat only the last {language_name} teaching phrase exactly, in native script, not the English follow-up. Do not start a new exercise.",
            "explain": "Give the plain English meaning of the last target-language phrase first. Do not introduce a new exercise.",
            "resume": "I am ready. Continue the same conversation where we paused.",
        }
        if action not in {*commands, "pause", "slow-down"}: return
        try:
            if action == "slow-down":
                await _apply_slow_down()
                return
            if action == "pause":
                session.input.set_audio_enabled(False)
                await session.interrupt(force=True)
            else:
                if action == "resume": session.input.set_audio_enabled(True)
                await session.interrupt(force=True)
                session.generate_reply(user_input=commands[action])
            await ctx.room.local_participant.publish_data(json.dumps({"action":"control-applied","control":action}), reliable=True, topic="maatu.control")
        except Exception:
            logger.exception("native control failed persona=%s action=%s", persona.id, action)

    @ctx.room.on("data_received")
    def _on_data_received(packet):
        if packet.topic != "maatu.control":
            return
        try:
            payload = json.loads(packet.data.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            return
        if isinstance(payload, dict): asyncio.create_task(_native_control(payload.get("action")))

    @session.on("user_input_transcribed")
    def _on_user_input_transcribed(ev):
        if not getattr(ev, "is_final", False):
            return
        text = getattr(ev, "transcript", "").lower()
        slow_requests = (
            "slow down",
            "speak slowly",
            "dheere",
            "nidhaan",
            "medhuva",
            "slow aagi",
        )
        if any(phrase in text for phrase in slow_requests):
            slower_pace = max(0.72, persona.pace - 0.18)
            set_voice_pace(tts_engine, slower_pace)
            logger.info(
                "control=spoken-slow-down persona=%s pace=%.2f transcript=%s",
                persona.id,
                slower_pace,
                text,
            )

    # Latency logging: mark the VAD speech end, then measure to first agent audio.
    # The canned one-word acknowledgment that used to play here is gone for good:
    # when the brain broke it was the ONLY thing the learner ever heard, and even
    # healthy it made the teacher sound robotic. Preemptive generation above reduces
    # latency without faking a reply, but the 1.5 second budget is still not met.
    turn = {
        "user_stopped_at": None,
        "awaiting_first_audio": False,
    }

    @ctx.room.on("track_subscribed")
    def _on_track(track, publication, participant):
        logger.info("heard track room=%s kind=%s from=%s", ctx.room.name, getattr(track, "kind", "?"), getattr(participant, "identity", "?"))

    @session.on("user_state_changed")
    def _on_user_state(ev):
        logger.info("learner state room=%s %s -> %s", ctx.room.name, getattr(ev, "old_state", None), getattr(ev, "new_state", None))
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

    # Spoken transcript in the log, so a teacher can audit what was actually
    # said on a call (learner transcript as heard, and the agent's reply).
    @session.on("conversation_item_added")
    def _on_item(ev):
        item = getattr(ev, "item", None)
        role = getattr(item, "role", None)
        text = getattr(item, "text_content", None)
        if role in ("user", "assistant") and text:
            logger.info(
                "transcript room=%s %s: %s",
                ctx.room.name,
                "learner" if role == "user" else "agent",
                " ".join(text.split()),
            )

    # Per-stage breakdown, so a latency regression can be blamed on the right
    # stage instead of guessed at. EOU is how long after the learner stops
    # before the turn is judged complete, ttft is the brain, ttfb is the voice.
    @session.on("metrics_collected")
    def _on_metrics(ev):
        m = ev.metrics
        name = type(m).__name__
        if name == "EOUMetrics":
            logger.info(
                "stage eou: end_of_utterance_delay=%.0f ms transcription_delay=%.0f ms",
                getattr(m, "end_of_utterance_delay", 0) * 1000,
                getattr(m, "transcription_delay", 0) * 1000,
            )
        elif name == "LLMMetrics":
            logger.info(
                "stage llm: ttft=%.0f ms prompt_tokens=%s",
                getattr(m, "ttft", 0) * 1000,
                getattr(m, "prompt_tokens", "?"),
            )
        elif name == "TTSMetrics":
            logger.info("stage tts: ttfb=%.0f ms", getattr(m, "ttfb", 0) * 1000)

    await session.start(
        room=ctx.room,
        agent=NativeSpeechAgent(language=persona_lang(persona), instructions=persona.system_prompt),
    )

    # The character speaks first, in scene.
    await session.generate_reply(instructions=persona.opening, allow_interruptions=True)


if __name__ == "__main__":
    agents.cli.run_app(
        agents.WorkerOptions(
            entrypoint_fnc=entrypoint,
            agent_name=AGENT_NAME,
            job_executor_type=agents.JobExecutorType.PROCESS,
            num_idle_processes=1,
        )
    )
