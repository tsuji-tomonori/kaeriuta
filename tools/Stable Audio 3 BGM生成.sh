#!/usr/bin/env bash
# Stable Audio 3 Medium の公式デモAPIでBGMを生成し、ゲーム用OGGへ整える。
set -euo pipefail

cd "$(dirname "$0")/.."

config="tools/stable-audio-3-bgm.json"
api_base="${STABLE_AUDIO_3_API_BASE:-https://stabilityai-stable-audio-3.hf.space}"
raw_dir="${STABLE_AUDIO_3_RAW_DIR:-.tmp/stable-audio-3/raw}"
event_dir="${STABLE_AUDIO_3_EVENT_DIR:-.tmp/stable-audio-3/events}"
mkdir -p "$raw_dir" "$event_dir" assets/audio

for command in curl jq ffmpeg ffprobe; do
  command -v "$command" >/dev/null || { echo "missing command: $command" >&2; exit 1; }
done

ids=("$@")
if ((${#ids[@]} == 0)); then
  mapfile -t ids < <(jq -r '.tracks[].id' "$config")
fi

track_json() {
  local id="$1"
  jq -cer --arg id "$id" '.tracks[] | select(.id == $id)' "$config"
}

generate_raw() {
  local id="$1" track request event_id events result_url
  if [[ -s "$raw_dir/$id.wav" ]]; then
    echo "[$id] reuse $raw_dir/$id.wav"
    return
  fi
  track="$(track_json "$id")"
  request="$(jq -cn \
    --arg variant_key "$(jq -r '.variant_key' "$config")" \
    --arg prompt "$(jq -r '.prompt' <<<"$track")" \
    --argjson duration "$(jq '.duration' "$config")" \
    --argjson steps "$(jq '.steps' "$config")" \
    --argjson cfg_scale "$(jq '.cfg_scale' "$config")" \
    --arg sampler_type "$(jq -r '.sampler_type' "$config")" \
    --argjson seed "$(jq '.seed' <<<"$track")" \
    '{variant_key:$variant_key,prompt:$prompt,duration:$duration,steps:$steps,cfg_scale:$cfg_scale,sampler_type:$sampler_type,seed:$seed}')"

  event_id="$(curl --fail --silent --show-error \
    -H 'Content-Type: application/json' \
    -d "$request" \
    "$api_base/gradio_api/call/v2/infer" | jq -er '.event_id')"
  events="$event_dir/$id.sse"
  curl --fail --silent --show-error --no-buffer \
    "$api_base/gradio_api/call/infer/$event_id" > "$events"
  if grep -q '^event: error' "$events"; then
    sed -n 's/^data: //p' "$events" | tail -n 1 | jq -r '.error // .' >&2
    exit 1
  fi
  result_url="$(sed -n 's/^data: //p' "$events" | tail -n 1 | jq -er '.[0].url')"
  curl --fail --silent --show-error "$result_url" -o "$raw_dir/$id.wav"
}

normalize_loop() {
  local id="$1" track target crossfade raw looped measured input_i input_lra input_tp input_thresh target_offset
  track="$(track_json "$id")"
  target="$(jq '.target_lufs' <<<"$track")"
  crossfade="$(jq '.loop_crossfade_seconds' "$config")"
  raw="$raw_dir/$id.wav"
  looped=".tmp/stable-audio-3/$id.loop.wav"

  ffmpeg -hide_banner -loglevel error -y -i "$raw" -i "$raw" \
    -filter_complex "[0:a]atrim=start=3,asetpts=PTS-STARTPTS[main];[1:a]atrim=start=0:end=3,asetpts=PTS-STARTPTS[head];[main][head]acrossfade=d=${crossfade}:c1=tri:c2=tri,aresample=48000,aformat=channel_layouts=stereo[out]" \
    -map '[out]' -c:a pcm_s24le "$looped"

  measured="$(ffmpeg -hide_banner -loglevel info -i "$looped" \
    -af "loudnorm=I=${target}:TP=-4.5:LRA=9:print_format=json" -f null - 2>&1)"
  loudnorm_value() { sed -n "s/.*\"$1\"[[:space:]]*:[[:space:]]*\"\\([^\"]*\\)\".*/\\1/p" <<<"$measured" | tail -n 1; }
  input_i="$(loudnorm_value input_i)"
  input_lra="$(loudnorm_value input_lra)"
  input_tp="$(loudnorm_value input_tp)"
  input_thresh="$(loudnorm_value input_thresh)"
  target_offset="$(loudnorm_value target_offset)"

  ffmpeg -hide_banner -loglevel error -y -i "$looped" \
    -af "loudnorm=I=${target}:TP=-4.5:LRA=9:measured_I=${input_i}:measured_LRA=${input_lra}:measured_TP=${input_tp}:measured_thresh=${input_thresh}:offset=${target_offset}:linear=true" \
    -ar 48000 -c:a libvorbis -q:a 7 "assets/audio/$id.ogg"
}

for id in "${ids[@]}"; do
  track_json "$id" >/dev/null || { echo "unknown track: $id" >&2; exit 1; }
  echo "[$id] generate"
  generate_raw "$id"
  echo "[$id] normalize and loop"
  normalize_loop "$id"
done
