#!/usr/bin/env bash
# Demo Update v1 — UI change. Pipeline will: Build ✅ Test ✅ Deploy ✅
# The app header and theme color update. Deployment switches blue→green.
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Applying v1: UI update (accent color + subtitle)..."

# Update the header brand in index.html
sed -i 's|<h1>AI Notes</h1>|<h1>AI Notes <span style="font-size:0.6em;color:#22c55e;font-weight:400">v2</span></h1>|' \
  "$ROOT/app/frontend/public/index.html"

# Change accent colour from blue (#3b82f6) to purple (#8b5cf6) in CSS
sed -i 's/--accent:    #3b82f6;/--accent:    #8b5cf6;/' "$ROOT/app/frontend/public/style.css"
sed -i 's/--accent-hv: #2563eb;/--accent-hv: #7c3aed;/' "$ROOT/app/frontend/public/style.css"
sed -i 's/background: var(--blue);/background: #6d28d9;/' "$ROOT/app/frontend/public/style.css"

echo "Done. Now commit and let Jenkins pick it up:"
echo ""
echo "  git add -A && git commit -m 'feat: v2 UI — purple theme'"
echo ""
echo "Jenkins will build → test → deploy. App switches to new colour."
