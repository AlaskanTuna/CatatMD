# CatatMD Product Film: Director's Brief

Owner: Director (session `ai-clinical-assistant-34`). Producer: Recorder/Designer (session `CatatMD Recorder/Designer`).
The Director owns the script, the shot list's intent, every approval gate and the repo integration.
The Recorder/Designer owns the workspace, the recording harness, the takes, the voice, the edit, the motion design and the renders.

## 1. The Deliverable

A polished product film for the CatatMD portfolio repository: an adult GP uses https://catatmd.vercel.app end to end on one synthetic consultation.

| Item      | Spec                                                                                              |
| --------- | ------------------------------------------------------------------------------------------------- |
| Length    | 2:00 to 2:40                                                                                      |
| Picture   | 1920×1080, 30 fps, H.264 High, yuv420p, `+faststart`                                              |
| Sound     | AAC 128 to 160 kbps, 48 kHz stereo, integrated −14 LUFS, true peak ≤ −1.5 dBTP                    |
| Size      | ≤ 20 MB final (aim 10 to 15 MB). Tune CRF or two-pass; text in the UI must stay sharp at 1080p    |
| Captions  | Burned in (GitHub's player has no track support; many viewers watch muted), plus a sidecar `.srt` |
| Poster    | One 1920×1080 JPEG ≤ 300 KB, a strong frame (the three-panel review screen or the title card)     |
| Hero loop | Optional: 6 to 10 s muted preview, animated WebP or MP4 ≤ 4 MB, for the README                    |

Hand the Director these files in `video/out/`: `catatmd-walkthrough.mp4`, `catatmd-walkthrough.srt`, `catatmd-walkthrough-poster.jpg`, optional `catatmd-hero.*`. The Director commits them to the app repo under `docs/assets/video/`. **Do not commit, branch or push in the app repo.**

## 2. Reference Pipeline

Model the production on the Kotak product film's pipeline. Read it before building:

- `record/`: Playwright 1.64 `page.screencast.start()` takes at 1920×1080, DSF 1, headless Chromium. `take.ts` logs cue ids with settled bounding boxes and times from the encoder origin into a per-run `manifest.json`. A check mode (`KOTAK_RECORD_CHECK=1`) writes one still per cue without video.
- `shots.json`: the shot contract (cues per shot, target seconds, setup off camera vs on camera).
- `src/`: Remotion 4.0.530. `edit.ts` is the cut as data: per-part clips time-remapped so each cue lands on its spoken word, camera framings that ease in (≤ 120% zoom on 1080p takes), rings and arrows drawn around cue boxes, callouts, act banners, a HUD.
- `scripts/finish.sh`: render, three-pass loudness to −14 LUFS, captions, then `qa.ts`.

Reuse its ideas and its quality bar, not its brand. Kotak's yellow rings and Atkinson font do not belong here.

## 3. Workspace

Build in `video/` (a standalone Bun project with its own lockfile). Keep keys out of the workspace's files and logs; read them from the app's `.env` by name at runtime.

## 4. Recording Target

1. **Preferred:** the deployed app, `https://catatmd.vercel.app`, signed in with `Sign In as Guest`. It is the build the portfolio links to, and its API on Render has the speech providers configured. Warm the Render API first (`/api/health`; the free tier sleeps).
2. **Fallback:** a local production build (frontend `vite build` and `vite preview`, backend `tsc` build), never a dev server. Only if the deployed app blocks a shot.

Report the choice with the reason at Checkpoint 1.

### Rules For The Shared Guest Account

- One new synthetic patient with a unique, clearly invented name. Never open, edit or delete another visitor's records.
- Never select `Delete My Data` (it wipes the shared guest account for everyone) or any erase action.
- Approving is allowed, and is the film's climax, but only on the film's own consultation.
- Each analysis is a billable model call. Up to 8 analysis runs are pre-approved; ask before more.
- Keep the patient list out of frame if other visitors' records clutter it, or search for our patient first.

## 5. Synthetic Audio Into The App

Ambient capture is the flagship flow. Feed it real audio through Chromium's fake microphone:

```
--use-fake-ui-for-media-stream --use-fake-device-for-media-stream
--use-file-for-fake-audio-capture=/abs/path/consult.wav%noloop
```

- Write a synthetic doctor-and-patient dialogue (two distinct TTS voices, adult, Malaysian English is welcome, natural turn gaps). Base it on `backend/src/fixtures/demo-consultation.txt`, and shape it so the app shows: at least one deterministic red flag with a `Rule` badge (read `backend/src/redflags/triggers.ts` for a trigger that fits an upper respiratory visit), at least one `Missing Information` gap, a populated completeness checklist with transcript evidence, guideline-cited suggestions, and a plausible prescription. Keep it 60 to 90 s of audio.
- Do the same for the prescription dictation shot (a separate take, so a separate launch with its own WAV).
- If the ambient engine is unavailable on the deployment, fall back to `Press To Record` with the same WAV, then to `Paste`. Tell the Director which one the film uses.
- In the edit, the consultation audio can play under the voice-over, ducked, during the capture scene.

## 6. Voice

ElevenLabs is off the table (no balance). Run a short bake-off on the same two script lines and pick the most natural:

1. Gemini TTS through `GEMINI_API_KEY` (a Pro or Flash TTS model; use a style prompt: calm, warm, unhurried product narrator). The narration is fixed, non-patient script text, so the free tier's data terms do not touch the Gemini invariant, which governs app data.
2. Qwen3 TTS through Alibaba Model Studio's international endpoint with `QWEN_API_KEY`.
3. Kokoro-82M locally (`af_heart` or `bf_emma`), the offline fallback the repo's old pipeline already supports.

Put the samples in `video/voice-bakeoff/` with a one-line note per sample on why it wins or loses. Default to the winner without waiting; the user can overrule later.

**Pronunciation:** CatatMD is "CHAH-taht em-dee" (Malay _catat_, "to note down"). CatatAI is "CHAH-taht A-I". Respell it in the TTS input if the model gets it wrong. Synthesize line by line, so each line's length is exact and captions follow the lines.

## 7. Narration Script (v1)

The Director owns these words. If the build shows something different, report it; never change the product to fit the words. Lines marked `[g]` lie over a motion graphic, not app footage.

| Scene | Picture                                                                                                                                                                         | Line                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S0    | `[g]` Title: wordmark, tagline                                                                                                                                                  | This is CatatMD. It turns a GP consultation into a clinical note the doctor can review.                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| S1    | Landing, `Try the Demo`, `Sign In as Guest`                                                                                                                                     | Everything you'll see here is synthetic: no real patient appears.                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| S2    | `Register Patient`, the profile, `Start Consultation`                                                                                                                           | The doctor registers a patient and starts a consultation from the profile.                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| S3    | `Press To Record`, the ILMU disclosure and consent tick, `Start Recording`, the timer, `Stop and Transcribe`, the transcript                                                    | (v2, Soniox has no balance) With the patient's consent, given for this visit only, the doctor records the consultation. When the doctor stops, a speech service in Malaysia transcribes it, turn by turn. (v2-A, if ILMU merges turns: drop ", turn by turn", and no frame may show a merged or mislabelled bubble.) (v1, Ambient, if Soniox is topped up: With the patient's consent, given for this visit only, CatatMD listens. The transcript builds live, turn by turn, and the safety panel suggests what to ask next.) |
| S4    | `Analyse Consultation`, the pipeline stages; then `[g]` the de-identification graphic                                                                                           | One click analyses the visit. Before any text leaves the server, names and identity numbers become tokens. The model only ever sees the tokens, and the real details come back on the return trip.                                                                                                                                                                                                                                                                                                                            |
| S5    | The three panels; note sections with `AI Generated`; a red flag with `Rule`; `Missing Information`; the completeness checklist evidence; a suggestion's guideline chip expanded | The doctor reviews three panels side by side: the transcript, the structured note, and clinical safety. Red flags come from deterministic rules first. The model can add candidates for review, but it can never remove a rule's hit. The checklist ties each field to the words that support it, and suggestions cite guideline IDs from a fixed corpus, so a made-up reference cannot reach the screen.                                                                                                                     |
| S6    | `Prescriptions`, `Add`, the typed text, the parsed lines, `Confirm Prescription`                                                                                                | (v2) The doctor writes the prescription in plain words. CatatMD parses each line into dose, frequency and duration, and saves only the lines the doctor confirms. (v1, Dictate, if Soniox is topped up: The doctor dictates the prescription. ...)                                                                                                                                                                                                                                                                            |
| S7    | CUT (CatatAI defects #478, #479)                                                                                                                                                | (none)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| S8    | `Acknowledge` both red flags, `Approve Note`, inline `Confirm Approval` and its tip, the `Approved` status, `Export`, the report                                                | (v2) Nothing is ever approved by default. The doctor acknowledges the red flags, approves the note, and the finished record exports as a consultation report.                                                                                                                                                                                                                                                                                                                                                                 |
| S9    | `[g]` End card: wordmark, the line, the repo URL, the stack                                                                                                                     | CatatMD drafts. The doctor decides.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

S7 is the first scene to cut if the film runs long.

### Script v3 Changes (Checkpoint 3)

- S5 ends as two sentences: "The checklist ties each field to the words that support it." / "Suggestions cite guideline IDs from a fixed corpus, so a made-up reference cannot reach the screen."
- S8: "Nothing is ever approved by default. The doctor acknowledges the red flags and approves the note." / "The finished record exports as a consultation report."
- De-identification graphic headline: "De-identified before the model" (not "never reach": #475).

### Claim Guardrails

Never on screen, in the voice or in the captions: "diagnose" (except as "does not diagnose"), "replaces the doctor", "AI decides", "accurate" or any accuracy number, "saves N minutes", "HIPAA", "PDPA compliant", "certified", "FDA", "medical device", "real patient", "guaranteed", "automatically approves". The de-identification graphic says **text** is tokenised; it must not imply audio is (ambient audio goes to the speech provider directly, as the consent disclosure says).

## 8. Look And Motion

Read `docs/DESIGN.md` (Color, Typography, Motion) and `docs/brand/`. The film's frame and graphics must feel like the product:

- **Palette:** ground `#EEEDE9`, surface `#FFFFFF`, ink `#1D221F`, ink-muted `#555D58`, line `#DDDCD9`, accent `#136A51`; dark ground `#0A0D0B` and accent `#54BB97` for title and end cards if you want contrast. Severity colours only where the app uses them.
- **Type:** Outfit for headings, Work Sans for captions and labels (both are in the frontend's self-hosted fonts). The wordmark is the Mafins SVG (`docs/brand/wordmark.svg`), never live text.
- **Motion:** calm. Eased moves of 150 to 250 ms for UI-scale elements, slower (about 1 s) for camera moves. No bounce, no elastic, no spinning. Highlights are accent-coloured rounded outlines or a soft spotlight dim, not Kotak's yellow rings.
- **Always-on tag:** a small "Synthetic demo data" chip in a corner during all app footage.
- **Captions:** Work Sans, bottom centre, two lines at most, on a soft ink plate; they never cover a highlighted element.
- **Act structure:** a light HUD or chapter label is welcome (Capture → Review → Prescribe → Approve), not required.
- **Music:** optional. Only a track whose licence allows redistribution in a public repo with no attribution doubt (CC0 or equivalent); record its source and licence in `out/CREDITS.md`. No music is better than a doubtful licence. Duck it well under the voice.
- **Light theme** for app footage, to match the screenshots in the README.

## 9. Checkpoints

Message the Director at each one, with file paths. The Director reviews stills and frames (it can read images, not play audio or video) and replies with approval or notes.

1. **Plan:** the recording target and why, the ASR path the film uses, the voice bake-off winner and why, and a `shots.json` with cues per shot. No billable takes yet.
2. **Check Run:** one still per cue from a check run (`stills/<shot>-<cue>.png`) and the synthetic dialogue script. The Director approves the framing and the content.
3. **Rough Cut:** a full-length render (a 720p proxy is fine), its `.srt`, and a contact sheet of one frame every 5 s. The Director checks timing, claims and legibility.
4. **Final:** the files in section 1 with `ffprobe` output, the loudness measurement and the file sizes.

Stop and ask the Director rather than guess when: a shot needs a product change, a cue cannot be filmed on the build, an analysis result contradicts the script, or any step would touch a record that is not the film's own.
