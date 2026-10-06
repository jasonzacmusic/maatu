#!/usr/bin/env python3
"""Publish a real spoken turn to Maatu and measure the live reply boundary."""

from __future__ import annotations

import argparse
import asyncio
import base64
import json
import math
import os
import subprocess
import tempfile
import time
import urllib.request
import wave
from pathlib import Path

from livekit import api, rtc


ROOT = Path(__file__).resolve().parent.parent

PHRASES = {
    "kn-auto": "ದಯವಿಟ್ಟು ಜಯನಗರಕ್ಕೆ ಹೋಗಿ. ಮೀಟರ್ ಹಾಕಿ.",
    "hi-auto": "भैया, कनॉट प्लेस चलिए. मीटर लगाइए।",
    "ta-auto": "அண்ணா, டி நகருக்கு போங்க. மீட்டர் போடுங்க.",
    "fr-auto": "Bonjour. À la gare de Lyon, s'il vous plaît. Vous mettez le compteur ?",
    "fr-chai": "Bonjour. Ça va bien, merci. Vous aimez la musique ?",
    "kn-teach": "Naanu nimge taala helthini. Modalu naalku beat ide.",
    "teacher-kn-l1": "Namaskara. Hegiddira?",
    "teacher-hi-l1": "Namaste. Aap kaise hain?",
    "teacher-ta-l1": "Vanakkam. Eppadi irukkeenga?",
    "teacher-fr-l1": "Bonjour. Comment allez-vous ?",
    "teacher-kn-l16": "Aivattu rupaayi jaasti. Swalpa kammi maadi.",
    "teacher-hi-l16": "Pachaas rupaye bahut zyada hai. Thoda kam kijiye.",
    "teacher-ta-l16": "Ambadhu roobaa romba jaasti. Konjam kammi pannunga.",
    "tutor-kn": "What does hegiddira mean?",
    "tutor-hi": "What does aap kaise hain mean?",
    "tutor-ta": "What does eppadi irukkeenga mean?",
    "tutor-fr": "Hello. What does bonjour mean?",
}

ACKNOWLEDGMENTS = {"sari", "theek hai", "seri", "okay"}

LANGUAGE = {
    "fr": "fr-FR",
    "kn": "kn-IN",
    "hi": "hi-IN",
    "ta": "ta-IN",
}


def load_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    for raw in path.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key] = value.strip().strip('"').strip("'")
    return values


def synthesize(text: str, language: str, key: str, output: Path, site: str | None = None) -> None:
    if language == "fr-FR":
        request = urllib.request.Request(
            (site or "http://127.0.0.1:3033").rstrip("/") + "/api/say",
            data=json.dumps({"lang": "fr", "text": text}).encode(),
            headers={"Content-Type": "application/json"}, method="POST",
        )
        with urllib.request.urlopen(request, timeout=60) as response:
            encoded = json.loads(response.read())["audio"]
        source = output.with_suffix(".source")
        source.write_bytes(base64.b64decode(encoded))
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(source), "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", str(output)], check=True)
        return
    body = json.dumps(
        {
            "text": text,
            "target_language_code": language,
            "speaker": "shreya",
            "model": "bulbul:v3",
        }
    ).encode()
    request = urllib.request.Request(
        "https://api.sarvam.ai/text-to-speech",
        data=body,
        headers={"Content-Type": "application/json", "api-subscription-key": key},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        data = json.loads(response.read())
    encoded = data.get("audios", [None])[0]
    if not encoded:
        raise RuntimeError("Sarvam returned no probe audio")
    source = output.with_suffix(".source")
    source.write_bytes(base64.b64decode(encoded))
    subprocess.run(
        [
            "ffmpeg",
            "-loglevel",
            "error",
            "-y",
            "-i",
            str(source),
            "-ar",
            "16000",
            "-ac",
            "1",
            "-c:a",
            "pcm_s16le",
            str(output),
        ],
        check=True,
    )


def rms(frame: rtc.AudioFrame) -> float:
    samples = memoryview(frame.data).cast("B").cast("h")
    if not samples:
        return 0
    return math.sqrt(sum(sample * sample for sample in samples) / len(samples))


async def run_probe(
    persona: str,
    phrase: str,
    timeout: float,
    barge_in: bool = False,
    turns: int = 1,
    metadata: str | None = None,
    agent_name: str = "maatu-studio",
    controls: bool = False,
    sequence: list[dict[str, str]] | None = None,
    site: str | None = None,
) -> dict[str, object]:
    env = load_env(ROOT / "agent" / ".env")
    parts = persona.split("-")
    lang = parts[1] if parts[0] in {"teacher", "tutor"} else parts[0]
    language = "en-IN" if phrase.startswith(("What ", "Hello", "Please ", "I ")) else LANGUAGE[lang]
    room_name = f"{agent_name}.{persona}__e2e{time.time_ns()}"
    identity = f"e2e-probe-{int(time.time())}"
    livekit_url = env["LIVEKIT_URL"]

    with tempfile.TemporaryDirectory(prefix="maatu-e2e-") as tmp:
        inputs = sequence or [{"text": phrase, "voice_language": language}] * turns
        audio_paths = []
        for index, item in enumerate(inputs):
            audio_path = Path(tmp) / f"probe-{index}.wav"
            synthesize(item["text"], item.get("voice_language", language), env["SARVAM_API_KEY"], audio_path, site)
            audio_paths.append(audio_path)

        token = (
            api.AccessToken(env["LIVEKIT_API_KEY"], env["LIVEKIT_API_SECRET"])
            .with_identity(identity)
            .with_name("Maatu E2E Probe")
            .with_grants(api.VideoGrants(room_join=True, room=room_name))
            .with_metadata(metadata or "")
            .with_room_config(api.RoomConfiguration(agents=[api.RoomAgentDispatch(agent_name=agent_name)]))
            .to_jwt()
        )
        if site:
            practice = json.loads(metadata or "{}")
            request = urllib.request.Request(
                site.rstrip("/") + "/api/token",
                data=json.dumps({"persona": persona, "learner": identity, "practice": practice.get("practice", ""), "practiceEn": practice.get("practiceEn", ""), "context": practice.get("context", "")}).encode(),
                headers={"Content-Type": "application/json"}, method="POST",
            )
            with urllib.request.urlopen(request, timeout=30) as response:
                call = json.load(response)
            token, room_name, livekit_url = call["token"], call["room"], call["url"]
            identity = f"learner-{identity}"

        room = rtc.Room()
        opening_audio_started = asyncio.Event()
        opening_done = asyncio.Event()
        reply_audio = asyncio.Event()
        reply_done = asyncio.Event()
        remote_lines: list[str] = []
        learner_lines: list[str] = []
        timing: dict[str, float] = {}
        control_events: dict[str, asyncio.Event] = {}
        control_acks: list[dict] = []
        control_active = False

        @room.on("data_received")
        def on_data(packet):
            if packet.topic != "maatu.control": return
            try: data = json.loads(bytes(packet.data).decode())
            except (ValueError, UnicodeDecodeError): return
            if data.get("action") in {"control-applied", "slow-down-applied"}:
                control_acks.append(data)
                key = data.get("control", "slow-down")
                if key in control_events: control_events[key].set()
        ready_for_reply = False
        stream_tasks: set[asyncio.Task[None]] = set()

        async def consume_audio(track: rtc.RemoteAudioTrack) -> None:
            stream = rtc.AudioStream(track)
            async for event in stream:
                level = rms(event.frame)
                if level > 20:
                    timing["last_remote_audio_at"] = time.perf_counter()
                if level > 5 and not opening_done.is_set():
                    opening_audio_started.set()
                if ready_for_reply and level > 120 and not reply_audio.is_set():
                    timing["reply_audio_at"] = time.perf_counter()
                    reply_audio.set()

        @room.on("track_subscribed")
        def on_track(track, _publication, _participant):
            if track.kind == rtc.TrackKind.KIND_AUDIO:
                task = asyncio.create_task(consume_audio(track))
                stream_tasks.add(task)
                task.add_done_callback(stream_tasks.discard)

        @room.on("transcription_received")
        def on_transcription(segments, participant, _publication):
            nonlocal ready_for_reply
            for segment in segments:
                if not segment.final or not segment.text.strip():
                    continue
                if participant and participant.identity == identity:
                    learner_lines.append(segment.text.strip())
                else:
                    text = segment.text.strip()
                    remote_lines.append(text)
                    if not opening_done.is_set():
                        opening_done.set()
                    elif ready_for_reply and (control_active or text.rstrip(".").lower() not in ACKNOWLEDGMENTS):
                        reply_done.set()

        async def wait_for_audio_boundary() -> None:
            deadline = time.perf_counter() + timeout
            while time.perf_counter() < deadline:
                if time.perf_counter() - timing.get("last_remote_audio_at", time.perf_counter()) > 0.8:
                    return
                await asyncio.sleep(0.2)
            raise TimeoutError("The agent did not finish its speaking turn")

        await room.connect(livekit_url, token)
        # Publish the microphone at once, like the real app does, so the agent
        # is already subscribed when the learner speaks. Publishing it after the
        # opening clipped the first syllable of every probe turn.
        source = rtc.AudioSource(16000, 1, queue_size_ms=200)
        track = rtc.LocalAudioTrack.create_audio_track("probe-microphone", source)
        options = rtc.TrackPublishOptions()
        options.source = rtc.TrackSource.SOURCE_MICROPHONE
        await room.local_participant.publish_track(track, options)
        try:
            if barge_in:
                await asyncio.wait_for(opening_audio_started.wait(), timeout=timeout)
                await asyncio.sleep(0.8)
            else:
                await asyncio.wait_for(opening_done.wait(), timeout=timeout)
                # The synchronized opening transcript can arrive just before the
                # final audio frame. Clear that tail so it cannot be mistaken for
                # the first audio of the learner's reply.
                await wait_for_audio_boundary()

            results: list[dict[str, object]] = []
            for turn_number, audio_path in enumerate(audio_paths, 1):
                reply_audio = asyncio.Event()
                reply_done = asyncio.Event()
                ready_for_reply = False
                learner_start = len(learner_lines)
                remote_start = len(remote_lines)

                with wave.open(str(audio_path), "rb") as wav:
                    if wav.getframerate() != 16000 or wav.getnchannels() != 1 or wav.getsampwidth() != 2:
                        raise RuntimeError("Probe audio must be 16 kHz mono PCM16")
                    while chunk := wav.readframes(320):
                        if len(chunk) < 640:
                            chunk += b"\0" * (640 - len(chunk))
                        await source.capture_frame(rtc.AudioFrame(chunk, 16000, 1, 320))

                timing["speech_end_at"] = time.perf_counter()
                ready_for_reply = True
                for _ in range(60):
                    await source.capture_frame(rtc.AudioFrame(b"\0" * 640, 16000, 1, 320))
                await source.wait_for_playout()

                await asyncio.wait_for(reply_audio.wait(), timeout=timeout)
                await asyncio.wait_for(reply_done.wait(), timeout=timeout)
                await wait_for_audio_boundary()
                ready_for_reply = False
                latency_ms = round((timing["reply_audio_at"] - timing["speech_end_at"]) * 1000)
                results.append(
                    {
                        "turn": turn_number,
                        "input": inputs[turn_number - 1]["text"],
                        "learner_transcript": " ".join(learner_lines[learner_start:]) if len(learner_lines) > learner_start else None,
                        "reply": " ".join(remote_lines[remote_start:]) if len(remote_lines) > remote_start else None,
                        "external_speech_end_to_audio_ms": latency_ms,
                    }
                )
                await asyncio.sleep(0.8)

            control_results = []
            if controls:
                for action in ["repeat", "explain", "slow-down", "pause", "resume"]:
                    await asyncio.sleep(1.5)
                    start = len(remote_lines)
                    control_events[action] = asyncio.Event()
                    reply_done = asyncio.Event()
                    ready_for_reply = True
                    control_active = True
                    await room.local_participant.publish_data(json.dumps({"action": action}), reliable=True, topic="maatu.control")
                    await asyncio.wait_for(control_events[action].wait(), timeout=12)
                    if action == "pause":
                        # Pausing must produce silence and ignore incoming speech.
                        before = len(learner_lines)
                        with wave.open(str(audio_paths[0]), "rb") as wav:
                            while chunk := wav.readframes(320):
                                if len(chunk) < 640: chunk += b"\0" * (640-len(chunk))
                                await source.capture_frame(rtc.AudioFrame(chunk,16000,1,320))
                        await source.wait_for_playout()
                        await asyncio.sleep(2)
                        if len(remote_lines) != start or len(learner_lines) != before:
                            raise AssertionError("Paused call still accepted speech or replied")
                    else:
                        await asyncio.wait_for(reply_done.wait(), timeout=30)
                        await wait_for_audio_boundary()
                    ready_for_reply = False
                    control_results.append({"action": action, "acknowledged": True, "reply": remote_lines[start:]})
            return {
                "room": room_name,
                "persona": persona,
                "phrase": phrase,
                "opening": remote_lines[0] if remote_lines else None,
                "turns": results,
                "barge_in": barge_in,
                "controls": control_results,
            }
        finally:
            await room.disconnect()
            for task in stream_tasks:
                task.cancel()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("persona", choices=sorted(PHRASES))
    parser.add_argument("--phrase")
    parser.add_argument("--timeout", type=float, default=60)
    parser.add_argument("--barge-in", action="store_true")
    parser.add_argument("--turns", type=int, default=1)
    parser.add_argument("--practice", help="tutor rooms: Build tab romanized practice line")
    parser.add_argument("--practice-en", default="", help="English meaning of --practice")
    parser.add_argument("--agent-name", default="maatu-studio")
    parser.add_argument("--controls", action="store_true")
    parser.add_argument("--sequence-file", type=Path, help="JSON list of spoken inputs with text and voice_language")
    parser.add_argument("--site", help="Use the deployed site's token route and French preview speech")
    args = parser.parse_args()
    if args.turns < 1:
        parser.error("--turns must be at least 1")
    result = asyncio.run(
        run_probe(
            args.persona,
            args.phrase or PHRASES[args.persona],
            args.timeout,
            args.barge_in,
            args.turns,
            json.dumps({"practice": args.practice, "practiceEn": args.practice_en})
            if args.practice
            else None,
            args.agent_name,
            args.controls,
            json.loads(args.sequence_file.read_text()) if args.sequence_file else None,
            args.site,
        )
    )
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
