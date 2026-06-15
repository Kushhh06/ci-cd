#!/usr/bin/env bash
# Post-deployment verification — confirms the live app is responding.
set -euo pipefail

APP_NAME="${APP_NAME:-ai-notes}"
DOCKER_NETWORK="${DOCKER_NETWORK:-ci-cd-network}"
STATE_FILE="/var/jenkins_home/active_color"

ACTIVE=$(cat "$STATE_FILE" 2>/dev/null || echo "blue")
echo "Post-deploy verification — active color: $ACTIVE"

# Hit the backend health endpoint through the active container
RESPONSE=$(docker run --rm \
  --network "$DOCKER_NETWORK" \
  curlimages/curl:latest \
  curl -sf "http://${APP_NAME}-backend-${ACTIVE}:3000/api/health" 2>&1)

STATUS=$(echo "$RESPONSE" | grep -o '"status":"ok"' || true)

if [ -n "$STATUS" ]; then
  echo "✅ Verification passed. Live response: $RESPONSE"
else
  echo "❌ Verification FAILED. Response: $RESPONSE"
  exit 1
fi
