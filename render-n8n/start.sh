#!/bin/sh
# Start the video render sidecar in background, then boot n8n
echo "[GrowthPulse] Starting video render server on port 5050..."
node /home/node/tts_server.js &

echo "[GrowthPulse] Starting n8n on port 5678..."
exec /docker-entrypoint.sh

