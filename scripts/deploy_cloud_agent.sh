#!/bin/bash
# Deploy the Maatu voice agent to LiveKit Cloud (free Build plan: 1 agent,
# 1,000 agent session minutes a month, 5 concurrent calls, no card needed).
# Authenticates with the project API key and secret in agent/.env, so no
# browser login is needed. Created 2026-09-28 as agent CA_qEYzC3PqfR2e.
#
# The cloud copy runs with MAATU_AGENT_NAME=maatu-cloud, so it ONLY answers
# rooms explicitly dispatched to it (room names 'maatu-cloud.<persona>__<id>')
# and never takes a real learner's call. To make it answer production calls,
# run this with PRODUCTION=1 (drops the name, so it joins every room).
# No em dashes anywhere.
set -e
REPO="$(cd "$(dirname "$0")/.." && pwd)"
AGENT_ID="${AGENT_ID:-CA_qEYzC3PqfR2e}"
BUILD="$(mktemp -d)/maatu-cloud"
mkdir -p "$BUILD/agent" "$BUILD/personas"
cp "$REPO/agent/"*.py "$BUILD/agent/"
cp "$REPO/agent/requirements.txt" "$BUILD/requirements.txt"
cp "$REPO/personas/"*.json "$BUILD/personas/"
cp "$REPO/curriculum.json" "$REPO/grammar.json" "$REPO/playbooks.json" "$BUILD/"
cat > "$BUILD/Dockerfile" << 'DF'
FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN python agent/worker.py download-files
CMD ["python", "agent/worker.py", "start"]
DF
printf 'Dockerfile\n.dockerignore\n*.env\n__pycache__\nlivekit.toml\n' > "$BUILD/.dockerignore"
printf '[project]\n  subdomain = "maatu-zj9ke1eq"\n\n[agent]\n  id = "%s"\n' "$AGENT_ID" > "$BUILD/livekit.toml"

SECRETS="$BUILD/../secrets.env"
grep -v '^#' "$REPO/agent/.env" | grep -v '^LIVEKIT_' > "$SECRETS"
if [ "${PRODUCTION:-0}" = "1" ]; then
  echo "MAATU_AGENT_NAME=production" >> "$SECRETS"
else
  echo "MAATU_AGENT_NAME=maatu-cloud" >> "$SECRETS"
fi
chmod 600 "$SECRETS"

set -a; . "$REPO/agent/.env"; set +a
cd "$BUILD"
lk agent deploy --yes --secrets-file "$SECRETS" . < /dev/null
lk agent status < /dev/null
rm -f "$SECRETS"
