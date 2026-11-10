#!/usr/bin/env bash
# Final deliverables from a 1080p master render:
#   1. measure, then two-pass loudnorm to -14 LUFS integrated, true peak <= -1.5 dBTP (linear mode)
#   2. H.264 High, yuv420p, +faststart, AAC 48 kHz stereo 160 kbps, two-pass to a size budget
#   3. sidecar .srt, poster JPEG <= 300 KB, then QA
# Usage: scripts/finish.sh <master.mp4> [video_kbps=700] [poster_second=72]
set -euo pipefail
cd "$(dirname "$0")/.."
master="$1"; vk="${2:-700}"; poster_at="${3:-72}"
out=${OUT_DIR:-out}; mkdir -p "$out" .state/finish
# NAME names the deliverables (default catatmd-walkthrough, as in docs/assets/video/); OUT_DIR holds them.
name="${NAME:-catatmd-walkthrough}"

# In linear mode loudnorm applies one gain; its LRA target only gates linear (input LRA must fit under it). v2's mix
# spans about 18 LU by design (a -30 LUFS bed between lines, silence under the heard dialogue), so the gate is 20.
lra=20

# 1. Loudness, in three passes (Kotak's chain): measure; gain to -13 LUFS and catch peaks with a 4x-oversampled
#    limiter at -2.5 dBFS; then a linear loudnorm to -14 LUFS with the measurements fed back. Linear or fail.
i0=$(ffmpeg -hide_banner -nostats -i "$master" -vn -af loudnorm=print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p' | jq -r .input_i)
pre="volume=$(awk "BEGIN{print -13 - $i0}")dB,aresample=192000,alimiter=limit=0.75:attack=1:release=60:level=disabled,aresample=48000"
stats=$(ffmpeg -hide_banner -nostats -i "$master" -vn -af "$pre,loudnorm=I=-14:TP=-2:LRA=$lra:print_format=json" -f null - 2>&1 | sed -n '/^{/,/^}/p')
mi=$(jq -r .input_i <<<"$stats"); mtp=$(jq -r .input_tp <<<"$stats"); mlra=$(jq -r .input_lra <<<"$stats"); mth=$(jq -r .input_thresh <<<"$stats"); off=$(jq -r .target_offset <<<"$stats")
echo "measured: master I=$i0 LUFS; after limiter I=$mi LUFS, TP=$mtp dBTP, LRA=$mlra"
kind=$(ffmpeg -hide_banner -nostats -y -i "$master" -vn \
  -af "$pre,loudnorm=I=-14:TP=-2:LRA=$lra:measured_I=$mi:measured_TP=$mtp:measured_LRA=$mlra:measured_thresh=$mth:offset=$off:linear=true:print_format=json,aresample=48000" \
  -ac 2 -c:a pcm_s24le .state/finish/audio.wav 2>&1 | sed -n '/^{/,/^}/p' | jq -r .normalization_type)
[ "$kind" = linear ] || { echo "loudnorm fell back to $kind" >&2; exit 1; }

# 2. Video, two-pass to the bitrate budget; audio from the normalised WAV.
ffmpeg -hide_banner -v error -y -i "$master" -an -c:v libx264 -profile:v high -pix_fmt yuv420p -preset slow -tune stillimage \
  -b:v "${vk}k" -maxrate "$((vk * 3))k" -bufsize "$((vk * 4))k" -g 60 -pass 1 -passlogfile .state/finish/x264 -f mp4 /dev/null
ffmpeg -hide_banner -v error -y -i "$master" -i .state/finish/audio.wav -map 0:v -map 1:a -c:v libx264 -profile:v high -pix_fmt yuv420p \
  -preset slow -tune stillimage -b:v "${vk}k" -maxrate "$((vk * 3))k" -bufsize "$((vk * 4))k" -g 60 -pass 2 -passlogfile .state/finish/x264 \
  -c:a aac -b:a 160k -ar 48000 -ac 2 -movflags +faststart "$out/$name.mp4"

# 3. Captions, poster.
bun scripts/captions.ts "$out/$name.srt"
# POSTER_PNG: a `remotion still --props='{"poster":true}'` frame (no captions, a play badge); else a master frame.
for q in 3 5 7 9 12; do
  if [ -n "${POSTER_PNG:-}" ]; then ffmpeg -hide_banner -v error -y -i "$POSTER_PNG" -frames:v 1 -q:v "$q" "$out/$name-poster.jpg"
  else ffmpeg -hide_banner -v error -y -ss "$poster_at" -i "$master" -frames:v 1 -q:v "$q" "$out/$name-poster.jpg"; fi
  [ "$(stat -c %s "$out/$name-poster.jpg")" -le 307200 ] && break
done
bun scripts/qa.ts "$out/$name.mp4" "$out/$name.srt" "$out/$name-poster.jpg"
