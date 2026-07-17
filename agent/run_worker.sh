#!/bin/bash
# Maatu agent worker launcher for the LaunchAgent. Explicit redirection so logs
# are always captured. No em dashes anywhere.
cd "$(dirname "$0")" || exit 1
LOG="$HOME/Library/Logs/maatu-agent.log"
# keep the log from growing without bound
if [ -f "$LOG" ] && [ "$(wc -c < "$LOG")" -gt 5000000 ]; then : > "$LOG"; fi
export PYTHONUNBUFFERED=1
echo "=== maatu agent starting $(date) ===" >> "$LOG"
# caffeinate -s keeps the Mac from sleeping while the worker runs (this Mac's
# system sleep is set to 1 minute; if it dozes, every live call goes dead).
if command -v caffeinate >/dev/null 2>&1; then
  exec caffeinate -s ./.venv/bin/python worker.py dev --no-reload >> "$LOG" 2>&1
fi
exec ./.venv/bin/python worker.py dev --no-reload >> "$LOG" 2>&1
