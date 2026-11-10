"""Word timings for a WAV with faster-whisper, for scripts/stream-lag.ts. Usage: words.py <wav> <out.json>"""

import json
import subprocess
import sys

import numpy as np
from faster_whisper import WhisperModel

wav, out = sys.argv[1], sys.argv[2]
pcm = subprocess.run(
    ['ffmpeg', '-v', 'error', '-i', wav, '-f', 'f32le', '-ac', '1', '-ar', '16000', '-'],
    capture_output=True,
    check=True,
).stdout
audio = np.frombuffer(pcm, dtype=np.float32)
model = WhisperModel('small.en', device='cpu', compute_type='int8')
segments, _ = model.transcribe(audio, word_timestamps=True, vad_filter=False)
words = [{'w': w.word.strip(), 's': round(w.start, 3), 'e': round(w.end, 3)} for s in segments for w in s.words]
with open(out, 'w') as f:
    json.dump(words, f)
print(len(words), 'words ->', out)
