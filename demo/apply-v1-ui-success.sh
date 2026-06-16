#!/usr/bin/env bash
# Demo v1 — Aurora Glass UI with spring animations.
# Pipeline: Build ✅  Test ✅  Deploy ✅  (badge switches colour slot)
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PUBLIC="$ROOT/app/frontend/public"

echo "Applying v1: Aurora Glass theme + spring animations..."

# Swap CSS theme
cp "$ROOT/demo/themes/neon.css" "$PUBLIC/style.css"

# Deploy animation script
cp "$ROOT/demo/themes/neon-animate.js" "$PUBLIC/animate.js"

# Cache-bust: change ?blue → ?neon (forces browser to fetch new CSS)
sed -i 's|style\.css?[a-z0-9=]*|style.css?neon|g' "$PUBLIC/index.html"
# Handle case where no query string exists yet
sed -i 's|href="style\.css"|href="style.css?neon"|g' "$PUBLIC/index.html"

# Add version label to brand name (only if not already present)
if ! grep -q 'version-tag' "$PUBLIC/index.html"; then
  sed -i \
    's|<span class="brand-name">AI Notes</span>|<span class="brand-name">AI Notes <span class="version-tag">v2</span></span>|' \
    "$PUBLIC/index.html"
fi

# Load animate.js before </body> (only if not already present)
if ! grep -q 'animate.js' "$PUBLIC/index.html"; then
  sed -i 's|</body>|  <script src="animate.js"></script>\n</body>|' "$PUBLIC/index.html"
fi

echo ""
echo "✅ v1 applied. Committing..."
cd "$ROOT"
git add app/frontend/public/style.css \
        app/frontend/public/animate.js \
        app/frontend/public/index.html
git commit -m "feat: v1 UI — Aurora Glass theme with spring animations"
echo ""
echo "Jenkins will detect the commit within 60s and run:"
echo "  Build ✅ → Test ✅ → Deploy ✅"
echo "Watch the badge at http://localhost switch colour."
echo "The app will have an Aurora Glass look — dark purple, glassmorphism panels, gradient text."
