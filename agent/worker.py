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
    except Exception as exc:
        logger.warning("active agenda unavailable persona=%s error=%s", persona_id, exc)
    return None, None

logger = logging.getLogger("maatu.agent")
logging.basicConfig(level=logging.INFO)

# French has no Sarvam voice, so the French companion runs on Gemini Live, one
# model that hears and speaks (tested 2026-09-28: replies in 1.0 to 1.5 s).
FRENCH_LIVE_MODEL = os.environ.get("MAATU_FRENCH_MODEL", "gemini-3.8-live")
FRENCH_PROMPT = (
    "You are Camille, a warm, playful friend from Paris who helps an Indian adult "
    "learn to SPEAK everyday French. This is a live voice call. The learner is a "
    "beginner and speaks mostly English plus a few French words.\n"
    "- Speak casual spoken Paris French the way friends actually talk: drop the ne "
    "(je sais pas), say on for we, use the near future (je vais manger). Never "
    "stiff textbook French.\n"
    "- Keep every turn short: one or two sentences, then ask the learner to say "
    "something. Speak a little slowly and clearly.\n"
    "- Support in English: whenever you teach a phrase, say it in French, give the "
    "English meaning, then invite them to repeat it.\n"
    "- An English question gets the English meaning FIRST, then the French.\n"
    "- A close-but-imperfect attempt counts as correct: praise briefly and move on. "
    "A real mistake gets one warm correction and one retry, then move on.\n"
    "- Control phrases always work: wait, stop, slow down, say that again, what "
    "does that mean, go back.\n"
    "- The learner can chat about anything, ask you to teach any topic, or ask you "
    "to act out any scene (a cafe, a bakery, a train station). Follow their lead.\n"
    "- Never mention spelling, letters or typing. This is only about speaking."
)
FRENCH_OPENING = (
    "Greet the learner warmly in French with bonjour, then in one short friendly "
    "English sentence offer the choice: we can just chat, I can teach you anything "
    "you name, or we can act out any scene you invent. Ask what they feel like today."
)


# Every Kannada, Hindi and Tamil call (Chat, lessons, situations) runs on Gemini
# Live: one model that hears and speaks the language natively, so the accent is
# a local one and replies land in one to two seconds. Sarvam's text voice read
# romanized spellings with an outsider's accent (Jason, 2026-09-28). Set
# MAATU_LIVE_LANGS="" to put every call back on the Sarvam pipeline below.
LIVE_LANGS = {x.strip() for x in os.environ.get("MAATU_LIVE_LANGS", "kn,hi,ta").split(",") if x.strip()}
LIVE_VOICES = {"female": ["Kore", "Aoede", "Leda", "Zephyr"], "male": ["Puck", "Charon", "Orus", "Fenrir"]}
CITY = {"kn": "Bengaluru", "hi": "Delhi", "ta": "Chennai"}


def persona_lang(persona) -> str:
    return (persona.language or "kn-IN")[:2]


async def run_live(ctx: agents.JobContext, persona) -> None:
    lang = persona_lang(persona)
    gender = "male" if str(getattr(persona, "gender", "female")).lower().startswith("m") else "female"
    voices = LIVE_VOICES[gender]
    voice = voices[sum(map(ord, persona.id)) % len(voices)] if not persona.id.startswith(("tutor-", "teacher-")) else {"kn": "Kore", "hi": "Aoede", "ta": "Leda"}[lang]
    logger.info("room=%s persona=%s engine=gemini-live model=%s voice=%s", ctx.room.name, persona.id, FRENCH_LIVE_MODEL, voice)
    # The script rule in the prompts exists for a text voice; a speaking model
    # just speaks, so tell it how to sound.
    instructions = persona.system_prompt + (
        f"\n\nYou are speaking out loud yourself. Pronounce every word the way a local from {CITY.get(lang, 'India')} "
        "says it, in the everyday spoken register, with natural Indian English for any English parts. "
        "Speak at a relaxed, clear pace for a learner."
    )
    session = AgentSession(
        llm=google.realtime.RealtimeModel(
            model=FRENCH_LIVE_MODEL,
            voice=voice,
            temperature=0.8,
            api_key=GEMINI_API_KEY,
        ),
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

    async def _slow_down():
        try:
            await ctx.room.local_participant.publish_data(
                json.dumps({"action": "slow-down-applied", "pace": 0.8}), reliable=True, topic="maatu.control"
            )
            session.generate_reply(
                instructions="The learner asked you to slow down. Say a short okay, then from now on speak "
                "noticeably slower, with small pauses between words, for the rest of the call."
            )
            logger.info("control=slow-down persona=%s engine=gemini-live", persona.id)
        except Exception:
            logger.exception("slow-down failed persona=%s", persona.id)

    @ctx.room.on("data_received")
    def _on_data(packet):
        if getattr(packet, "topic", None) != "maatu.control":
            return
        try:
            payload = json.loads(bytes(packet.data).decode())
        except Exception:
            return
        if payload.get("action") == "slow-down":
            asyncio.create_task(_slow_down())

    await session.start(room=ctx.room, agent=Agent(instructions=instructions))
    await session.generate_reply(instructions=persona.opening)


async def run_french(ctx: agents.JobContext) -> None:
    opening = FRENCH_OPENING
    try:
        learner = await asyncio.wait_for(ctx.wait_for_participant(), timeout=10)
        data = json.loads(learner.metadata or "{}")
        practice = " ".join(str(data.get("practice", "")).split())[:160]
        practice_en = " ".join(str(data.get("practiceEn", "")).split())[:160]
        if practice:
            opening = (
                f"The learner just built this sentence in the Build tab and wants to say it "
                f"out loud: {practice_en} = {practice}. Greet them with bonjour, say you will "
                "practise that line together, say it once slowly, and ask them to repeat it. "
                "After they try, flip it one step at a time (past, right now, every day, "
                "future; then he or she) asking them to say each version."
            )
            logger.info("practice line room=%s practice=%s practice_en=%s", ctx.room.name, practice, practice_en)
    except asyncio.TimeoutError:
        logger.warning("no learner joined within 10 s room=%s", ctx.room.name)
    except Exception:
        logger.exception("french practice metadata read failed room=%s", ctx.room.name)

    logger.info("room=%s persona=tutor-fr model=%s", ctx.room.name, FRENCH_LIVE_MODEL)
    session = AgentSession(
        llm=google.realtime.RealtimeModel(
            model=FRENCH_LIVE_MODEL,
            voice="Aoede",
            temperature=0.8,
            api_key=GEMINI_API_KEY,
        ),
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

    await session.start(room=ctx.room, agent=Agent(instructions=FRENCH_PROMPT))
    await session.generate_reply(instructions=opening)


async def entrypoint(ctx: agents.JobContext):
    await ctx.connect()

    room_name = ctx.room.name
    # A named test worker serves rooms called '<agent name>.<persona>__<id>'.
    # The production worker rejects that prefix as an unknown persona, so a
    # test call is answered by exactly one voice.
    if AGENT_NAME and room_name.startswith(AGENT_NAME + "."):
        room_name = room_name[len(AGENT_NAME) + 1 :]
    if room_name.startswith("tutor-fr__"):
        await run_french(ctx)
        return
    try:
        persona = persona_from_room_name(room_name)
    except ValueError as exc:
        logger.error("rejecting room=%s error=%s", ctx.room.name, exc)
        return
    if persona.id.startswith("tutor-"):
        # The Build tab starts a companion call with the sentence the learner
        # just built in their participant metadata. Read it before the
        # greeting so the companion opens on that line.
        try:
            learner = await asyncio.wait_for(ctx.wait_for_participant(), timeout=10)
            persona = apply_practice_metadata(persona, learner.metadata)
        except asyncio.TimeoutError:
            logger.warning("no learner joined within 10 s room=%s", ctx.room.name)
        except Exception:
            logger.exception("practice metadata read failed room=%s", ctx.room.name)
        line = persona.raw.get("practice_line")
        if line:
            logger.info(
                "practice line room=%s practice=%s practice_en=%s",
                ctx.room.name,
                line["practice"],
                line["practiceEn"],
            )
    classroom_mode = persona.id.startswith("teacher-") or persona.id.startswith("tutor-")
    agenda, agenda_updated_at = (
        (None, None)
        if classroom_mode
        else await asyncio.to_thread(fetch_active_agenda, persona.id)
    )
    if agenda:
        persona = apply_secret_agenda(persona, agenda)
    if persona_lang(persona) in LIVE_LANGS:
        await run_live(ctx, persona)
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

    tts_engine = sarvam.TTS(
        target_language_code=persona.language,
        model="bulbul:v3",
        speaker=persona.voice,
        pace=persona.pace,
        # The installed Sarvam plugin enforces 30 as the minimum. Lower values
        # crash the call before the teacher can speak.
        min_buffer_size=30,
        max_chunk_length=50,
        output_audio_codec="mp3",
        api_key=SARVAM_API_KEY,
    )
    session = AgentSession(
        stt=sarvam.STT(
            # Auto-detect, NOT locked to the target language. A beginner speaks
            # mostly English plus a few target words, and a locked transcriber
            # turned every English question into phonetic native-script gibberish
            # ("what does namaskara mean" -> Kannada letters), which the brain
            # could not answer. Verified against the live API: auto-detect
            # transcribes pure kn/hi/ta identically to the locked mode AND
            # returns clean romanized text for mixed speech.
            # saarika:v2.5 is sunset. Tested 2026-09-28: saaras:v4 in translit
            # mode, locked to the call's language, wrote Kannada as clean
            # romanized Latin ("naanu dina piano nudistini") and English
            # questions as plain English, 0.15 to 0.3 s after speech ended.
            # saaras:v4 on auto-detect heard Kannada and Tamil as Malayalam on
            # short clips, so it stays locked.
            language=persona.language,
            model="saaras:v4",
            mode="translit",
            # Sarvam's own end-of-speech detection was the single biggest slice
            # of the turn: measured transcription_delay of 785 to 875 ms before
            # the final transcript arrived, which the brain must wait for. High
            # sensitivity finalizes sooner. The endpointing grace window below
            # still keeps a beginner's short thinking pause inside one turn.
            high_vad_sensitivity=True,
            api_key=SARVAM_API_KEY,
        ),
        llm=build_brain(),
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
            tts_engine.update_options(pace=slower_pace)
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
        agent=Agent(instructions=persona.system_prompt),
    )

    # The character speaks first, in scene.
    await session.generate_reply(instructions=persona.opening, allow_interruptions=True)


if __name__ == "__main__":
    agents.cli.run_app(
        agents.WorkerOptions(
            entrypoint_fnc=entrypoint,
            agent_name=AGENT_NAME,
            job_executor_type=agents.JobExecutorType.THREAD,
            num_idle_processes=0,
        )
    )
