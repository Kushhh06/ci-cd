#!/usr/bin/env bash
# Blue-Green zero-downtime deployment script.
# Called by the Jenkins pipeline after a successful test run.
set -euo pipefail

APP_NAME="${APP_NAME:-ai-notes}"
APP_VERSION="${APP_VERSION:-dev}"
DOCKER_NETWORK="${DOCKER_NETWORK:-ci-cd-network}"
NGINX_CONTAINER="${NGINX_CONTAINER:-nginx-proxy}"
GEMINI_API_KEY="${GEMINI_API_KEY:-}"
STATE_FILE="/var/jenkins_home/active_color"   # survives Jenkins restarts (named volume)
HEALTH_RETRIES=12
HEALTH_INTERVAL=5

# ── Determine colors ──────────────────────────────────────
CURRENT_COLOR=$(cat "$STATE_FILE" 2>/dev/null || echo "none")
if [ "$CURRENT_COLOR" = "blue" ]; then
  NEW_COLOR="green"
else
  NEW_COLOR="blue"
fi

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║         BLUE-GREEN DEPLOYMENT                ║"
echo "╠══════════════════════════════════════════════╣"
echo "║  App version : $APP_VERSION"
echo "║  Active now  : $CURRENT_COLOR"
echo "║  Deploying to: $NEW_COLOR"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── Ensure Docker network exists ──────────────────────────
docker network create "$DOCKER_NETWORK" 2>/dev/null || true

# ── Tag built images with color ───────────────────────────
docker tag "${APP_NAME}-backend:${APP_VERSION}"  "${APP_NAME}-backend:${NEW_COLOR}"
docker tag "${APP_NAME}-frontend:${APP_VERSION}" "${APP_NAME}-frontend:${NEW_COLOR}"

# ── Start NEW containers ──────────────────────────────────
echo "[1/4] Starting ${NEW_COLOR} containers..."

docker rm -f "${APP_NAME}-backend-${NEW_COLOR}"  2>/dev/null || true
docker rm -f "${APP_NAME}-frontend-${NEW_COLOR}" 2>/dev/null || true

docker run -d \
  --name "${APP_NAME}-backend-${NEW_COLOR}" \
  --network "$DOCKER_NETWORK" \
  -e GEMINI_API_KEY="$GEMINI_API_KEY" \
  -e PORT=3000 \
  -e APP_VERSION="$APP_VERSION" \
  -e APP_COLOR="$NEW_COLOR" \
  --restart unless-stopped \
  "${APP_NAME}-backend:${NEW_COLOR}"

docker run -d \
  --name "${APP_NAME}-frontend-${NEW_COLOR}" \
  --network "$DOCKER_NETWORK" \
  --restart unless-stopped \
  "${APP_NAME}-frontend:${NEW_COLOR}"

# ── Health check ──────────────────────────────────────────
echo "[2/4] Health checking ${NEW_COLOR} backend..."

HEALTH_PASSED=false
for i in $(seq 1 "$HEALTH_RETRIES"); do
  echo "  Attempt $i/$HEALTH_RETRIES..."
  if docker run --rm \
       --network "$DOCKER_NETWORK" \
       curlimages/curl:latest \
       curl -sf "http://${APP_NAME}-backend-${NEW_COLOR}:3000/api/health" \
       > /dev/null 2>&1; then
    echo "  ✅ Health check passed!"
    HEALTH_PASSED=true
    break
  fi
  sleep "$HEALTH_INTERVAL"
done

if [ "$HEALTH_PASSED" = "false" ]; then
  echo ""
  echo "❌ Health check FAILED after $HEALTH_RETRIES attempts."
  echo "   Rolling back — removing ${NEW_COLOR} containers..."
  docker rm -f "${APP_NAME}-backend-${NEW_COLOR}"  2>/dev/null || true
  docker rm -f "${APP_NAME}-frontend-${NEW_COLOR}" 2>/dev/null || true
  echo "   ✅ Old version (${CURRENT_COLOR}) is still serving traffic."
  exit 1
fi

# ── Switch nginx upstream ─────────────────────────────────
echo "[3/4] Switching nginx traffic to ${NEW_COLOR}..."

UPSTREAM_CONF="# Managed by deploy.sh — do not edit manually.
upstream backend  { server ${APP_NAME}-backend-${NEW_COLOR}:3000; }
upstream frontend { server ${APP_NAME}-frontend-${NEW_COLOR}:80;  }"

echo "$UPSTREAM_CONF" | docker exec -i "$NGINX_CONTAINER" \
  sh -c 'cat > /etc/nginx/conf.d/upstream.conf'

docker exec "$NGINX_CONTAINER" nginx -s reload
echo "  ✅ Nginx now routing to ${NEW_COLOR}."

# ── Persist state & clean up old containers ───────────────
echo "[4/4] Cleaning up old ${CURRENT_COLOR} containers..."
echo "$NEW_COLOR" > "$STATE_FILE"

if [ "$CURRENT_COLOR" != "none" ]; then
  docker rm -f "${APP_NAME}-backend-${CURRENT_COLOR}"  2>/dev/null || true
  docker rm -f "${APP_NAME}-frontend-${CURRENT_COLOR}" 2>/dev/null || true
  echo "  ✅ Removed ${CURRENT_COLOR} containers."
fi

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  ✅  DEPLOYMENT SUCCESSFUL                   ║"
echo "║  Active: ${NEW_COLOR} (v${APP_VERSION})      ║"
echo "║  App: http://localhost:80                    ║"
echo "╚══════════════════════════════════════════════╝"
