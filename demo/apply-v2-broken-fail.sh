#!/usr/bin/env bash
# Demo v2 — futuristic Smart Search + auto-tags UI committed, but backend search
#            endpoint has a syntax error.
# Pipeline: Build ✅  Test ❌  Deploy SKIPPED
# Live app stays running — zero downtime proven.
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVER="$ROOT/app/backend/src/server.js"
PUBLIC="$ROOT/app/frontend/public"

# Idempotent — skip if marker already present
if grep -q '// __DEMO_BREAK__' "$SERVER"; then
  echo "v2 already applied. Run v3 first to restore."
  exit 0
fi

echo "Applying v2: Smart Search + auto-tags UI + broken /api/search endpoint..."

# Deploy v2 app.js (smart search + auto-tags, no help modal yet)
cp "$ROOT/demo/themes/v2-app.js" "$PUBLIC/app.js"

# Append broken search endpoint to backend (unclosed arrow function = SyntaxError)
cat >> "$SERVER" << 'EOF'

// __DEMO_BREAK__ — marker used by v3 to cleanly remove this block
app.get('/api/search', async (req, res) => {
  const { q = '' } = req.query;
  const results = loadNotes().filter(n =>
    n.title.toLowerCase().includes(q) ||
    n.content.toLowerCase().includes(q)
EOF

echo ""
echo "✅ v2 patch applied. Committing..."
cd "$ROOT"
git add app/frontend/public/app.js \
        app/backend/src/server.js
git commit -m "feat: smart search + auto-tags UI — add /api/search endpoint (WIP)"
echo ""
echo "Jenkins will detect the commit within 60s and run:"
echo "  Build ✅ → Test ❌ (syntax error in server.js) → Deploy SKIPPED"
echo "Your live app at http://localhost keeps serving traffic — zero downtime!"
