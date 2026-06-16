#!/usr/bin/env bash
# Demo reset — restores the original blue theme and removes animations.
# Run this any time to get back to the clean starting state before v1.
# Pipeline: Build ✅  Test ✅  Deploy ✅
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PUBLIC="$ROOT/app/frontend/public"

echo "Resetting to v0: restoring original blue theme..."

# Restore original CSS from stable reference
cp "$ROOT/demo/themes/blue.css" "$PUBLIC/style.css"

# Remove animation script
rm -f "$PUBLIC/animate.js"

# Restore brand name (remove version tag)
sed -i \
  's|<span class="brand-name">AI Notes <span class="version-tag">v2</span></span>|<span class="brand-name">AI Notes</span>|' \
  "$PUBLIC/index.html"

# Remove animate.js script tag
sed -i '/animate\.js/d' "$PUBLIC/index.html"

# Clean up v2 syntax error marker if present
SERVER="$ROOT/app/backend/src/server.js"
if grep -q '// __DEMO_BREAK__' "$SERVER"; then
  sed -i '/\/\/ __DEMO_BREAK__/,$d' "$SERVER"
  git add "$SERVER"
  echo "  Also removed v2 syntax error marker from server.js"
fi

echo ""
echo "✅ Reset applied. Committing..."
cd "$ROOT"
git add app/frontend/public/style.css \
        app/frontend/public/index.html
# animate.js removed — stage the deletion
git add -u app/frontend/public/animate.js 2>/dev/null || true
git commit -m "chore: reset demo to v0 — original blue theme"
echo ""
echo "Jenkins will detect the commit within 60s and run:"
echo "  Build ✅ → Test ✅ → Deploy ✅"
echo "App is back to the original blue theme. Ready to run v1 again."
