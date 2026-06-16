#!/usr/bin/env bash
# Demo v3 — fix the syntax error from v2 + ship Help & Support panel.
# Pipeline: Build ✅  Test ✅  Deploy ✅
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVER="$ROOT/app/backend/src/server.js"
PUBLIC="$ROOT/app/frontend/public"

# Only removes lines if the v2 marker is actually present — safe to run anytime
if ! grep -q '// __DEMO_BREAK__' "$SERVER"; then
  echo "v2 marker not found — nothing to fix. Run v2 first."
  exit 0
fi

echo "Applying v3: fixing syntax error + adding Help & Support panel..."

# Fix server.js — remove broken block
sed -i '/\/\/ __DEMO_BREAK__/,$d' "$SERVER"

# Deploy v3 app.js (search + auto-tags + help modal + keyboard shortcuts)
cp "$ROOT/demo/themes/v3-app.js" "$PUBLIC/app.js"

echo ""
echo "✅ v3 patch applied. Committing..."
cd "$ROOT"
git add app/backend/src/server.js \
        app/frontend/public/app.js
git commit -m "fix: resolve search endpoint syntax error + add Help & Support panel"
echo ""
echo "Jenkins will detect the commit within 60s and run:"
echo "  Build ✅ → Test ✅ → Deploy ✅"
echo "App is back — search, smart tags, and Help panel are all live."
echo "Badge switches colour slot again."
