// Kokoro (local, kokoro-onnx), for the narration and the fake-microphone WAVs. Writes a 24 kHz mono WAV.
// Input is fixed, non-patient script text only. KOKORO_DIR holds kokoro-v1.0.onnx, voices-v1.0.bin and a .venv.
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const KOKORO = resolve(process.env.KOKORO_DIR ?? resolve(import.meta.dirname, '../.state/kokoro'))

/** Malay "catat" (/tʃa.tat/), stressed for an English reader: CHAH-taht. Spliced over the phonemizer's guess. */
const CATAT_IPA = 'tʃˈɑtɑt'

/** Malay words said the Malay way, so an ASR with Malay hints writes them back as spelled (Contoh = "CHON-toh"). */
const MALAY_IPA: Record<string, string> = { 'Siti Contoh': 'sˈiti tʃˈɔntɔh' }

export function kokoro(
  text: string,
  out: string,
  voice: string,
  lang = 'en-us',
  speed = 1.0,
): void {
  // "Chatat" phonemizes as tʃˈæɾæt; swap in the Malay vowels and a real t so the name is exact. Each MALAY_IPA
  // phrase is cut out of the text, the pieces are phonemized apart, and its IPA is joined back in between.
  const py = `
import json, re, sys, soundfile
from kokoro_onnx import Kokoro
k = Kokoro('${KOKORO}/kokoro-v1.0.onnx', '${KOKORO}/voices-v1.0.bin')
text = sys.stdin.read().strip().replace('CatatMD', 'Chatat MD').replace('CatatAI', 'Chatat AI')
fixed = json.loads(${JSON.stringify(JSON.stringify(MALAY_IPA))})
pattern = '(' + '|'.join(re.escape(w) for w in fixed) + ')'
ph = ''.join(fixed[p] if p in fixed else (k.tokenizer.phonemize(p, '${lang}') if p.strip() else p)
             for p in re.split(pattern, text) if p)
ph = re.sub(r'tʃˈæ[ɾt]æt', '${CATAT_IPA}', ph)
audio, rate = k.create(ph, voice='${voice}', speed=${speed}, lang='${lang}', is_phonemes=True)
soundfile.write(sys.argv[1], audio, rate, subtype='PCM_16')
print(ph, file=sys.stderr)
`
  const run = spawnSync(`${KOKORO}/.venv/bin/python`, ['-I', '-c', py, out], {
    input: text,
    encoding: 'utf8',
  })
  if (run.status !== 0) throw new Error(`Kokoro ${voice}: ${run.stderr.slice(-400)}`)
}

export function seconds(file: string): number {
  const run = spawnSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file],
    {
      encoding: 'utf8',
    },
  )
  return Number(run.stdout.trim())
}
