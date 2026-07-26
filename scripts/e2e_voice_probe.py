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
    "kn-auto": "Dayavittu Jayanagar hogi. Meter haaki.",
    "hi-auto": "Bhaiya, Connaught Place chaliye. Meter lagaiye.",
    "ta-auto": "Anna, T Nagar ponga. Meter podunga.",
    "kn-teach": "Naanu nimge taala helthini. Modalu naalku beat ide.",
    "teacher-kn-l1": "Namaskara. Hegiddira?",
    "teacher-hi-l1": "Namaste. Aap kaise hain?",
    "teacher-ta-l1": "Vanakkam. Eppadi irukkeenga?",
    "teacher-kn-l16": "Aivattu rupaayi jaasti. Swalpa kammi maadi.",
    "teacher-hi-l16": "Pachaas rupaye bahut zyada hai. Thoda kam kijiye.",
    "teacher-ta-l16": "Ambadhu roobaa romba jaasti. Konjam kammi pannunga.",
    "tutor-kn": "What does hegiddira mean?",
    "tutor-hi": "What does aap kaise hain mean?",
    "tutor-ta": "What does eppadi irukkeenga mean?",
}

ACKNOWLEDGMENTS = {"sari", "theek hai", "seri", "okay"}

LANGUAGE = {
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


def synthesize(text: str, language: str, key: str, output: Path) -> None:
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
) -> dict[str, object]:
    env = load_env(ROOT / "agent" / ".env")
    parts = persona.split("-")
    lang = parts[1] if parts[0] in {"teacher", "tutor"} else parts[0]
    language = LANGUAGE[lang]
    room_name = f"{persona}__e2e{int(time.time())}"
    identity = f"e2e-probe-{int(time.time())}"

    with tempfile.TemporaryDirectory(prefix="maatu-e2e-") as tmp:
        audio_path = Path(tmp) / "probe.wav"
        synthesize(phrase, language, env["SARVAM_API_KEY"], audio_path)

        token = (
            api.AccessToken(env["LIVEKIT_API_KEY"], env["LIVEKIT_API_SECRET"])
            .with_identity(identity)
            .with_name("Maatu E2E Probe")
            .with_grants(api.VideoGrants(room_join=True, room=room_name))
            .to_jwt()
        )

        room = rtc.Room()
        opening_audio_started = asyncio.Event()
        opening_done = asyncio.Event()
        reply_audio = asyncio.Event()
        reply_done = asyncio.Event()
        remote_lines: list[str] = []
        learner_lines: list[str] = []
        timing: dict[str, float] = {}
        ready_for_reply = False
        stream_tasks: set[asyncio.Task[None]] = set()

        async def consume_audio(track: rtc.RemoteAudioTrack) -> None:
            stream = rtc.AudioStream(track)
            async for event in stream:
                level = rms(event.frame)
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
                    elif ready_for_reply and text.rstrip(".").lower() not in ACKNOWLEDGMENTS:
                        reply_done.set()

        await room.connect(env["LIVEKIT_URL"], token)
        try:
            if barge_in:
                await asyncio.wait_for(opening_audio_started.wait(), timeout=timeout)
                await asyncio.sleep(0.8)
            else:
                await asyncio.wait_for(opening_done.wait(), timeout=timeout)
                # The synchronized opening transcript can arrive just before the
                # final audio frame. Clear that tail so it cannot be mistaken for
                # the first audio of the learner's reply.
                await asyncio.sleep(1.5)

            source = rtc.AudioSource(16000, 1, queue_size_ms=200)
            track = rtc.LocalAudioTrack.create_audio_track("probe-microphone", source)
            options = rtc.TrackPublishOptions()
            options.source = rtc.TrackSource.SOURCE_MICROPHONE
            await room.local_participant.publish_track(track, options)

            results: list[dict[str, object]] = []
            for turn_number in range(1, turns + 1):
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
                ready_for_reply = False
                latency_ms = round((timing["reply_audio_at"] - timing["speech_end_at"]) * 1000)
                results.append(
                    {
                        "turn": turn_number,
                        "learner_transcript": learner_lines[-1] if len(learner_lines) > learner_start else None,
                        "reply": remote_lines[-1] if len(remote_lines) > remote_start else None,
                        "external_speech_end_to_audio_ms": latency_ms,
                    }
                )
                await asyncio.sleep(0.8)

            return {
                "room": room_name,
                "persona": persona,
                "phrase": phrase,
                "opening": remote_lines[0] if remote_lines else None,
                "turns": results,
                "barge_in": barge_in,
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
        )
    )
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
