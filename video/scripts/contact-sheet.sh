#!/usr/bin/env bash
# One frame every 5 s, tiled 5 wide with its true timestamp burned in (select, not fps: fps labels a frame up to
# 2.5 s early). Usage: contact-sheet.sh <video> <out.jpg>
set -euo pipefail
in="$1"; out="$2"
dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$in")
n=$(python3 -c "import math; print(math.ceil($dur/5))")
rows=$(( (n + 4) / 5 ))
ffmpeg -v error -y -i "$in" -vf "select='isnan(prev_selected_t)+gte(t-prev_selected_t\,4.999)',scale=384:-1,drawtext=text='%{pts\:hms}':x=8:y=8:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=4,tile=5x${rows}:padding=4:color=white" -frames:v 1 -q:v 3 "$out"
echo "$n frames -> $out"
