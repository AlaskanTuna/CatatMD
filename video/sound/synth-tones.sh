#!/usr/bin/env bash
# Two UI tones synthesised instead of generated: ElevenLabs returned noisy bursts over a low drone for both.
# captureStart: two soft rising beeps, G5 then C6. approveChime: two marimba-like notes, E5 then B5, with a 4th partial.
set -euo pipefail
cd "$(dirname "$0")/.."
note() { echo "(sin(2*PI*$1*(t-$2)) + 0.22*sin(2*PI*4*$1*(t-$2))*exp(-14*(t-$2)))*exp(-$3*(t-$2))*gte(t,$2)*(1-exp(-400*(t-$2)))"; }
ffmpeg -v error -y -f lavfi -i "aevalsrc='0.45*($(note 783.99 0 38) + $(note 1046.5 0.16 24))':s=48000:d=0.5" \
  -af "volume=-3dB,afade=t=out:st=0.42:d=0.08" -ac 1 -c:a pcm_s16le public/sfx/captureStart.wav
ffmpeg -v error -y -f lavfi -i "aevalsrc='0.42*($(note 659.25 0 6) + $(note 987.77 0.13 5))':s=48000:d=1.3" \
  -af "afade=t=out:st=1.1:d=0.2" -ac 1 -c:a pcm_s16le public/sfx/approveChime.wav
for f in captureStart approveChime; do p=$(ffmpeg -hide_banner -i public/sfx/$f.wav -af volumedetect -f null - 2>&1 | sed -n 's/.*max_volume: \(-\?[0-9.]*\) dB/\1/p'); ffmpeg -v error -y -i public/sfx/$f.wav -af "volume=$(awk "BEGIN{print -3 - $p}")dB" -c:a pcm_s16le .state/sfx/$f.lvl.wav && mv .state/sfx/$f.lvl.wav public/sfx/$f.wav; done
