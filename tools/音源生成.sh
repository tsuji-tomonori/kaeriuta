#!/usr/bin/env bash
# 権利に依存しない lavfi 音源だけから、決定的にゲーム用の短い音を作る。
set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p assets/audio

bgm() {
  local id="$1" duration="$2" graph="$3"
  local post_gain=""
  # The ending's sparse sustained arrangement leaves more headroom than the
  # other cues after normalization; use that headroom without approaching 0dB.
  if [[ "$id" == "bgm_ending" ]]; then post_gain=",volume=1.35"; fi
  ffmpeg -hide_banner -loglevel error -y -f lavfi -i "$graph" -t "$duration" \
    -af "aformat=channel_layouts=stereo,afade=t=in:st=0:d=2,afade=t=out:st=$((${duration%.*}-3)):d=3,loudnorm=I=-22:TP=-6:LRA=7${post_gain}" \
    -ar 44100 -c:a libvorbis -b:a 48k "assets/audio/${id}.ogg"
}

se() {
  local id="$1" duration="$2" graph="$3"
  ffmpeg -hide_banner -loglevel error -y -f lavfi -i "$graph" -t "$duration" \
    -af "aformat=channel_layouts=stereo,afade=t=out:st=$(awk "BEGIN { print $duration - 0.08 }"):d=0.08,loudnorm=I=-16:TP=-3:LRA=7" \
    -ar 44100 -c:a libvorbis -b:a 48k "assets/audio/${id}.ogg"
}

# 雨は固定 seed の pink noise、持続音は純粋な正弦波だけで構成する。
bgm bgm_arrival 55 "anoisesrc=c=pink:r=44100:seed=101,lowpass=f=1450,volume=0.10[s0];sine=f=55:r=44100,volume=0.055[s1];sine=f=110:r=44100,volume=0.025[s2];[s0][s1][s2]amix=inputs=3:normalize=0"
bgm bgm_storm 58 "anoisesrc=c=pink:r=44100:seed=202,lowpass=f=2600,volume=0.18[s0];anoisesrc=c=brown:r=44100:seed=203,lowpass=f=150,volume=0.12[s1];sine=f=43:r=44100,volume='0.035+0.025*sin(2*PI*t/13)':eval=frame[s2];[s0][s1][s2]amix=inputs=3:normalize=0"
bgm bgm_mansion 60 "anoisesrc=c=brown:r=44100:seed=303,lowpass=f=420,volume=0.025[s0];sine=f=73:r=44100,volume=0.035[s1];sine=f=876:r=44100,volume='if(lt(mod(t,2),0.055),0.11,0)':eval=frame[s2];[s0][s1][s2]amix=inputs=3:normalize=0"
bgm bgm_inquiry 52 "anoisesrc=c=brown:r=44100:seed=404,lowpass=f=190,volume=0.075[s0];sine=f=48:r=44100,volume='if(lt(mod(t,1.35),0.20),0.13,0)':eval=frame[s1];sine=f=96:r=44100,volume=0.022[s2];[s0][s1][s2]amix=inputs=3:normalize=0"
bgm bgm_reasoning 56 "sine=f=92:r=44100,volume=0.045[s0];sine=f=97:r=44100,volume=0.040[s1];sine=f=49:r=44100,volume='if(lt(mod(t,0.82),0.13),0.12,0)':eval=frame[s2];anoisesrc=c=pink:r=44100:seed=505,lowpass=f=780,volume=0.025[s3];[s0][s1][s2][s3]amix=inputs=4:normalize=0"
bgm bgm_ending 65 "anoisesrc=c=brown:r=44100:seed=606,lowpass=f=520,volume=0.024[s0];sine=f=65:r=44100,volume=0.045[s1];sine=f=130:r=44100,volume=0.018[s2];[s0][s1][s2]amix=inputs=3:normalize=0"

se se_glass 1.10 "sine=f=1760:r=44100,volume='0.22*exp(-4*t)':eval=frame[s0];sine=f=2480:r=44100,volume='0.13*exp(-5*t)':eval=frame[s1];anoisesrc=c=white:r=44100:seed=701,lowpass=f=5200,volume='0.025*exp(-8*t)':eval=frame[s2];[s0][s1][s2]amix=inputs=3:normalize=0"
se se_door 1.60 "anoisesrc=c=brown:r=44100:seed=702,lowpass=f=260,volume='0.18*exp(-1.8*t)':eval=frame[s0];sine=f=83:r=44100,volume='0.09*exp(-2*t)':eval=frame[s1];[s0][s1]amix=inputs=2:normalize=0"
se se_footsteps 1.55 "anoisesrc=c=brown:r=44100:seed=703,lowpass=f=310,volume='if(lt(mod(t,0.52),0.13),0.18*exp(-12*mod(t,0.52)),0)':eval=frame"
se se_thunder 2.40 "anoisesrc=c=brown:r=44100:seed=704,lowpass=f=180,volume='0.24*exp(-1.1*t)':eval=frame[s0];sine=f=38:r=44100,volume='0.14*exp(-1.4*t)':eval=frame[s1];[s0][s1]amix=inputs=2:normalize=0"
se se_clock 0.75 "sine=f=1130:r=44100,volume='0.22*exp(-7*t)':eval=frame[s0];sine=f=565:r=44100,volume='0.08*exp(-8*t)':eval=frame[s1];[s0][s1]amix=inputs=2:normalize=0"
se se_paper 1.20 "anoisesrc=c=pink:r=44100:seed=706,highpass=f=700,lowpass=f=4800,volume='0.11*(0.45+0.55*sin(2*PI*8*t))*exp(-1.5*t)':eval=frame"

for file in assets/audio/bgm_*.ogg; do
  detection="$(ffmpeg -hide_banner -i "$file" -af volumedetect -f null - 2>&1)"
  mean="$(sed -n 's/.*mean_volume: \([-0-9.]\+\) dB.*/\1/p' <<<"$detection")"
  max="$(sed -n 's/.*max_volume: \([-0-9.]\+\) dB.*/\1/p' <<<"$detection")"
  awk -v mean="$mean" -v max="$max" 'BEGIN { exit !(mean >= -26 && mean <= -18 && max >= -9 && max <= -5) }' || {
    echo "音量検査失敗: $file (mean=${mean}dB max=${max}dB)" >&2
    exit 1
  }
done

for file in assets/audio/se_*.ogg; do
  detection="$(ffmpeg -hide_banner -i "$file" -af volumedetect -f null - 2>&1)"
  max="$(sed -n 's/.*max_volume: \([-0-9.]\+\) dB.*/\1/p' <<<"$detection")"
  awk -v max="$max" 'BEGIN { exit !(max >= -6 && max <= -2) }' || {
    echo "音量検査失敗: $file (max=${max}dB)" >&2
    exit 1
  }
done
