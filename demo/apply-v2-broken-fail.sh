#!/usr/bin/env bash
# Demo v2 — intentional syntax error in backend.
# Pipeline: Build ✅  Test ❌  Deploy SKIPPED
# Live app stays running — zero downtime proven.
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Applying v2: injecting syntax error into server.js..."

# Append an unclosed object literal — valid JS up to the brace, then syntax error
cat >> "$ROOT/app/backend/src/server.js" << 'EOF'

// BUG: accidental syntax error — unclosed object
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
