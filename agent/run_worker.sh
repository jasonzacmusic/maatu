#!/bin/bash
# Maatu agent worker launcher for the LaunchAgent. Explicit redirection so logs
# are always captured. No em dashes anywhere.
cd "$(dirname "$0")" || exit 1
LOG="$HOME/Library/Logs/maatu-agent.log"
# keep the log from growing without bound
if [ -f "$LOG" ] && [ "$(wc -c < "$LOG")" -gt 5000000 ]; then : > "$LOG"; fi
export PYTHONUNBUFFERED=1
echo "=== maatu agent starting $(date) ===" >> "$LOG"
exec ./.venv/bin/python worker.py dev >> "$LOG" 2>&1
