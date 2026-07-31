#!/usr/bin/env python3
"""Fail when shipped audio violates the soundtrack delivery contract."""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
LOOP_IDS = {
    "bgm_title", "bgm_arrival", "bgm_mansion", "bgm_storm", "bgm_inquiry",
    "bgm_reasoning", "bgm_end_arrest", "bgm_end_escape", "bgm_end_puppet",
    "bgm_end_reversal", "bgm_end_rescue", "bgm_end_unfinished", "bgm_end_silenced",
}
REQUIRED_BGM = LOOP_IDS | {"bgm_credits"}


def run(*command: str) -> str:
    return subprocess.run(command, check=True, capture_output=True, text=True).stdout


def probe(path: Path) -> dict[str, object]:
    data = json.loads(run(
        "ffprobe", "-v", "error", "-show_entries",
        "stream=codec_name,sample_rate,channels:format=duration", "-of", "json", str(path),
    ))
    stream = data["streams"][0]
    return {
        "codec": stream["codec_name"], "sample_rate": int(stream["sample_rate"]),
        "channels": int(stream["channels"]), "duration": float(data["format"]["duration"]),
    }


def loudness(path: Path) -> tuple[float, float]:
    process = subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-af",
         "loudnorm=I=-24:TP=-2:LRA=7:print_format=json", "-f", "null", "-"],
        check=True, capture_output=True, text=True,
    )
    match = re.search(r'\{\s*"input_i".*?\}', process.stderr, flags=re.S)
    if not match:
        raise RuntimeError(f"could not measure {path}")
    data = json.loads(match.group(0))
    return float(data["input_i"]), float(data["input_tp"])


def stress_mix() -> tuple[float, float]:
    paths = [ROOT / "assets/audio" / name for name in ("bgm_storm.ogg", "amb_storm.ogg", "se_paper.ogg")]
    process = subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostats", "-stream_loop", "-1", "-i", str(paths[0]),
         "-stream_loop", "-1", "-i", str(paths[1]), "-stream_loop", "-1", "-i", str(paths[2]),
         "-filter_complex",
         "[0:a]volume=.9[b];[1:a]volume=.72[a];[2:a]volume=.78[s];"
         "[b][a][s]amix=inputs=3:normalize=0,loudnorm=I=-24:TP=-2:LRA=7:print_format=json",
         "-t", "20", "-f", "null", "-"],
        check=True, capture_output=True, text=True,
    )
    match = re.search(r'\{\s*"input_i".*?\}', process.stderr, flags=re.S)
    if not match:
        raise RuntimeError("could not measure stress mix")
    data = json.loads(match.group(0))
    return float(data["input_i"]), float(data["input_tp"])


def decoded(path: Path) -> np.ndarray:
    process = subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", str(path),
         "-f", "f32le", "-acodec", "pcm_f32le", "-ac", "2", "-ar", "48000", "-"],
        check=True, capture_output=True,
    )
    return np.frombuffer(process.stdout, dtype="<f4").reshape(-1, 2)


def main() -> int:
    manifest = json.loads((ROOT / "assets/manifest.json").read_text(encoding="utf-8"))
    audio = {item["id"]: item for item in manifest["assets"] if item["kind"] in {"bgm", "ambience", "se"}}
    failures: list[str] = []
    missing = REQUIRED_BGM - set(audio)
    if missing:
        failures.append(f"manifest is missing BGM: {', '.join(sorted(missing))}")

    rows = []
    for asset_id in sorted(audio):
        path = ROOT / audio[asset_id]["file"]
        if not path.exists():
            failures.append(f"{asset_id}: file is missing")
            continue
        info = probe(path)
        level, peak = loudness(path)
        kind = audio[asset_id]["kind"]
        target = (-21 if asset_id == "bgm_credits" else
                  -23 if asset_id.startswith("bgm_end_") else
                  -24 if kind == "bgm" else -28 if kind == "ambience" else -21)
        tolerance = 1.0 if kind == "bgm" else 2.0
        peak_limit = -2.0 if kind == "bgm" else -8.0 if kind == "ambience" else -5.5
        if info["codec"] != "vorbis" or info["sample_rate"] != 48_000 or info["channels"] != 2:
            failures.append(f"{asset_id}: expected Vorbis 48 kHz stereo, got {info}")
        too_loud = level > target + tolerance
        too_quiet = kind != "ambience" and level < target - tolerance
        if too_loud or too_quiet:
            failures.append(f"{asset_id}: {level:.1f} LUFS, expected {target}±{tolerance}")
        if peak > peak_limit:
            failures.append(f"{asset_id}: true peak {peak:.1f} dBTP exceeds {peak_limit}")
        samples = decoded(path) if kind == "bgm" else None
        stereo_delta = float(np.sqrt(np.mean((samples[:, 0] - samples[:, 1]) ** 2))) if samples is not None else None
        if kind == "bgm" and stereo_delta < .0001:
            failures.append(f"{asset_id}: channels appear to be dual mono")
        seam = None
        if asset_id in LOOP_IDS:
            seam = float(np.max(np.abs(samples[0] - samples[-1])))
            if seam > .08:
                failures.append(f"{asset_id}: loop boundary jump {seam:.4f} exceeds .08")
        rows.append({"id": asset_id, "seconds": round(info["duration"], 3), "lufs": level,
                     "true_peak": peak,
                     "stereo_delta": round(stereo_delta, 6) if stereo_delta is not None else None,
                     "seam": seam})

    mix_level, mix_peak = stress_mix()
    rows.append({"id": "stress_mix", "seconds": 20, "lufs": mix_level, "true_peak": mix_peak,
                 "stereo_delta": None, "seam": None})
    if mix_peak > -1.0:
        failures.append(f"stress_mix: true peak {mix_peak:.1f} dBTP leaves insufficient headroom")

    print(json.dumps(rows, ensure_ascii=False, indent=2))
    if failures:
        print("\nAudio validation failed:", file=sys.stderr)
        for failure in failures:
            print(f"- {failure}", file=sys.stderr)
        return 1
    print("Audio validation passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
