#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/../.." && pwd)
TARGET=${1:-}
case "$TARGET" in suiri|bannin|kanjou|sokkyou|ura|toubou|ayatsuri|gyakuten|mikiri|shoshinsha|danzai) IDS=($TARGET) ;; all) IDS=(suiri bannin kanjou sokkyou ura toubou ayatsuri gyakuten mikiri shoshinsha danzai) ;; *) echo '使い方: tools/AIプレイ/実行.sh <suiri|bannin|kanjou|sokkyou|ura|toubou|ayatsuri|gyakuten|mikiri|shoshinsha|danzai|all>' >&2; exit 2 ;; esac
node "$ROOT/tools/AIプレイ/生成.mjs" >/dev/null
for id in "${IDS[@]}"; do
  echo "=== $id ==="
  google-chrome --headless=new --no-sandbox --disable-gpu --allow-file-access-from-files \
    --virtual-time-budget=960000 --dump-dom "file://$ROOT/tools/AIプレイ/harness.html?persona=$id" 2>/dev/null \
    | node "$ROOT/tools/AIプレイ/回収.mjs" "$id"
done
if [[ "$TARGET" == "all" ]]; then
  node "$ROOT/tools/AIプレイ/測定死角検査.mjs"
fi
