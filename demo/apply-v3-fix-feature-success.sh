#!/usr/bin/env bash
# Demo v3 — fix the syntax error from v2.
# Pipeline: Build ✅  Test ✅  Deploy ✅
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVER="$ROOT/app/backend/src/server.js"

# Only removes lines if the v2 marker is actually present — safe to run anytime
if ! grep -q '// __DEMO_BREAK__' "$SERVER"; then
  echo "v2 marker not found — nothing to fix. Run v2 first."
  exit 0
fi

echo "Applying v3: removing syntax error from server.js..."

# Delete from the marker line to end of file (GNU + BSD sed compatible)
sed -i '/\/\/ __DEMO_BREAK__/,$d' "$SERVER"

echo ""
echo "✅ v3 patch applied. Committing..."
cd "$ROOT"
git add app/backend/src/server.js
git commit -m "fix: remove accidental syntax error from analytics WIP"
echo ""
echo "Jenkins will detect the commit within 60s and run:"
echo "  Build ✅ → Test ✅ → Deploy ✅"
echo "App is back — badge switches to the new deployment colour."
echo "AI chat and Summarise button are fully working."
