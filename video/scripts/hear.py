"""Transcribe WAVs with faster-whisper and report what was heard, speech span and pauses. Usage: hear.py <wav>..."""

import json
import subprocess
import sys

import numpy as np

from faster_whisper import WhisperModel

model = WhisperModel('small.en', device='cpu', compute_type='int8')
out = []
for path in sys.argv[1:]:
    pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '1', '-ar', '16000', '-'],
                         capture_output=True, check=True).stdout
    audio = np.frombuffer(pcm, dtype=np.float32)
    segments, info = model.transcribe(audio, word_timestamps=True, vad_filter=False)
    words = [w for s in segments for w in s.words]
    text = ''.join(w.word for w in words).strip()
    gaps = [round(b.start - a.end, 2) for a, b in zip(words, words[1:])]
    out.append({
        'file': path.rsplit('/', 1)[-1],
        'heard': text,
        'speech_start': round(words[0].start, 2) if words else None,
        'speech_end': round(words[-1].end, 2) if words else None,
        'duration': round(info.duration, 2),
        'longest_gap': max(gaps) if gaps else None,
    })
print(json.dumps(out, indent=1))
