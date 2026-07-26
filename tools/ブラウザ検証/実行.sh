#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/../.." && pwd)
node "$ROOT/tools/ブラウザ検証/生成.mjs" >/dev/null

for route in execution confession; do
  echo "=== ${route} ==="
  google-chrome --headless=new --no-sandbox --disable-gpu --allow-file-access-from-files \
    --virtual-time-budget=600000 --dump-dom \
    "file://$ROOT/tools/ブラウザ検証/harness.html?route=$route" 2>/dev/null \
    | sed -n '/<pre id="browser-verification-result"/,/<\/pre>/p'
done
