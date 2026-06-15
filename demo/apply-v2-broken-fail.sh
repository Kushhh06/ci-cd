#!/usr/bin/env bash
# Demo v2 — intentional syntax error in backend.
# Pipeline: Build ✅  Test ❌  Deploy SKIPPED
# Live app stays running — zero downtime proven.
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVER="$ROOT/app/backend/src/server.js"

# Idempotent — skip if marker already present
if grep -q '// __DEMO_BREAK__' "$SERVER"; then
  echo "v2 already applied. Run v3 first to restore."
  exit 0
fi

echo "Applying v2: injecting syntax error into server.js..."

cat >> "$SERVER" << 'EOF'

// __DEMO_BREAK__ — marker used by v3 to cleanly remove this block
const brokenAnalytics = {
EOF

echo ""
echo "✅ v2 patch applied. Committing..."
cd "$ROOT"
git add app/backend/src/server.js
git commit -m "feat: add analytics (WIP — syntax error)"
echo ""
echo "Jenkins will detect the commit within 60s and run:"
echo "  Build ✅ → Test ❌ (syntax error) → Deploy SKIPPED"
echo "Your live app at http://localhost keeps serving traffic — zero downtime!"
