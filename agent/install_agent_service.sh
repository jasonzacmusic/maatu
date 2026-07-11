#!/bin/bash
# Install the Maatu voice agent as a macOS LaunchAgent that runs on this Mac and
# answers calls from the live site (via LiveKit Cloud). It keeps running and
# restarts on login or crash.
#
# The agent runtime is copied to ~/.maatu-agent because macOS TCC blocks
# background launchd processes from reading ~/Documents. Re-run this after
# changing agent code or personas. No em dashes anywhere.
set -e

REPO="$(cd "$(dirname "$0")/.." && pwd)"
RT="$HOME/.maatu-agent"
LABEL="com.nsm.maatu.agent"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
PYBIN="/opt/homebrew/bin/python3.12"

echo "Relocating agent runtime to $RT ..."
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
mkdir -p "$RT/agent" "$RT/personas"
cp "$REPO/agent/"*.py "$RT/agent/"
cp "$REPO/agent/run_worker.sh" "$RT/agent/" 2>/dev/null || true
cp "$REPO/agent/requirements.txt" "$RT/agent/"
cp "$REPO/agent/.env" "$RT/agent/.env"
cp "$REPO/personas/"*.json "$RT/personas/"
cp "$REPO/curriculum.json" "$RT/curriculum.json"

if [ ! -x "$RT/agent/.venv/bin/python" ]; then
  echo "Building venv (first run, a couple of minutes) ..."
  "$PYBIN" -m venv "$RT/agent/.venv"
  "$RT/agent/.venv/bin/pip" install --quiet --upgrade pip
  "$RT/agent/.venv/bin/pip" install --quiet "livekit-agents>=1.0" \
    livekit-plugins-sarvam livekit-plugins-google livekit-plugins-anthropic \
    livekit-plugins-silero python-dotenv
fi

cat > "$RT/agent/run_worker.sh" << 'SH'
#!/bin/bash
cd "$(dirname "$0")" || exit 1
LOG="$HOME/Library/Logs/maatu-agent.log"
if [ -f "$LOG" ] && [ "$(wc -c < "$LOG")" -gt 5000000 ]; then : > "$LOG"; fi
export PYTHONUNBUFFERED=1
echo "=== maatu agent starting $(date) ===" >> "$LOG"
exec ./.venv/bin/python worker.py dev >> "$LOG" 2>&1
SH
chmod +x "$RT/agent/run_worker.sh"

echo "Writing LaunchAgent ..."
mkdir -p "$HOME/Library/LaunchAgents"
cat > "$PLIST" << PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$RT/agent/run_worker.sh</string>
  </array>
  <key>WorkingDirectory</key><string>$RT/agent</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ProcessType</key><string>Background</string>
  <key>EnvironmentVariables</key><dict><key>PYTHONUNBUFFERED</key><string>1</string></dict>
</dict>
</plist>
PL

launchctl bootstrap "gui/$(id -u)" "$PLIST"
sleep 3
echo "Done. The Maatu agent is running. Logs: ~/Library/Logs/maatu-agent.log"
launchctl print "gui/$(id -u)/$LABEL" | grep -E "state = |pid =" | head -2 || true
