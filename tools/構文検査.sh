#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

mapfile -d '' FILES < <(find "$ROOT/src" "$ROOT/tools/AIプレイ" "$ROOT/tools/ブラウザ検証" -type f -name '*.js' -print0)
for file in "${FILES[@]}"; do
  target="$TEMP_DIR/$(basename "$file").$RANDOM.mjs"
  cp "$file" "$target"
  node --check "$target"
done

echo "ESM構文検査: ${#FILES[@]} ファイル、エラー 0"
