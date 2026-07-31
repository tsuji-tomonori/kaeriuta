#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo_dir"

command -v ffmpeg >/dev/null || { echo "ffmpeg is required" >&2; exit 1; }
python3 -c 'import numpy, scipy' 2>/dev/null || {
  echo "Python packages numpy and scipy are required" >&2
  exit 1
}

python3 tools/audio/render_soundtrack.py "$@"
