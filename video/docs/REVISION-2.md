# Revision 2: The User's Feedback On v1 (9 Nov 2026)

v1 (e3f7a8d, 2:25) shipped. The user reviewed it and asked for the changes below. This file is the brief for v2. It overrides BRIEF.md wherever they disagree.

## 1. The User's Notes, Verbatim Intent

| #   | Note                                                                                    | Owner                                   |
| --- | --------------------------------------------------------------------------------------- | --------------------------------------- |
| U1  | Subtitles smaller and more minimalist                                                   | Peer (spec §4)                          |
| U2  | Capture phase: the patient and GP conversation longer and clearer                       | Director script §3, Peer takes and edit |
| U3  | Camera: always start at the full app window (100%), zoom or move on cue, return to 100% | Peer (spec §5)                          |
| U4  | Capture with **Ambient** (CatatMD's highlight), not Press To Record                     | Peer, blocked on Soniox balance         |
| U5  | 01:24: a ring outlived the modal it sat on                                              | Peer (spec §5)                          |
| U6  | Prescribe: the GP **dictates** into the field, no typing                                | Peer, blocked on Soniox balance         |
| U7  | Demonstrate CatatAI: a question answered, and an edit proposed and applied              | Peer (spec §6)                          |
| S1  | Sound effects (ElevenLabs sound generation)                                             | Director                                |
| S2  | Background music from the user's lofi suite, trimmed per its track list                 | Director                                |

## 2. Shape

- **Length:** 2:45 to 3:15. **Size:** at most 25 MB. Everything else in BRIEF §1 stands.
- **Order:** S0 title, S1 sign-in, S2 register, S3 ambient capture (long), S4 analyse and de-id graphic, S5 review, S6 dictated prescription, S7 CatatAI, S8 acknowledge, approve, export, S9 end card.
- **Consultation:** a new draft under Siti Contoh (the film's only patient). Draft 1 is approved and stays untouched. S2 reuses the approved v1 take.

## 3. Script v4 (The Director's Words)

Unchanged lines keep their v3 text (`shots.json` `script_v2`). Changes:

- **S3 (Ambient):** "With the patient's consent, given for this visit only, CatatMD listens. The transcript builds live, turn by turn, and the safety panel suggests what to ask next."
- **S6 (Dictation):** "The doctor dictates the prescription. CatatMD parses each line into dose, frequency and duration, and saves only the lines the doctor confirms."
- **S7 (CatatAI):** "CatatAI answers questions about the visit, and can propose an edit. Nothing changes until the doctor applies it."

### Consultation Dialogue v2 (Synthetic)

About 100 s with natural turn gaps (0.6 to 0.9 s at speaker changes). Two warm, clearly different voices, adult Malaysian English. Read the IC as continuous digits with no pauses (the de-id gate must pass; see #475). Allergies and current medicines stay unasked.

1. **Doctor:** Good morning. Please, have a seat. Before we start, can I confirm your full name and IC number?
2. **Patient:** Siti Contoh. My IC is nine zero zero four one two zero eight six five four three.
3. **Doctor:** Thank you, Puan Siti. What brings you in today?
4. **Patient:** I've had a cough for three days now, and since yesterday my throat is really sore.
5. **Doctor:** I'm sorry to hear that. Have you had any fever?
6. **Patient:** Yes. Last night it was thirty-eight point two. This morning it feels a bit lower.
7. **Doctor:** Are you coughing anything up?
8. **Patient:** Some white phlegm. But this morning I noticed a few streaks of blood in my phlegm, and that worried me.
9. **Doctor:** Thank you for telling me. Was it only streaks, or more than that?
10. **Patient:** Only a few streaks, just once.
11. **Doctor:** Any pain in your chest when you breathe or cough?
12. **Patient:** No, no pain there.
13. **Doctor:** Can you swallow? Are you eating and drinking normally?
14. **Patient:** I can swallow. It just hurts when my throat is dry.
15. **Doctor:** Do you smoke?
16. **Patient:** No, never.
17. **Doctor:** Any other medical problems?
18. **Patient:** No, I'm usually healthy.
19. **Doctor:** Alright, let me have a look. Your throat is a bit red, and your chest sounds clear.
20. **Doctor:** I'll give you something for the fever and the sore throat. If you see blood in your phlegm again, or you feel worse, please come back straight away.
21. **Patient:** Okay. Thank you, doctor.

Never "short of breath" or "chest pain" in the doctor's own words: machine-drafted labels fire rules on them (#477).

### Dictation v2 (Synthetic)

Keep `audio-in/dictation.script.json` (paracetamol, benzydamine gargle 15 mL). The parser was already checked against it.

## 4. Captions (U1)

Minimal and smaller. Burned-in captions:

- Work Sans 500, **30 px**, white, line height 1.3, letter spacing 0.
- Plate: `rgba(10, 13, 11, 0.55)`, padding 8 px 16 px, radius 10 px, no border, no shadow.
- At most 2 lines, about 60 characters per line, centred, 44 px above the bottom edge.
- Dialogue captions: the same style, with a muted speaker label in 24 px small caps ("Doctor", "Patient") and no italics.
- No caption on the title or end card when the same words are on the card.
- The sidecar `.srt` keeps the v1 chunking rules (42 characters, 2 lines, at least 1.2 s).

## 5. Camera And Marks (U3, U5)

- **Rest State Is 100%.** Every app segment opens on the full 1920×1080 window (z = 1, x = 960, y = 540).
- **On Cue:** ease to a focus (z from 1.0 to 1.2) over 0.8 to 1.0 s, starting 0.3 s before the cue. Hold while the narration names it.
- **Return:** ease back to 100% over 0.8 to 1.0 s once the line moves on. Never chain two zoomed framings without passing through 100%, unless the two targets sit within one screen width of each other at the same zoom.
- **No Drift:** the camera never moves while a ring is drawing in or out.
- **Marks End Before The Element Changes.** A ring or spot ends at least 0.25 s before its element moves, closes or re-renders (modal close, page change, scroll). Build this into the edit as a check that fails the render, using the take's cues.
- **The Transcript-Safe Clamp Goes Away** if the ambient transcript arrives with clean, correctly labelled turns. If a merged or mislabelled bubble remains, keep it out of frame by framing, never by a forced zoom.

## 6. CatatAI (U7)

Two calls on the camera take, in this order:

1. **Question:** "Which red flags need my attention, and what should I ask next?" Expect the haemoptysis flag and the unasked allergies.
2. **Proposal:** "Add the safety-net advice to the Plan." Expect a proposal card, then **Apply**. The Plan section turns to `You Edited This`.

- **Budget:** 8 CatatAI calls in total for v2, including probes.
- **First, a 2-call probe off camera.** If the proposal still stalls or truncates (#479), stop and tell the Director, who will look at the code.
- CatatAI cannot see confirmed prescriptions (#478), so CatatAI runs **before** S6 in the take and the questions avoid medicines.

## 7. Sound (Director)

- **Music:** one track from `lofi-bgm.mp3` (the track list gives the cut points). Bed at about -30 LUFS under the voice, ducked 6 dB while anyone speaks, up to -24 on the title and end cards, faded at both ends. No music under the heard consultation dialogue.
- **Sound effects:** a small, quiet set: a soft UI click on every on-camera click, a capture-start tone, a soft chime on "Analysis complete", a warm confirm chime on approval (the product's one moment of delight), and a paper slide on export. All sit about 18 dB under the voice. Files land in `public/sfx/` with a manifest. The peer places them on cues.

## 8. Budgets

| Resource                    | v2 Allowance                                                                             |
| --------------------------- | ---------------------------------------------------------------------------------------- |
| Analysis runs               | 3 (1 of 8 used in v1)                                                                    |
| CatatAI calls               | 8                                                                                        |
| Soniox ambient sessions     | 3, once topped up                                                                        |
| Soniox dictation sessions   | 3, once topped up                                                                        |
| ElevenLabs batch refinement | 0: press `Use Live Transcript` after Stop, so the account's credit goes to sound effects |
| Gemini TTS (dialogue)       | 3 calls                                                                                  |

## 9. Checkpoints

1. **Probe:** a 2-call CatatAI probe, plus a Soniox handshake once the user tops up. The Director already confirmed the 402 at 21:0x on 9 Nov.
2. **Check run:** stills per cue, plus the dialogue v2 gate (de-id, haemoptysis rule, no emergency flag, bubble count and labels).
3. **Rough cut:** contact sheet every 5 s, and the camera check report (rest state, return, marks ending before changes).
4. **Final:** finish.sh QA. The Director commits.
