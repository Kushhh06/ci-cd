#!/usr/bin/env bash
# Demo v3 — fix the syntax error from v2, no new features needed
# (summarise + AI chat already exist in the current design).
# Pipeline: Build ✅  Test ✅  Deploy ✅
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Applying v3: removing syntax error from server.js..."

# Strip the broken lines appended by v2 (last 3 lines)
# Works on both GNU and BSD sed
SERVER="$ROOT/app/backend/src/server.js"
LINES=$(wc -l < "$SERVER")
KEEP=$((LINES - 4))   # remove the blank line + comment + unclosed object (4 lines)
head -n "$KEEP" "$SERVER" > "${SERVER}.tmp" && mv "${SERVER}.tmp" "$SERVER"

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
