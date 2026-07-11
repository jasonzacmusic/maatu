# Maatu Agent Worker

Python voice agent (livekit-agents). Runs on the Mac mini via LaunchAgent.

Pipeline per turn: LiveKit room audio -> Sarvam Saarika STT (streaming, language-locked) -> Brain LLM (persona system prompt + rolling transcript + learner profile) -> Sarvam Bulbul V3 TTS (streaming WS) -> room audio.

Latency budget: under 1.5s user-speech-end to agent-audio-start, measured and logged per turn.

Setup (Claude Code runs this, not Jason):

    /usr/bin/python3 -m venv .venv
    .venv/bin/pip install -r requirements.txt
    .venv/bin/python worker.py dev

Real work starts in Milestone 2 once keys arrive.
