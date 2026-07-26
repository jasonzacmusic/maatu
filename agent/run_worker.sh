#!/bin/bash
# Maatu agent worker launcher for the LaunchAgent. Explicit redirection so logs
# are always captured. No em dashes anywhere.
cd "$(dirname "$0")" || exit 1
LOG="$HOME/Library/Logs/maatu-agent.log"
# keep the log from growing without bound
if [ -f "$LOG" ] && [ "$(wc -c < "$LOG")" -gt 5000000 ]; then : > "$LOG"; fi
export PYTHONUNBUFFERED=1
# LiveKit's Rust WebSocket client intermittently fails to read the macOS
# keychain trust store under launchd. Point every TLS client at certifi's
# bundled roots so a running worker can reliably join dispatched rooms.
CERT_BUNDLE="$(./.venv/bin/python -c 'import certifi; print(certifi.where())')"
export SSL_CERT_FILE="$CERT_BUNDLE"
export REQUESTS_CA_BUNDLE="$CERT_BUNDLE"
echo "=== maatu agent starting $(date) ===" >> "$LOG"
# caffeinate -s keeps the Mac from sleeping while the worker runs (this Mac's
# system sleep is set to 1 minute; if it dozes, every live call goes dead).
if command -v caffeinate >/dev/null 2>&1; then
  exec caffeinate -s ./.venv/bin/python worker.py dev --no-reload >> "$LOG" 2>&1
fi
exec ./.venv/bin/python worker.py dev --no-reload >> "$LOG" 2>&1
