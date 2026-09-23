#!/usr/bin/env bash
# 環境音とSEを、権利に依存しない lavfi 音源だけから決定的に生成する。
# BGMは `tools/Stable Audio 3 BGM生成.sh` と同ディレクトリのJSON設定で管理する。
set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p assets/audio

normalized_audio() {
  local id="$1" duration="$2" graph="$3" filters="$4" target="$5" peak="$6" measured input_i input_lra input_tp input_thresh target_offset encoded encoded_i gain pass_file
  measured="$(ffmpeg -hide_banner -loglevel info -f lavfi -i "$graph" -t "$duration" -af "${filters},loudnorm=I=${target}:TP=${peak}:LRA=7:print_format=json" -f null - 2>&1)"
  loudnorm_value() { sed -n "s/.*\"$1\"[[:space:]]*:[[:space:]]*\"\\([^\"]*\\)\".*/\\1/p" <<<"$measured" | tail -n 1; }
  input_i="$(loudnorm_value input_i)"; input_lra="$(loudnorm_value input_lra)"; input_tp="$(loudnorm_value input_tp)"; input_thresh="$(loudnorm_value input_thresh)"; target_offset="$(loudnorm_value target_offset)"
  [[ -n "$input_i" && -n "$input_lra" && -n "$input_tp" && -n "$input_thresh" && -n "$target_offset" ]]
  ffmpeg -hide_banner -loglevel error -y -f lavfi -i "$graph" -t "$duration" \
    -af "${filters},loudnorm=I=${target}:TP=${peak}:LRA=7:measured_I=${input_i}:measured_LRA=${input_lra}:measured_TP=${input_tp}:measured_thresh=${input_thresh}:offset=${target_offset}:linear=true:print_format=summary" \
    -ar 44100 -c:a libvorbis -b:a 56k "assets/audio/${id}.ogg"
}
amb() {
  local id="$1" graph="$2"
  ffmpeg -hide_banner -loglevel error -y -f lavfi -i "$graph" -t 60 \
    -af "aformat=channel_layouts=stereo,afade=t=in:st=0:d=2,afade=t=out:st=57:d=3,loudnorm=I=-25:TP=-8:LRA=7" \
    -ar 44100 -c:a libvorbis -b:a 48k "assets/audio/${id}.ogg"
}
se() {
  local id="$1" duration="$2" graph="$3"
  normalized_audio "$id" "$duration" "$graph" "aformat=channel_layouts=stereo,afade=t=out:st=$(awk "BEGIN { print $duration - 0.08 }"):d=0.08" "-16" "-3"
  # 短尺SEでは2パスloudnormだけでは目標を越えるため、エンコード後に再測定し、
  # 測定差だけの固定ゲインで -16 LUFS へ補正する。
  local encoded encoded_i gain pass_file
  encoded="$(ffmpeg -hide_banner -loglevel info -i "assets/audio/${id}.ogg" -af loudnorm=I=-16:TP=-3:LRA=7:print_format=json -f null - 2>&1)"
  encoded_i="$(sed -n 's/.*"input_i" *: *"\([^"]*\)".*/\1/p' <<<"$encoded" | tail -n 1)"
  gain="$(awk "BEGIN { print -16 - ${encoded_i} }")"
  pass_file="assets/audio/.${id}.pass.ogg"
  ffmpeg -hide_banner -loglevel error -y -i "assets/audio/${id}.ogg" -af "volume=${gain}dB" -ar 44100 -c:a libvorbis -b:a 56k "$pass_file"
  mv "$pass_file" "assets/audio/${id}.ogg"
}

amb amb_rain_indoor "anoisesrc=c=pink:r=44100:seed=801,lowpass=f=1800,volume=0.075"
amb amb_corridor "anoisesrc=c=pink:r=44100:seed=802,lowpass=f=1600,volume=0.055[a];anoisesrc=c=brown:r=44100:seed=803,lowpass=f=240,volume='if(lt(mod(t,5.7),0.28),0.075,0)':eval=frame[b];[a][b]amix=inputs=2:normalize=0"
amb amb_library "sine=f=880:r=44100,volume='if(lt(mod(t,2),0.045),0.05,0)':eval=frame[a];anoisesrc=c=pink:r=44100:seed=804,highpass=f=900,lowpass=f=3800,volume=0.012[b];[a][b]amix=inputs=2:normalize=0"
amb amb_hall "anoisesrc=c=pink:r=44100:seed=805,lowpass=f=500,volume=0.028[a];anoisesrc=c=brown:r=44100:seed=806,lowpass=f=180,volume=0.026[b];[a][b]amix=inputs=2:normalize=0"
amb amb_kitchen "anoisesrc=c=pink:r=44100:seed=807,highpass=f=1200,lowpass=f=5500,volume='if(lt(mod(t,4.3),0.04),0.235,0)':eval=frame"
amb amb_basement "anoisesrc=c=pink:r=44100:seed=808,lowpass=f=320,volume=0.04[a];sine=f=100:r=44100,volume=0.018[b];[a][b]amix=inputs=2:normalize=0"
amb amb_hidden_room "sine=f=1190:r=44100,volume='if(lt(mod(t,3.1),0.035),0.187,0)':eval=frame[a];anoisesrc=c=pink:r=44100:seed=809,highpass=f=1700,lowpass=f=3800,volume='if(lt(mod(t,3.1),0.09),0.044,0)':eval=frame[b];[a][b]amix=inputs=2:normalize=0"
amb amb_storm "anoisesrc=c=pink:r=44100:seed=810,lowpass=f=2600,volume=0.13[a];anoisesrc=c=brown:r=44100:seed=811,lowpass=f=170,volume=0.08[b];[a][b]amix=inputs=2:normalize=0"

se se_glass 1.10 "sine=f=1760:r=44100,volume='0.22*exp(-4*t)':eval=frame[s0];sine=f=2480:r=44100,volume='0.13*exp(-5*t)':eval=frame[s1];[s0][s1]amix=inputs=2:normalize=0"
se se_door 1.60 "anoisesrc=c=brown:r=44100:seed=702,lowpass=f=260,volume='0.18*exp(-1.8*t)':eval=frame[s0];sine=f=83:r=44100,volume='0.09*exp(-2*t)':eval=frame[s1];[s0][s1]amix=inputs=2:normalize=0"
se se_footsteps 1.55 "anoisesrc=c=brown:r=44100:seed=703,lowpass=f=310,volume='if(lt(mod(t,0.52),0.13),0.18*exp(-12*mod(t,0.52)),0)':eval=frame"
se se_thunder 2.40 "anoisesrc=c=brown:r=44100:seed=704,lowpass=f=180,volume='0.24*exp(-1.1*t)':eval=frame[s0];sine=f=38:r=44100,volume='0.14*exp(-1.4*t)':eval=frame[s1];[s0][s1]amix=inputs=2:normalize=0"
se se_clock 0.75 "sine=f=1130:r=44100,volume='0.22*exp(-7*t)':eval=frame[s0];sine=f=565:r=44100,volume='0.08*exp(-8*t)':eval=frame[s1];[s0][s1]amix=inputs=2:normalize=0"
se se_paper 1.20 "anoisesrc=c=pink:r=44100:seed=706,highpass=f=700,lowpass=f=4800,volume='0.11*(0.45+0.55*sin(2*PI*8*t))*exp(-1.5*t)':eval=frame"
se se_typewriter .45 "anoisesrc=c=white:r=44100:seed=712,highpass=f=1600,lowpass=f=6200,volume='0.20*exp(-15*t)':eval=frame[a];sine=f=210:r=44100,volume='0.15*exp(-12*t)':eval=frame[b];[a][b]amix=inputs=2:normalize=0"
se se_temari .80 "sine=f=145:r=44100,volume='0.28*exp(-7*t)':eval=frame[a];sine=f=290:r=44100,volume='0.11*exp(-9*t)':eval=frame[b];anoisesrc=c=brown:r=44100:seed=713,lowpass=f=420,volume='0.14*exp(-13*t)':eval=frame[c];[a][b][c]amix=inputs=3:normalize=0"
se se_tray 1.20 "anoisesrc=c=white:r=44100:seed=714,highpass=f=900,lowpass=f=7000,volume='0.16*exp(-5*t)':eval=frame[a];sine=f=420:r=44100,volume='0.18*exp(-4*t)':eval=frame[b];sine=f=710:r=44100,volume='0.10*exp(-6*t)':eval=frame[c];[a][b][c]amix=inputs=3:normalize=0"
se se_floor 1.00 "anoisesrc=c=brown:r=44100:seed=715,lowpass=f=260,volume='0.19*exp(-4*t)':eval=frame[a];sine=f=96:r=44100,volume='0.10*exp(-5*t)':eval=frame[b];[a][b]amix=inputs=2:normalize=0"
se se_keys .85 "sine=f=1220:r=44100,volume='0.16*exp(-8*t)':eval=frame[a];sine=f=1750:r=44100,volume='0.12*exp(-10*t)':eval=frame[b];[a][b]amix=inputs=2:normalize=0"
se se_pen .55 "anoisesrc=c=pink:r=44100:seed=716,highpass=f=900,lowpass=f=4200,volume='0.12*exp(-13*t)':eval=frame[a];sine=f=340:r=44100,volume='0.10*exp(-12*t)':eval=frame[b];[a][b]amix=inputs=2:normalize=0"
se se_cloth .95 "anoisesrc=c=pink:r=44100:seed=717,highpass=f=350,lowpass=f=2900,volume='0.15*exp(-3*t)':eval=frame"
se se_water 1.40 "anoisesrc=c=pink:r=44100:seed=718,lowpass=f=650,volume='0.13*(0.5+0.5*sin(2*PI*2*t))*exp(-.8*t)':eval=frame"
