"""Re-time a rendered dialogue: find each scripted turn in the audio with faster-whisper word timings, cut at the middle
of each between-turn silence, trim each turn's edge silence, and join them with set gaps (speaker change vs same
speaker). Usage: regap.py <in.wav> <script.json> <out.wav> [change_gap=1.4] [same_gap=1.0] [lead=2.0] [tail=2.0]"""

import difflib
import json
import re
import subprocess
import sys

import numpy as np
import soundfile
from faster_whisper import WhisperModel

src, script_path, out = sys.argv[1:4]
change_gap, same_gap, lead, tail = (float(x) for x in (sys.argv[4:8] + ['1.4', '1.0', '2.0', '2.0'][len(sys.argv[4:8]):]))

turns = json.load(open(script_path))['turns']
norm = lambda w: re.sub(r'[^a-z0-9]', '', w.lower())
script_words, owner = [], []
for i, t in enumerate(turns):
    for w in (t.get('say') or t['text']).split():
        if norm(w):
            script_words.append(norm(w))
            owner.append(i)

rate = 48000
pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-f', 'f32le', '-ac', '1', '-ar', str(rate), '-'], capture_output=True, check=True).stdout
audio = np.frombuffer(pcm, dtype=np.float32).copy()
heard_16k = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-f', 'f32le', '-ac', '1', '-ar', '16000', '-'], capture_output=True, check=True).stdout
model = WhisperModel('small.en', device='cpu', compute_type='int8')
segments, _ = model.transcribe(np.frombuffer(heard_16k, dtype=np.float32), word_timestamps=True, vad_filter=False,
                               initial_prompt=' '.join(t['text'] for t in turns[:3]))
words = [w for s in segments for w in s.words if norm(w.word)]
heard = [norm(w.word) for w in words]

# Map each scripted word to a heard word, then each turn to its first and last heard time.
span = {}
for block in difflib.SequenceMatcher(a=script_words, b=heard, autojunk=False).get_matching_blocks():
    for k in range(block.size):
        i = owner[block.a + k]
        w = words[block.b + k]
        s, e = span.get(i, (w.start, w.end))
        span[i] = (min(s, w.start), max(e, w.end))
missing = [i for i in range(len(turns)) if i not in span]
if missing:
    sys.exit(f'turns not found in the audio: {missing}')

# Cut points: the middle of the silence between turn i's last word and turn i+1's first word.
cuts = [0.0] + [(span[i][1] + span[i + 1][0]) / 2 for i in range(len(turns) - 1)] + [len(audio) / rate]


def trim(x, thresh=0.01, pad=0.04):
    loud = np.where(np.abs(x) > thresh)[0]
    if not len(loud):
        return x[:0]
    a, b = max(0, loud[0] - int(pad * rate)), min(len(x), loud[-1] + int(pad * rate))
    return x[a:b]


pieces, timeline, t = [np.zeros(int(lead * rate), dtype=np.float32)], [], lead
for i, turn in enumerate(turns):
    seg = trim(audio[int(cuts[i] * rate):int(cuts[i + 1] * rate)])
    timeline.append({'speaker': turn['speaker'], 'text': turn['text'], 'start': round(t, 2), 'end': round(t + len(seg) / rate, 2)})
    pieces.append(seg)
    t += len(seg) / rate
    if i < len(turns) - 1:
        gap = change_gap if turns[i + 1]['speaker'] != turn['speaker'] else same_gap
        pieces.append(np.zeros(int(gap * rate), dtype=np.float32))
        t += gap
pieces.append(np.zeros(int(tail * rate), dtype=np.float32))
soundfile.write(out, np.concatenate(pieces), rate, subtype='PCM_16')
json.dump({'file': out.rsplit('/', 1)[-1], 'seconds': round(t + tail, 2), 'change_gap': change_gap, 'same_gap': same_gap, 'turns': timeline},
          open(out.rsplit('.', 1)[0] + '.timeline.json', 'w'), indent=2)
print(f'{len(turns)} turns, {t + tail:.1f} s')
