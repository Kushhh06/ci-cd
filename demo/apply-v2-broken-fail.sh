#!/usr/bin/env bash
# Demo Update v2 — introduces a syntax error in the backend.
# Pipeline will: Build ✅ Test ❌ (fails here) Deploy skipped.
# App continues serving traffic on the previous colour. Zero downtime.
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVER="$ROOT/app/backend/src/server.js"

echo "Applying v2: broken backend (syntax error)..."

# Append a deliberate syntax error at the end of server.js
cat >> "$SERVER" << 'EOF'

// BUG: accidental syntax error introduced in this commit
const brokenCode = {
EOF

echo "Done. Now commit and watch the pipeline fail:"
echo ""
echo "  git add -A && git commit -m 'feat: add analytics (WIP — DO NOT MERGE)'"
echo ""
echo "Jenkins: Build ✅ → Test ❌ → Deploy skipped"
echo "Your live app remains UNTOUCHED on the previous deployment."
