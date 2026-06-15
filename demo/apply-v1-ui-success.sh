#!/usr/bin/env bash
# Demo v1 — UI change: accent colour from blue → purple.
# Pipeline: Build ✅  Test ✅  Deploy ✅  (switches to opposite colour slot)
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Applying v1: change accent colour blue → purple..."

# Swap CSS design tokens
sed -i 's/--accent:           #388bfd;/--accent:           #8b5cf6;/' "$ROOT/app/frontend/public/style.css"
sed -i 's/--accent-hover:     #58a6ff;/--accent-hover:     #a78bfa;/' "$ROOT/app/frontend/public/style.css"
sed -i 's/--accent-glow:  rgba(56, 139, 253, 0.15);/--accent-glow:  rgba(139, 92, 246, 0.15);/' "$ROOT/app/frontend/public/style.css"
sed -i 's/--blue-dim:     rgba(56,139,253,.12);/--blue-dim:     rgba(139,92,246,.12);/' "$ROOT/app/frontend/public/style.css"
sed -i 's/--blue-border:  rgba(56,139,253,.3);/--blue-border:  rgba(139,92,246,.3);/' "$ROOT/app/frontend/public/style.css"
sed -i 's/background: linear-gradient(135deg, #1f6feb, #388bfd);/background: linear-gradient(135deg, #6d28d9, #8b5cf6);/' "$ROOT/app/frontend/public/style.css"
sed -i 's/box-shadow: 0 0 12px rgba(56,139,253,.35);/box-shadow: 0 0 12px rgba(139,92,246,.35);/' "$ROOT/app/frontend/public/style.css"

# Add v2 label to the brand name
sed -i 's|<span class="brand-name">AI Notes</span>|<span class="brand-name">AI Notes <span style="font-size:.7em;font-weight:400;opacity:.7">v2</span></span>|' \
  "$ROOT/app/frontend/public/index.html"

echo ""
echo "✅ v1 patch applied. Committing..."
cd "$ROOT"
git add app/frontend/public/style.css app/frontend/public/index.html
git commit -m "feat: v2 UI — purple accent theme"
echo ""
echo "Jenkins will detect the commit within 60s and run:"
echo "  Build ✅ → Test ✅ → Deploy ✅"
echo "Watch the deployment badge change colour at http://localhost"
