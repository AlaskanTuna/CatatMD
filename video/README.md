# Walkthrough Film

The source of the product film in [`docs/assets/video/`](../docs/assets/video/): Playwright records takes of the running app, Kokoro voices the narration, and Remotion cuts the takes into the film. Every frame shows synthetic data.

It is a package of its own, outside the root workspaces. Run every command from `video/`.

```bash
cd video && bun install
```

## What Is Here

| Path         | Contents                                                                                          |
| ------------ | ------------------------------------------------------------------------------------------------- |
| `shots.json` | The shot list: each shot's cue ids, the film patient, the narration (one sentence per line)       |
| `record/`    | The recorder: one Playwright take per shot, with cues, boxes and clicks logged against the video  |
| `scripts/`   | Every other stage: audio, narration, ingest, staging, sound, checks, captions, finish, QA         |
| `src/`       | The Remotion film; `src/edit.ts` is the cut as data, `src/data/` the generated inputs it reads    |
| `sound/`     | The UI sound effects' generator (ElevenLabs) and two synthesised tones                            |
| `stand-in/`  | A local speech stand-in for the app's live capture, and the app patch that points at it           |
| `audio-in/`  | The dialogue and dictation scripts, and the timelines of the WAVs played into the fake microphone |
| `public/`    | Fonts (OFL), brand marks, the five sound effects and their manifest                               |
| `docs/`      | The brief (`BRIEF.md`) and the revision that produced v2 and v3 (`REVISION-2.md`)                 |

## Stages In Run Order

| #   | Stage          | Command                                      | Produces                                                                    |
| --- | -------------- | -------------------------------------------- | --------------------------------------------------------------------------- |
| 1   | Fake-mic audio | See [Dialogue Audio](#dialogue-audio)        | `audio-in/consult.wav`, `audio-in/dictation.wav`                            |
| 2   | Local stack    | `STACK_DIR=<checkout> bun run stack:up`      | The app on `:4173`, its API on `:3001`, the stand-in on `:8787`             |
| 3   | Record         | `bun run record S1 S2 S3 S4 S5 S7 S6 S8 S8R` | `footage/runs/<run>/raw/*.webm` and `manifest.json` (cues, boxes, clicks)   |
| 4   | Voice          | `bun run voice`                              | `voice/lines/*.wav`, `voice/lines.json`                                     |
| 5   | Ingest         | `bun run ingest`                             | `public/footage/*.mp4`, `src/data/footage.json`                             |
| 6   | Stage          | `bun run stage`                              | `public/{voice,audio,music}/`, `src/data/lines.json`, the dialogue timeline |
| 7   | Sound          | `bun run sound`                              | `src/data/sound.json`: music and effect gains against the voice             |
| 8   | Edit           | `bun run studio`, editing `src/edit.ts`      | The cut                                                                     |
| 9   | Check          | `bun run check-marks`                        | A pass or fail line per take timing and per ring                            |
| 10  | Render         | `bun run render out/master.mp4`              | The 1080p master; it runs the check first and stops on any failure          |
| 11  | Finish         | `bun run finish out/master.mp4`              | `out/<NAME>.mp4`, `.srt` and `-poster.jpg`, then the QA report              |

- **A Check Run** (`bun run record:check S3`) records too, and also writes a still per cue.
- **One-Shot Takes:** S2 registers the film patient and S8 approves the draft. Each runs once per film; `NEW` makes the draft off camera when S2 is reused, and `STATE` prints what the draft holds.
- **Ingest Picks The Takes** in `scripts/ingest.ts` (`KEPT`). `bun run ingest S8` re-encodes one shot.
- **Sound Effects** are committed. `bun run sfx` regenerates them and rewrites `public/sound-manifest.json`.

## Inputs Not Committed

| Input         | Where The Suite Reads It                                                      | How To Supply It                                                                              |
| ------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Footage       | `FOOTAGE_DIR` (default `footage/`)                                            | Record it (stage 3), or point `FOOTAGE_DIR` at an existing `runs/` tree                       |
| Dialogue WAVs | `AUDIO_IN_DIR` (default `audio-in/`)                                          | Regenerate them ([Dialogue Audio](#dialogue-audio)), or point `AUDIO_IN_DIR` at existing ones |
| Music         | `MUSIC_DIR` (default `music/`)                                                | The file `public/sound-manifest.json` names (`pulse-memory.mp3`, from the owner's lofi suite) |
| Speaker clips | `SHIM_SPEAKER_REFS`, default `stand-in/refs/speaker-{1-doctor,2-patient}.wav` | About 5 s of each voice alone, cut from `consult.wav` (mono WAV)                              |
| Kokoro        | `KOKORO_DIR` (default `.state/kokoro/`)                                       | `kokoro-v1.0.onnx` and `voices-v1.0.bin`, and a `.venv` with `kokoro-onnx` and `soundfile`    |
| The app       | `APP_URL` (default `http://localhost:4173`)                                   | The local stack (stage 2), or any running CatatMD                                             |

### Dialogue Audio

The two WAVs play into Chromium's fake microphone during S3 and S6. Their scripts and timelines are in `audio-in/`.

- **Dictation:** `bun run audio-in dictation` (Kokoro, no key).
- **Consultation:** `bun run dialogue gemini-2.5-flash-preview-tts .state/consult-gemini.wav Achird Sulafat` renders the script in one Gemini multi-speaker call (`GEMINI_API_KEY`), with the model and voices the film used.
  - Then `scripts/regap.py` sets the gaps between turns.
  - Then the splice that `audio-in/consult.timeline.json` records drops two phrases.
- **Free Fallback:** `bun run audio-in consult` renders the consultation with two Kokoro voices. It replaces the Gemini WAV.
- **Checks:** `scripts/hear.py` transcribes a WAV with faster-whisper; `scripts/gate.ts` runs the app's own de-identifier and red-flag engine over a transcript.

Run the Python scripts with `uv run --with faster-whisper --with numpy --with soundfile python -I scripts/<name>.py`.

## Local Stack

The film was recorded on the app at `14533dd`, whose live capture used Soniox. The stand-in speaks Soniox's protocol: Qwen realtime streams the live words, and OpenAI transcribes and diarises each phrase.

```bash
git worktree add ../film-stack 14533dd
cd ../film-stack && git apply ../<this repo>/video/stand-in/soniox-local.patch
cp ../<this repo>/.env . && bun install && bun run build
cd -  # back in video/
STACK_DIR=../../film-stack bun run stack:up
```

- **`stack:up` Refuses An Unpatched Checkout,** so the app never calls a real speech provider from a film run.
- **Keys:** `OPENAI_API_KEY` and `QWEN_API_KEY`, from the environment or else from `STACK_DIR/.env`.
- **Current Main Needs No Stand-In:** #489 replaced Soniox with a Qwen relay, and the patch applies only to `14533dd`.
- Stop it with `bun run stack:down`.

## Environment

| Variable                                      | Default                       | Used By                                         |
| --------------------------------------------- | ----------------------------- | ----------------------------------------------- |
| `APP_URL`                                     | `http://localhost:4173`       | The recorder                                    |
| `FOOTAGE_DIR`                                 | `footage/`                    | The recorder, ingest, `stream-lag.ts`           |
| `AUDIO_IN_DIR`, `MUSIC_DIR`                   | `audio-in/`, `music/`         | `stage`                                         |
| `OUT_DIR`, `NAME`, `POSTER_PNG`               | `out/`, `catatmd-walkthrough` | `finish`, captions                              |
| `STACK_DIR`, `SHIM_SPEAKER_REFS`, `SHIM_PORT` | none, `stand-in/refs/…`, 8787 | The local stack and the stand-in's test clients |
| `KOKORO_DIR`                                  | `.state/kokoro/`              | `voice`, `audio-in`                             |
| `APP_SRC`, `APP_ENV_FILE`                     | `../backend/src`, `../.env`   | `gate.ts`; the key reader                       |
| `CATATMD_RUN_ID`, `CATATMD_RECORD_CHECK`      | a timestamp, off              | The recorder                                    |

**Keys** are read by name only, from the environment or else from `APP_ENV_FILE`: `GEMINI_API_KEY` (dialogue), `ELEVENLABS_API_KEY` (effects), `OPENAI_API_KEY` and `QWEN_API_KEY` (stand-in). No `.env` lives in `video/`.

## Measured Gates

| Gate                      | Rule                                                                                                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Camera** (`edit.ts`)    | Each app segment opens and ends at 100%; a focus eases in over 0.8 to 1.0 s, at most 120%; the camera never moves while a ring fades                                                  |
| **Marks** (`check-marks`) | Every ring matches a frame where its target is on screen for its whole span (correlation 0.80 or more), and ends 0.25 s before the target changes                                     |
| **Take Timing**           | Each take's logged clicks sit within 1.5 s (median) of the picture changes they cause                                                                                                 |
| **Captions**              | At most 2 lines of 42 characters per cue, never under 1.2 s                                                                                                                           |
| **Dialogue** (`gate.ts`)  | The S3 transcript tokenises the name and the IC, fires the haemoptysis rule, and raises no emergency flag                                                                             |
| **Delivery** (`qa`)       | 1920×1080, 30 fps, H.264 High, yuv420p, faststart; AAC 48 kHz stereo 128 to 160 kbps; -14 LUFS ±0.5; true peak -1.5 dBTP or lower; 2:45 to 3:30; 25 MB or less; poster 300 KB or less |

The shipped v3 cut measures 3:28.5, 22.5 MB, -14 LUFS and -2.5 dBTP, with all 36 timing and mark checks passing.
