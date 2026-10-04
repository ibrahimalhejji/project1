#!/usr/bin/env bash
# Builds the production bundle and packs it as dist/cmchub-net-<stamp>.tar.gz
set -euo pipefail
cd "$(dirname "$0")/.."
STAMP="$(date +%Y%m%d-%H%M)"
NAME="cmchub-net-$STAMP"
OUT="dist/$NAME"
rm -rf dist && mkdir -p "$OUT"
echo "[package] building ..."
npm run build >/dev/null
echo "[package] assembling $OUT"
cp -r .next/standalone/. "$OUT/"
mkdir -p "$OUT/.next/static" && cp -r .next/static/. "$OUT/.next/static/"
cp -r public "$OUT/public"
cp -r drizzle "$OUT/drizzle"
mkdir -p "$OUT/data" "$OUT/logs"
cp deploy/.env.production.example "$OUT/.env.example"
cp deploy/README-DEPLOY.md "$OUT/README-DEPLOY.md"
cp deploy/ecosystem.config.js deploy/nginx.conf.example "$OUT/"
rm -f "$OUT/.env"   # never ship local secrets
printf '%s\n' "$NAME" "$(git rev-parse --short HEAD 2>/dev/null || echo nogit)" > "$OUT/VERSION"
tar -czf "dist/$NAME.tar.gz" -C dist "$NAME"
du -sh "dist/$NAME.tar.gz" | awk '{print "[package] done: " $2 " (" $1 ")"}'
