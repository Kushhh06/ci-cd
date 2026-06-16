#!/usr/bin/env bash
# Demo reset — restores the original blue theme.
# Run this any time to get back to the clean starting state before v1.
# Pipeline: Build ✅  Test ✅  Deploy ✅  (badge switches colour)
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CSS="$ROOT/app/frontend/public/style.css"
HTML="$ROOT/app/frontend/public/index.html"

echo "Resetting to v0: restoring original blue theme..."

# Restore accent colours
sed -i 's/--accent:       #8b5cf6;/--accent:       #388bfd;/' "$CSS"
sed -i 's/--accent-hover: #a78bfa;/--accent-hover: #58a6ff;/' "$CSS"
sed -i 's/--accent-glow:  rgba(139, 92, 246, 0.15);/--accent-glow:  rgba(56, 139, 253, 0.15);/' "$CSS"
sed -i 's/--blue-dim:     rgba(139,92,246,.12);/--blue-dim:     rgba(56,139,253,.12);/' "$CSS"
sed -i 's/--blue-border:  rgba(139,92,246,.3);/--blue-border:  rgba(56,139,253,.3);/' "$CSS"
sed -i 's/background: linear-gradient(135deg, #6d28d9, #8b5cf6);/background: linear-gradient(135deg, #1f6feb, #388bfd);/' "$CSS"
sed -i 's/box-shadow: 0 0 12px rgba(139,92,246,.35);/box-shadow: 0 0 12px rgba(56,139,253,.35);/' "$CSS"

# Remove v2 label from brand name
sed -i 's|<span class="brand-name">AI Notes <span style="font-size:.7em;font-weight:400;opacity:.7">v2</span></span>|<span class="brand-name">AI Notes</span>|' "$HTML"

# Also clean up any v2 syntax error marker if present
SERVER="$ROOT/app/backend/src/server.js"
if grep -q '// __DEMO_BREAK__' "$SERVER"; then
  sed -i '/\/\/ __DEMO_BREAK__/,$d' "$SERVER"
  echo "  Also removed v2 syntax error marker from server.js"
fi

echo ""
echo "✅ Reset applied. Committing..."
cd "$ROOT"
git add app/frontend/public/style.css app/frontend/public/index.html app/backend/src/server.js
git commit -m "chore: reset demo to v0 — original blue theme"
echo ""
echo "Jenkins will detect the commit within 60s and run:"
echo "  Build ✅ → Test ✅ → Deploy ✅"
echo "App is back to the original blue theme. Ready to run v1 again."
