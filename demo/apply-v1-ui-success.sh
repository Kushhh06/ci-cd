#!/usr/bin/env bash
# Demo v1 — Full neon green UI with spring animations.
# Pipeline: Build ✅  Test ✅  Deploy ✅  (badge switches colour slot)
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PUBLIC="$ROOT/app/frontend/public"

echo "Applying v1: neon green theme + spring animations..."

# Swap CSS theme
cp "$ROOT/demo/themes/neon.css" "$PUBLIC/style.css"

# Deploy animation script
cp "$ROOT/demo/themes/neon-animate.js" "$PUBLIC/animate.js"

# Add version label to brand name
sed -i \
  's|<span class="brand-name">AI Notes</span>|<span class="brand-name">AI Notes <span class="version-tag">v2</span></span>|' \
  "$PUBLIC/index.html"

# Load animate.js before </body>
sed -i \
  's|</body>|  <script src="animate.js"></script>\n</body>|' \
  "$PUBLIC/index.html"

echo ""
echo "✅ v1 applied. Committing..."
cd "$ROOT"
git add app/frontend/public/style.css \
        app/frontend/public/animate.js \
        app/frontend/public/index.html
git commit -m "feat: v2 UI — neon green theme with spring animations"
echo ""
echo "Jenkins will detect the commit within 60s and run:"
echo "  Build ✅ → Test ✅ → Deploy ✅"
echo "Watch the badge at http://localhost switch colour."
echo "The app will have a full black + neon green look with animated cards."
