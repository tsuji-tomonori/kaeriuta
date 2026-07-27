#!/usr/bin/env bash
# 権利に依存しない lavfi 音源だけから、決定的にゲーム用の短い音を作る。
set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p assets/audio

# 「帰り唄」動機: D5 F5 E5 C5 D5 A4 G4 D5。
# 最終Dを鳴らさなければ問いが残り、鳴らせば六番の「閉じましょう」に解決する。
note_freq() { case "$1" in C4) echo 261.63;; D4) echo 293.66;; E4) echo 329.63;; F4) echo 349.23;; G4) echo 392.00;; A4) echo 440.00;; C5) echo 523.25;; D5) echo 587.33;; Eb5) echo 622.25;; E5) echo 659.25;; F5) echo 698.46;; Fs5) echo 739.99;; G5) echo 783.99;; A5) echo 880.00;; esac; }

# melody_layer NAME "NOTE:DURATION ..." START_MS STEP_MS AMP DECAY
# 各音を基音・第2/3/4倍音と短い高域アタックから組み立てる。
# 倍音ほど小さく速く減衰させ、オルゴール／ピアノ寄りの打鍵感を保つ。
melody_layer() {
  local name="$1" notes="$2" start="$3" step="$4" amp="$5" decay="$6" i=0 token note dur freq freq2 freq3 freq4 decay2 decay3 decay4 delay graph="" labels=""
  for token in $notes; do
    note="${token%%:*}"; dur="${token#*:}"; freq="$(note_freq "$note")"; delay=$((start + i * step))
    freq2="$(awk "BEGIN { print ${freq} * 2 }")"; freq3="$(awk "BEGIN { print ${freq} * 3 }")"; freq4="$(awk "BEGIN { print ${freq} * 4 }")"
    decay2="$(awk "BEGIN { print ${decay} * 1.45 }")"; decay3="$(awk "BEGIN { print ${decay} * 1.9 }")"; decay4="$(awk "BEGIN { print ${decay} * 2.5 }")"
    graph+="sine=f=${freq}:r=44100:d=${dur},volume='${amp}*exp(-${decay}*t)':eval=frame[${name}${i}f];sine=f=${freq2}:r=44100:d=${dur},volume='${amp}*.40*exp(-${decay2}*t)':eval=frame[${name}${i}h2];sine=f=${freq3}:r=44100:d=${dur},volume='${amp}*.19*exp(-${decay3}*t)':eval=frame[${name}${i}h3];sine=f=${freq4}:r=44100:d=${dur},volume='${amp}*.09*exp(-${decay4}*t)':eval=frame[${name}${i}h4];anoisesrc=c=white:r=44100:d=0.025:seed=$((900 + i)),highpass=f=4200,volume='${amp}*.075*exp(-95*t)':eval=frame[${name}${i}a];[${name}${i}f][${name}${i}h2][${name}${i}h3][${name}${i}h4][${name}${i}a]amix=inputs=5:normalize=0,adelay=${delay}|${delay}[${name}${i}];"
    labels+="[${name}${i}]"; i=$((i + 1))
  done
  graph+="${labels}amix=inputs=${i}:normalize=0[${name}]"
  printf '%s' "$graph"
}

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
bgm() {
  local id="$1" duration="$2" graph="$3" target="-22"
  [[ "$id" == bgm_ending || "$id" == bgm_end_* ]] && target="-24"
  normalized_audio "$id" "$duration" "$graph" "aformat=channel_layouts=stereo,afade=t=in:st=0:d=2,afade=t=out:st=$((${duration%.*}-3)):d=3" "$target" "-6"
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

arrival="$(melody_layer m 'D5:1 F5:1 E5:1 C5:1 D5:1 A4:1 G4:1' 1200 2300 .12 2.8)"
mansion="$(melody_layer m 'D4:1 F4:1 E4:1 C4:1 D4:1 A4:1 G4:1 D4:1' 1000 5200 .11 2.4)"
inquiry="$(melody_layer m 'D5:1 F5:1 E5:1 D5:1 A4:1 G4:1 D5:1' 900 2500 .10 3.2)"
reasoning="$(melody_layer m 'D5:0.5 F5:0.5 Fs5:0.5 E5:0.5 C5:0.5 D5:0.5 A4:0.5 G4:0.5 D5:0.5' 700 1750 .095 4.2)"
ending="$(melody_layer m 'D5:1 F5:1 E5:1 C5:1 D5:1 A4:1 G4:1 D5:2' 1500 5500 .14 2.1)"
arrest="$(melody_layer m 'D5:1 F5:1 E5:1 C5:1' 1400 4200 .13 2.8)"
escape="$(melody_layer m 'D5:1 F5:1 E5:1 C5:1 D5:1 A4:1 G4:1' 9000 6000 .045 1.4)"
rescue="$(melody_layer m 'D5:1 Fs5:1 E5:1 C5:1 D5:1 A4:1 G4:1 D5:2' 1200 4700 .15 1.8)"

bgm bgm_arrival 55 "${arrival};sine=f=146.83:r=44100,volume=0.025[h];[m][h]amix=inputs=2:normalize=0"
bgm bgm_storm 58 "sine=f=43:r=44100,volume='0.035+0.018*sin(2*PI*t/13)':eval=frame[s0];sine=f=86:r=44100,volume=0.018[s1];anoisesrc=c=white:r=44100:seed=620,highpass=f=1800,volume='if(lt(mod(t,8.7),0.035),0.08*exp(-55*mod(t,8.7)),0)':eval=frame[s2];[s0][s1][s2]amix=inputs=3:normalize=0"
bgm bgm_mansion 60 "${mansion};sine=f=73:r=44100,volume=0.018[h];[m][h]amix=inputs=2:normalize=0"
bgm bgm_inquiry 52 "${inquiry};sine=f=48:r=44100,volume='if(lt(mod(t,2.5),0.16),0.045,0)':eval=frame[h];[m][h]amix=inputs=2:normalize=0"
bgm bgm_reasoning 56 "${reasoning};sine=f=92:r=44100,volume=0.018[h];[m][h]amix=inputs=2:normalize=0"
bgm bgm_ending 65 "${ending};sine=f=146.83:r=44100,volume=0.016[h];[m][h]amix=inputs=2:normalize=0"
bgm bgm_end_arrest 28 "${arrest};sine=f=73:r=44100,volume=0.018[h];[m][h]amix=inputs=2:normalize=0"
bgm bgm_end_escape 42 "${escape};anoisesrc=c=pink:r=44100:seed=612,highpass=f=800,volume=0.012[w];anoisesrc=c=white:r=44100:seed=613,highpass=f=3500,volume='if(lt(mod(t,6),0.025),0.08*exp(-105*mod(t,6)),0)':eval=frame[a];[m][w][a]amix=inputs=3:normalize=0"
bgm bgm_end_rescue 45 "${rescue};sine=f=220:r=44100,volume=0.024[h];[m][h]amix=inputs=2:normalize=0"

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
