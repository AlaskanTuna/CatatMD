# 20. ASR Contract: On-Device Default, Hosted By Exception

Part of the [Technical Reference](../TRD.md).

## In This Section

- [The Governing Rule](#the-governing-rule)
- [Capture Mode Ownership And Manual Pause](#capture-mode-ownership-and-manual-pause)
- [The `ASRClient` Port](#the-asrclient-port)
- [Where Transcription Runs](#where-transcription-runs)
- [What Crosses The Network](#what-crosses-the-network)
- [Bounding The Wait: The Worker Speaks, Silence Is Terminated](#bounding-the-wait-the-worker-speaks-silence-is-terminated)
- [Deciding Whether To Offer Audio : The Two-Stage Capability Probe](#deciding-whether-to-offer-audio-the-two-stage-capability-probe)
- [The Memory Failure Mode](#the-memory-failure-mode)
- [Consent UX : A Live Tension, Not A Solved Problem](#consent-ux-a-live-tension-not-a-solved-problem)
- [Batch, Not Streaming, For V1](#batch-not-streaming-for-v1)
- [Interaction With Existing Contracts](#interaction-with-existing-contracts)
- [Model, Delivery, And Runtime : Resolved 13/08/26 (§19 Row 13, Closed)](#model-delivery-and-runtime-resolved-130826-19-row-13-closed)
- [Threat: ASR Is A Second Fabrication Surface](#threat-asr-is-a-second-fabrication-surface)
- [20.1 Measured Finding : Model Selection For Malaysian Code-Switched Speech](#201-measured-finding-model-selection-for-malaysian-code-switched-speech)
- [20.2 Draft Speaker Labels: Measured, Gated, Not Diarisation](#202-draft-speaker-labels-measured-gated-not-diarisation)
- [20.3 Measured Finding: Hosted `ilmu-asr-v4.2` Against The Shipped Local Path](#203-measured-finding-hosted-ilmu-asr-v42-against-the-shipped-local-path)
- [20.4 The Consent Gate (Resolves §19 Row 18)](#204-the-consent-gate-resolves-19-row-18)
- [20.5 Hosted Draft Turns: Server-Side Split And Label](#205-hosted-draft-turns-server-side-split-and-label)
- [20.6 Capture Constraints: Dictation DSP Off (Addendum To §20.3)](#206-capture-constraints-dictation-dsp-off-addendum-to-203)
- [20.7 Live Ambient Capture: Mechanism, Models, And The Accuracy Chain](#207-live-ambient-capture-mechanism-models-and-the-accuracy-chain)
- [20.8 How This Design Compares To Industry Practice](#208-how-this-design-compares-to-industry-practice)
- [20.9 Ambient Capture On ILMU, And The Mechanism Behind 20.8's Post-Correction Row](#209-ambient-capture-on-ilmu-and-the-mechanism-behind-208s-post-correction-row)
- [20.10 Ambient Capture On Soniox, Browser-Direct, Under An API-Minted Key](#2010-ambient-capture-on-soniox-browser-direct-under-an-api-minted-key)
- [20.11 The Live Panes, And Why The Note Is Not One Of Them](#2011-the-live-panes-and-why-the-note-is-not-one-of-them)
- [20.12 Two-Way Translation On Ambient Capture](#2012-two-way-translation-on-ambient-capture)
- [20.13 Evaluated 15/10/26: ElevenLabs Scribe v2 Realtime As A Soniox Replacement](#2013-evaluated-151026-elevenlabs-scribe-v2-realtime-as-a-soniox-replacement)
- [20.14 Refinement After Stop: Batch `scribe_v2`, Browser-Direct, Under An API-Minted Token](#2014-refinement-after-stop-batch-scribe_v2-browser-direct-under-an-api-minted-token)

**Status: `Built` and live. The local path (issue #2), the hosted relay (#154) and the consent gate that lets a doctor enter the hosted path (#155, §20.4) are all `Built`. `ILMU_API_KEY` is set in the Render production service, verified 16/08/26, so the path is reachable today: an authenticated doctor who has chosen the hosted engine for the device and ticked the per-consultation box for this patient sends that recording to ILMU. The route still fails closed with `503 asr_unavailable` on any deployment where the key is absent.**

Audio input creates a second egress point that sits **before** the de-identification gate (§9): raw audio cannot be de-identified, only transcribed first. Un-redacted patient audio, and voice itself, a biometric identifier, would leave the trust boundary before the gate ever saw it, contradicting the central invariant in `AGENTS.md` that no text containing patient identifiers may leave the API.

The resolution is not "audio never leaves the device" as an absolute, because §20.1 measured the hardware cost of holding that line on a modest clinic PC and it is real. It is a **default plus a gate**: on-device transcription is what the product does, and the hosted path exists, is documented, and can only be entered deliberately.

## The Governing Rule

> **On-device is the default and the floor. Hosted is only ever entered by an explicit, recorded, per-consultation act. Failure degrades to paste, never to the cloud.**

**Two surfaces are stated exceptions to the first sentence, and only the first sentence.** Prescription dictation defaults to streaming from 10/09/26 (§20.10, `docs/decisions/` D-001), and from 21/09/26 a new consultation opens in ambient capture (D-007, #378).

Failure degrades away from the cloud on both, but their floors differ and the difference is the part worth reading.

| Surface                | Its Floor When The Streaming Path Cannot Run                                                                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prescription dictation | On-device recognition, or typing                                                                                                                                                            |
| Ambient capture        | **No On-Device Path Of Its Own.** It falls back to press-to-record, which has one. With `SONIOX_API_KEY` unset the Record tab shows that recorder instead of the ambient panel, and says so |

Ambient still sends nothing without its per-consultation tick. This rule governs the press-to-record relay below unchanged.

This is the direct analogue of `DEID_FAIL_CLOSED` (§7), and it is stated here in the same terms because a reviewer will, correctly, ask what happens when the on-device path cannot cope:

| Behaviour On A Device That Cannot Transcribe Locally     | Verdict                                                                                                                     |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Fall back to paste, tell the doctor why                  | **The Specified Behaviour.** The privacy control fails **closed**, the cheap path out is the private one                    |
| Silently switch to hosted ASR because the device is slow | **Rejected.** A privacy control that fails **open** under load, degrading precisely when the doctor is least able to notice |

The second option is the one a performance-minded implementation reaches for by default, which is why it is written down as rejected rather than left to judgement. Convenience may never be the trigger that moves patient audio off the device; only the doctor, per consultation, may be.

## Capture Mode Ownership And Manual Pause

Capture Mode belongs to the consultation, not the browser. The hero's **Consultation Settings** dialog owns the Ambient / Press To Record choice alongside the clinical-note layout; the device-scoped Audio dialog retains only microphone, noise handling, gain, and manual transcription-engine preferences. A legacy `mode` key in local storage is ignored.

**A New Consultation Opens In Ambient** (`docs/decisions/` D-007). Three things follow, and the second is the one that is easy to get wrong.

- **The Value Is Written, Not Merely Defaulted.** The column defaults to `ambient` and `POST /api/consultations` writes it too, because the migration is applied by hand while the API deploys on a merge (§17), so neither ordering may decide where a doctor lands.
- **Only Where Nothing Contradicts It.** A create carrying a transcript takes the mode that transcript's `source` implies: `asr_live` did stream and stays `ambient`, everything else is written `manual`. An unconditional `ambient` would stamp every pasted, uploaded and fixture-seeded consultation with a claim that audio reached the provider, and the mode locks the moment a transcript exists, so it could never be corrected.
- **The Mode Is Reconciled Again When The Transcript Lands.** `PATCH` writes `manual` alongside any transcript whose `source` is not `asr_live`, in the same statement that closes the lock. That is what makes the rule hold rather than merely be intended: the browser also moves the mode when ambient turns out to be unavailable, and that write can fail silently while the doctor carries on recording.
- **Existing Consultations Are Untouched.** The migration sets the default and updates no row, so anything created before 21/09/26 keeps `manual`.

Capture Mode is also one half of the ambient consent pair, so moving it pre-arms that half and leaves the per-consultation tick as the only control the doctor still exercises.

**Where ambient cannot run, the Record tab moves the consultation to press-to-record and says so.** `SONIOX_API_KEY` unset answers the config probe `503 asr_unavailable`, and since every new consultation now opens in ambient, without this the tab would greet each one with an alert rather than a working recorder.

- **The Stored Mode Moves Too**, through the same `onCaptureModeChange` the panel's own Use Press To Record button always called. Showing one path while the record claims the other is how a consultation ends up locked at `ambient` with nothing having streamed.
- **The Trigger Is The Error Code, Not The Status.** A Render cold start through the `/api` rewrite also answers `503`, and treating that as "no provider" would flip a doctor's deliberate choice on a transient outage. Any other failure keeps the ambient panel and its Check Again button, because there is something to retry.
- **The Substitution Is Stated On Screen** rather than made quietly, in a `role="status"` line, for the reason `.claude/rules/security.md` gives on the sibling surface.

The persisted choice is mutable only before a transcript exists. Once `Consultation.transcript` is non-null, both Capture Mode controls are disabled with a visible explanation and the API independently rejects any `captureMode` write with `409 invalid_state`. While a recorder, transcription worker, upload, or live stream owns unsent audio, the hero gear is temporarily disabled so a mode change cannot unmount that work.

Press To Record has one reversible pause transition:

```text
idle -> recording <-> paused -> loading/uploading -> transcribing/labelling -> idle
```

Pause and Resume retain the same `MediaRecorder`, microphone stream, accumulated chunks, and prewarmed worker. The elapsed clock freezes while paused, the UI states that audio is not being added, and **Stop And Transcribe** remains available. Ambient capture has no pause control; its continuous stream remains Start → Stop.

## The `ASRClient` Port

Transcription is specified as a **port with two adapters**, deliberately mirroring `LLMClient` (§6) rather than inventing a second pattern:

| Adapter      | Implementation                                                                                              | Status                                                                                                                         | Where Audio Goes                                                                                  |
| ------------ | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `asr_local`  | `whisper-small` via `@huggingface/transformers` v4, chunked in a **Web Worker**                             | **`Built`** (issue #2)                                                                                                         | Nowhere, browser memory only                                                                      |
| `asr_hosted` | `ilmu-asr-v4.2` via the authenticated relay `POST /api/asr/transcriptions` (#154)                           | **`Built`** server-side; the consent UI that invokes it is #155                                                                | ILMU, processed in Malaysia, transiting our API on Render Singapore in request-scoped memory only |
| `asr_live`   | `stt-rt-v5` on a socket the **browser** holds, opened with a key `POST /api/asr/live-sessions` mints (#268) | **`Building`** (§20.10). The audio never enters the API, so the server-side record is the minted session rather than the bytes |

The rationale for shaping it as a port rather than a branch is the same one that justifies `LLMClient`: it is what lets "what happens when data residency requirements change" be answered with an architecture instead of an assertion. A second adapter that is written down, gated, and audited is a stronger answer than a single path that quietly becomes a second path the first time someone hits a slow laptop.

`Transcript.source` (§3) records which adapter produced a given transcript, and §15's `consultation.asr_hosted_used` records the fact of the hosted path in the audit trail.

## Where Transcription Runs

- On the default path, audio capture and transcription happen entirely client-side, inside `frontend/`, using Whisper via **`@huggingface/transformers` v4 directly**, not `xenova/whisper-web`, which was last pushed 2024-10-01, carries WebGPU only on a branch, and has 49 open issues.
- The audio buffer (microphone input, or an uploaded audio file if that path is ever added) exists only in the browser's memory for the duration of transcription. It is never sent to `backend/`, never written to a request body, and never persisted anywhere server-side.
- **There Is No Self-Hosted Transcription Path, And None Is Planned.** Render's free-tier instance (§17) has 512 MB of memory and no GPU, and cannot host a Whisper model at all, but the tier is not the real argument. Self-hosted server-side ASR is **strictly dominated**: the audio crosses the network either way, so it pays the full privacy cost _and_ the compute cost, for worse accuracy than a hosted provider (`docs/PRD.md` §12). Where audio must leave the device, a hosted provider is the honest choice; running our own would only obscure that it left.
- The hosted adapter is therefore an egress path to a **third party**, not a fallback to our own backend, and it is governed by the rule above. With ILMU that third party processes and stores in Malaysia (a provider claim from docs.ilmu.ai, read 15/08/26; contractual verification is tracked in `docs/DPIA.md`), which makes the hosted path an in-country answer for the audio itself, with one honestly disclosed caveat: the recording transits our API on Render Singapore, in request-scoped memory only, because the browser cannot hold the provider key.

## What Crosses The Network

On the `asr_local` path:

- The **only** thing that reaches the API is the transcript text the browser-side model produces, structured into `TranscriptSchema` turns (§3), the same shape already used by the fixture, paste, and file-upload input paths.
- Because no audio byte, raw or compressed, is ever transmitted or persisted, this path keeps voice data outside the PHI boundary by construction rather than by policy: it never reaches the de-identification gate (§9) because nothing crosses the network for that gate to guard. This is the one point in the system where "never leaves the device" is literally true rather than a control being relied upon.

On the `asr_hosted` path, that sentence stops being true, and the documentation says so rather than softening it:

- The browser posts the whole recording to `POST /api/asr/transcriptions` (§13, issue #154), which relays it to ILMU. The audio is **not** de-identified, because it cannot be: that is the whole reason this path is gated by an explicit act rather than by a configuration flag.
- The relay route exists because the browser cannot hold the _account_ key (ambient capture, §20.10, hands the browser a short-lived one instead, which is a different thing). Audio passes through the API in request-scoped memory only: never persisted, never logged, never written to the database. The route's audit rows carry billed seconds, a model id, and a closed failure reason, not content (§15), and its rate limiter and 25 MB cap bound what one caller can move through it.
- What returns is text, which then enters the same pipeline as every other transcript: the de-identification gate (§9) still runs before any LLM call, unchanged. The hosted ASR path widens the audio boundary; it does not touch the text boundary.

In both cases the resulting `Transcript` is submitted through the existing `POST /api/consultations` contract (§13). The relay returns text to the browser and stores nothing, so the consultation is created the same way whichever adapter produced its transcript, and `Transcript.source` (§3) stays the only shared-schema change on the consultation side; the relay's own response contract is `HostedAsrResultSchema` (§13).

### The One Network Call The Local Path Does Make

The claim above is about **patient data**, and stated without this it reads as broader than it is. On the `asr_local` path one request does leave the browser, and a reviewer watching the network tab will see it: the model weights are fetched from the Hugging Face CDN on first use (see Delivery, below). Naming it here rather than only in a delivery table is deliberate, because the section a reviewer checks for egress claims should be the section that discloses the egress.

**The Direction Is What Makes It Safe, Not A Policy.** It is a download of public model weights, not an upload. No audio, no transcript, no identifier, and no consultation content is part of that request, because it happens before any of them exist.

| Party            | What It Observes                                                       |
| ---------------- | ---------------------------------------------------------------------- |
| Hugging Face CDN | The clinician device's IP address, which model was requested, and when |
| Hugging Face CDN | **No** patient data of any kind, and no transcript                     |

Two things follow that are worth stating plainly rather than leaving a reviewer to infer:

- **Nothing that PDPA cross-border transfer rules attach to leaves the country on this path**, because no personal data of a patient is in the request. The clinician's IP is visible to a non-Malaysian CDN, which is a fact about the clinic's own network rather than a patient data transfer, and it is the same exposure as loading any third-party asset.
- **It Is Removable, And The Removal Is Shipped Rather Than Described.** `VITE_ASR_MODEL_HOST` (§7) points the weight download at any origin, and the path layout under it matches HuggingFace's own (`{model}/resolve/{revision}/…`), so mirroring is a plain file copy rather than a rewrite. A clinic whose network policy forbids the fetch mirrors the files, serves them from the same origin as the app, and the on-device claim becomes an on-premises one with no third-party call at all. Left unset it defaults to the CDN, which is the disclosed behaviour above.

#### Two Assets, Two Decisions

The ONNX Runtime WASM (~23 MB) is served from the application's own origin; the model weights (~240 MB per model) are not. That is **two decisions with different inputs, not one mitigation half-applied**, and a reviewer who sees `ort-wasm` on our origin and the model on HuggingFace should be able to tell them apart:

| Asset             | Served From                            | Why                                                                                                                                                |
| ----------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| ONNX Runtime WASM | Our origin, always                     | Bounded and fixed. Emitted into the build, so there is no reason to introduce a second third-party origin for it                                   |
| Model weights     | HuggingFace CDN by default, mirrorable | ~240 MB per model whose bandwidth we would carry on every cache miss. Made configurable instead, so the cost falls to the deployment that needs it |

The residency argument needs **one disclosed origin, not zero**, and is stronger for naming which and why than for implying third-party fetches were eliminated entirely.

`asr_local` is **`Built`** as of issue #2, so this describes shipping behaviour rather than a contract to hold to. Measured on a real Malaysian English sample: 25 seconds of audio transcribed in 33 seconds on WASM, with the weights fetched once (~240 MB) and browser-cached after. The register held: the output keeps `lah` and renders "aunties" correctly, which is the exact word §20.1 recorded `whisper-base` mangling into "until".

## Bounding The Wait: The Worker Speaks, Silence Is Terminated

Shipping behaviour as of issues #138 and #139. The contract in one line: **the worker speaks continuously from the first request to the result, and the component terminates any worker silent for `STALL_TIMEOUT_MS` (180 s), tells the doctor what happened, and points at typing or pasting.** A wedged weight fetch, a hung `requestAdapter()`, a dead worker and a malformed audio container all end the same way: bounded, visible, and recoverable, never an infinite spinner.

| Rule                        | Mechanism                                                                                                                                                                                                                                            |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Every phase is on screen    | Aggregate download bytes (the library's `progress_total`, whose denominator covers every file from its first event), a `ready` stage change, a per-chunk `transcribing` tick, an `alive` token heartbeat, and `finishing` once before the merge tail |
| Silence is bounded          | One timer armed before the audio decode and rearmed by every worker message; expiry terminates the worker and surfaces the typing-or-pasting sentence                                                                                                |
| The doctor can always leave | A Cancel control that terminates the worker; after a failure, Try Again reruns the retained audio rather than asking for the consultation again                                                                                                      |
| Failure degrades to paste   | The stall and worker-death sentences point at typing or pasting and never mention hosted ASR (the governing rule above)                                                                                                                              |

Three properties are load-bearing and worth defending against future edits:

- **The Budget Is On Silence, Not Duration.** §20.1 measures an RTF of 1.5 to 3.0, so a consultation-length recording legitimately transcribes for many minutes; a deadline on the whole job would abort exactly the recordings most expensive to lose. 180 s is floored by ONNX session creation, which blocks the worker thread on a ~240 MB decoder and is legitimately silent throughout.
- **The Heartbeat Rides On Tokens, Not Whisper Timestamps.** Timestamps go silent over stride overlaps, quiet audio and repetition loops, any of which would let the budget kill a healthy run; tokens fire per decoding step whatever the audio contains (`HEARTBEAT_TOKENS`, one `alive` per eight).
- **`finishing` Clears The Budget Rather Than Rearming It.** After the last chunk the tokenizer merge blocks the worker thread, so no heartbeat is physically possible until the result. The phase is named on screen, the spinner carries liveness, and Cancel remains the doctor's bound. A cap here would have to be sized for the slowest legitimate merge, at which point it protects nothing Cancel does not, while a wrong one destroys a finished transcription, the worst outcome this feature has.

Cancel is a `terminate()`, never a message: a worker wedged inside a fetch that never settles will not read one. Every exit, whether expiry, cancel, worker death or unmount, leaves no worker running and no timer armed. The bar also stopped claiming a finished download: at 100% the copy reads "Opening the speech model", because the ORT backend import and the session open both happen after the last byte, which is the same stretch where a blocked backend used to surface only after a finished-looking download.

## Deciding Whether To Offer Audio: The Two-Stage Capability Probe

The probe's job is to decide **whether to offer audio on this device at all**, not to silently pick a mode. Mode selection is the doctor's (see the governing rule); capability is a fact about the machine.

**Design Constraint That Shapes The Whole Thing:** a probe that downloads 240 MB before reporting "your device is too slow" punishes exactly the user it exists to protect. The free stage exists to gate the expensive one.

| Stage                                          | What It Measures                                                                                       | Cost                 | What It Decides                                              |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------- | ------------------------------------------------------------ |
| **1, Triage**, on opening "New consultation"   | `navigator.hardwareConcurrency`, `navigator.deviceMemory`, and a ~200 ms synthetic WASM microbenchmark | Zero network, ~0.5 s | Three bands: clearly capable / clearly incapable / uncertain |
| **2, Verdict**, on the first transcribed chunk | Real-time factor (RTF) measured on work actually done                                                  | The chunk itself     | Can **overturn** Stage 1 in either direction                 |

A synthetic benchmark is triage, not a verdict, which is why Stage 2 exists and is allowed to overrule Stage 1. The "uncertain" band is a genuine outcome and must be designed for, not collapsed into one of the confident ones.

**Caching, Stated Honestly.** The model is cached to OPFS, with the measured RTF stored alongside it so the probe does not start from zero on every visit. "One-time download" is nevertheless a claim that fails in ordinary clinic conditions, and is not made here: cache eviction, a shared clinic PC where each staff member has their own browser profile, and incognito sessions each defeat it independently.

## The Memory Failure Mode

Slowness is the visible risk. Memory exhaustion is the one that actually loses a consultation.

`whisper-small` at ~240 MB, plus the ONNX runtime, plus the browser itself, on a 4 GB machine already running the clinic's own management system, is a plausible out-of-memory kill, **a dead tab in the middle of a consultation, not merely a slow one**. Recovering a half-transcribed consultation from a crashed tab is not a feature this prototype has.

Consequently: **Core-i3-class hardware gets audio _not offered_ by default**, with an explicit override for a doctor who wants to try it anyway. This is deliberately stronger than "discouraged", a warning the doctor can click past is the wrong control for a failure whose cost is losing the consultation rather than waiting longer for it.

**The Same Budget Argument Constrains The Rest Of The Page.** These estimates assume transcription is not competing with a continuous render loop for the same cores: at an estimated RTF of 1.5–3.0 in-browser on a 4-core clinic PC (§20.1), there is no headroom to share. Any always-animating WebGL or `requestAnimationFrame` surface on the consultation screen would be spending exactly the CPU the ASR path needs, so the frontend does not carry one, a constraint on the UI, recorded here because it originates in this section's measurements rather than in a design preference.

## Consent UX: A Live Tension, Not A Solved Problem

Recorded as an unresolved tension because presenting it as solved would be the more comfortable and less honest option.

**The Tension:** the doctor on weak hardware is exactly the doctor who wants hosted mode, and surfacing the hosted option at the moment of maximum frustration is precisely how meaningful consent quietly degrades into clicking whatever ends the friction. The mechanism is sound (explicit, per-consultation, recorded); the risk is that the moment it fires is the moment the doctor is least able to weigh it.

**The Handling:** hosted must be **findable but not funnelled**. It is mentioned neutrally, with its tradeoff stated in the same breath rather than behind a link, and it is never the highlighted button on a screen the doctor reached by failing. The exact wording and affordance are unresolved, see the Open Decisions Register, §19, row 18.

Two properties are settled regardless of how that resolves: consent is **per consultation and never sticky** (consent is not transferable between patients), and choosing hosted is recorded in both the transcript (§3) and the audit trail (§15).

## Batch, Not Streaming, For V1

**Superseded 05/09/26 By §20.7.** Reason 1 below is overturned: the client has now asked, by name, for exactly the margin it recorded nobody wanting. Reasons 2 and 3 still hold, and are what make §20.7 segmented HTTP rather than a socket. This section is kept rather than rewritten, because the reasoning it records is what shaped the replacement.

The hosted adapter posts one finished recording per request. ILMU's transcription API is batch-only today, and that fits the design rather than constraining it: a streaming session was already rejected on its own terms when the pencilled-in provider offered one.

| Reason                | Detail                                                                                                                                       |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Latency is sufficient | 2.3 to 2.5 s for a 99.2 s recording (§20.3) is already near-live against a consultation's pace; streaming buys a margin nobody has asked for |
| Integration cost      | Posting chunks reuses the request/response shape the codebase already has everywhere; a WebSocket session does not                           |
| Exposure surface      | A continuously open audio stream is a materially larger surface than discrete posts of bounded chunks                                        |

True streaming is an optimisation available later, not the starting point. Stated as a decision so that "we didn't use the realtime endpoint" reads as a choice rather than an omission.

## Interaction With Existing Contracts

- Downstream of transcript creation, the audio-sourced path is **processed** identically to any other `Transcript`, the same de-identification pipeline (§9), red-flag engine (§10), and LLM prompt contracts (§12) apply with no special-casing. `Transcript.source` (§3) makes it _identifiable_ without making it _special_: nothing in the pipeline branches on it, and the field exists for the audit trail and the reviewer's attention, not for the processing path.
- The CAP-1 latency target (`docs/PRD.md`) is measured from the doctor triggering analysis, not from when audio capture began (see `docs/PRD.md` CAP-1). Client-side transcription time is additional wall-clock time the doctor experiences before analysis is even triggered, and it is not counted in that target, it compounds, rather than resolves, the tension already recorded in the Open Decisions Register, §19, row 8.

## Model, Delivery, And Runtime: Resolved 13/08/26 (§19 Row 13, Closed)

| Decision           | Value                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Model              | **`whisper-small`** (~240 MB), revised upward from `whisper-base` on 13/08/26 by measurement, see §20.1. `base` is **not** fit for Malaysian code-switched speech. **Not** `large-v3-turbo`, ≈560 MB+ on first load                                                                                                                                                                     |
| Delivery           | Fetched from the Hugging Face CDN on first use, then cached in the browser. Never bundled into the frontend build                                                                                                                                                                                                                                                                       |
| Execution provider | **WASM Is First-Class, Not A Fallback.** Through transformers.js v3.0.2, WASM beat WebGPU on `whisper-base` on an M2 (4.9–5.9 s vs 9.5–9.6 s for 60 s audio). v4's runtime may have flipped this; measure, do not assume                                                                                                                                                                |
| Platform           | **Desktop Chromium Only**, stated explicitly. Documented crashes exist on Android Chrome and iOS                                                                                                                                                                                                                                                                                        |
| `language`         | **Always Hard-Coded To `'en'`.** Never auto-detected, and never set from a locale picker or a patient's recorded language, §20.1 finding 2. The risk is not that auto-detect translates (that claim was measured and withdrawn, finding 3); it is that auto-detect could _select_ a non-English language on code-switched audio, which is the regime finding 2 measured as catastrophic |
| Version pinning    | Pin the exact model × dtype × device combination and test it before shipping; a known open issue collapses all segments into one under v4 + WebGPU + fp16 + timestamped turbo                                                                                                                                                                                                           |

**Never Promise Real-Time.** Measured figures and their hardware caveats are in §20.1; the short version is that `whisper-small` ranges from comfortably faster than real time on a modern multi-core machine to **several times slower than real time** on a modest clinic PC, and the clinic's hardware is not ours to choose. Design consequences: transcribe in chunks in a Web Worker during the consultation, probe real-time factor on the first chunk and warn early if the device cannot keep up, show real progress, and keep the paste-a-transcript path as the primary route (`docs/PRD.md` §14).

**Check Cross-Origin Isolation Before Counting On Multi-Threaded WASM.** COOP/COEP headers are required for `SharedArrayBuffer`, and enabling them on Vercel constrains cross-origin model fetches from the HF CDN, the two requirements pull against each other and must be resolved together, not sequentially.

### The Quantised Decoder Needs Graph Optimisation Disabled

Recorded because every step of the diagnosis looked like the answer and was not, so without this someone will re-derive it. Found while building #2.

The session refuses to open at all:

```
Can't create a session. qdq_actions.cc:137 TransposeDQWeightsForMatMulNBits
Missing required scale: model.decoder.embed_tokens.weight_merged_0_scale
```

Three plausible causes, each eliminated by measurement rather than reasoning:

| Hypothesis                  | Why It Is Wrong                                                                                                                  |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| A bad mirror                | The failure is identical on `Xenova/whisper-small` and `onnx-community/whisper-small`                                            |
| The wrong dtype             | `decoder_model_merged_int8.onnx` is **byte-identical** (md5) to the `_quantized` file, so switching between them changes nothing |
| The scale really is missing | That tensor name appears **341 times** in the decoder graph                                                                      |

The failure is inside an ONNX Runtime **optimisation pass** that rewrites quantised MatMuls and cannot resolve the reference in this graph. `session_options: { graphOptimizationLevel: 'disabled' }` skips the pass and loads **the same weights, unchanged**.

That distinction matters for anyone reviewing it later: this disables a graph rewrite, not a correctness check, and it does not alter the model or its output. It is a workaround for a runtime bug, not a quality trade.

### Per-Module Dtype On WebGPU (Issue #144)

The WebGPU branch originally set no `dtype`, so the library default applied and everything came down at fp32. It now pins a full-precision encoder with a `q4` decoder, the pairing the official transformers.js WebGPU Whisper demos ship for models of this size. Two nearby options were rejected on evidence, not preference:

- **Scalar `q8`** is pathologically slow on WebGPU (transformers.js issue #894 measures 27 s against 5.2 s WASM on the same file), and the q8 decoder independently fails to open on this runtime (the qdq diagnosis above).
- **An fp16 Encoder** would save a further 176 MB, but the demos reserve fp16 encoders for `large-v3-turbo`, and the pinning row above records an open v4 + WebGPU + fp16 timestamp issue. Timestamps carry §20.2, so full precision won.

#### Download Size, Measured 15/08/26

In-browser `progress_total` on the production worker, Intel gen-9 adapter; per-artifact sizes are CDN `content-length`:

| Path                          | Total Measured | Weight Artifacts                                              |
| ----------------------------- | -------------- | ------------------------------------------------------------- |
| WASM `q8` (unchanged)         | ~250 MB        | encoder_quantized 92.3 MB + decoder_merged_quantized 156.8 MB |
| WebGPU, fp32 default (before) | 970.9 MB       | encoder 352.8 MB + decoder_merged 615.3 MB                    |
| WebGPU, fp32 + q4 (after)     | 588.7 MB       | encoder 352.8 MB + decoder_merged_q4 233.1 MB                 |

A 39% cut, not the issue's hoped-for half: the q4 decoder is 233 MB, not the ~170 MB the estimate assumed. Weights cache per artifact, so an existing WebGPU user re-downloads the decoder once; the fp32 encoder stays cached.

#### Session And Speed, Same Machine And Recording

The session opens with the q4 decoder, no qdq failure, no WASM fallback. On the §20.2 83.4 s reference recording, stamped: session open 26.2 s and transcription 74.6 s (RTF 0.89) under fp32 + q4, against 41.5 s and 153.8 s (RTF 1.84) under an fp32 decoder, and 178.5 s (RTF 2.14) for the 14/08/26 WASM q8 baseline. The q4 decoder halves decode time on top of halving its download.

#### Token A/B, Stated With The Honesty §20.1 Demands

The §20.1 sample was no longer present on the measurement machine, so the A/B ran on the §20.2 synthetic consultation instead: ground truth known, but TTS voices with anglicised Malay pronunciation, which §20.2 already records as a register caveat. n=1, not a benchmark. Two q4 runs were byte-identical, so the differences below are deterministic, not noise.

| Token (Ground Truth)         | WASM q8 (14/08 Baseline) | WebGPU fp32 + q4      | WebGPU fp32 Decoder          |
| ---------------------------- | ------------------------ | --------------------- | ---------------------------- |
| "Any phlegm when you cough?" | phlegm                   | **Flam**              | phlegm                       |
| "Batuk sudah 3 hari lah"     | Batuxidha 3 Harry Law    | Batuxedot 3 harry law | Batuxidothri harila (no "3") |
| "MC", both mentions          | MC                       | MC                    | mc                           |
| "sakit"                      | socket                   | socket                | socket                       |
| Everything else              | Identical                | Identical             | Identical                    |

No dtype dominated. Against the fp32 default it replaces, q4 keeps the numeral in "3 hari" and the MC capitalisation and loses "phlegm" to a phonetic "flam"; the TTS voice's rendering of exactly that word is the kind of token one synthetic sample cannot settle. A real-speech A/B is the open follow-up, not a blocker recorded as solved.

#### Timestamp Integrity On The Reference Recording

18 segments, monotonic and contiguous (`end[i] == start[i+1]` throughout), final end 83.5 s against 83.38 s true duration, and the concatenated segment text reconstructs the transcript after whitespace normalisation. Neither known failure shape from §20.2 appeared.

## Threat: ASR Is A Second Fabrication Surface

This is a genuine architectural gap, stated as one. Every control in this system, the de-identification gate (§9), the rules engine (§10), ID-constrained citations (§11), and evidence-bound assertion (§21.4), sits **downstream of the transcript** and cannot detect a transcript that is already wrong.

| Failure                        | Mechanism                                                                                                                                               | Why No Downstream Control Catches It                                                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Whisper Hallucination**      | ~1% of transcriptions contain entire fabricated phrases, correlated with long non-vocal spans; ~40% judged capable of harm (Koenecke et al., FAccT '24) | A hallucinated span **passes** the §21.4 evidence check, the evidence genuinely is in the transcript. The transcript is what is wrong   |
| **Wrong-Language Declaration** | **Measured, §20.1.** Declaring a language the audio is not in produces a fluent repetition loop, not an error, on both `base` and `small`               | Grammatical, plausible output in the declared language, bearing no relation to what was said. Indistinguishable downstream              |
| **Semantic Substitution**      | **Measured, §20.1.** `whisper-base` rendered "auntie" as "until" and dropped "pasar malam" entirely                                                     | The transcript is well-formed English. A substituted content word is a fact the doctor never said, and it carries a valid evidence span |

Mitigations available in this window: pass `language` and **never pass one the audio is not in**; VAD-trim long silences before transcription; surface a low-confidence indicator on ASR output so the doctor is cued to check the **transcript**, not only the note; and keep pasted text as the primary demo path. None of these closes the gap, they bound it. The same law fires at both layers: **silence → fabrication at the ASR layer, sparse text → fabrication at the LLM layer** (§21.1).

## 20.1 Measured Finding: Model Selection For Malaysian Code-Switched Speech

Measured **13/08/26** on a 49.7 s Manglish sample (casual conversation, Malay and Cantonese loanwords, single speaker, not clinical register), decoded to 16 kHz mono. Whisper runs via `@huggingface/transformers` **4.2.0**, the exact production dependency, at `dtype: 'q8', device: 'cpu'` on a 16-core machine. Qwen via `qwen3-asr-flash` on the Singapore endpoint.

**Sample Provenance:** a publicly downloaded speech sample. No patient data, real or simulated, was sent to any provider. The file is **not committed** to this repository.

| Token In Audio      | `whisper-base`        | `whisper-small`    | `qwen3-asr-flash` |
| ------------------- | --------------------- | ------------------ | ----------------- |
| "pasar malam"       | **Dropped Entirely**  | "Paso Malams"      | "pasar malams"    |
| "auntie"            | **"Until"**           | "Auntie"           | "Auntie"          |
| "lang loi"          | **"Language"** (7×)   | "Lang Loi"         | "lang loi"        |
| "lang chai"         | **"Language"**        | "Lang Jai"         | "lang chai"       |
| `lah` / `ah` / `eh` | mostly lost           | preserved          | preserved         |
| Wall clock          | 7.2 s (**RTF 0.146**) | 13.9 s (RTF 0.279) | **2.8 s**         |
| Determinism         | ,                     | ,                  | byte-identical ×3 |

**Three Findings, In Order Of Consequence.**

1. **`whisper-base` Is Not Fit For The Measured Malaysian Code-Switched Speech.** It rendered _"You call me auntie ah, how old am I"_ as _"You call me until you're old and you know?"_, not degradation but a **meaning change**, in well-formed English that no downstream control can flag. `whisper-small` recovers essentially all of it. The §20 default is therefore revised `base` → `small`, at the cost of ~104 MB more download and roughly 2× the compute.

2. **Declaring the wrong language causes a fluent hallucination loop, on both model sizes.** With `language: 'ms'`, `base` emitted _"Dia berlalu di sini"_ ×20 then _"Saya takkan berguna"_ ×30, **238 words for 50 s of audio**, RTF rising 4× to 0.583. `small` emitted _"Teruklah"_ ×10 at **RTF 1.365, slower than real time.** This is the §21.1 failure mode reproduced one layer down: grammatical, confident, entirely fabricated. It is why `language` must be `'en'` and must never be set from a locale picker or auto-detected patient language.

3. **The Silent-Translation Threat Did Not Reproduce, And The Claim Is Withdrawn.** Earlier drafts of this section asserted, from secondary research, that Whisper translates rather than transcribes on code-switched audio when `language` is unset. Measured here, `auto` and `language: 'en'` produced **byte-identical output** on both model sizes. The underlying source benchmarked European language pairs; it does not transfer to Malaysian audio. `language` stays explicit because finding 2 makes it load-bearing anyway, but for a different and better-evidenced reason.

**Limits Of This Measurement, Stated Plainly.** n=1, one 50-second sample, casual register rather than clinical, with heavier Cantonese loanword density than a typical consultation. Clinical Manglish is plausibly easier, medical vocabulary is English. No WER is reported because the sample carries no ground-truth transcript; the table compares specific tokens whose correct value is agreed between the two stronger models. This is a **smoke test that settled a model choice**, not a benchmark, and it is described as such wherever it is cited.

**The Hardware Consequence Is Now The Binding Constraint, Not Accuracy.** The 16-core figures above run native ONNX Runtime in Node; **browser WASM is typically 1.5–3× slower**, so treat RTF 0.279 as a floor. On a 4-core clinic PC, `whisper-small` in-browser plausibly lands at **RTF 1.5–3.0, slower than real time**, meaning a 10-minute consultation could take 15–30 minutes to transcribe. Design consequence: probe real-time factor on the first completed chunk and tell the doctor up front, rather than discovering the backlog at the end.

**Open**, `language` is settled above and is not negotiable. Whether the low-confidence indicator and VAD silence-trimming are built in this window, or named as unmitigated, is a scope call against the remaining runway. See the Open Decisions Register, §19, row 15.

**Malay-Accuracy Roadmap, Not A Build Item.** `mesolitica/malaysian-whisper-*` is fine-tuned on Malaysian audio (IMDA STT, the Malay Conversational Speech Corpus, pseudolabelled Malaysian YouTube) with v3 described as handling Malay, Manglish, Mandarin and Tamil. **No ONNX build is published and no public WER exists.** Cite it as the improvement path; do not attempt the conversion now.

## 20.2 Draft Speaker Labels: Measured, Gated, Not Diarisation

**Built, Issue #118.**

### What This Is, And Is Not

This is **turn segmentation from timing and sentence content**, not diarisation. Whisper cannot tell the two voices apart, and nothing in this feature listens to the audio for who is speaking: it reads segment boundaries and what each sentence says. A per-line Doctor/Patient toggle in a review list (`frontend/src/audio/SpeakerAssign.tsx`) is prefilled with a guess and stays a guess, editable, until the doctor explicitly applies it. Start Consultation stays disabled until that apply happens, so nothing guessed reaches the transcript unreviewed.

### The Pipeline Flag And Its Cost

`transcribe.worker.ts` passes `return_timestamps: true` to Whisper (`chunk_length_s: 30`, `stride_length_s: 5`), which is what turns one flat transcript into per-segment boundaries `draft-turns.ts` can split on.

| Cost               | Detail                                                                                                                             |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Wall clock         | +49% transcription time measured on the same audio, same session, 16-core machine: 98.5 s plain vs 147.2 s with timestamps         |
| On clinic hardware | Compounds on the §20.1 RTF 1.5-3.0 estimate for browser WASM on a 4-core clinic PC, since this is on top of that time, not instead |
| What is bought     | Passive machine time traded against the doctor's active per-line labelling time, which is the tradeoff being accepted, not avoided |

### Measured, 14/08/26

83.4 s synthetic two-voice consultation (Windows SAPI, David as doctor, Zira as patient), fixture 1's turns plus four scripted closing turns, run through the exact production pipeline (`onnx-community/whisper-small`, WASM, `q8`, `graphOptimizationLevel: 'disabled'`, `language: 'en'`) and through the production worker file end to end.

**Stated Honestly, As §20.1 Does For Its Own Sample:** synthetic TTS audio is a timing and boundary test, not a speech-register test (clean voices, anglicised Malay pronunciation). n=1, not a benchmark.

| Finding                         | Result                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Timestamp integrity             | 17 segments, zero NaN, monotonic, final end 83.6 s vs 83.4 s true duration; concatenated segment text reproduces the transcript after whitespace normalisation. Neither known transformers.js failure shape (#1590 segment collapse, #1077 NaN) appeared                                                                                                            |
| Pause-gap premise               | **False.** Segment timestamps are contiguous partitions: `end[i] == start[i+1]` at all 16 boundaries, every scripted 1.0-1.6 s silence absorbed into the earlier segment. There is no gap to threshold on; the boundaries themselves are the split signal                                                                                                           |
| Boundary recall                 | 10 of 11 true speaker handoffs recovered by a line boundary within 1.0 s. The miss merged the doctor's advice and the patient's reply into one line                                                                                                                                                                                                                 |
| Label prefill accuracy          | 9 of 17 lines correct (53%). Failure modes: alternation flipping on an over-split same-speaker continuation; a spurious question mark from rising TTS intonation triggering rule 3; the merged line cascading three wrong labels until the next question re-anchored. This is why labels are toggles behind an explicit apply, never text already in the transcript |
| Timestamp decoding cost         | +49% wall clock (above). The production worker run including model init from cache took 180 s                                                                                                                                                                                                                                                                       |
| Text quality with timestamps on | Equal or better on this sample: the plain run dropped a word ("bit") and ran three sentences together; the stamped run kept them                                                                                                                                                                                                                                    |

### Revised 15/08/26: Sentence Units And Content Scores

The v1 rules (open with the doctor, answer after a question, any question to the doctor, otherwise alternate) are the ones the 53% above was measured on. They were replaced after a production recording folded a doctor greeting, the patient's "I have serious coughing", and the doctor's follow-up into one segment, a handoff per-segment labels cannot see by construction. The unit of labelling is now the sentence, and content outranks structure:

- **Split.** Each segment splits at sentence boundaries (`[.!?]` runs followed by a capital or digit), guarded twice: a title Whisper writes ("Dr.") is not a boundary, and a split whose pieces do not reconstruct the segment text exactly is discarded whole. The same text-is-authoritative stance as `usable()`.
- **Score.** Each sentence is checked against two small pattern tables. Doctor patterns are speech directed at the patient: question openers ("what brings you", "any fever"), instructions ("take these", "let me"), examination ("your throat"). Patient patterns are first-person experience ("I have", "my chest", "I ate") and vocative "doctor". More matches wins.
- **Context On A Tie, Keeping v1's Ordering Rationale.** The answer to a question outranks the sentence's own trailing question mark ("Yes, since this morning?" stays the patient's); a content-free question falls to the doctor as the last resort; a sentence with no signal at all continues the previous speaker. Continuation replaces alternation, whose flips on same-speaker continuations were the largest measured failure mode above.
- **Merge.** Consecutive same-speaker sentences within one segment fold back into one line, so splitting costs a review line only where the guessed speaker changes.
- **Offsets.** Only the line that opens a segment carries its start time. A split line's true offset inside the segment is unknown, and a fabricated one would assert a wrong time in the evidence trace.

What this fixes, each pinned by `frontend/src/audio/draft-turns.test.ts`: the within-segment handoff above, the alternation flips, and the v1 known-wrong case, because "Is it bad that I am coughing up blood?" now scores as first-person symptom and stays the patient's.

### Measured, 15/08/26

95 s scripted consultation, one reader voicing both roles, read live into the production recorder path (`onnx-community/whisper-small`, WebGPU, the shipped worker). A single voice is a valid test here precisely because the feature uses no voice information; it is not a test of acoustic diarisation.

Whisper returned **15 segments** spanning **38 sentences**, having merged a speaker handoff into a segment at eleven of the twenty-one turn boundaries, a heavier merge rate than the 14/08/26 sample. v1 was replayed over the identical segments for a like-for-like comparison.

| Metric, Per Sentence         | v1             | v2                 |
| ---------------------------- | -------------- | ------------------ |
| Sentences labelled correctly | 20 of 38 (53%) | **36 Of 38 (95%)** |
| Lines holding two speakers   | 10 of 15       | 2 of 28            |
| Lines carrying a wrong label | 4 of 15        | 0 of 28            |

v1 scoring 53% here, on different audio and a different metric from the 14/08/26 run that also produced 53%, is corroboration rather than coincidence.

**The Red-Flag Case, On Real Speech:** v1 labelled "Is it bad that I'm coughing out blood?" **Doctor**, which is the suppression shape `mislabel-suppression.test.ts` pins. v2 labelled it **Patient**.

**Two Pattern Gaps This Run Exposed, Both Fixed And Pinned By Tests:** a first-person question about one's own care ("Do I need antibiotics?", "anything I should watch out for?") had no content signal, fell to the doctor as a last-resort question, and then cascaded one line through the answer-after-question rule; and the first-person symptom pattern fired on a bare negation, handing "You can see Dr. Tan if I'm not around" to the patient. Together they accounted for 6 of the 9 errors in the first pass, which scored 29 of 38.

**The Two Remaining Errors Are Structural, Not Tuning:** Whisper split "Any chest pain or / breathlessness?" across two segments mid-sentence, which no sentence-level labeller can repair, and "Like this." carries no signal in either direction.

**Confirmation Run, Same Day, Fixed Code, Fresh Recording.** The table above scores the corrected patterns replayed over the first recording's segments, so a second reading was recorded end to end to check the result was not fitted to one sample. 31 lines over 39 sentences: **38 of 39 correct (97%), 30 of 31 lines clean, zero wrong labels.** Every fix held in live conditions, including the two that the first run motivated, and the red-flag line landed on the patient again. The single error is the same "Like this.", which is now the only known content-free failure in either recording.

**Limits, Stated As §20.1 Does:** n=1, one voice, scripted rather than spontaneous, and read by a non-clinician. Real ASR errors were present and left in ("phlegm" became "flame", "doctor" became "daughter"), so this measures labelling over imperfect text, which is the honest condition. The pattern tables are English-only, so heavily code-switched sentences fall through to the context rules.

### The Apply Gate Is The Safety Control

`backend/src/redflags/mislabel-suppression.test.ts` (test only, zero backend production changes) is the executable rationale. It pins that "Is it bad that I am coughing up blood?" fires the `haemoptysis` trigger when labelled patient, and goes silent when a mislabelling dresses it up as a doctor question followed by a patient denial, which is exactly the shape the v1 rules produced when a patient asked about their own symptom. The sentence scoring above now keeps that sentence with the patient, and the gate stays anyway, because a content score is still a guess. Issue #70's suppression is correct given correct labels; it trusts the labels it is given. That is why nothing guessed here reaches `evaluateRedFlags` unreviewed: Start Consultation is disabled until the doctor applies the draft, one line at a time.

### The Offsets Contract

- Applying serialises lines into the shared textarea as `Doctor [0:04]: text`, floored to whole seconds.
- The single parser (`frontend/src/lib/transcript.ts`, moved from `ConsultationNew` for #118) reads the same optional inline `[m:ss]` back into `offsetSeconds` as an integer, for every input path: fixture, paste, upload, and record.
- A second recording appended to existing content keeps the drafted labels but drops timestamps, because its timebase restarts at zero and would otherwise collide with the first recording's.
- The fixture tab now serialises through this same function, so fixture-authored offsets survive to submission for the first time. Previously the textarea round-trip discarded them on every path, and the evidence trace's `PATIENT · 0:04` marker had never rendered for a user-created consultation.

### The Fallback Contract

Segments are advisory, text is authoritative. `usable()` in `draft-turns.ts` checks that segment timestamps are non-decreasing and finite, and that the concatenated segment text reproduces the full transcript after whitespace normalisation. Malformed, non-monotonic, or text-mismatching segments make the draft come back empty and the raw prose lands unlabelled, exactly as it did before #118.

### Limits

- No voice information is used anywhere in this feature; it is timing and sentence content only.
- A speaker handoff inside one sentence is not splittable; that line is fixed only by editing the applied text, not by the labelling UI.
- A third speaker is not representable: `SpeakerSchema` has two values, and the review list offers only Doctor/Patient.
- The pattern tables are English-only, and a sentence with no signal stays with the previous speaker, which under-switches where v1 over-switched; a doctor reviewing the draft is the mitigation for both.

### Voice Diarisation Roadmap (Specified, Not Built)

Recorded so the option is scoped, not attempted, in this window.

**What Is Available For Free.** transformers.js v4 natively ships both models a diarisation pass would need, with zero new dependencies and mirrorable through the existing `VITE_ASR_MODEL_HOST` layout with no code change:

| Model                                           | Size         | Role                                                             |
| ----------------------------------------------- | ------------ | ---------------------------------------------------------------- |
| `onnx-community/pyannote-segmentation-3.0`      | 6.0 MB fp32  | `AutoModelForAudioFrameClassification`, speech/overlap detection |
| `onnx-community/wespeaker-voxceleb-resnet34-LM` | 26.5 MB fp32 | 256-d speaker embeddings                                         |

**Two Verified Library Traps, So They Are Not Re-Discovered The Hard Way:**

- `PyAnnoteFeatureExtractor` does not window: it tensors the whole recording, but the model is trained on 10 s chunks, so a sliding window has to be hand-built.
- `post_process_speaker_diarization` is not a diarizer. It returns per-window powerset class ids (0 is silence) whose identities do not persist across windows.

**Design Sketch.** 10 s windows at a 5 s hop; permutation-invariant `P(speech)` and `P(overlap)` stitching across windows; embeddings taken on clean (non-overlapping) segments under a CPU budget; deterministic average-linkage agglomerative clustering read at k=1/2/3; **refusal as a first-class output**, where a one-speaker or third-voice verdict falls back to unlabelled prose rather than forcing a guess. That refusal path is why `SpeakerSchema` needs no third value even if this ships.

**A Possible Second Payoff.** The segmentation pass doubles as a VAD. Its silence-trimming may pay for more of its own cost than the diarisation half costs, and would close the VAD half of §19 row 15 (currently open) if it does.

**Estimated Cost.** 2 to 4 minutes added to a 10-minute consultation.

**Ship Thresholds**, against measured EER on one-desk-microphone clinic-like audio:

| EER             | Verdict                                                                           |
| --------------- | --------------------------------------------------------------------------------- |
| Under about 10% | Proceed                                                                           |
| 10 to 20%       | Demoted to a labour-saver with per-line uncertainty shown, not a default          |
| Over 20%        | Worse than nothing: converts the doctor's authoring task into a proofreading task |

**Rejected Implementations, Recorded So They Are Not Retried:**

- **Sherpa-onnx WASM.** Statically links a second ONNX Runtime, bypassing the `VITE_ASR_MODEL_HOST` mirror.
- **A Direct `onnxruntime-web` Dependency.** The lockfile resolves a transformers.js-pinned nightly dev build; a caret range on top would install a second ORT beside it.

**Role-Mapping Floor.** A one-tap swap control, same as today's Swap All. Stored clinician voiceprints are rejected outright: biometric data, on shared clinic PCs, and this section's own upload claims already forbid it.

**Verified 15/08/26, While Revising The Draft Labels:**

- `onnx-community/whisper-small_timestamped` exists on the hub, so the word-timestamp alignment path is real. Swapping `MODEL` to it invalidates the cached weights and re-downloads them in full; schedule that migration deliberately, not as a side effect.
- `vercel.json` `connect-src` already covers the hosts the two models above download from; no CSP change is needed.
- Published ceilings justify the staging: text-only role identification measures ~82% against ~95% once acoustic speaker identities are added (fine-tuned BERT on 117 clinic transcripts, PSB 2026), and DiarizationLM (Interspeech 2024) corrects speaker attribution with an LLM post-pass at double-digit relative error reductions. Sentence scoring raises the floor; voices remain the endgame.
- PriMock57 (57 acted mock GP consultations, audio plus utterance-level speaker ground truth, downloaded locally and never committed) is the candidate corpus for the EER gate above.
- A resident warm worker between recordings was considered for load time and rejected: a warm session holds the full weights in memory while the doctor works elsewhere, which is the OOM kill this section's memory failure mode warns about. Prewarm-per-recording through the existing but unsent `load` request is the open alternative, with one hazard: the worker answers it with `ready`, which the component currently reads as the start of transcription.

## 20.3 Measured Finding: Hosted `ilmu-asr-v4.2` Against The Shipped Local Path

Measured **15/08/26**, gating issue #151 (the hosted-ASR build, issues #154 and #155, does not start unless this section records a ship decision). Harness: `evals/asr-ab.ts`, three default runs per sample plus one `language='ms'` probe, response-shape probes, and a report per run under the gitignored `evals/reports/`.

**Samples, Provenance Stated Per The 20.1 Convention.** Two samples, neither committed:

1. The 20.2 reference recording: 83.4 s synthetic two-voice consultation, Windows SAPI voices, anglicised Malay pronunciation.
2. A new 99.2 s scripted rojak consultation: single human reader voicing both roles, phone recording (AAC 48 kHz stereo, decoded to 16 kHz mono), Malay-dominant with mid-sentence English switches, scripted ground truth. Synthetic content; no patient data of any kind was sent to any provider.

**Local Arm:** `@huggingface/transformers` 4.2.0, the exact production dependency, Node CPU, `dtype: 'q8'`, `graphOptimizationLevel: 'disabled'`, production generation options, run per the 20.1 method with the same caveat (browser WASM is slower than these Node figures).

### Token Table, Rojak Sample

| Token (Ground Truth)                    | `ilmu-asr-v4.2`                         | `whisper-small` `language:'en'` (Shipped)                         | `whisper-small` `language:'ms'`                  |
| --------------------------------------- | --------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------ |
| "batuk sudah empat hari lah"            | "patut sudah empat hari lah"            | **"It's Been Four Days"** (translated)                            | "patuk sudah empah hari lah"                     |
| "Ada demam tak?"                        | "ada teman tak"                         | **"Do You Have A Fever?"** (translated)                           | "Ada teman tak?"                                 |
| "tiga puluh lapan point dua"            | correct ("poin"/"point" varies by run)  | "38.2" (translated to digits)                                     | "38.2"                                           |
| "Any phlegm when you cough? Kahak ada?" | "any 你 fling when you cough kahak ada" | "Any flanks when you cough, or cough, or white"                   | "Any fling when your cough kakak ada"            |
| "dada rasa sakit sikit"                 | **Correct**                             | **"Your Feet Are Strong, You Will Feel A Little Pain"**           | "dah dah rasa sakit sikit"                       |
| "Tekak merah sikit, tonsil tak bengkak" | "kekak merah sikit tongso tak pengkat"  | "Tekak Merah sikit Tongsil, Dap penkak" (after an English detour) | "Tekak. Merah sikit. Tongsel. Tak penkak."       |
| "denggi", both mentions                 | "tenggi"                                | "tanggi"                                                          | "tanggi"                                         |
| "Boleh dapat MC tak"                    | "boleh tapak MC tak" (MC survives)      | **"Can I Get A Doctor's Leave?"** (translated, MC gone)           | "boleh tapak emci tak"                           |
| "semput"                                | "sempuk"                                | "if you feel sick" (gone)                                         | "sempuk"                                         |
| Duplicated or invented content          | one stutter ("air air")                 | repeated blocks plus invented clauses                             | repeated blocks plus one fabricated Malay clause |
| Punctuation and casing                  | **None**: flat lowercase stream         | yes                                                               | partial                                          |
| Wall clock (99.2 s audio)               | 2.3 to 2.5 s (**RTF 0.024**)            | 66.2 s (RTF 0.67, Node CPU floor)                                 | 157.5 s (**RTF 1.59**, slower than real time)    |

### Findings, In Order Of Consequence

1. **The Shipped Local Configuration Fails Dangerously, Not Gracefully, On Malay-Dominant Audio.** `language: 'en'` on this recording produced fluent English translation-fabrication: "bila batuk kuat, dada rasa sakit sikit" became "when your feet are strong, you will feel a little pain", erasing the exact phrase the chest-pain red flag matches on. This is 20.1 finding 2 and the section 21 threat table reproduced on the production settings, and it is the measured justification for the consent-gated hosted path: the on-device default has no safe answer for a Malay consultation today.
2. **`auto` Is Not Detection.** With `language` unset, transformers.js logs "No language specified - defaulting to English" per chunk; output was byte-identical to `'en'`. 20.1 finding 3 withdrew the silent-translation claim from secondary research; this run supplies the mechanism: there is no detection to mistrust, only a default.
3. **A Doctor-Declared `'ms'` Toggle Would Not Be A Fix.** It transcribes rather than translates, but with stride-duplication blocks, one fabricated clause, "emci" for MC, and RTF 1.59 on a 16-core machine, which clinic hardware multiplies. The on-device toggle idea stays rejected; the section 20 language row stands unchanged.
4. **`ilmu-asr-v4.2` Wins The Rojak Arm Decisively On Structure And Speed.** Correct matrix language, mid-sentence code-switching preserved, clinical content largely intact (including "dada rasa sakit sikit" and "kahak"), roughly 40x faster than the local WASM path, at about RM 0.012 per consultation-minute. Its error family on this recording is consonant devoicing ("patut" for "batuk", "teman" for "demam", "tenggi" for "denggi", "pengkat" for "bengkak"), shared with `whisper-small` `'ms'` at the same spots, which points at the phone-mic audio profile as a contributor; plus one Chinese-character intrusion on "phlegm" and no punctuation.
5. **The early-access API diverges from its documentation, in ways the relay must absorb.** `verbose_json` is not honoured (the response is `{text, usage: {type: "duration", seconds}}` with `timestamp_granularities[]` a no-op), `srt` returns a single cue spanning the whole file, the `prompt` biasing field is a no-op (identical output with punctuation-style and jargon prompts), and `temperature=0` is not byte-deterministic on the rojak sample (three runs differed in minor tokens; the TTS sample was deterministic). Consequences: no per-turn offsets exist, draft speaker labels cannot engage (the flat unpunctuated prose also defeats sentence splitting), and the relay's audited `durationSeconds` comes from `usage.seconds`, the one duration the API actually returns.

   **Revised 16/08/26:** superseded in part by §20.5. The §20.2 sentence-scoring pass still cannot engage on hosted prose for the reason stated above, but a server-side LLM pass now drafts labels for the hosted path from text alone, no segments or punctuation required. Offsets remain unavailable on the hosted path; only the labelling half of this finding is closed.

6. **Reference-Recording Arm, For Continuity With 20.2:** rough parity with the local WASM baseline on anglicised TTS (both garble the TTS-Malay tokens; ILMU uniquely recovered "Okay can", uniquely stuttered once, and spells numerals out), deterministic there, 2.0 to 2.4 s. The TTS register cannot carry the Malay verdict, which is why the human-read sample exists.

### Decision, Applying The Rule Written In #151 Before Measurement

Tokens: ILMU beats local. Segments: fail (none delivered). **Ship the hosted path, with the prose-fallback caveat recorded:** hosted transcripts enter the app as paste-grade prose (unpunctuated, unsegmented, no draft speaker labels, no per-turn offsets), and the consent UI must not promise labelling on the hosted path. The devoicing family and the "phlegm" intrusion belong in the consent tooltip's accuracy framing (#155) rather than in a marketing sentence.

**Revised 16/08/26:** the "no draft speaker labels" half of this decision is superseded by §20.5, which drafts labels server-side from text rather than from segments. The consent UI now discloses that step (§20.4); the rest of this decision, including no per-turn offsets on the hosted path, stands unchanged.

**Limits, Stated Plainly.** n=1 reader, one phone microphone, a non-clinical room; one sample per register; token comparison rather than WER, per the 20.1 convention; the local arm ran in Node CPU rather than browser WASM. The devoicing overlap between both models suggests re-measurement with a clinic-grade microphone before treating it as a provider property. If the provider ships working `verbose_json` segments or punctuation later, the draft-labels verdict in finding 5 is the one to re-measure.

**Revised 16/08/26:** the capture-profile suspicion now has a shipped response: §20.6 turns off the browser's voice-call DSP at the microphone. Every figure in this section was captured with that DSP on; §20.6 holds the re-measurement protocol, and this section's verdicts stand until it runs.

**Cost Of The Whole Gate:** about RM 0.20 of the RM 20 early-access credit.

## 20.4 The Consent Gate (Resolves §19 Row 18)

**Status: `Built` (#155). Split in two by #228, half of it restored by #254.** This is the interaction that carries the governing rule above, and the only way a doctor can reach the relay shipped by #154.

### Two Controls, Two Questions

**Revised 06/09/26 (#254).** The gate is no longer one control. #228 replaced the whole of it with a standing device preference on the owner's decision 02/09/26, which answers the first question well and cannot answer the second at all: a remembered setting is one the patient after the consenting one never agreed to. Both now exist.

| Control                          | Question                          | Scope                                    | Where                       |
| -------------------------------- | --------------------------------- | ---------------------------------------- | --------------------------- |
| **Engine Preference** (#228)     | Where does audio go?              | This device, standing, in `localStorage` | `audio/AudioSettingsDialog` |
| **Consent Gesture** (#155, #254) | May this patient's audio be sent? | One consultation, remembered by nothing  | `audio/ConsentGate`         |

Neither reaches ILMU alone. Between 02/09/26 and 06/09/26 only the first existed, while the Audio dialog went on stating that each patient was asked. Nothing asked, and no test covered the claim, which is why it survived three weeks (#254).

### What Is Rendered

| Element                | Specification                                                                                             |
| ---------------------- | --------------------------------------------------------------------------------------------------------- |
| **Placement**          | Above the Record controls, so the disclosure and the tick are read before the button they enable          |
| **Presence**           | Rendered whenever the device engine is hosted, in every branch. Never conditional on a failure            |
| **Absence**            | Not rendered on the on-device engine, where nothing leaves the browser and a tick would be an offer       |
| **Emphasis**           | Muted body text and a plain checkbox. Never a button, never accented, never a highlighted card            |
| **Default**            | Unticked. Plain `useState`, so it resets on every mount and writes nothing to any storage                 |
| **Availability**       | Disabled unless the component is idle                                                                     |
| **Supplementary Note** | A keyboard-reachable, touch-usable disclosure beside the `ilmu-asr-v4.2` model name, carrying detail only |

**Placement moved from the foot of the tab to above the controls (#254).** A disabled button leaves the tab order, so at the foot a keyboard user reached Start and the file picker only to have both skipped, and arrived last at the one control that unlocks them. The invariance argument below was about the engine picker not reading as a rescue after a failure; that picker is gone, and what remains is a precondition rather than an offer.

### Why The Structure Carries The Rule, Not The Wording

The §19 row 18 tension was that the doctor on weak hardware is exactly the one offered the hosted path, at the moment of most frustration. Wording cannot fix that; placement and invariance can:

- **The Block Never Changes.** Identical presence, position and styling whether the doctor arrived fresh or after a stall, a dead worker or a refused microphone. Nothing about it is introduced by failure, so nothing about it reads as a rescue.
- **The On-Device Failure Copy Never Mentions Hosted.** Pinned by a negative test asserting the stall and worker-death messages match no `/hosted|ilmu|upload/i`. This is the regression most likely to be introduced by someone editing nearby copy in good faith.
- **Failure Degrades Toward Privacy In Both Directions.** A hosted failure offers on-device or paste and never silently runs the local worker, exactly as a local failure never silently uploads. No automatic switching exists in either direction.
- **Consent Is Not Transferable.** It dies with the component, so it cannot carry from one patient to the next. This is the property #228 lost and #254 restored, and it is the reason the gesture may never be folded back into the remembered preference however convenient that is.

### What The Copy Claims, And Why It Claims No More

The inline paragraph is the load-bearing text: the tradeoff is stated in the same breath as the choice, never behind the disclosure. It states the transit path (this browser, then our server in Singapore, then ILMU in Malaysia), that the choice is per consultation, and that it is audited.

**It deliberately does not claim that audio is unretained or withheld from training.** YTL's Acceptable Use Policy, which governs the ILMU API, grants processing "for the purpose of delivering, developing, and improving the Service" unless a negotiated agreement says otherwise. This project holds a self-serve early-access key and no such agreement, so the copy states that ILMU's standard early-access terms apply and that we have not varied them. An earlier draft of the consent text asserted "not kept after transcription, and is not used to train models"; neither claim is supportable and both were removed before build.

The disclosure cites the **PDPA as amended in 2024**, under which voice is biometric data and therefore sensitive personal data requiring explicit consent. That amendment is what makes this gate necessary rather than merely prudent.

**Revised 16/08/26 (#189):** the paragraph now additionally discloses the labelling step §20.5 adds: that the returned text is de-identified and sent to the note model to draft Doctor/Patient labels, the same disclosure standard as the transit and retention sentences above.

**Revised 06/09/26 (#254):** that disclosure claimed the doctor reviews the drafted labels line by line before they enter the transcript. #233 removed the review gate three days earlier and the copy stayed, the same failure as the consent claim in the same dialog. It now states what actually happens: the labels are applied unreviewed and travel with `labelsReviewed: false`, so the red-flag engine will not drop a trigger hit on a label nobody stood behind.

### Client Behaviour

| Concern            | Behaviour                                                                                                                                                                                                                                                                                            |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Fork Point**     | `media.onstop`, the audio-file picker and Try Again all route through one dispatcher reading both keys                                                                                                                                                                                               |
| **Mid-Run Switch** | Saving the Audio dialog to hosted during a recording is refused at that dispatcher, not by the controls, which were legitimately enabled when the run started. The blob is kept and Try Again sends it once agreed. It never falls back to the local worker: no silent switching in either direction |
| **Prewarm**        | A hosted recording skips the local prewarm and terminates any worker left warm by an earlier on-device run                                                                                                                                                                                           |
| **Upload Phase**   | A distinct `uploading` phase with no invented progress bar; the relay is one request with no midpoint to report                                                                                                                                                                                      |
| **Bound**          | 180 s via `AbortController`, plus Cancel and unmount. Expiry is reported; a cancel is not an error                                                                                                                                                                                                   |
| **Hardware Floor** | Does not apply to hosted, which loads no local weights. Choosing hosted reveals the controls without setting the local-path override                                                                                                                                                                 |
| **Failure Copy**   | One message for every upstream reason, so the provider's operational state never reaches a consulting-room screen                                                                                                                                                                                    |
| **Provenance**     | `asr_hosted` is sticky for the consultation once any hosted recording contributed, and never downgrades on a later local pass                                                                                                                                                                        |

**Follow-Up, Closed 16/08/26:** `docs/assets/tech-stack.drawio.png` and the doctor-journey diagram now draw the hosted adapter as `ilmu-asr-v4.2`, built, with the audio relayed through the API. The dashed outline remains because the provider sits outside the trust boundary.

### What Pins This, Added 06/09/26 (#254)

The claim outlived its control for three weeks because nothing connected the two. Three guards now do:

| Guard                                             | What It Prevents                                                                                                                        |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `AudioSettingsDialog.test.tsx`, the coupling test | The dialog claiming per-patient asking while no per-patient control renders. Both halves asserted in one test, so deleting either fails |
| `AudioCapture.test.tsx`, the consent describe     | The relay being reachable without the gesture, including the mid-run engine switch no disabled control can catch                        |
| The storage negative, extended to the tick        | The gesture ever being persisted, which is what turned it into a preference the first time                                              |

### Ambient Extends This, It Does Not Bypass It

§20.7 specifies continuous listening and says nothing about consent. When it is built (#219) the gesture has to cover the session rather than the recording, because a session has no `media.onstop` to gate. Two constraints carry forward unchanged: MMC 003/2023 wants consent obtained before capture for a stated single purpose, and the MMC AI guideline wants the patient told how AI is used before the consultation. Neither is satisfiable by a remembered device preference, which is the whole finding of #254. `ConsentGate` is a standalone component so that lift is a prop change rather than a redesign.

## 20.5 Hosted Draft Turns: Server-Side Split And Label

**Status: `Built` (#189).** Closes the labelling half of §20.3 finding 5 and the corresponding decision line.

### Why

The §20.2 sentence-scoring heuristic reads segment boundaries and punctuation, neither of which the hosted provider returns (§20.3 finding 5): no `verbose_json` segments, and a flat lowercase stream with no sentence marks. Code-switched Malay-English content also falls outside the English-only pattern tables (§20.2 limits). A local, rule-based split cannot engage on this input by construction, so the split and label step moves server-side and uses the note model instead of pattern rules.

### Mechanism

`POST /api/asr/draft-turns` (§13), session-guarded, own limiter (`draftTurnsRateLimit`, 5/min per client key), body `{ text }` trimmed to 1..30,000 chars (`MAX_DRAFT_TEXT_CHARACTERS`, reconciled with the 16,384-token output ceiling: the response echoes the input verbatim, and at a conservative 2.5 chars/token for code-switched Malay the echo is now per chunk rather than per request, so the ceiling has ample headroom; the cap remains the bound on how much text one request may submit, and therefore on the fan-out below):

1. `deidentify(text)` mints the branded content plus a request-scoped vault before anything leaves the API, the same PHI-boundary gate every other egress uses. `detected` labels are kept for the audit row.
2. **`sliceDeidentified` Cuts The Gated Value Into 600-Character, Whitespace-Bounded Chunks**, at most four in flight at once. Detail and rationale in §20.6 below.
3. `LLMClient.generate` **per chunk**, operation `draft_turns`, `temperature: 0`, `maxTokens: 16_384`, output constrained to `DraftTurnsResponseSchema` (`{ turns: [{ speaker: 'doctor' | 'patient', text }] }`, 1 to 600 turns, each turn's text 1 to 4,000 chars), system prompt in `backend/src/draft-turns/prompt.ts`.
4. **Reconstruction Guard** (`backend/src/draft-turns/reconstruction.ts`). The model's turns are trusted only for boundaries and speaker labels, never for their text. Each turn is canon-aligned word-for-word against the input (lowercased; letters, digits, `[]`, `_` kept, so a pseudonym token compares as one word), then the shipped turn text is re-sliced from the input's own characters, not from the model's. Punctuation and casing changes are forgiven during comparison but excluded from the output; a paraphrase, drop, reorder, translation, or split token discards the whole draft. This is stronger than a string diff: the guarantee is that shipped text is provably the input's own characters, not merely similar to it.
5. Per-turn `vault.rehydrate`, then a **second** schema parse against `DraftTurnsResponseSchema` after rehydration, because a restored span can push a turn past the 4,000-char cap. This failure is classified `not_reconstructed` and happens before the audit row is written.
6. Exactly one audit row is written after the LLM call is attempted: `asr.hosted_draft_labelled` on success or `asr.hosted_draft_failed` with a closed `reason` (`llm_failed` or `not_reconstructed`) on failure (§15). Pre-egress rejections (`401`, `400`, `429`, a `DeidentificationError`) write no row, mirroring the relay pair (§15).

### Chunking, And Why The Pass Needed It

Measured against production on 16/08/26, before chunking:

| Input       | Result                   |
| ----------- | ------------------------ |
| 180 chars   | labelled, 16 s           |
| 653 chars   | labelled, 19.5 s         |
| 1,335 chars | `502 draft_failed`, 22 s |

A real consultation is several thousand characters, so the pass failed on exactly the input it exists for, and the failure was invisible: the client swallowed it and delivered unlabelled prose.

**The Cause Is The Reconstruction Guard's Granularity, Not The Guard Itself.** Word-for-word alignment is all-or-nothing across whatever was submitted, so one drifted word in four thousand discarded every label. Shrinking the unit shrinks the blast radius without weakening the guarantee, because each chunk is still aligned and re-sliced in full.

- **`sliceDeidentified` (`backend/src/deid/index.ts`) Cuts The Value After The Gate, Never Before It.** Detection is context-sensitive: `Ahmad Ismail` is one `PATIENT` span only while the two words are adjacent, so de-identifying chunk by chunk would let an identifier straddling a boundary through. The whole text is gated once and the result is cut, so every piece inherits a guarantee the whole already earned.
- **It Lives In `deid/` Because That Module Owns The Brand.** Rebranding a substring anywhere else is the `as Deidentified` cast `no-stray-brand-casts.test.ts` fails the build on. The function takes a `Deidentified` and returns `Deidentified[]`, so it is a brand-preserving transform and cannot launder a raw string.
- **Cuts Land Only On Whitespace**, so a vault token can never be split into a `[PATIENT` and a `_1]` that no longer matches `TOKEN_PATTERN`. A single word longer than the budget ships whole rather than being cut.
- **`assertNoIdentifiers` Now Runs Per Chunk** rather than once per request, which is strictly more checking than the unsliced path.
- **600 Characters, At Most 4 Concurrent.** The size sits inside the range that was reliably passing rather than at its edge. The concurrency bound matters because `MAX_DRAFT_TEXT_CHARACTERS` is 30,000: unbounded fan-out would open up to 50 provider calls for one request, the unbounded-consumption shape `MAX_CONCURRENT_RELAYS` already guards against on the audio route (OWASP LLM10).
- **A Rejected Chunk Fails The Whole Pass.** Keeping the surviving chunks and giving the rejected one its neighbour's speaker was considered and refused: it fabricates attribution, presenting up to 600 characters of patient speech as the doctor's with nothing in the response marking it invented, and it would flow into the note and the red-flag engine that way. Failing is safe because the client's fallback is a real one (`proseToDraft`), drafting on-device labels that the review step already describes as guesses.

Measured after, same 2,543-character unpunctuated Malay stream: **11 turns, both speakers, every word verbatim, 37.9 s**, against a 150 s client deadline.

**A Rejected Chunk Costs Its Own Labels And Nothing Else.** Failing the whole pass was tried first and did not hold up: measured in production, a 2,543-character transcript still returned `draft_failed` at ~28 s, because all five chunks had to land. Chunking had shrunk the failure rather than removed it.

The span now ships with its text intact and `undrafted` set on the turn:

- **The Marker Is Server-Set Only.** `reconstructTurns` builds every returned turn from scratch, so a model emitting `undrafted` is ignored; pinned by a test.
- **`speaker` Is A Placeholder On Those Turns**, which is exactly what the marker tells the client not to trust. It is never merged into a labelled neighbour, because hiding it inside one would defeat the point.
- **The Client Renders It As Needing A Label**, not as a drafted one, and names the count above the list. Resolving it is the doctor's tap.
- **Every Chunk Failing Is Still A Failure**, so a model outage or a systematically rejected echo surfaces as `draft_failed` rather than as a transcript with no labels.

Verified against the real provider on the same 2,543-character stream, in a run where one chunk was genuinely rejected: **6 turns, both speakers, 1 marked undrafted, every word verbatim, 39.5 s**. The same run under the previous rule returned `draft_failed`.

### Failure Taxonomy And Fallback

One generic client-visible failure, `502 draft_failed` (`500 deid_failed` for the pre-egress de-identification failure, its own code so `errorHandler` classifies it `deidentification_error` in the drain rather than `model_error`), regardless of which of the two reasons above fired: error messages never carry model output. On the frontend, `AudioCapture.transcribeHosted` calls this endpoint after a successful relay under a new `labelling` phase (150 s deadline, `LABEL_TIMEOUT_MS`, sharing the Cancel/unmount `AbortController`). Any labelling failure, timeout included, silently delivers the unlabelled prose with no banner and no Try Again, exactly the pre-#189 behaviour: retrying would re-upload audio the relay already billed. A success feeds the same `SpeakerAssign` review-then-apply flow as the on-device path (§20.2), with `hosted-${i}` ids and no offsets, so an applied line serialises as `Doctor: text` with no `[m:ss]`. The local on-device recording path never calls this endpoint.

### Labels Remain Guesses

The output of this pass sits behind the identical explicit Apply gate as the on-device draft, for the same reason (§20.2, issue #70): a mislabel can only reach the transcript through the doctor applying it, never automatically. This endpoint drafts labels; it does not diarise, does not diagnose, and its output is not authoritative until a doctor applies it line by line.

### Gaps, Stated Honestly

- **No Per-Actor Spend Cap.** Same posture as the relay (§20) and `analyze` (§13): the 5/min limiter bounds request rate, not cumulative cost.
- **Not Tied To A Relay Having Happened.** Any authenticated session can call this endpoint with arbitrary text within the character bounds; it does not verify the text originated from `/api/asr/transcriptions`.

## 20.6 Capture Constraints: Dictation DSP Off (Addendum To §20.3)

**Status: `Built` (#191).** Ships alongside the red-flag devoicing tolerance (#192, `redflag-list-v6`) and the review-time mishear hints (#193); this section records the capture half and the protocol that judges it.

### What Changed

`AudioCapture` now requests dictation constraints instead of `{ audio: true }`:

| Constraint         | Value   | Why                                                                                                                                                      |
| ------------------ | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `echoCancellation` | `false` | AEC removes a far end that a dictation capture does not have                                                                                             |
| `noiseSuppression` | `false` | NS attenuates the low-energy consonant bursts separating b/p and d/t, the §20.3 devoicing family ("patut" for "batuk")                                   |
| `autoGainControl`  | `true`  | Two speakers sit at different distances from one microphone; a quiet far speaker costs more than gain pumping, and AGC changes level, not spectral shape |
| `channelCount`     | `1`     | The local path downmixes to 16 kHz mono anyway, and mono roughly halves a hosted upload against the relay's 25 MB cap                                    |

`new MediaRecorder(stream)` is deliberately untouched: default Opus is speech-transparent, and raising `audioBitsPerSecond` inflates a long consultation toward the same 25 MB cap for no measured benefit. A test pins the exact constraints object so a refactor cannot drift back to `{ audio: true }`.

### What This Rests On, And What It Does Not Claim

- The §20.3 limits paragraph already pointed at the phone-mic audio profile: both ASR arms devoiced the same words at the same spots, which a provider property would not explain.
- **Every §20.1 to §20.3 measurement was captured with the browser's voice-call DSP on.** That makes the DSP a plausible contributor, not a proven one.
- **No Re-Measurement Has Run Yet.** The §20.3 verdicts stand until the protocol below does.
- Constraint values are ideals per the mediacapture spec: a browser may honour none of them without erroring. `track.getSettings()` reports what actually applied, and every future measurement must record that readout beside its figures.

### Re-Measurement Protocol (Needs A Human Reader)

1. With this change running locally, one reader re-records the 99.2 s rojak script live through the Record tab, plus the §20.2 reference script as the English control arm (checks the on-device English path did not regress with NS off).
2. Tick the ILMU consent so the exact blob is visible as the relay request body in devtools; save it locally as `rojak-dsp-off.webm` (synthetic scripted audio per the §20.1 provenance rules; never committed). Record the `getSettings()` readout alongside it.
3. ILMU arm: `evals/asr-ab.ts` against the saved file, three runs, report under the gitignored `evals/reports/`.
4. Local arm: `evals/asr-ab.ts` posts to ILMU only, so the on-device comparison is the same session's Record-tab transcript, noted in the report.
5. Compare the §20.3 token-table devoicing rows (batuk, demam, denggi, semput, bengkak, tekak, tonsil) and record the verdict here. If devoicing persists with the DSP off on a decent microphone, it is a provider property, and `backend/src/redflags/mishears.ts` stays the primary mitigation.

**Corrected 06/09/26.** Step 5 previously named "the review-time hints (#193)" as the primary mitigation. Those hints no longer exist: #233 deleted `frontend/src/audio/confusables.ts` and `SpeakerAssign.tsx` in commit `2131592` and moved the safety they bought into `redflags/mishears.ts`. The distinction matters for anyone reading this protocol, because the two mitigations are not equivalent. The hints were shown to the doctor and could correct the transcript on a tap; `mishears.ts` expands confusables **inside the red-flag matcher only** and never changes a word the doctor reads. Devoicing that persists is therefore tolerated by the safety engine and still visible in the transcript, which is the intended behaviour and not a gap.

---

## 20.7 Live Ambient Capture: Mechanism, Models, And The Accuracy Chain

**Status: `Specified`.** Research recorded 05/09/26, ahead of implementation. This section supersedes the "Batch, Not Streaming, For V1" decision above, and states the model chain a reviewer will ask about, including the question they always ask last: what corrects the speech recogniser.

> **Revised In Part, 06/09/26. Read §20.10 First, Then §20.9.** The provider changed twice in one day: to ILMU for want of a sign-off, then to Soniox when the sign-off was granted. The transport changed too, and §20.9's reasoning is untouched by it, because both of the reasons below for having no socket were about a socket through our own API rather than one from the browser to a provider. The transport, the segment window, the accuracy chain and the rejection of a transcript-rewriting pass all stand. **The provider does not.** Live transcription moves from `qwen3-asr-flash` to `ilmu-asr-v4.2`, because a second audio egress needs a human sign-off that does not exist. The rows below still name Alibaba and are left standing rather than rewritten, because the measurements behind them are a true record and two probes in §20.9 can still send the design back to them.

### Why This Reopens A Closed Decision

"Batch, Not Streaming" rested on three reasons. Only one has changed, and it is the one that was conditional.

| Original Reason                                                                                                                  | Status Now                                                                                            |
| -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Latency is already sufficient, "streaming buys a margin nobody has asked for"                                                    | **Overturned.** The margin has now been asked for, by name, as the product's defining feature         |
| Integration cost: posting chunks reuses the request and response shape the codebase has everywhere, a WebSocket session does not | **Still Holds, And Decides The Transport.** The design below posts chunks and opens no socket         |
| Exposure surface: a continuously open audio stream is materially larger than discrete posts of bounded chunks                    | **Still Holds, And Decides The Transport.** Segments stay discrete, bounded, and individually audited |

Two of the three survive intact. They are not arguments against ambient capture, they are arguments about how to carry it, and the design follows them rather than overriding them.

### The Mechanism

Ambient capture is **segmented batch transcription at conversational cadence**, not a socket. The microphone stays open for the whole consultation, the audio is cut into short segments on natural pauses, and each segment makes one ordinary HTTP round trip.

```
mic (open for the session)
  |
  v
RMS silence detector          cut at a pause; floor 8 s, ceiling 20 s; silent segments dropped
  |
  v
segment blob (webm/opus)      POST /api/asr/live-segments   (one request, one response)
  |
  v
relay to qwen3-asr-flash      text and detected language return in that same response
  |
  v
running transcript            browser memory only, until the doctor finishes
  |
  |--- every segment -------> red-flag rules       deterministic, in-process, no model
  |--- every 12 s or more --> de-identify, extract facts, derive gaps
  |
  v
Finish                        speaker labelling, then the existing full analysis, unchanged
```

**Floor Revised 05/09/26.** This diagram first specified a 4 second floor. Measured on real speech, a 4 second floor costs 23.5 points of Malay word error against the whole file, where an 8 second floor costs 1.5. A batch model called once per chunk starts cold each time and loses the surrounding speech it uses to disambiguate, so the penalty is measured in multiples rather than percentages. See 20.8.

**Why no socket to our API, which is not the same as no socket at all (revised 06/09/26, §20.10).** The reasoning below is unchanged and still correct about the API. It does not reach a socket from the browser to a provider, which is what ambient capture now opens: the rewrite is not in that path and no cookie travels on it. The browser reaches the API only through the Vercel rewrite that makes the session cookie first-party (§17, issue #156). That rewrite proxies HTTP and server-sent events but not WebSocket upgrades, and a direct browser-to-Render socket would lose the cookie and reintroduce the mobile lockout. A provider socket held by the API is possible, and is the phase 2 option, but it is not needed to reach conversational cadence.

**What The Doctor Experiences.** Text appears a beat after each pause rather than word by word: expected 2 to 4 seconds from the end of an utterance, worst case around 14 seconds if nobody pauses and the ceiling forces the cut. The pane that matters most for safety does not wait on a model at all.

### Every Model In The Chain

"Which model does what" has one answer per stage, and each stage names the control that bounds it.

| Stage                              | Model                                                   | Runs On                           | May Do                                                                             | May Never Do                                                                                                                                                                                                                                         |
| ---------------------------------- | ------------------------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Segment the audio                  | **None.** RMS energy over an `AnalyserNode`             | Browser                           | Cut on silence, drop silent segments                                               | Discard speech without the segment counter showing it                                                                                                                                                                                                |
| Live transcription                 | **`qwen3-asr-flash`** (Alibaba Model Studio, Singapore) | Provider, via our relay           | Audio to text, detect the language                                                 | Return text that any route trusts unvalidated                                                                                                                                                                                                        |
| Batch transcription                | **`ilmu-asr-v4.2`** (ILMU, Malaysia)                    | Provider, via our relay           | Audio to text                                                                      | **Revised 06/09/26 (§20.9): This Path Is No Longer Untouched By Ambient Work.** The same adapter now also carries the live segment relay, on the same single outbound `fetch`. What it may never do is return text that any route trusts unvalidated |
| On-device transcription, unchanged | **`onnx-community/whisper-small`**                      | Browser, WebGPU or WASM           | English and Manglish to text                                                       | Be pointed at Malay, Tamil, Mandarin or Cantonese (§20.1 finding 2)                                                                                                                                                                                  |
| Mishear expansion                  | **None.** Fixed table, `redflags/mishears.ts`           | Our API, in-process               | Expand measured confusables **inside the matcher only**, keeping an index map back | Change one character of what is quoted to the doctor                                                                                                                                                                                                 |
| Red flags                          | **None.** Pure functions, `redflags/`                   | Our API, in-process               | Raise flags from the raw transcript                                                | Be filtered, reordered or suppressed by any model (§10)                                                                                                                                                                                              |
| Live fact extraction               | **`qwen3.7-flash`** via `LLMClient`                     | Provider, after de-identification | Fill the closed 34-field schema, each assertion carrying a verbatim span           | Assert `PRESENT` or `DENIED` without a span that appears in the transcript; §21.4 downgrades it                                                                                                                                                      |
| Speaker labelling, at Finish       | **`qwen3.7-flash`** via `LLMClient`                     | Provider, after de-identification | Propose turn boundaries and Doctor or Patient labels                               | Alter a single word; `draft-turns/reconstruction.ts` re-slices every turn from the input                                                                                                                                                             |
| Note and suggestions, at Finish    | **`qwen3.7-flash`** via `LLMClient`                     | Provider, after de-identification | Write the SOAP note, cite guideline IDs                                            | Cite free text, state a diagnosis, or suppress a rule hit                                                                                                                                                                                            |

Two properties of that table carry the whole safety argument. **The only stage that can raise a red flag runs no model.** And **every model stage is either schema-constrained, span-checked, or structurally unable to change the words it was handed.**

### Is There A Post-Cleaning Model? No, And The Reason Is The Point

The obvious way to fix a noisy multilingual transcript is to hand it to a language model and ask it to tidy up the speech recognition. **This system does not do that, and must not.** The rejection is recorded here because it is the first optimisation a reasonable engineer reaches for.

| Why A Transcript-Rewriting Pass Is Rejected    | Detail                                                                                                                                                                                                                                                                                                                                   |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| It silently voids the primary control          | `hasVerbatimEvidence` (`analysis/evidence.ts`) accepts an assertion only when its evidence span appears in the transcript text. Clean the transcript first and every span still matches, because the span is now checked against the model's own prose. The control keeps reporting green while quoting sentences the patient never said |
| It deletes a guard that is already shipped     | `draft-turns/reconstruction.ts` exists precisely so a model may label speech and never rewrite it, aligning word for word and re-slicing from the input. A post-cleaner is that guard removed and inverted                                                                                                                               |
| Correction and hallucination are one operation | Turning "patut" into "batuk" is a fix. Turning "no chest pain" into "some chest pain" is the harm this system exists to prevent. At the text layer both are a model improving fluency, and nothing downstream can tell them apart                                                                                                        |
| The literature puts the failure exactly here   | Ambient notes carry more hallucination than physician notes, 31% against 20% (§21.6). A generative pass upstream of the note moves work into the layer that is already weakest                                                                                                                                                           |

**What Does The Accuracy Work Instead.** Four layers, in the order they act. None of them rewrites the transcript.

| #   | Layer                                      | Mechanism                                                                                                                                                                                                                                                                                                                  | State                   |
| --- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| 1   | Recognition-time biasing                   | A static, versioned Malaysian clinical vocabulary passed to the recogniser as hotwords or context, so likely words are recognised correctly the first time. It shapes the transcript before it exists rather than editing it afterwards                                                                                    | To build with the relay |
| 2   | Mishear-tolerant matching                  | `redflags/mishears.ts` expands measured confusables ("patut" to "batuk", "teman" to "demam", "tenggi" to "denggi") **only inside the matcher**, and carries an index map so a matched span is cut from the original text. The doctor is always shown the words that were actually recorded                                 | **Built** (issue #193)  |
| 3   | Structured extraction as the cleaning step | This is where normalisation legitimately happens. A noisy, code-switched transcript goes in; a closed 34-field schema comes out, in English, every `PRESENT` or `DENIED` carrying a verbatim span, anything unsupported downgraded to `NOT_ASSESSED` rather than guessed. The messy text is interpreted, never overwritten | **Built** (§21.4)       |
| 4   | The doctor                                 | The note is a draft. Editing is expected, approval is an explicit transition, and the transcript sits beside the note for exactly this reason                                                                                                                                                                              | **Built**               |

**The One Admissible Form Of Post-Correction** is a suggestion the doctor accepts or rejects. It shipped once as one-tap Malay mishear hints (issue #195) and was removed with the draft-label review (#233). If it returns for ambient mode, it returns in that shape: a proposal on screen, never an automatic edit, and never a rewrite of stored text.

### Provider Research, And An Unexplained Gap In The Record

| Provider And Model                                                       | Malaysian Language Coverage                                                                                                                                                                                                                                    | Real Time                                                                                     | Residency                                                           | Position                                                                                                             |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **`qwen3-asr-flash`**, Alibaba Model Studio Singapore                    | English, Malay, Mandarin, Cantonese, Hokkien, Indonesian and more, with automatic language identification. **Tamil is on no Alibaba ASR language list**                                                                                                        | File calls at low latency; a realtime sibling exists                                          | Singapore, the endpoint and key family already accepted for the LLM | **Recommended.** Already measured here, see below                                                                    |
| `ilmu-asr-v4.2`, ILMU                                                    | **Vendor Claims English, Bahasa Malaysia And Mandarin, "Including Natural Code-switching And Background Noise"** (model page, read 06/09/26). Malay measured here (§20.3); Mandarin unmeasured in this repo. Tamil and Cantonese absent from the vendor's list | Batch as an API, but RTF 0.024 (§20.3) makes segmented batch viable at conversational cadence | Malaysia, the strongest residency answer available                  | **Under Revision, See §20.9.** Previously "keep unchanged as the in-country batch option"                            |
| `onnx-community/whisper-small`, on device                                | English and Manglish. Other languages come back rewritten into English rather than transcribed                                                                                                                                                                 | No, real-time factor 1.5 to 3.0 on clinic hardware                                            | The device                                                          | Keep as the privacy floor                                                                                            |
| `mesolitica/malaysian-whisper-*`                                         | Malay, Manglish, Mandarin, Tamil                                                                                                                                                                                                                               | No                                                                                            | Would need a self-hosted GPU                                        | Still the roadmap item of §20.1. No ONNX build published, and §20 rules out self-hosting                             |
| Azure AI Speech Southeast Asia, Google Speech-to-Text v2 asia-southeast1 | Include Tamil, with continuous language identification                                                                                                                                                                                                         | Yes                                                                                           | Singapore                                                           | **Named Remediation For Tamil Only.** A second vendor and a new privacy assessment row, so not adopted speculatively |

**Correction, 06/09/26: the ILMU row said "Malay and English only" and that was wrong.** The vendor's own model page lists Mandarin alongside English and Bahasa Malaysia. The error mattered rather than being cosmetic: language coverage is one of the two grounds on which this table excluded ILMU from the ambient path, and the exclusion was therefore resting on a claim nobody had checked against the vendor. It came from the same 15/08/26 session as §20.3, which is the second time a capability finding from that session has proved dated, so the standing lesson in §21.2 now has two instances behind it rather than one. What the correction does **not** supply is a measurement: the Mandarin claim is the vendor's, and this repo has measured ILMU on Malay and English only.

**The Gap Worth Naming.** §20.1 measured `qwen3-asr-flash` on 13/08/26 against both Whisper sizes on a Manglish sample. It won on every token in that table, ran fastest at 2.8 s for 49.7 s of audio, and was byte-identical across three runs. It then appears nowhere else in this document, and the hosted path shipped on ILMU instead. The reason was almost certainly residency, ILMU processing in Malaysia against Alibaba in Singapore, which is a defensible call. **It was never written down.** This section records the gap, because the best-measured option for exactly the language problem the client cares about was measured and then set aside without a rationale a reviewer could check.

**Tamil Is The Honest Limitation.** No provider on the shortlist that satisfies the residency posture transcribes Tamil. The product says so plainly on the capture surface rather than degrading quietly, which is the same rule §20.1 finding 2 already imposes for declaring a language wrongly.

### 20.7.1 Measured: Reachability, Containers, And The Context Effect

Measured **05/09/26** against the production `QWEN_API_KEY` already in the Render service. A capability probe, not a benchmark, run to answer whether the recommendation above is even reachable before any of it is built. One sentence per condition, one synthesised voice, no ground-truth corpus, so **no word error rate is reported and none should be quoted from this**.

**Sample Provenance.** Two clips generated locally by Windows text-to-speech at 16 kHz mono: one English clinical sentence, one Malay clinical sentence. No patient data, real or simulated. Neither clip is committed.

**Reachability, Settled.**

| Question                                        | Answer                                                                                                                                                                                                                                                                 |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Does the existing key reach ASR at all          | **Yes.** `qwen3-asr-flash` answers on the key already in production                                                                                                                                                                                                    |
| Which host                                      | **`dashscope-intl.aliyuncs.com`, Unchanged.** The workspace-scoped `{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com` form in the current documentation is not required for this account, so `ALIBABA_ASR_BASE_URL` can reuse the host `QWEN_BASE_URL` already names     |
| Which request form                              | Both work. The DashScope form at `/api/v1/services/aigc/multimodal-generation/generation`, and the OpenAI-compatible chat form at `/compatible-mode/v1/chat/completions`. Audio goes in as a base64 data URI on either                                                 |
| Is there an OpenAI-style transcription endpoint | **No.** `/compatible-mode/v1/audio/transcriptions` drops the connection rather than answering, confirming §20.7's note that the ILMU adapter is a pattern to copy, not a client to reuse                                                                               |
| Sibling models                                  | `qwen-audio-3.0-asr-flash` and `fun-asr-flash-2026-06-15` both exist on this key but reject this request shape with `UNSUPPORTED_FORMAT: format is empty`. They need a `format` parameter this probe did not send. Not pursued, because the recommended model answered |
| Latency                                         | 429 ms to 865 ms for clips of 2 s to 7.8 s. Real-time factor near 0.1, an order of magnitude inside what the segment cadence needs                                                                                                                                     |
| Billing unit                                    | Whole audio seconds, reported per call as `usage.seconds`                                                                                                                                                                                                              |
| Unrequested extra                               | Every response carries an `emotion` annotation. It is not asked for and must not be surfaced, stored, or acted on. The same clip returned `sad` on one call and `neutral` on another, which is reason enough on its own                                                |

**Containers, And Why This Decides The Browser Path.** Raw WAV, `webm/opus` and `ogg/opus` are all accepted directly, with identical transcription. A 5.7 s clip is **16 KB as `webm/opus` against 183 KB as WAV**.

The consequence is that `MediaRecorder` output goes to the provider **as recorded**. No AudioWorklet, no PCM re-encoding, no second code path in the browser, and a segment small enough that the 2 MB route cap in §20.7 is roughly two orders of magnitude of headroom rather than a real bound.

**The Context Effect, Which Is The Finding That Matters.** All five conditions below are the same Malay clip with `language: "ms"`, varying only the system context. Ground truth is _"Doktor, saya batuk sudah lima hari, demam pun ada. Tekak sakit sangat."_

| Condition                                          | Returned                                                                     | Reading                                            |
| -------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------- |
| No context                                         | "Dr. Sayyabah Taksudali Maharaj, D. Mampun ada, Tekak Saki Tsangat."         | Unusable                                           |
| Generic Malay prose, no clinical words             | "Doktor, saya betul sudah lima hari, di mampun ada, tekak saya kecenggat."   | Large recovery from language priming alone         |
| **Clinical Malay Vocabulary, None Of The Answers** | **"Doktor, Saya Betah Sudah Lima Hari, Demam Pun Ada, Tekak Sakit Sangat."** | **One Word Wrong. The Effect Is Real And General** |
| Clinical Malay vocabulary including the answers    | "Doktor, saya batuk sudah lima hari, demam pun ada, tekak sakit sangat."     | Verbatim, but this condition is circular           |
| English clinical context                           | "Doktor Sayyabatuk Sudad Limahari, di Mampandai, Tekak Soket Sangat."        | Worse than nothing                                 |

The third row is the load-bearing one, and the fourth exists to make the third honest. **The first attempt at this measurement put the answer words in the context and proved nothing.** Re-run with a clinical vocabulary containing none of the sentence's content words, the recogniser still recovered "demam pun ada" and "tekak sakit sangat" verbatim, neither of which it had been shown. The effect is domain and language priming, not keyword injection.

**Three design consequences follow, and they change §20.7's layer 1 from plausible to evidenced.**

| Consequence                                                                                              | Detail                                                                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| The hotword and context prompt is not a refinement, it is the difference between usable and unusable     | It carried the same clip from nonsense to one wrong word. Layer 1 is the highest-value part of the accuracy chain to build first, and it costs one static versioned data file              |
| The context must be written in the target language                                                       | English context scored **worse than no context at all**. A single English vocabulary list serving every language would actively harm the non-English consultations this feature exists for |
| ~~Automatic language identification is not sufficient on its own~~ **Retracted the same day, see below** | The claim was drawn from a sample that could not support it. Corrected immediately below                                                                                                   |

#### Retraction: Language Detection Was Not The Problem

The row struck through above was wrong, and it is corrected here rather than quietly edited, because it was published before the measurement that tests it.

**What It Said.** That automatic language identification could not be relied on, and that ambient capture would therefore need a language the doctor sets per consultation.

**What It Was Based On.** One observation: the anglicised Malay clip, left to auto-detect, was labelled `en`. That clip is an English voice reading Malay text, so it is acoustically English. Labelling it `en` is defensible behaviour, not a failure, and no conclusion about language detection can rest on it.

**What The Follow-Up Measured.** Two further conditions, on the same day.

| Audio                                                               | Context Supplied  | Detected | Transcript                      |
| ------------------------------------------------------------------- | ----------------- | -------- | ------------------------------- |
| Genuine English speech                                              | none              | `en`     | Verbatim                        |
| **Genuine Mandarin Speech**, from the provider's own text to speech | **None**          | **`zh`** | **Verbatim, Homophone Aside**   |
| Genuine Mandarin speech                                             | Chinese clinical  | `zh`     | Identical to the no-context run |
| Genuine Mandarin speech                                             | four-language mix | `zh`     | Identical to the no-context run |

**Detection Works, Unprompted, On Audio Genuinely Spoken In A Language.** Mandarin was identified and transcribed correctly with no context at all, and neither a Chinese context nor a four-language context changed the result. **No per-consultation language picker is needed**, and §20.7 should not carry one.

**The real constraint is narrower, and it is about the context rather than the detection.** A single-language context rescued the acoustically ambiguous Malay clip; a four-language context did not, and left it on `en`. So:

| Situation                     | Behaviour                                                                                                                    |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Audio clearly in one language | Detection is correct with no context. A multilingual context is harmless                                                     |
| Audio acoustically ambiguous  | Detection follows the acoustics. Only a **single-language** context pulls it back                                            |
| Consequence                   | The context that helps most cannot be chosen until the language is known, and the language is knowable from the audio itself |

**The Design That Follows Needs No User Interface At All.** Detect the language from the opening segments with no context, then apply the matching single-language clinical vocabulary for the remainder of the session, revising if detection shifts. That is strictly better than asking the doctor, because it costs nothing at the point of care and cannot be set wrongly and left.

**Still Unmeasured, And The Reason The Register Row Stays Open.** Genuinely spoken Malay, by a human, remains untested: the vendor's text to speech offers no Malay voice, and the machine used here carries only English and Russian. Mid-sentence code-switching, the actual Malaysian consultation register, is untested. Tamil is absent from the vendor's list entirely. The Mandarin result also pairs one vendor's speech synthesis with the same vendor's recogniser, which is a favourable match and is not evidence about a human speaker.

**One word stayed wrong, and it is the word this repository has already met twice.** "batuk" came back as "betah" and "betul", where §20.3 measured both other engines hardening it to "patut". **It cannot be fixed in layer 2:** "betul" is the everyday Malay word for "correct", so adding it to the `mishears.ts` confusables table would raise a cough flag on any sentence agreeing with the doctor. That module's own header already refuses to widen for exactly this reason. Recognition-time biasing is therefore not merely the cheapest place to fix "batuk", it is the **only** place the layered design permits it to be fixed, which is a stronger argument for layer 1 than the one §20.7 was written with.

**Chunking, One Encouraging Data Point.** A 2 s slice cut mid-sentence returned _"Doctor, I have had a bad."_ It truncated where the audio truncated and invented no completion. Compared with the repetition loops §20.1 measured from Whisper under stress, a recogniser that stops cleanly at a cut is the behaviour segmented capture depends on. One clip is not a boundary-loss measurement, and the segmented-against-whole comparison in the table below still has to be run.

**What This Does Not Establish.** The Malay clip is an English voice reading Malay text, so it is anglicised, which §20.3 already ruled out as a basis for any Malay verdict. It is plausibly harder than a Malay speaker, which makes the context effect more striking rather than less, but the direction of that bias is an argument and not a measurement. **This does not establish Malay accuracy.** Tamil, Mandarin and Cantonese were not tested at all. The human-read, per-language corpus remains the gate.

### What Must Be Measured Before This Is Built

§20.1 is a smoke test on one 50-second casual sample, and is cited as one. Ambient capture needs more before any claim reaches a client.

| Measurement                                                                                                   | Why It Gates The Build                                                                                                                |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Word or character error rate per language: Manglish, Malay, Mandarin, Cantonese, Tamil, accented English      | The client will test these personally. A measured number is the only honest answer                                                    |
| Language identification accuracy on code-switched speech                                                      | Automatic identification is the feature being relied on, and §20.1 finding 2 is what happens when a language is called wrongly        |
| Segmented against whole-file penalty, at 8, 10 and 12 second cuts                                             | Cutting speech into segments costs accuracy at the boundaries. If that cost is large, layer 1 matters more, or phase 2 arrives sooner |
| ~~Container acceptance, and the exact Singapore endpoint for this account~~ **Answered 05/09/26, see 20.7.1** | `webm/opus` is accepted exactly as `MediaRecorder` produces it, on the host already configured. No PCM path is needed                 |
| Utterance to on-screen latency, median and 90th percentile                                                    | The claim being made is real time. It is measured, or it is not made                                                                  |

Reports land in the gitignored `evals/` reports directory and the numbers come back into this section. Nothing about per-language support is said to a client before that table exists.

## 20.8 How This Design Compares To Industry Practice

**Status: `Specified`.** Research recorded 05/09/26 against vendor API documentation, peer-reviewed literature and independent benchmarks. Written because a reviewer will ask what everyone else does, and because two of the answers changed decisions in 20.7. Full source list in the gitignored `evals/reports/` alongside the measurements.

### The Finding That Matters Most: Nobody De-Identifies Before The Model

This is the largest single divergence between this system and the industry, and it runs in our favour.

| Evidence                                                                                                                                                                                                                                                           | Detail                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Abridge names OpenAI and Google Cloud as subprocessors on its own trust centre, with no de-identification claim anywhere on it                                                                                                                                     | Transcript content reaches a third-party model bearing identifiers, governed by contract rather than by transformation |
| A deployed scribe reporting 2.33 million encounters describes its pipeline in a peer-reviewed paper as audio, then speech to text, then model, then template, then clinician review. **No de-identification or redaction step appears in the architecture at all** | This is not an oversight in one product, it is the shape of the category                                               |
| The Joint Commission and CHAI joint guidance, September 2025, does not require de-identification before data reaches a model                                                                                                                                       | The governing guidance sanctions the contractual posture                                                               |
| AWS states plainly that its own redaction feature "does not meet the requirements for de-identification under medical privacy laws, such as HIPAA"                                                                                                                 | The vendor selling redaction declines to call it de-identification                                                     |

**The industry answer is a contract; ours is a transformation plus a contract.** Every major model host is available under a business associate agreement, so the standard posture is to bring the model inside the compliance boundary rather than to strip identifiers before it. That is defensible and it is what the regulators have blessed. It is also weaker than a gate that fails closed, and it depends entirely on the paper holding.

Two corroborations of positions this document already took:

- **Voice Is Itself An Identifier.** The HIPAA Safe Harbor list names biometric identifiers "including finger and voice prints" at 45 CFR 164.514(b)(2)(P). That is the same conclusion 20.4 reached from the PDPA 2024 amendment, arrived at from a different statute. It also means transcript redaction alone can never de-identify an ambient pipeline, which is exactly why the audio path is governed by consent and bounds rather than by the gate.
- **"Risk Reduction, Not Anonymisation"** is the correct framing, and AWS's disclaimer is the strongest available external support for it.

### Where This Design Matches Industry Practice

| Decision Here                                                      | Industry Position                                                                                                                                                                                       | Evidence                                                                                                                                                           |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Cascaded pipeline: speech to text, then a language model over text | The standard, and the evidence for it is stark. Measured unsupported-claim rates: human notes 0.01, cascaded 0.21 to 0.23, **end-to-end audio models 0.99 to 1.00**                                     | An end-to-end audio model produces an unsupported claim in essentially every note. Our separation is not conservatism, it is the difference between usable and not |
| Evidence-bound assertions, every claim carrying a verbatim span    | AWS HealthScribe emits `{EvidenceLinks[], SummarizedSegment}`, one sentence per cluster of transcript segments. Abridge ships the same idea as Linked Evidence. The academic form is Cluster2Sent, 2020 | We arrived at the same structure independently and it is the strongest pattern in the field                                                                        |
| Full note generated once, at the end                               | AWS HealthScribe generates only on an explicit end-of-session event and has no incremental mode. Nabla has no streaming note endpoint                                                                   | Our decision to run the 20 second pipeline once at Finish is the industry norm, not a compromise                                                                   |
| No transcript-rewriting correction pass                            | **No Vendor Documents An ASR Post-Correction Stage.** Nabla instead verifies downstream, splitting the finished note into atomic facts and checking each against the transcript                         | 20.7's rejection was reasoned from our own controls. The industry reached the same place                                                                           |

On that last row the research is unusually decisive. Language-model correction of speech output helps when error rates are high and the corrector is fine-tuned on that recogniser's own mistakes with access to its alternative hypotheses. It hurts in the low-error regime with a general model seeing only final text, which is our situation. A practitioner benchmark found hallucinations in roughly a quarter of cases and concluded the technique is not a breakthrough; Apple's research finds a small specialised model beats a large language model at this with fifteen times fewer parameters. The named failure modes are over-correction of rare proper nouns, which in a clinic means drug and patient names.

### Where This Design Leads

| Ahead On                                              | Why It Matters                                                                                                                                                                                                                                                       |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **De-Identification Before Egress**                   | See above. The category does not do this                                                                                                                                                                                                                             |
| **Deterministic Red Flags The Model Cannot Suppress** | No industry equivalent was found. The only randomised trial names **negation-detection failure as a counted error class**: "denies chest pain" recorded as chest pain. That is precisely the failure a rules-first engine prevents and a model-mediated one produces |
| **Live Safety And Information Panes**                 | No reviewed system generates these panes live. This differs from shipped practice and adds an implementation risk.                                                                                                                                                   |

### Where This Design Is Behind

| Behind On                     | Industry Practice                                                                                                                       | Consequence                                                                                                                                                             |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Session Resumption**        | AWS HealthScribe resumes against the same client-supplied session id, any number of times, within five hours                            | We have nothing. A dropped clinic connection currently loses the consultation, and this is the clearest gap the comparison exposed                                      |
| **Incremental Note Assembly** | Nabla accepts the previous note plus only the new transcript and folds the delta in, explicitly to avoid resending a growing transcript | 20.7 plans to re-extract over the whole running transcript every cycle. The fold is cheaper and will churn the screen less. **Adopt it**                                |
| **Partial Results**           | Streaming vendors emit revisable partial text in 200 to 500 ms and finals in 0.7 to 4 seconds                                           | Segmented batch shows the doctor nothing until a segment closes. The screen is empty for the whole segment, which is the real experiential cost of the transport choice |

| **Update Policy For A Live Panel** | Online summarisation research measures screen churn directly, and zero-erasure policies exist | Answered in 20.8.1. Adopt a forced-prefix fold rather than regenerating the panel each cycle |

### What The Clinical Literature Says About The Product Category

These findings bound what the evidence supports; they do not describe implementation.

| Finding                                               | Number                                                                                                                                                       | Consequence Here                                                                                                                                                         |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Omission Is The Dominant Failure, Not Fabrication** | 18% of notes carried accidental omissions against 11.5% hallucinations, n=356                                                                                | The missing-information panel addresses the most common documented failure mode.                                                                                         |
| **A Minority Of Notes Carry Serious Risk**            | 5.3% of notes contained an error posing serious or imminent risk                                                                                             | The single best citation for why approval must be an explicit clinician act and never a default                                                                          |
| **Time Savings Are Not Established**                  | In the only randomised trial the market-leading scribe showed no significant reduction in documentation time. Burnout and task load improved in both arms    | The trial found no significant reduction in documentation time; burnout and task load improved in both arms.                                                             |
| **Documenting Is Not Acting**                         | Across 20,302 notes, AI-scribed notes recorded significantly more symptoms yet the clinician was **less** likely to intervene                                | A caution for systems that surface red flags: surfacing is not the outcome; acting is                                                                                    |
| **Speech Recognition Hallucination Tracks Silence**   | Roughly 1% of segments in one corpus, rising with non-vocal duration, and 38% of those carried explicit harm                                                 | The patients who pause are the elderly, the breathless, the distressed and anyone speaking through an interpreter. This is a fairness argument, not only an accuracy one |
| **No Standard Benchmark Exists**                      | A scoping review found 7 qualifying studies and only 2 public datasets, and named the absence of standard hallucination and error metrics as the central gap | There is no standard benchmark for comparison. Report the evaluation method; PDQI-9 with a severity scale is the closest available convention                            |

### 20.8.1 The Published Work Closest To This Design

Four results found 05/09/26 that bear on choices made elsewhere in this document. Two validate a decision, one fills a gap this section had listed as undocumented, and one is a warning about how the system is evaluated.

**Writing the note from the transcript, rather than from extracted facts, is the higher-groundedness choice.** FactsR (Corti, 2025) is the closest published analogue to live ambient generation: a sliding window over transcript turns, a draft-evaluate-refine loop producing structured Facts during the consultation, then a note generated from the Facts and a template rather than from the transcript. Its own measurements:

| Pipeline                        | Completeness | Conciseness | Groundedness |
| ------------------------------- | ------------ | ----------- | ------------ |
| **Transcript Straight To Note** | 0.802        | 0.851       | **0.971**    |
| Facts to note                   | 0.814        | 0.878       | 0.922        |
| Facts to note, refined          | 0.931        | 0.948       | 0.914        |

Every intermediate-representation variant scored **lower on groundedness** than going straight from the transcript. An extraction layer is another place for a fact to be distorted before the writer ever sees it, and the refinement that buys completeness costs the most groundedness of all.

That result supports the arrangement in section 12: `clinical_facts` and `note_and_gaps` run **concurrently over the same transcript**, and the note is deliberately not written from the assertions. What was recorded there as a latency optimisation turns out to be the grounding-optimal shape as well. **Keep it.** The live pass planned in 20.7 reuses the extraction half to drive the patient card and the gap checklist, which is the correct use of an intermediate representation, and it must not become the source the note is written from.

**The Churn Problem Has A Published Metric And A Published Answer.** This section listed screen churn as undocumented across the industry. It is undocumented among vendors, but not in the literature. Online summarisation research defines **Normalized Erasure**, the volume of previously shown output later retracted, and measures five update policies against it:

| Policy                                                         | Erasure  | Cost              | Note                                                                                               |
| -------------------------------------------------------------- | -------- | ----------------- | -------------------------------------------------------------------------------------------------- |
| Full rewriting each cycle                                      | **13.8** | highest           | Authors report "excessive rewriting" causing "high cognitive strain" even where fluency rated well |
| **Sliding Window With The Previous Output Forced As A Prefix** | **0**    | about 1.8x tokens | Best intermediate quality of the set                                                               |
| Independent chunk summaries                                    | 0        | lowest            | Worst quality                                                                                      |

Zero erasure is achievable, and it costs roughly 1.8 times the tokens. For a panel a doctor reads while talking, never retracting a line that has already been shown is worth more than the token saving. This is the concrete mechanism behind the fold that 20.8 recommends adopting from Nabla, and it supersedes "re-extract and re-render each cycle" as the live update policy.

**A language model cannot be used to catch the failure mode that matters most here.** Omission is the dominant documented failure of ambient notes, at 18% against 11.5% for hallucination. A 2026 study measured how well language-model judges detect each:

| What The Judge Is Asked To Find           | Discrimination   |
| ----------------------------------------- | ---------------- |
| Content that was added and is unsupported | 0.79 to 0.94     |
| **Content That Is Missing**               | **0.50 To 0.63** |

At 0.50 a judge is guessing. **Judges verify presence, not absence.** A dedicated per-fact pipeline recovered only 24.6% to 36.9% of omissions at a 2.7% to 6.2% false-alarm rate.

Published findings support the gap engine's shape in section 12. `deriveGaps` does not ask a model what is missing. It enumerates a fixed checklist and reports every field whose assertion state is `NOT_ASSESSED` or `UNKNOWN`, which is absence detection by construction rather than by judgement. Any future proposal to replace it with a model that reads the note and lists what is absent should be refused on this evidence.

**Two Cautions About Evaluation And Claims.**

- An audit of three deployed commercial scribes over 142 consultations found **31.3% of notes carried a verified failure**, concentrated in allergy and medication information, invented patient identity, and history written up as examination on telephone consultations where no examination occurred. More usefully, the same work found the measured failure rate ranged from **28% to 97% depending on the evaluation instrument**, with review instructions alone moving verification rates from 9.3% to 79.0%. Any error rate quoted for this system, ours included, is a statement about the rubric as much as about the software.
- **Approval As An API State Transition.** AWS and Abridge state this requirement in prose, but neither cited contract enforces it. CatatMD makes the `approved` transition explicit, requires doctor action, and pins it with a guard test.

**One Number For The Live Panes.** The only published latency budget for anything shown to a clinician mid-consultation is Suki's, at **sub-300 ms** for voice-command intent, achieved by keeping a language model out of the hot path entirely and using sentence encoders with nearest-neighbour search instead. Nothing note-shaped has a published budget. That supports the split in 20.7: the deterministic red-flag pass is the surface that must feel immediate, and the model-backed card is allowed to lag.

### What The Research Changed In 20.7

| Item                             | Before                                          | After                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Segment window                   | 4 to 12 seconds                                 | **8 Second Floor.** Measured: a 4 second floor costs 23.5 points of Malay word error, an 8 second floor costs 1.5                                                                                                                                                                                                                                                                          |
| Per-consultation language picker | Proposed, then retracted                        | Stays retracted. Detection works unprompted on genuinely spoken audio. **Additionally: constrain the candidate set to the languages expected and exclude Indonesian**, which is what every vendor supporting code-switching advises and what removes the confusion measured here mechanically                                                                                              |
| Tamil                            | "Not on the vendor's list"                      | **Definitively Unsupported.** Qwen3-ASR covers 30 languages plus 22 Chinese dialects and Tamil is absent, which is why language identification failed on all four clips. **Speechmatics ships a single `cmn_en_ms_ta` model covering Mandarin, English, Malay and Tamil**, and is the only vendor with a Malay-English product. It deserves evaluation before Tamil is declared impossible |
| Incremental analysis             | Re-extract over the whole transcript each cycle | Fold the delta into the previous result, following the one documented incremental contract in the field                                                                                                                                                                                                                                                                                    |

### Two Accuracy Findings To Carry Forward

**The Malay Result Is Optimistic, And By A Lot.** FLEURS is read, scripted, studio-clean speech. On spontaneous Singaporean Malay the same class of model scores 33 to 58 percent word error against the 13.2 percent measured here. Recording conditions alone account for a factor of two and a half to four before code-switching is considered.

**Code-Switching Is The Unmeasured Risk.** On Singaporean Malay-English, Whisper-class models exceed 100 percent word error, meaning insertions make the output longer than the reference and unusable. No vendor anywhere publishes a code-switched error rate against a monolingual baseline, and a systematic review of 127 code-switching papers found contextual biasing not discussed at all. There is no public Malaysian conversational Malay-English benchmark. **If the client records his own consultations, that recording becomes the most authoritative Malaysian data in existence on this question**, which is a better thing to offer him than a number from a read-speech corpus.

## 20.9 Ambient Capture On ILMU, And The Mechanism Behind 20.8's Post-Correction Row

**Status: `Superseded 06/09/26 by §20.10, and not built`.** The provider and transport chosen here were replaced the same day, when the sign-off this section records as absent was granted. **The measurements below stand as a true record** and are why this section is not deleted: the segmentation table is real, and it is the evidence that would matter again if the ambient path ever returned to a batch recogniser. Everything the original status line said follows. This section revises §20.7's provider choice, extends §20.8's post-correction row with the mechanism behind it, and answers §19 rows 21 and 22. **Nothing in it is measured on ILMU.** The probes that gate the build are named at the end, and one of them can reverse the decision.

### Amended 10/09/26: The Tick Is Removed, And The Surface Becomes A Theatre

The sign-off above is unchanged and is not re-opened: same vendor, socket, region and minting route, so no new egress and no new grant. What moved is the interface in front of it, and one control is gone (@Andersonnn7788, #365, `docs/decisions/` D-001).

| Behaviour              | Before                                               | After                                                                         |
| ---------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------- |
| Pressing Dictate       | Disabled until the per-consultation box is ticked    | Opens a full-viewport theatre and the microphone with it                      |
| The disclosure         | Names Soniox and the region above the tick           | Removed                                                                       |
| What the client sends  | `{ consent: true, mode }` on every call              | `{ mode }` on dictation, `{ consent: true, mode }` on ambient                 |
| What the trail records | `consentAsserted: true`, a literal in the audit type | `consentAsserted` derived from the mode: `false` on dictation, `true` ambient |
| Compose surface        | A card in the review page's 620px middle column      | The theatre, one column while listening and two after Stop                    |
| One dictation yields   | One prescription                                     | Several, each with its own sig, confirmed together                            |

**Four Implementation Consequences, And The Audit One Is The Load-Bearing One.**

- **`LiveSessionRequestSchema` Stopped Being `consent: z.literal(true)`.** It is an optional boolean with a `refine` that requires `true` on ambient, so ambient behaviour is unchanged byte for byte (defaults apply before `refine`, so a bare `{}` still resolves to ambient and still fails 400) while dictation may legitimately assert nothing. The alternative, leaving the literal and having the client keep sending `true`, would have filled the trail with patient agreements that were never collected. A client that stops asking must stop claiming.
- **`consentAsserted` In `backend/src/audit/index.ts` Widened From `true` To `boolean`.** It was typed as the literal, so the route could not have recorded anything else even if it had wanted to.
- **The Dictation Session Cap Moved 120 To 300**, because the surface now takes a whole prescription sheet in one pass. See the cap history above.
- **`PrescriptionSchema.dictated` Moved `max(400)` To `max(2000)`**, and its meaning narrowed: it is now the stretch of the dictation belonging to that drug, not the whole utterance. At 400 the box stopped a four-drug prescription mid-sentence while the doctor was still speaking, and the stop was silent because the cap flag was destructured away at the call site.

**The per-drug sig is the one new piece of logic, and it is client-side.** `parseSig` answers one sig per phrase, so a four-drug dictation cannot yield four from one response. The theatre re-sends each accepted drug's own stretch of text to the same parse route, bounded by the next drug name the matcher heard, and prints that stretch on the row it filled. The route is deterministic, stores nothing, writes no audit row and allows thirty a minute, so this needed no backend change. It fails toward an empty field rather than an inherited one: the slice starts at the drug's own name, so a dose spoken before the name is lost rather than drug two opening with drug one's trailing sig.

#### Amended 10/09/26: `sigReadTo`, The Second Boundary

**Bounding a slice at the next drug name is only half a boundary** (#369). A drug the lexicon does not hold raises no candidate, so nothing bounds the previous slice, which then runs to the end of the utterance and quotes a second drug's whole sig as evidence for fields that text never supplied. Brands are outside the lexicon by D-001, which makes that the ordinary case rather than the rare one.

| Piece                               | Where                                       | What It Is                                                                                                                                                                                   |
| ----------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `parseSigWithSpan(text)`            | `backend/src/medications/sig.ts`            | `{ sig, readTo }`, where `readTo` is the maximum `Claim.end` already tracked internally, or `null` when no field parsed. `parseSig` is now a wrapper over it, so its own tests are untouched |
| `sigReadTo`                         | `PrescriptionParseResponseSchema`           | The offset on the wire. `nullish` for deploy skew, and a sibling of `sig` because `sig` is a `PrescriptionSchema` pick and may hold only stored-prescription fields                          |
| `narrowToSig`, `unclaimedStretches` | `frontend/src/review/prescription-draft.ts` | Pure. The first shrinks a row's claim to what its sig read, the second returns the gaps left over                                                                                            |

Four properties hold it in place.

- **`readTo` Is An Offset And Nothing Else.** No claim about what the remaining text means, and no drug proposed for it.
- **The Quote Is Cut From The Posted String, Never Re-Sliced From `parsedFrom`.** Pressing Check replaces `parsedFrom` while staged rows keep the spans they were cut with, so re-slicing there would quote new text at old offsets.
- **`sourceSpan` Is Kept Apart From `span`.** `span` is the drug's name and decides which candidates stay on offer; `sourceSpan` is the stretch its fields came from and decides which characters no row accounts for. One field doing both would suppress a candidate merely for sitting downstream of an accepted drug.
- **`null` Leaves The Claim Alone.** No field read is no evidence about where the drug's text stops, and a quote cut on nothing is worse than one that is too wide.

#### Amended 06/10/26: One Read Returns Every Line

**The per-drug re-parse and the unclaimed-stretch panel are replaced by one read of the whole box** (D-001, amended 06/10/26). The two sections above are the history of that mechanism; `narrowToSig`, `unclaimedStretches` and the per-row parse are gone.

| Piece                                     | Where                                       | What It Is                                                                                                                                          |
| ----------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `parsePrescriptionLines(text, profileId)` | `backend/src/medications/lines.ts`          | Pure. Cuts the dictation into clauses, places each on a line, then fills shared fields. No model, no I/O                                            |
| `PrescriptionLineSchema`                  | `shared/src/medications.ts`                 | `{ start, end, candidates, exact, sig, shared }`. An empty `candidates` is a line nobody named                                                      |
| `lines`, `generics`                       | `PrescriptionParseResponseSchema`           | Both `nullish` for deploy skew. `sig`, `sigReadTo` and `candidates` stay for an older SPA                                                           |
| `readFrom`, `doseAt`, `claims`            | `parseSigWithSpan`                          | Where the first sig field and the dose start, and every stretch a field was read from, so an unknown word before or beside a dose can be told apart |
| `rowsFrom`, `lineKeys`, `toConfirm`       | `frontend/src/review/prescription-draft.ts` | Pure. The parse plus the doctor's edits make the table; ticked rows make the save                                                                   |

**How A Clause Is Placed.** Clauses split on `, ; .`, a new line, and `and`, `dan`, `then`, `plus`, `also`, never inside a heard drug name. A matcher reading made only of sig words ("10 mg sekali"), or reaching back over a boundary from sig words ("day. Amoxicillin" as doxycycline), is not a heard name and is dropped before clauses are cut. "Dosed" below means a dose `parseSig` reads, or a count of puffs, sprays, drops or lozenges, which it does not read as a dose but which still marks another product.

| Clause                                                                                       | Goes To                                                                                                                                                                                                |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Holds a drug name                                                                            | A new line for that drug. Text before the name joins it, unless it opens on another word with a sig ("Panadol 1 g amoxicillin"). Two names in one clause make both lines not exact                     |
| The same exact name again, before any dose                                                   | The same line, as a self-correction. Never when either mention is a near-match                                                                                                                         |
| Opens on `all`, `both`, `semua`, `kesemua` or `kedua-dua`, with nothing named before its sig | Shared: route, frequency, duration and food fill every line missing them. If dosed, a new unnamed line instead                                                                                         |
| Dosed                                                                                        | The line before, if that is a drug line with no dose, nothing was named in between, and no unknown word sits before the dose or straight after it ("plus 400 mg Brufen"). Otherwise a new unnamed line |
| Any sig, straight after a clause naming a product with a form ("Strepsils lozenge")          | A new unnamed line, starting at the product                                                                                                                                                            |
| Says only fields the line before already has                                                 | A new unnamed line. A name-only clause just before it moves with it                                                                                                                                    |
| Anything else                                                                                | The line before. Before any line, it is dropped when it says no sig                                                                                                                                    |

**`exact`** is `score === 1` on the best candidate, with no other candidate reaching past it over a word the sig does not own, and no other name in the same clause. Reaching over a unit ("g amoxicillin") does not count.

**On The Client, A Line That Is Not Exact Is Undecided** until the doctor ticks it, picks another reading, types a name or leaves it out, and an undecided line holds Confirm like an unnamed one.

**On The Client**, the box is re-read 600 ms after the last edit, and a response for text since changed is dropped. Each line keeps its doctor's edits under a key built from its drug, or from its words when unnamed, so a correction earlier in the box does not move them. `dictated` is the line's own words, then `…` and the shared clause it used, falling back to the line alone past 2000 characters.

**What this costs is stated in `docs/DPIA.md` as a residual risk rather than closed here.** MMC 003/2023 cl.18 wants consent specific to the purpose before capture and the PDPA 2024 amendment makes voice biometric data requiring explicit consent. Neither is asked for on this path now. Ambient capture and the ILMU relay are untouched and keep both halves of the rule.

### Why The Provider Changed

§20.7 routes ambient capture to `qwen3-asr-flash`. That path is blocked, and the block is procedural rather than technical.

| Constraint                           | Detail                                                                                                                                                                                                                             |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A second audio egress needs sign-off | `.claude/rules/security.md` lists "any new path from raw transcript text toward a provider" under changes needing explicit human sign-off. Issue #255 reads it as covering raw audio a fortiori and says "do not start without it" |
| The sign-off does not exist          | No record grants it anywhere in the repo, in issues, or in git history. Every record that mentions it records it as outstanding                                                                                                    |
| Audio cannot be de-identified        | Voice is biometric under the PDPA 2024 amendment and is a HIPAA Safe Harbor identifier (§20.8). There is no gate that makes a second audio vendor cheap                                                                            |

ILMU is already the single approved audio egress, so routing ambient through it engages none of that. Three facts make it viable rather than merely convenient.

| Fact                                     | Evidence                                                                                                                                                      |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fast enough for segment cadence          | RTF 0.024, 2.3 to 2.5 s per call (§20.3). §20.7's experience target is 2 to 4 s from the end of an utterance                                                  |
| Accepts the container we already produce | The vendor page lists `webm` among flac, mp3, mp4, ogg and wav, so `MediaRecorder` output needs no transcoding. This matches what §20.7.1 measured on Alibaba |
| Reuses the existing adapter              | `transcribeWithIlmu` stays the only outbound `fetch` in `backend/src`, so `no-stray-fetch.test.ts` stays pinned at one file and one call with no edit         |

### The Latency Number Is Fixed Overhead, Which Is The Risk

ILMU returned 2.0 to 2.4 s on 83 s of audio and 2.3 to 2.5 s on 99.2 s (§20.3). That is almost entirely fixed per-call cost, not compute.

**On An 8 Second Segment The Overhead Does Not Shrink.** Effective real-time factor becomes roughly 0.29 rather than 0.024, against roughly 0.1 for `qwen3-asr-flash` (§20.7.1). It still meets the 2 to 4 s target on paper, and it means there is no latency knob left: cutting shorter segments cannot make it faster, and it costs accuracy. If the Vercel to Render hop pushes the fixed cost past roughly 3.5 s, this choice has no recovery and the answer is Alibaba plus the sign-off.

### What Choosing ILMU Costs

| Cost                     | Detail                                                                                                                                                                                                                              |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cantonese                | Absent from the vendor's list. Available on `qwen3-asr-flash` at 2.4 percent CER, which is the one language the sign-off would buy                                                                                                  |
| Tamil                    | Absent here too, and unsupported by every in-region vendor. §20.7's honest-limitation position is unchanged                                                                                                                         |
| Recognition-time biasing | §20.3 finding 5 measured ILMU's `prompt` field as a no-op, so layer 1 of §20.7's accuracy chain may be unavailable. See the probes                                                                                                  |
| Prose quality            | ILMU returns a flat lowercase stream with no punctuation and no segments (§20.3 finding 5). Under ambient capture that is what the doctor watches grow on screen for the whole consultation, and what the live note is written from |
| The DPIA release gate    | `DPIA.md` requires review whenever a new hosted-ASR path is introduced. Same processor does not exempt a new path. See `DPIA.md`                                                                                                    |

**The Biasing Cost Is Survivable, And Only Because The Provider Is ILMU.** Every error in ILMU's measured family is already in `redflags/mishears.ts`, which is layer 2, built and versioned. §20.7.1's claim that an error can only be fixed at layer 1 was about a **Qwen** error, "batuk" returning as "betul", where the wrong word is an everyday Malay word that cannot be added to a confusable table. That claim does not transfer to a different recogniser with a different error family.

### Post-Correction: The Mechanism Behind 20.8's Row

§20.8 already records that no vendor documents an ASR post-correction stage, and that the technique "hurts in the low-error regime with a general model seeing only final text, which is our situation". That conclusion is unchanged. What follows is the mechanism, because the research names four distinct techniques and only one of them is what §20.8 rejected.

| Form                                                                         | What It Requires                                                                       | Reported Effect                                                                                                                    | Available On ILMU                                           |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Generative error correction over the N-best list (HyPoradise, NeurIPS 2023)  | The recogniser's alternative hypotheses                                                | Up to 53.9 percent WER reduction on its own test sets                                                                              | **No.** ILMU returns `{text, usage}` only (§20.3 finding 5) |
| Contextual biasing, also called keyterm boosting (Deepgram, AWS, AssemblyAI) | A hotword or context field at decode time                                              | The production-standard lever across vendors. Shapes the transcript before it exists rather than editing it after                  | **No**, pending the probe below                             |
| Prompt-only rewriting of the 1-best text                                     | Nothing                                                                                | Hallucination that "may lead to the modification of the correct text"; survey material reports over-correction raising error rates | Yes, and it is the form §20.8 rejected                      |
| Multi-stage correction with verification (RLLM-CF, arXiv 2505.24347)         | Three passes: error pre-detection, chain-of-thought correction, reasoning verification | 21, 11, 9 and 11.4 percent relative CER and WER reductions, no fine-tuning                                                         | Yes, at three times the calls                               |

**This Sharpens §20.8's Row Rather Than Softening It.** The row's condition, "with access to its alternative hypotheses", is exactly the N-best list, and the first row of the table above is why that condition cannot be met here: our provider does not return one. Choosing ILMU therefore forecloses the only form with a large reported effect.

### What Ambient Noise Does To Safety

The most consequential finding for an ambient product, and it reframes what accuracy work is for. "Beyond WER: A Paired Acoustic Stress Test for Ambient Clinical Scribes" (arXiv 2606.05909) tests Whisper-large-v3 into Qwen3-235B, which is this system's pipeline shape.

| Condition                                     | WER                    | Unsafe Outputs           |
| --------------------------------------------- | ---------------------- | ------------------------ |
| Clean                                         | 16.54%                 | 13.60%                   |
| Stationary ambient noise, 15 dB               | 17.25%, up 0.71 points | 27.21%                   |
| Semantic interference, another voice at 15 dB | not stated             | 66.91%                   |
| Stationary 5 dB, with their mitigation        | not stated             | 33.46%, down from 40.44% |

Unsafe is scored at or below 2 on a 1 to 5 clinical rubric, where 2 is a major error such as an omitted red flag or a wrong dose and 1 is a safety hallucination.

**Word Error Rate Is Not The Safety Variable.** A 0.71 point WER move nearly doubled unsafe output, and a second voice in the room quintupled it. Chasing word accuracy does not buy clinical safety, and for a consulting room the dominant risk is a bystander speaking, not a slightly worse transcript.

**The Implementation Uses The Same Control Pattern.** An extractor attaches verbatim evidence, a verifier removes unsupported content, and a symbolic filter discards any quoted span not present as an exact substring, nulling high-stakes fields. That is `applyEvidenceCheck` and `hasVerbatimEvidence` (§21.4), including the downgrade to `NOT_ASSESSED`. The paper states its authors did **not** clean the ASR transcript, and the reason is structural: the symbolic filter only means anything against the raw transcript. This finding supports the existing evidence check and informs the correction design below, which proposes changes rather than rewriting the transcript.

### The Correction Shape That Was Chosen

Decided by the owner on 06/09/26, after review of the material above. It is the shape §19 row 22 already named as the only admissible one.

| Property                      | Decision                                                                                                                                                                                                                                                                                                                          |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Generation                    | The RLLM-CF three-stage shape: detect candidate spans, propose a replacement, verify and drop                                                                                                                                                                                                                                     |
| Application                   | **Proposals Only.** The stored transcript stays verbatim until the doctor taps to accept one                                                                                                                                                                                                                                      |
| Constraint on the replacement | Drawn from a static, versioned clinical vocabulary, so an arbitrary word cannot be proposed. Same mechanism as ID-constrained citations, and it makes §20.7's named harm, turning "no chest pain" into "some chest pain", structurally unreachable                                                                                |
| Where it runs                 | Once, after the segment stream closes. Not per segment: three calls per cycle at ambient cadence is roughly 75 calls per consultation for a surface nobody can act on while still talking                                                                                                                                         |
| The bar it must clear         | The 11-entry table in `redflags/mishears.ts` was measured on ILMU, covers exactly ILMU's error family, and costs nothing. **The model pass earns its place only if it finds correct corrections the table does not.** If it finds none, ship the deterministic proposals alone and record the model pass as measured and rejected |

### What Must Be Measured Before This Is Built

§20.7's own measurement table still governs. These are the additional probes this deviation creates, and the first two can reverse it.

| Probe                                                                              | Question                                                                                                                                                             | What A Bad Answer Means                                                                                                      |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Per-segment latency, through the deployed relay rather than direct to the provider | Does the fixed overhead hold near 2.3 s at an 8 to 20 s segment, once the Vercel to Render hop is inside the number                                                  | Above roughly 3.5 s median, the ILMU choice has no recovery. Alibaba plus the sign-off                                       |
| Segmented against whole-file penalty on ILMU, at 8, 12 and 20 s                    | §20.8's 8 second floor was measured on `qwen3-asr-flash`. It is not known to transfer to a different recogniser                                                      | A large penalty at the 20 s ceiling means no window works, and no downstream layer recovers boundary loss                    |
| The `prompt` field, re-probed                                                      | Is it still a no-op                                                                                                                                                  | If honoured, layer 1 becomes available and is the measured-best lever. If not, the deterministic table carries layer 2 alone |
| Invented content on a silence-heavy segment                                        | §20.7.1 measured Alibaba truncating cleanly and inventing no completion. ILMU has no equivalent measurement, and §20.8 records that ASR hallucination tracks silence | Any invention is disqualifying                                                                                               |
| The vendor's Mandarin claim                                                        | Does it hold on real speech                                                                                                                                          | It is a vendor claim. Alibaba's Mandarin is measured at 2.5 percent CER; ILMU's is measured nowhere                          |

Three runs per condition, because §20.3 measured `temperature=0` as not byte-deterministic on the rojak sample. Without three runs a segmentation penalty cannot be separated from run-to-run noise. Synthetic or scripted audio only, per the §20.1 and §20.2 provenance rules.

### Measured 06/09/26: The Segmentation Penalty On ILMU

Discharges probe 2 of the table above. Harness: `evals/asr-ab.ts --segment --wer` (#264, PR #265), three runs per condition, the §20.3 rojak sample, 16 kHz mono wav, direct to the provider. Scored by `evals/wer.ts`, whose normalisation is a port of the script behind §20.8's `qwen3-asr-flash` table: NFKC, lowercased, punctuation stripped.

| Condition                     | WER       | CER      | vs Whole File |
| ----------------------------- | --------- | -------- | ------------- |
| Whole file, transcoded, uncut | 16.2%     | 7.5%     | baseline      |
| Fixed 8 s                     | 18.4%     | 9.7%     | +2.2          |
| Fixed 12 s                    | 19.7%     | 10.1%    | +3.5          |
| **Fixed 20 s**                | **15.8%** | **6.9%** | **-0.4**      |

**The `qwen3-asr-flash` Cliff Does Not Transfer.** §20.8 measured silence cuts at a 4 second floor costing +23.5 points on Malay. On ILMU the worst window tested costs +3.5, and the 20 s ceiling costs nothing measurable. The probe's stated failure condition, a large penalty surviving at the 20 s ceiling, is not met, so this does not reverse the ILMU decision.

**The Control Is Transcoded, Not The Original File.** `--segment 0` re-encodes through the same encoder as the cut arms, so the rows differ only in whether the audio was cut. A control that kept the original AAC would have let a transcoding penalty read as a segmentation penalty.

Limits, stated per the §20.1 convention:

- **One Sample, One Reader, One Recording.** Indicative, not a benchmark.
- **Not A Curve, And Not Monotonic.** Within-condition spread across three runs reached 0.6 points, so 12 s scoring worse than both neighbours is not credible as a trend. 20 s beating the uncut control is noise: read it as no measurable penalty at 20 s, not as cutting helping.
- **Fixed Windows, Not Silence Cuts.** The frontend segmenter (#266) cuts on a 600 ms silence hold above an 8 s floor, which is untested here. For whoever tests it: §20.8's cutter used `hangover_ms=600` by default, the same value, and at an 8 to 20 s window it tied fixed 10 s at 10.3% exactly. The +23.5 point row was that same cutter at 4 to 12 s. The floor carried that result, not the cutting strategy.
- **Capture DSP.** This is the §20.3 sample, recorded before §20.6 turned the voice-call DSP off. That makes it the right audio for a segmentation delta, where the arms share it and it cancels, and the wrong audio for an absolute ILMU accuracy claim.
- **Cutting Costs Slightly More To Bill**, 101 to 105 seconds against 100 uncut, because each call rounds up independently.

**Still Open: The Latency Probe.** Direct-to-provider per-chunk latency measured roughly 315 ms for an 8 s chunk, so the relay hop would have to add over 3 s to breach the 3.5 s threshold. That is an argument from the direct number, not a measurement of the relay. The threshold stays formally unanswered until `--via-relay` is run against the deployment, and this argument must not be cited as the answer.

### Provenance Of The Sources In This Section

Stated because §20.1's convention requires it, and because this section mixes read sources with search summaries.

| Source                                                                                                                     | How It Was Obtained                                                                                                                                                                                                                                                                              |
| -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ILMU model page language list, containers, price                                                                           | The vendor's published model page, read 06/09/26 through a text-extraction proxy after the site refused direct fetches. Corroborated by three independent search summaries, and the quoted price of RM 0.0002 per second matches §20.3's independently measured RM 0.012 per consultation-minute |
| Beyond WER, arXiv 2606.05909                                                                                               | Abstract and body read directly. Figures quoted are the paper's own                                                                                                                                                                                                                              |
| RLLM-CF, arXiv 2505.24347                                                                                                  | Abstract read directly. The paper reports relative reductions only and states no absolute baselines                                                                                                                                                                                              |
| HyPoradise, NeurIPS 2023                                                                                                   | **Search Summary Only, Not Read.** The 53.9 percent figure and the 316,000-pair dataset size are reported rather than verified here                                                                                                                                                              |
| Over-correction raising error rates; a Whisper model degrading from 2.7 to over 20 percent WER after medical customisation | **Search Summaries Only, Not Read.** Directionally consistent with §20.8 and with §20.7.1's finding that English context over Malay audio scored worse than none, but not primary-verified                                                                                                       |
| The segmentation table above                                                                                               | **Measured On This System**, 06/09/26, with `evals/asr-ab.ts`. Four dated reports in the gitignored `evals/reports/`, per the §20.3 convention that the harness writes a report and a human transcribes the figures                                                                              |

**The segmentation table is the only measurement of this system in this section**, and it was added on 06/09/26; everything else here is a vendor claim or a published result about someone else's pipeline. This does not establish ambient accuracy in any language, including in the measured table: it quantifies a segmentation delta on one scripted sample recorded before §20.6, not accuracy.

---

## 20.10 Ambient Capture On Soniox, Browser-Direct, Under An API-Minted Key

**Status: `Decided, building`.** Recorded 06/09/26. This section supersedes §20.9's provider and transport, and answers §19 row 21. It is what closed the sign-off §20.9 records as absent.

### The Sign-Off, Which Is The Thing §20.9 Was Waiting For

§20.9 chose ILMU for one reason: `.claude/rules/security.md` requires explicit human sign-off for a new path from raw content toward a provider, issue #255 read that as covering raw audio a fortiori, and no record granted it. That is no longer true.

| Question         | Answer                                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| Who              | @Andersonnn7788, the repo owner, on 06/09/26                                                           |
| What it covers   | Soniox specifically, browser-direct, US region, ambient capture only                                   |
| What it does not | Any third audio egress, any other transport, and the manual record-then-transcribe path, all unchanged |
| What prompted it | The owner tested the provider on code-switched Malay, English and Chinese speech and judged it usable  |

A third audio egress would need its own sign-off. The clause in `.claude/rules/security.md` has been widened to say so explicitly rather than leaving the next reader to make the same a fortiori argument.

A third audio egress, post-Stop refinement with batch `scribe_v2`, was granted separately on 16/10/26. See §20.14.

### Extended 10/09/26: The Sign-Off Reaches Prescription Dictation

The grant above is scoped to ambient capture, and its "What it does not" row names the manual record-then-transcribe path. Streaming a prescription the doctor dictates on the review page is neither of those, so it takes its own row rather than being read into the first one.

| Question         | Answer                                                                                                                                                                                  |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Who              | @Andersonnn7788, the repo owner, on 10/09/26                                                                                                                                            |
| What it covers   | Prescription dictation on the review page, on the same Soniox socket, browser-direct, US region                                                                                         |
| What it does not | Any other dictation surface, the note editor and the transcript-corrections box included; any third audio egress; any other transport                                                   |
| What prompted it | A reasoned extension, not a measurement. It adds no new counterparty, destination, transport or minting route, and one dictated phrase is a narrower exposure than a whole consultation |

**This basis is weaker than the one above, and is recorded as weaker.** The 06/09/26 grant rested on the owner's own usability test of code-switched speech. This one rests on an argument about scope: what changes is which surface may open the socket, not where the audio goes or who receives it. Nothing about dictation accuracy on this provider is measured, and the "What Is Not Measured" table below applies to it unchanged.

**What It Does Not License Is The Interesting Half.** The two-control consent rule is not waived by the surface being small: a dictated phrase leaves the device exactly as a consultation does, so it takes the same standing device preference plus a per-consultation tick that dies with the component. On-device Whisper stays the floor on that page and is where every failure lands (`docs/decisions/` D-001). **Both halves of that sentence were overtaken the same day.** The default moved in the next subsection, and the tick was removed outright in the one after it; the paragraph is kept as written because the grant rested on it and a reader needs to see what was undertaken before seeing what was withdrawn.

### Extended 28/09/26: The Sign-Off Reaches Two-Way Translation

| Question         | Answer                                                                                                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Who              | @Andersonnn7788, the repo owner, on 28/09/26                                                                                                                              |
| What it covers   | Two-way machine translation between English and Urdu or Bengali on ambient capture, on the same Soniox socket, key type, region and minting route (§20.12)                |
| What it does not | Any other language pair, translation on prescription dictation, any spoken or synthesised output, and any other vendor or transport                                       |
| What prompted it | Pakistani and Bangladeshi patients who cannot describe symptoms in English or Malay, and #389 measuring translation as one first-frame field with a deterministic pairing |

**Not A New Surface And Not A New Egress.** Ambient capture opens the socket exactly as before. What changes is the recognition config in the first frame, selected by a closed enum, and the processor now translates as well as transcribes. That second half is what this row exists to name.

### Extended 06/10/26: Mandarin And Tamil

| Question         | Answer                                                                                                                       |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Who              | @AlaskanTuna, on 06/10/26                                                                                                    |
| What it covers   | The same two-way translation between English and Mandarin or Tamil, on the same socket, key type, region and minting route   |
| What it does not | Cantonese as a pair of its own, any other language pair, and any claim about accuracy: neither language is measured (§20.12) |
| What prompted it | Clinic request to support Mandarin- and Tamil-speaking patients, with the Urdu and Bengali mechanism already in place (#385) |

### Amended 10/09/26: Streaming Becomes The Default On That Page

The sign-off above is unchanged and is not re-opened here: same vendor, socket, region and minting route, so no new egress and no new grant. What moved is `DEFAULT_AUDIO_SETTINGS.dictationEngine`, from `'local'` to `'streaming'` (@Andersonnn7788, 10/09/26, #363). The rationale is the measurement in §20.1 and the table above: an on-device default whose real-time factor sits above 1.0 on typical clinic hardware cannot deliver words as the doctor speaks, so it is a default most doctors would have to leave.

| Behaviour                | Before                                                  | After                                                                                                                                    |
| ------------------------ | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Doctor changes nothing   | On-device Whisper, no consent tick offered, no requests | Streaming offered, consent tick shown, `GET /asr/live-sessions/config` on mount. **The tick went the same day, see the next subsection** |
| Consent withheld         | Not applicable, nothing to consent to                   | Dispatcher refuses. It does not silently run the local worker. **Unreachable since #365**                                                |
| Below the hardware floor | Dictate hidden, typing only                             | Dictate offered, because a socket loads no weights                                                                                       |
| Any streaming failure    | Not applicable                                          | On-device or typing, never the cloud, never silently                                                                                     |

**Three Implementation Consequences, None Of Which The Sign-Off Anticipated.**

- **`loadAudioSettings` Now Treats Absent And Corrupt Differently, For This Field Only.** An absent `dictationEngine` reads as the current default, so the decision reaches a device that already holds a `catatmd.audio` key; any present value other than `'streaming'` reads as `'local'`, so corruption still fails closed. Reading positively for both, as `engine` does, would have left every existing device on-device and made the new default reach nobody.
- **Every review page carrying an analysed note now issues `GET /asr/live-sessions/config?mode=dictation` on mount.** That is the shape `AmbientCapture` has used since #268, but it is new traffic on a page that previously issued none. It also makes the config-failure copy commonly visible, so that copy now distinguishes a 503 (this deployment has no key) from any other failure (the network did not answer), rather than asserting the first for both.
- **Expected Mint Volume On The Dictation Bucket Rises**, because the path is now taken by default rather than by opt-in. The per-mode limiter and the 120 second per-session cap added in #356 are what absorb it. The absence of a global spend cap recorded in `.claude/rules/security.md` is unchanged and now carries more load; it remains a gap rather than a control.

**What it costs is a control, and `docs/decisions/` D-001 carries the full accounting.** In short: the standing device preference ships already set to send, so this surface holds one defaulted preference and one deliberate tick rather than two chosen controls. The tick is untouched and still gates every send. Separately, #363 found the preference had been unreachable from the review page for the whole of #357's life, because its only writer was mounted in `CapturePanel`; it is now mounted on both surfaces, which stay mutually exclusive by their render conditions.

### Amended 06/10/26: The Preference Goes

The device preference this subsection describes no longer exists (`docs/decisions/` D-001, "Amended 2026-10-06"). Dictation always prefers streaming and falls back to this device only when streaming is unavailable or unreachable, with the notice that says so. `loadAudioSettings` drops a stored `dictationEngine`, so a device that once chose on-device cannot stay pinned to a choice no screen shows. The failure table above is unchanged.

### Why The Provider Changed

§20.9's own analysis is what makes the case, because it names three costs and calls one of them the risk.

| Property              | Soniox `stt-rt-v5`                                     | ILMU Per Segment (§20.9)                                                             |
| --------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Recogniser            | Streaming                                              | Batch, called once per chunk, cold every time                                        |
| Latency               | Tokens arrive while the sentence is still being spoken | 2.0 to 2.5 s fixed overhead per call, and §20.9 states there is no latency knob left |
| Output                | Punctuated, cased, diarised, per-token language        | A flat lowercase stream with no punctuation and no segments                          |
| Boundary loss         | None; the session is one continuous stream             | The measured segmentation penalty, +2.2 to +3.5 points depending on window           |
| Recognition-time bias | A `context` field, unmeasured here                     | Measured as a no-op (§20.3 finding 5)                                                |

The prose-quality row is the one that changes the product rather than the numbers. Under ambient capture the doctor watches the transcript grow for the whole consultation, and it is what the note is written from.

### Why The Transport Changed, And Why That Is Not A Reversal

§20.7 line 1977 rules out a socket, and that reasoning still holds exactly as written. Both of its reasons are about a socket **through our API**: the Vercel rewrite proxies HTTP and server-sent events but not WebSocket upgrades, and a direct browser-to-Render socket would lose the first-party cookie and reintroduce the mobile lockout (#156).

Neither reason touches a socket from the browser to a third party, which is what this is. The rewrite is not in that path and no cookie travels on it.

What that costs is the property §20.9 leans on, that the API is the only audio egress. What it buys is that our servers never hold the audio at all. The API remains the policy point:

| Control              | Where It Lives                                                                                        |
| -------------------- | ----------------------------------------------------------------------------------------------------- |
| Who may stream       | `POST /api/asr/live-sessions` behind the session guard, like every other protected route              |
| How often            | `liveSessionRateLimit`, 5 per minute per client key, its own bucket                                   |
| For how long         | A 30 second key TTL to open the connection, and a per-mode session cap: 1800 ambient, 300 dictation   |
| What is recorded     | `asr.live_session_minted` before the response and unguarded, `asr.live_session_failed` on failure     |
| Attributable to whom | A server-generated `client_reference_id` the provider binds to the key and the client cannot override |
| Where it may connect | An env enum, a shared URL pattern the client checks, and the CSP `connect-src` host                   |

**Two of those rows were stale until 10/09/26, and two became per-mode the same day.** The TTL and cap read 60 and 3600 against code that has said 30 and 1800 since the bounds were tightened (`backend/src/lib/asr/soniox.ts:81`, `:105`), and are corrected above. Prescription dictation (#356) gave the cap a second value, and the limiter a second bucket so that a ten-drug prescription sheet cannot exhaust the five-per-minute budget one consultation needs.

**The dictation cap has now been wrong in both directions, which is the useful part of its history.** 1800 was 30 minutes on a 15 second utterance, a spend cap that never binds. 120 replaced it and bound too tightly once #365 widened the surface from one drug to a whole prescription sheet read in one pass. The failure mode is what makes the second error worse than a number: the provider enforces the cap by closing the socket, and the browser cannot tell that close from a network drop, so a deliberate bound reached the doctor as "The connection was lost". 300 is the current value and leaves the character limit as the bound that actually fires.

### The Mechanism

```
Record tab, mode = ambient
  GET  /api/asr/live-sessions/config   -> region, socket URL, recognition config, or 503
  doctor ticks per-consultation consent (useState, remembered by nothing)
  [ambient only since #365; dictation asks nothing and asserts nothing]
  getUserMedia                          (asked first: the key lives 30 seconds)
  POST /api/asr/live-sessions           -> mint, audit, respond with the key
  browser opens wss://stt-rt.soniox.com/transcribe-websocket
    frame 1: JSON config carrying the key
    then:    MediaRecorder webm/opus chunks every 250 ms
    back:    tokens with is_final, speaker, language, start_ms, end_ms
  Stop -> recorder.stop -> last chunk -> empty frame -> await finished
       -> settled tokens become segments and text
  POST /api/asr/draft-turns             (the existing de-identified labelling pass)
  transcript lands with source: 'asr_live'
```

Two properties of that flow are load-bearing rather than incidental. The microphone is opened before the key is minted, because a permission prompt can sit for a long time and the key expires in a minute. The end frame is sent only after the recorder's final chunk has been handed over, because the reverse order asks the provider to finish audio it has not received.

### The Ambient Disclosure, Removed 10/09/26

**The tick in that flow is unchanged. The paragraph above it is gone** (`docs/decisions/` D-004, authorised by the owner). It named Soniox, the region read from `config.region`, and that our server issues the key and never receives the audio.

| Property                       | State                                                                                                                                                                                                                                   |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The two-control rule           | Both halves exist, but the Capture Mode half ships pre-set from 21/09/26 (`decisions/` D-007), so the tick is the only one the doctor still chooses. It is enforced in the start dispatcher and asserted to the mint as `consent: true` |
| What no longer exists anywhere | Any on-screen statement of the processor or the region for this path. The Audio dialog's ambient card names the provider only, and no longer points at a Record tab sentence that is gone                                               |
| Why the prop is nullable       | `ConsentGate`'s `disclosure` defaults to the relay's sentence, which says ILMU in Malaysia. Ambient passes `null` rather than omitting it, so a fall-through cannot misstate the destination                                            |
| How it is pinned               | `AmbientCapture.test.tsx` asserts the panel matches no `/Soniox\|United States\|leaves this device/i`. The removal is a test that must be deleted to undo, not an assertion quietly withdrawn                                           |

### What Is Not Measured

**Nothing About This Provider Is Measured In This Repo.** The owner's own test is the only evidence, and it was a judgement about usability rather than a benchmark. Per the §20.1 convention this is stated rather than softened, and per §20.9's own closing rule this does not establish ambient accuracy in any language.

| Unmeasured                        | Why It Matters                                                                                        |
| --------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Word error rate on real speech    | Synthetic voices only, below. No number from a person speaking in a consulting room                   |
| Latency through the deployed path | §20.9's 3.5 s threshold was about a relay this design does not use, so it does not transfer           |
| Code-switching                    | The reason the provider was chosen, and still unquantified here, as §20.8 records it is industry-wide |
| Diarisation quality               | Measured on synthetic audio only, below. Real consulting-room audio is still unmeasured               |
| Tamil on real speech              | Synthetic Tamil reads at 8.2% WER, below. Malaysian Tamil from a speaker is unmeasured                |
| Safari and iOS                    | `MediaRecorder` emits `audio/mp4` there, untested over a chunked stream                               |
| Behaviour on silence-heavy audio  | §20.8 records that ASR hallucination tracks silence. Any invention would be disqualifying             |

### Measured 07/10/26: Language Coverage On The Production Config (#218)

Two native ElevenLabs voices per language read the six synthetic lines in `backend/src/fixtures/languages.ts`, alternating. The joined audio streamed through a session minted by production's own `/api/asr/live-sessions`, in 250 ms slices as the SPA sends it, with production's Auto-Detect config (`stt-rt-v5`, hints `ms`, `en`, `zh`, `ta`). Scored with `evals/wer.ts`.

| Language  | Metric | Rate      | Tagged As  | Reading                                                                                                   |
| --------- | ------ | --------- | ---------- | --------------------------------------------------------------------------------------------------------- |
| Tamil     | WER    | **8.2%**  | `ta` 95/95 | Usable. Most errors are numbers written as digits ("3" for மூன்று)                                        |
| Mandarin  | CER    | **6.5%**  | `zh` 59/59 | Usable. Digits again, and one homophone (药 heard as 要)                                                  |
| Malay     | WER    | **9.4%**  | `ms` 61/61 | Usable                                                                                                    |
| Cantonese | CER    | **62.5%** | `zh` 62/62 | **Unusable.** Recognised as Mandarin with the content wrong. A `yue` hint is refused by the real-time API |

- **Tamil Reverses §20.7's Limitation For This Provider.** That position came from `qwen3-asr-flash`, which does not list Tamil; Soniox does, and reads it.
- **Cantonese Is Stated As Unsupported** on the Record tab (D-009). Part of its rate is the traditional-to-simplified swap, but the content errors are most of it.
- **What It Does Not Establish:** six read lines per language from synthetic voices. Real speech, Malaysian accents and code-switching are unmeasured, and this does not support an accuracy claim.

### Observed 09/09/26: The Devoicing Family Reaches This Provider Too

**§20.3's Consonant-Devoicing Family Is Now Recorded On A Third Arm.** A captured ambient consultation returned _"saya **teman** since 3 days ago"_ where the audio was _"saya **demam**"_, in a turn whose next line transcribed _"demam tu tinggi tak?"_ correctly and whose patient answer gave _"38.5"_. The same capture returned _"**Are there checked** temperature dekat rumah"_ for _"**Ada check** temperature dekat rumah"_.

|                              |                                                                                                                                                                                                                                  |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What It Closes**           | `redflags/mishears.ts` states that its table applies to ambient capture without anything proving those pairs occur on that provider. `demam` to `teman` is now recorded on Soniox as well as on ILMU and `whisper-small` (§20.3) |
| **What It Does Not Close**   | One turn of one consultation, no ground-truth corpus, no word error rate. It is an existence proof for one pair, not a measurement of the family                                                                                 |
| **Consequence For Layer 2**  | The confusable table earns its ambient scope on evidence rather than on the additive argument the module header falls back to                                                                                                    |
| **Consequence For The Note** | `expandMishears` reaches `redflags/triggers.ts` only, so the rules engine saw `demam` and the note pipeline saw `teman`. The safety net held and the structured note did not. Issue #308                                         |

**The Second Error Is Deliberately Not Being Fixed.** "Are there checked" for "Ada check" is a code-switch boundary error, and the clinical meaning survives it. Repairing it means letting a model rewrite grammar, which is the paraphrase risk `draft-turns/reconstruction.ts` exists to prevent. Recorded here so a later reader does not mistake the omission for an oversight.

### Built 09/09/26: Layer 1 Vocabulary, And What It Is Not Evidence Of

`liveSessionConfig()` now sends a `terms` array alongside `general` (issue #307). `backend/src/lib/asr/vocabulary.ts` holds it: Malay consultation register, drug names in English, and `CONFUSABLE_TARGETS` derived from the `mishears.ts` map so layer 1 and layer 2 cannot disagree about what they are aiming at.

**The Evidence Behind It Is §20.7.1, And §20.7.1 Was Measured On Qwen.** That section carried a Malay clip from unusable to one word wrong with a clinical Malay vocabulary containing none of the sentence's content words, and it measured "batuk" returning as "betul", a pair no confusable table can claim without raising a cough flag on every sentence agreeing with the doctor. Both findings argue for the layer. Neither was measured on Soniox, and Soniox's `terms` is a vendor-documented array rather than the system context §20.7.1 varied, so **the mechanism is an inference and the outcome is unmeasured here.**

Two specific things a later measurement should settle:

- **Whether The Array Does Anything At All.** §20.3 finding 5 recorded ILMU's `prompt` biasing field as a no-op. A vendor field that is accepted and ignored is a live possibility, and nothing in the test suite can see it: `soniox.test.ts` proves the terms are _sent_, never that they are _used_.
- **Whether English Drug Names Cost Anything.** §20.7.1's fifth condition scored an English clinical context worse than no context at all on Malay audio, and the language-detection follow-up found a four-language context failing to rescue an acoustically ambiguous clip where a single-language one succeeded. Drug names are in the list because Malaysian doctors speak them in English, so priming them in Malay could not match the audio; that is a domain fact, and its interaction with the language-priming effect is untested. Dropping `ENGLISH_DRUG_TERMS` is a one-line A/B if a measurement disagrees.

### Recorded 10/09/26: The Drug Half Was A Second Hand-Written Copy, And The Budget Is Now Full

`ENGLISH_DRUG_TERMS` was written by hand, while `backend/src/medications/lexicon.ts` separately holds the names the doctor can accept as a candidate. The two had drifted. Eleven lexicon drugs were primed nowhere, the entire urinary antibacterial set among them: clarithromycin, doxycycline, phenoxymethylpenicillin, nitrofurantoin, trimethoprim, cotrimoxazole, fosfomycin, ciprofloxacin, norfloxacin, cefalexin and phenazopyridine.

**The Two Halves Of The Chain Were Aiming At Different Targets**, which is the failure the vocabulary module's own header warns about when it derives `CONFUSABLE_TARGETS` from the `mishears.ts` map rather than copying it: a name the recogniser was never primed for is one `matchMedication` can only offer after the doctor has already typed it. #356 derives the drug terms from the lexicon, in the same shape and for the same reason.

**The Cost Is The Remaining Budget, All Of It.** Measured 10/09/26, the deduped ambient list lands at **exactly 120 against `MAX_ASR_CONTEXT_TERMS = 120`**:

| Source                                     | Terms   |
| ------------------------------------------ | ------- |
| Malay consultation register                | 61      |
| Existing drug and dosage-form terms        | 28      |
| `MEDICATION_LEXICON` generics and synonyms | 39      |
| `CONFUSABLE_TARGETS`                       | 7       |
| **Deduped Total**                          | **120** |

Nothing has to be dropped, and the brand names survive, which matters because a patient says "Panadol" where the lexicon deliberately holds only generics. What it means is that the next lexicon entry is not a free addition: it forces a decision about the cap. That cap is small on purpose. A list crossing the audio egress cannot be de-identified, so review by eye is the only review it can get, and 120 terms is already near the limit of what an eye will actually check.

**Prescription Dictation Sends A Different, Narrower List** (#356). The Malay symptom register and the confusable targets are excluded, because a prescription phrase carries no symptoms and 61 terms of the wrong domain is the effect §20.7.1 measured scoring worse than no context at all. What it sends instead is the lexicon plus the sig vocabulary the parser already owns, so every primed phrase is one `parseSig` can act on.

### Built 09/09/26: Per-Token Confidence, Shown As A Cue (Issue #309)

Soniox returns a confidence with every token and `SonioxTokenSchema` did not declare it, so Zod's implicit strip discarded it at the same line that discards `error_message`. Nothing in the product told a doctor which words the recogniser was unsure of. This is the first half of §19 row 15.

**What Was Built.** The field is carried into `LiveToken`, folded per segment into character ranges on `LiveSegment`, re-based onto turns by `carryUncertain` in `frontend/src/audio/draft-turns.ts`, stored inside `TranscriptTurnSchema.uncertain`, and rendered as a dotted underline in the live pane and the review transcript.

| Decision                                    | Why                                                                                                                                                                                                                                                            |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ranges, not a per-segment score             | A minimum or a mean says something here is shaky without saying which word to re-read, and the word is the only part a doctor can act on                                                                                                                       |
| Absent confidence maps to `null`            | An unknown is not an uncertainty. A vendor that stops sending the field must produce no cues rather than underlining every word                                                                                                                                |
| An out-of-range value is refused, not fatal | `.catch(undefined)` on the bounded schema. Enforcing 0 to 1 by failing the message would end a live consultation mid-sentence over one token; the value becomes an unknown instead. `speaker` records that this vendor has already changed a field's type once |
| A dotted underline, not a filled mark       | A filled mark is what this codebase uses for a finding the doctor must decide about. Nothing here claims a word is wrong                                                                                                                                       |
| Nothing is gated on it                      | No red flag, suggestion or note field reads `uncertain`. It is display metadata, the same posture `RedFlagSchema.evidenceLink` holds                                                                                                                           |

**The Threshold Has No Measurement Behind It.** `UNCERTAIN_CONFIDENCE_THRESHOLD` is 0.6, chosen to mark the visibly shaky words in the captures seen so far. Nothing in this repo has scored this provider's confidence against a ground-truth transcript in any language, so it sits on the same pile as the vocabulary array above. What settles it is a labelled sample: the threshold that catches most real errors without underlining correct speech. Until then the cost of it being wrong is bounded by what the cue does, which is nothing except ask a doctor to look.

**The Offset Hazard, Which Is The Part Worth Reading.** `tokensToSegments` built its text with a tidy step that collapses whitespace runs and trims the ends, and then discarded the tokens. Offsets computed on the raw token join are therefore wrong in the emitted text, and wrong silently: Soniox tokens carry their own leading spaces, so a segment cut on a speaker change begins with one and every naive offset lands a character early, putting the highlight on the neighbouring word with nothing thrown. The text and the per-token spans are now built in a single pass, and `live-tokens.test.ts` slices the ranges back out of the segment's own text and compares them to the expected words, because a comparison of range numbers would pass while the highlight sat in the wrong place.

**Everything Downstream Fails Closed.** A turn that cannot be located in the segments carries no ranges; a segment or line whose text is not already normalised carries none, because the offsets describe the un-normalised string; ranges past the per-turn cap are dropped rather than allowed to fail the transcript; and a line the doctor edited carries none, because the re-attachment across the textarea is an exact-text match. A missing cue costs a doctor nothing. A cue on the wrong word tells them a correct transcription is suspect.

**What This Is Not.** It is not a correction and it proposes nothing. Issue #309's second half, the constrained model pass that reads these ranges as its gate, is not built here; §19 row 22 still governs whether it earns its place.

### Built 09/09/26: Layer 3, The Constrained Cleanup Pass (Issue #309)

The third accuracy layer, built and shipped **off**. Layer 1 primes the recogniser, layer 2 is the measured 11-entry table, and this reaches the mishears neither can: §20.7.1 measured "batuk" returning as "betul", a pair no confusable table can claim without raising a cough flag on every sentence agreeing with the doctor.

`backend/src/transcript-cleanup/` holds it, reached from the existing `POST /api/consultations/:id/transcript-corrections` rather than a second route. It goes deid then `LLMClient` exactly as `draft_turns` does, and chunks after the gate.

**Every control is in `policy.ts` or the response schema. None is the prompt.**

| Control                                                      | What It Stops                                                                                                                                |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Model schema is `{ original, replacement }` and no more      | A response asserting a position, or claiming it came from the measured table. Positions are located server-side                              |
| Span must overlap a recogniser-flagged uncertain range       | Rewriting words nothing ever doubted, which is the regime arXiv 2407.21414 measured as degrading a transcript                                |
| **A `model` Edit That Would Remove A Fired Flag Is Dropped** | A doctor's accepted edit silently removing a red flag on re-analysis. Differential, not positional; see below. `source: 'mishear'` is exempt |
| Word delta at most one, bounded anchor                       | A sentence rewrite wearing a word's clothes. §20.10 records the code-switch boundary error as deliberately not repaired                      |
| Character class on the replacement                           | Digits, brackets, and therefore a rehydrated vault token, reaching a proposal                                                                |
| Single-occurrence anchor across the whole transcript         | Correcting the wrong instance of a repeated word                                                                                             |

**Why The Two Sources Are Treated Differently** is the part worth keeping. `expandMishears` already reaches `redflags/triggers.ts`, so a rule that fired on a table pair fired _because_ the engine read the corrected word; accepting that same correction moves the stored text to where the engine already was. A model edit has no such relationship, so accepting one can change a word a rule matched and stop the flag firing. `mergeRedFlags` is untouched and the doctor is the actor, so the invariant is not breached in letter; running the engine before proposing is what stops exercising it being one click away.

**The Suppression Check Is Differential, And The First Design Was Not.** Protecting each fired flag's evidence span looks sufficient and is not, because whether a match becomes a flag depends on text outside the span it matched: `isNegated` reads sixty characters before it, `isSafetyNetting` a hundred and twenty, and `asserts` and `findDeniedAbility` read the neighbouring turn entirely.

The case that settled it, found in review rather than in testing: a patient turn reading "Ada batuk berdarah" raises `haemoptysis` on "batuk berdarah". An edit changing "Ada" to "Tiada" is one word, letters only, zero word delta, sits inside an uncertain range, and touches no protected span, so every positional bound admits it. `tiada` is a Malay negator, so on re-analysis the emergency flag is gone. A `RedFlag` also carries no position at all (`evidence` is a bare string; `evidenceLink` is audio timing that may never influence a flag), which is what made the positional version awkward as well as wrong.

So the policy asks the question that actually matters: run the engine over the transcript the proposal would produce, and refuse it if any rule that fired before does not fire after. `evaluateRedFlags` is pure, which is what makes asking affordable. Each proposal is judged alone, which is sufficient because the client refetches against the stored text after every accept, so a second correction is judged against a transcript already carrying the first.

**The Trigger Set Is Chosen Inside The Policy, Not Passed In.** It was a parameter taking the caller's clinical profile, which was a hole of the same family: `profile.redFlagTriggers` is a filtered slice, the two shipped profiles share one trigger out of twelve, `profileId` arrived in the request body, and nothing ties a consultation to the profile it was analysed under. Every trigger is the only safe set, and over-protecting can only drop more model edits.

#### The Deviation From §20.9, Recorded Rather Than Left As Drift

§20.9's chosen shape says the replacement must be "drawn from a static, versioned clinical vocabulary, so an arbitrary word cannot be proposed. Same mechanism as ID-constrained citations". **What shipped is not that.** The owner chose the character-class shape on 09/09/26, after the alternative was put with its trade-off.

| §20.9 As Decided 06/09/26                                  | Shipped 09/09/26                                                                          |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Replacement is an enum over a versioned vocabulary         | Replacement matches a character class, at most two words                                  |
| Hallucinated or out-of-domain word structurally impossible | Hallucinated word bounded by the uncertainty gate and the two overlap rules, not excluded |
| Cannot fix a mishear whose target is outside the register  | Can fix any word-level mishear                                                            |

**State The Cost Plainly.** §20.7 names "no chest pain" becoming "some chest pain" as the harm this layer must not create, and §20.9 credited the vocabulary constraint with making it structurally unreachable. Under the shipped shape it is not unreachable: a negation flip is one word, passes the character class, and would be caught only if the span sits outside every uncertain range or overlaps a fired flag's evidence. The prompt forbids it, and a prompt is a Tier-4 control that does not count. `ASR_VOCABULARY_VERSION` already exists in `backend/src/lib/asr/vocabulary.ts`, so tightening this to an enum later is a small diff, and it is the first thing to reach for if a measurement shows over-correction.

#### Off By Default, And What Would Turn It On

§20.9's bar is unchanged and unmet: "the model pass earns its place only if it finds correct corrections the table does not. If it finds none, ship the deterministic proposals alone and record the model pass as measured and rejected."

`TRANSCRIPT_CLEANUP` defaults to `off` in `backend/src/config/env.ts` and is pinned `off` in `render.yaml`, so turning it on is a diff rather than a dashboard click. `evals/transcript-cleanup.ts` is the harness that produces the number: it reports corrections found beyond the table alongside over-corrections on already-correct text, because only the pair is meaningful. **Nothing in this repo has run it against a provider yet**, so no claim is made here about whether this layer works.

### Measured 06/09/26: The Policy Pins The Host, And The Host Answers

The one thing about this design that could be verified without a provider key, verified before the build was trusted. Method: `frontend/dist` served locally under the exact `Content-Security-Policy` string from `vercel.json`, driven in a real browser, per §17's rule that a policy change is checked against the built application rather than against dev, where no policy applies at all.

| Probe                                             | Result                                                            |
| ------------------------------------------------- | ----------------------------------------------------------------- |
| `wss://stt-rt.soniox.com/transcribe-websocket`    | Socket **opened**. The policy permits it and the endpoint answers |
| `wss://stt-rt.eu.soniox.com/transcribe-websocket` | **Refused By `connect-src`** before any connection was attempted  |

The second row is the one worth keeping. It means the policy is pinned to one region rather than to the vendor, so moving `SONIOX_REGION` without moving the CSP host fails closed in the browser instead of quietly streaming somewhere else. It also confirms the pairing this section claims: redirecting this egress needs both a bad response and a policy change.

**This Measures Reachability And Policy, And Nothing About Recognition.** No audio was sent and no key was used.

### Measured 06/09/26: What The Endpoint Actually Does

Run against the real endpoint with the production credential, on a mint and two bare connections carrying no audio. Synthetic only, per the §20.1 provenance rule: nothing here sent speech.

| Question                             | Answer                                                                                                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Mint status                          | **201**, not 200. The adapter keys on the whole 2xx range, so this was already handled, and it is now pinned                                                 |
| Mint response                        | `{ api_key, expires_at }` and nothing else. The quarantined schema matches exactly                                                                           |
| Config frame                         | Accepted. The first reply carries `tokens`, `final_audio_proc_ms` and `total_audio_proc_ms`                                                                  |
| Error shape                          | `error_code`, `error_type`, `error_message`, `more_info`, `request_id`. **Only `error_code` survives our schema**, which is the point of writing it that way |
| **Does One Key Open One Connection** | **No. A Second Connection On The Same Key Was Accepted.** This was an assumption and it was wrong                                                            |

**The Last Row Is The One That Changes A Control.** The session cap bounds how long each stream may run; it does not bound how many streams a key can start. What narrows that is the key's own lifetime, which is why it is thirty seconds rather than the sixty first written: the browser already holds an open microphone before it asks for a key, so the gap between minting and connecting is one round trip, and the slow part, the permission prompt, deliberately happens first.

**It does not close the spend gap, and this section does not claim it does.** No global budget exists. `.claude/rules/security.md` states that as a gap rather than implying coverage, and it is the follow-up worth doing before this path is pointed at anything real.

### What The Trust Picture Gains And Loses

| Gains                                                                 | Loses                                                                                                |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Our servers never hold ambient audio, in memory or otherwise          | Audio now leaves Malaysia. Soniox has no Malaysian or Singapore region                               |
| No 25 MB buffers and no in-flight gate, because nothing is buffered   | A second processor, which `docs/DPIA.md` requires a new vendor assessment and DPA for                |
| One less hop, so Render's sleeping free tier is out of the audio path | An egress no server-side check can observe, which is why the SPA now carries a guard test of its own |

Vendor statements, read 06/09/26 and **unverified by us**: real-time audio and transcripts are not stored, customer content is not used to train or improve their models, SOC 2 Type 2 and ISO 27001. The residency posture is recorded in `docs/DPIA.md` with the PDPA 2010 s.129 basis open, not solved. No legal position is stated here or anywhere in this repo.

### Measured 07/10/26: Roles Now Follow The Voice (#388)

**The Mix-Up Was Two Problems, And Only One Was The Provider's.** Two synthetic voices read scripted URTI consultations in English and Malay. The audio was joined at known turn boundaries and streamed through a production-minted ambient session exactly as the SPA streams it. Each segment's speaker and drafted role were then scored against the script.

| Condition, 5 Voice Pairs           | Diarisation                                          | Labelling Pass      | Pattern Fallback | Either, After The Vote |
| ---------------------------------- | ---------------------------------------------------- | ------------------- | ---------------- | ---------------------- |
| Clean turns, 600 ms apart, English | 100% of segments                                     | 79 to 100% of words | 98% of words     | 100%                   |
| Clean turns, Malay                 | 100%                                                 | 94 to 100%          | 59 to 63%        | 100%                   |
| Room echo and noise, 150 ms apart  | 100%                                                 | 94 to 100%          | 60 to 98%        | 100%                   |
| Turns overlapping by 300 ms        | 91%, and one Malay pair merged into a single speaker | not scored          | not scored       | unchanged, by design   |

- **Stored Roles Ignored The Diariser.** Both the labelling pass and its fallback draft roles from text alone. Text cannot place a bare "Okay", and the fallback's patterns do not read Malay. `voteRolesBySpeaker` now gives each line the role its voice was drafted most often, and cuts a drafted line where the voice changes.
- **The Vote Stands Down When Diarisation Cannot Be Trusted.** It acts only with two voices that each hold enough of the words and a decisive lead for one of them. The merged Malay run therefore kept its drafted roles rather than flipping wholesale.
- **What The Doctor Saw On Screen Is The Provider's.** The live chips show the provider's speaker numbers, and overlapping speech is what moved them in these runs. Nothing here changes those numbers. The thresholds are set from synthetic runs, and real consulting-room audio is unmeasured.

### Follow-Ups This Section Creates

- A Soniox arm for `evals/asr-ab.ts`, so the unmeasured table above gets numbers on synthetic audio.
- The `context` field, measured before adoption. It is layer 1 of §20.7's accuracy chain and the one lever ILMU could not offer.
- The provider's own speaker turns as input to the labelling pass, instead of flat prose. Partly done: since #388 the voices vote the drafted roles afterwards (below).
- Safari and iOS verification of `MediaRecorder` output over `audio_format: 'auto'`.
- A spend cap. The per-session bound does not substitute for one, because a key opens several sessions, and this is the follow-up worth doing before real audio.
- **Session resumption, built for a drop and not for a reload (#256, D-010).** A dropped socket is reopened on a fresh key while a second recorder queues the audio, at once and then after one and three seconds, bounded by 60 seconds held and by the minted `maxSessionSeconds` for the whole capture. The reopened socket's clock and speaker numbers restart, so its tokens are moved to where they fell (`fromConnection`) and its speakers are kept apart from the first socket's: the role vote picks a doctor within each connection, and the chip reads "Speaker 1 (reconnected)". The dropped socket's last utterance is closed with a boundary token, so a turn or a translation never spans the drop. The first recorder keeps running throughout, so the playback copy (#293) stays one container. A reload is guarded by the leave-page prompt only, and the transcript still lives only in component state until submitted.

---

## 20.11 The Live Panes, And Why The Note Is Not One Of Them

**Status: `Built`** (#219). Ambient capture streams text; this is what the review surface does with it while the doctor is still talking.

### What Updates Live, And What Does Not

| Pane                    | Source                                        | Cadence              |
| ----------------------- | --------------------------------------------- | -------------------- |
| **Red Flags**           | `evaluateRedFlags`, deterministic, no model   | Every closed segment |
| **Missing Information** | `deriveGaps` over the merged facts, no model  | Every 12 s, at most  |
| **Patient Card**        | `live_facts` through `LLMClient`, then merged | Every 12 s, at most  |
| **The Note**            | Unchanged. `analyseNote` at Finish            | Once, at the end     |

Two routes rather than one, because the cadences differ by roughly 40x and the fast pane must not wait on the slow one. Neither writes a `Consultation` column nor moves `status`; the precedent is `POST /analyze-ephemeral`.

### The Note Stays At Finish, On Evidence

§20.8.1 measures every extract-then-write variant as **less grounded** than writing from the transcript: 0.971 against 0.914 to 0.946. A forced-prefix fold hands the model its own previous note plus new text, so from cycle two the note is written partly from a note. That is the same shape by another route, and it degrades the property invisibly, because the output still reads like a note written from the consultation.

It also erodes the control underneath. `hasVerbatimEvidence` accepts an assertion only when its span appears in the transcript, and a note folded from a note gives that check progressively less raw transcript to match against.

The attention argument points the same way. The three things a doctor can act on mid-consultation are what to ask next, what is dangerous, and who the patient is. A note is read afterwards, so a note rewriting itself while they talk is churn on the one surface nobody acts on mid-sentence, which is where §20.8.1's 13.8 retraction score lands hardest.

### No Differential Diagnosis, And The Reason Is Regulatory

Researched 07/09/26 before building. The vendors that go in-encounter ship **cited evidence pulled on demand** (Abridge against NEJM, JAMA and UpToDate; Heidi's in-session ask), not a pushed differential; Ambience ships no in-visit decision support at all.

The line that decides it for a Malaysian product: the **Medical Device Authority** classifies software that provides clinical recommendations, assists in diagnosis, or influences treatment decisions as **Class B minimum, possibly Class C**, which brings a licensed conformity assessment body, IEC 62304, ISO 14971, a clinical evidence summary and usability engineering. A documentation tool sits outside that. A differential generator does not. FDA's January 2026 CDS guidance keeps non-device status only where the professional can independently review the basis for a recommendation.

That question belongs to **#226**, not to a UI issue. Nothing in the live panes proposes, ranks or implies a diagnosis.

### The Fold, And Why The Model Never Sees The Previous Facts

Each cycle sends the new window plus the previous cycle's **state**, and `LiveAnalysisStateSchema` has no field a growing transcript could travel in. The merge is `foldFacts` in `backend/src/analysis/live.ts`: field-wise monotone, so a field that has left `NOT_ASSESSED` never slides back. An established field may still be corrected by another established value; only the slide to unknown is refused, because that is the one that would blank a line the doctor has already read.

Deciding this in code rather than asking the model is the same reasoning that makes `deriveGaps` stronger than a model judge: the key set is fixed, so the merge is decidable, cheaper, and cannot be argued out of a fact.

### The One-Segment Lookback Is A Safety Requirement

Each window repeats the previous window's last closed segment. `findDeniedAbility` (`redflags/triggers.ts`) is an adjacency-pair matcher reading `turns[index + 1]`, and unlike `asserts()` it does so **regardless of `labelsReviewed`**. A doctor's question closing one window with the patient's denial opening the next would be invisible to a strictly disjoint delta, and for some emergency triggers that pair is the only path that raises them at all.

`backend/src/redflags/live-window.test.ts` pins it, including a test written to fail if the lookback is removed.

### Decisions A Reviewer Will Question

| Decision                                           | Why                                                                                                                                                          |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `labelsReviewed` forced to `false` server-side     | Nobody has reviewed a label mid-consultation, and the field only ever _weakens_ the engine. A client must not be able to buy the question-denial suppression |
| Audit is session-scoped, not per cycle             | ~100 cycles per consultation against `CHAIN_HEAD_ATTEMPTS = 3` would fail requests on chain contention. `asr.live_session_minted` is the shipped precedent   |
| `live-flags` writes no audit row                   | No egress and no state change, so there is no act to record. Precedent: `GET /api/asr/live-sessions/config`                                                  |
| Evidence spans are checked against the window only | A span must appear in the text the model was shown. A field established earlier keeps its already-checked evidence through the fold                          |

### What This Does Not Do

- **No Spend Cap**, per-actor or global. The two limiters bound a caller, not a bill. Same open gap as `hostedAsrRateLimit`.
- **Nothing Is Persisted**, so a reload loses the live panes exactly as it loses the transcript. A dropped socket now reconnects; a reload is only guarded by the leave-page prompt (#256, D-010).
- **The Live Pass Is Additive And Advisory.** It can surface a flag earlier than Finish would; it can never remove one. `evaluateRedFlags` over the whole stored transcript at Finish stays the authoritative, persisted, audited run.

---

## 20.12 Two-Way Translation On Ambient Capture

**Status: `Decided, building`.** Recorded 28/09/26. The grant is §20.10 "Extended 28/09/26". Work is split across #389 (measurement), #390 (engine phrasings), #391 (names), #392 (API) and #393 (UI). **Extended 06/10/26 to Mandarin and Tamil, unmeasured** (§20.10 "Extended 06/10/26", D-008's amendment, #385).

A Pakistani or Bangladeshi patient speaks Urdu or Bengali, and the doctor answers in English. Each turn shows what was said with its translation beneath, in both directions, while the consultation is running.

### Why Soniox, After Research

Researched 28/09/26 across Soniox, the hyperscalers, and specialist and open-source models. The live two-way requirement narrows the field quickly.

| Candidate                       | Urdu       | Bengali    | Live Two-Way Translation | Verdict                                                        |
| ------------------------------- | ---------- | ---------- | ------------------------ | -------------------------------------------------------------- |
| **Soniox `stt-rt-v5`**          | Yes        | Yes        | Yes, same socket         | **Chosen.** No new egress, and translation is not billed extra |
| Alibaba Qwen LiveTranslate      | Yes        | Yes        | Yes                      | The follow-up pilot, because it has a Singapore endpoint       |
| Gladia Solaria                  | Yes        | Yes        | Yes                      | Plausible, on vendor claims only                               |
| Azure Speech Translation        | ur-IN only | bn-IN only | Yes                      | The Indian variants of both languages, at about $2.50 per hour |
| OpenAI `gpt-realtime-translate` | **No**     | Yes        | Yes                      | Disqualified for Urdu by its own language list                 |
| AWS Transcribe                  | **No**     | bn-IN only | No                       | Disqualified                                                   |
| Deepgram, Speechmatics          | Yes        | Yes        | No                       | Recognition only, with no Urdu or Bengali translation          |

- **The Deciding Property Is Egress.** Every other candidate is a third audio egress, needing a fresh sign-off, a CSP change, a new guard and a new way to authenticate a browser.
- **Accuracy Evidence For Urdu And Bengali Is Vendor-Published Everywhere.** Soniox quotes 6.3% WER for both, against Google at 13.4% and 48.9%. No independent benchmark covers any commercial vendor on either language.
- **Independent Numbers Exist Only For Open Models.** On FLEURS, SeamlessM4T v2 scores 9.6% CER on Urdu and 9.0% on Bengali. Whisper large-v3 scores 9.4% and 33.9%, so the on-device path is a poor fallback for Bengali in particular.
- **Clinical Guidance.** NHS England advises against automated translation in place of professional interpreters, for consent and high-stakes content above all.

### The Mechanism

| Piece       | What It Is                                                                                                                                                                                               |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Request     | `POST /api/asr/live-sessions` takes `translation: 'ur' \| 'bn'`, valid with `mode: 'ambient'` only. Consent, cap and rate-limit bucket are ambient's, unchanged                                          |
| Config      | `translatedAmbientConfig(language)` in `backend/src/lib/asr/soniox.ts`, a written-out table selected by a closed enum. `liveSessionConfig` is untouched                                                  |
| First frame | Hints `[language, 'en', 'ms']`, diarisation off, endpoint detection on, no `terms`, and `translation: { type: 'two_way' }` pairing the language with English                                             |
| Probe       | `GET /api/asr/live-sessions/config` advertises `availableTranslations`, so an SPA hides the option against an older API instead of failing                                                               |
| Audit       | Unchanged, and deliberately so: neither live-session row records translation                                                                                                                             |
| Stored      | `turn.text` is always Latin script: English, or Malay the recogniser left untranslated. `turn.otherLanguage` keeps the other half, and `transcript.machineTranslation` records that translation happened |

### Measured 28/09/26: What The Stream Actually Does

#389 streamed synthetic two-voice dialogues at real-time pace: 9 runs, about 3,600 final tokens and 190 translation runs. The audio was edge-tts voices, synthetic only, per §20.1.

| Question                                   | Answer                                                                                                                             |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Where does a translated segment end?       | **Translations Arrive In Lockstep.** Every translation run directly follows the original chunk it translates, with zero violations |
| Does `<end>` ever precede its translation? | Never. With endpoint detection off the lockstep still holds, so it belongs to the translation pipeline rather than to endpointing  |
| Timing on translation tokens               | None. Turn timing comes from the original tokens                                                                                   |
| Non-final translation tokens               | None seen. Translations arrive final, 10 to 60 ms after their original chunk                                                       |
| `speaker` on translation tokens            | Only when diarisation is on                                                                                                        |
| Urdu tagged as Hindi                       | No. Tagged `ur`, in Perso-Arabic script                                                                                            |
| English words inside Bengali or Urdu       | Carried into the English. Urdu writes them in its own script, and both still translate to "chest pain"                             |
| `language_hints_strict`                    | Accepted, and behaved identically to plain hints, so it is not used                                                                |
| Latency                                    | Text settles about 0.7 s after the speaker stops, and the translation follows within about 50 ms                                   |

**The Lockstep Is What Makes Pairing Safe.** `findDeniedAbility` composes an emergency flag from turn adjacency alone on unreviewed labels, so a translated "No." attached to the wrong turn would silently drop that flag. Pairing each translation with the chunk directly before it is deterministic, and the UI tests pin it (#393).

### Measured 28/09/26: Malay Is The Dangerous Case

| Hints                  | The Patient Says "Tak Ada, Doktor." ("No, Doctor")                                          |
| ---------------------- | ------------------------------------------------------------------------------------------- |
| `[bn, en]`             | Heard as Bengali script "তা আদা, ডক্টর।" and translated **"Yes, doctor."**, a negation flip |
| `[bn, en]` plus strict | The same flip                                                                               |
| `[bn, en, ms]`         | Recognised as Malay, left untranslated, and read natively by the engine                     |

This is §20.1 finding 2 on a new vendor: declaring the wrong language produces fluent fabrication. Malay therefore stays hinted.

### Measured 28/09/26: Red-Flag Recall On The Translated English

One patient sentence per trigger, in each language, run through the real engine:

- **Before #390: 7/12 In Both Languages.** Every translation was semantically right. The five misses were plain English the engine lacked: "blood is coming along with the cough", saliva coming out of the mouth, "my body is shaking", "passed out" and "haven't been able to urinate".
- **After #390: 12/12.** `redflag-list-v13` appends those forms. Review of #390 also found "No, I haven't been able to urinate" silenced by its leading "No". That is fixed and pinned.
- **Full Dialogues.** Both raise chest pain, dyspnoea, fever, and the swallowing flag from "Can you swallow?" followed by "No.". The negated "No blood comes with the cough" raises nothing.

### Decisions A Reviewer Will Question

| Decision                                      | Why                                                                                                                                                                    |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Translation is a request field, not a mode    | A translated consultation is an ambient one. Consent, session cap and rate-limit bucket carry over with no change, and `liveSessionConfig`'s pinned signature stays    |
| English is `turn.text`, never the original    | The engine matches English and Malay only, and de-identification reads Latin script only, so the original would disable every trigger and pass names to the LLM        |
| The audit rows say nothing about translation  | With two languages on offer even a boolean names a likely national origin, and the trail outlives erasure. The transcript records it instead, where erasure reaches it |
| No refine tying pairs to `machineTranslation` | A missing marker costs a banner; a refine would refuse the save and lose the transcript over a display fact                                                            |
| Diarisation off, endpoint detection on        | Roles come from the spoken language, so a frozen wrong speaker id has nothing to damage, the argument that inverts dictation's settings. `<end>` bounds each turn      |
| No `terms`                                    | Both vocabularies target Malay consultations, and §20.7.1 measured a wrong-language context scoring worse than none                                                    |
| Consent stays English only                    | The owner's decision, 28/09/26, recorded with its cost in `docs/decisions/` D-008                                                                                      |

### Never Sent To A Model

- **What Is Shielded.** `otherLanguage.text` is Bengali or Urdu script, which no name detector reads, so a name written in it would pass them untouched.
- **What Enforces It.** `backend/src/deid/no-stray-other-language.test.ts` pins it behaviourally, on `serialiseTranscript` and the copilot digest.
- **Structurally, Too.** The same test finds the field named nowhere in backend source. The API stores the transcript and never needs to read this field. That half matches the name only, so a spread or a stringified transcript would slip past it.
- **At The Gate, Whatever A Client Sends.** The `SCRIPT` detector (#391) tokenises any run of Bengali, Arabic or Devanagari script, so script reaching model-bound text by any route becomes a token. `assertNoIdentifiers` re-runs it at egress.
- **The Gap That Remains, Narrowed (#418).** Chinese and Tamil script sit outside `SCRIPT` on purpose, because ambient capture hints both and tokenising them would blind the note. A name in either is now tokenised where a cue marks it: a self-introduction ("我叫", "我姓", "என் பெயர்", or a Latin "my name is" or "nama saya" before the script) or a title (the surname alone directly before 先生, 小姐 or 医生, where it starts a word; one word after திரு, திருமதி or செல்வி). A Chinese name must open on a listed surname unless it ends the clause, and a cued name that ends a clause is found again where it repeats. A name said with neither still passes the gate on the untranslated Auto-detect path (`decisions/` D-011).
- **Mandarin And Tamil On A Translated Session.** The original rides in `otherLanguage` like Urdu and Bengali, and the script guard in `frontend/src/audio/live/bilingual.ts`, an allowlist of Latin script, keeps Chinese, Tamil and any neighbouring script out of `turn.text`. It runs in the browser, so on these two pairs it and `no-stray-other-language.test.ts` are the protection, with no gate-side backstop: a client other than the SPA, or a doctor's edit to the transcript, bypasses it, exactly as on Auto-detect.
- **Pinyin Names.** Mandarin translation spells a Chinese name in Pinyin, which the Malaysian romanisations in the gazetteer never match, so thirty common Pinyin surnames were added with #385.
- **Erasure.** `eraseConsultation` already nulls the whole transcript column, originals included.

### What Is Not Measured

| Unmeasured                             | Why It Matters                                                                                                          |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Accuracy on real speech                | #389 used clean synthetic voices. It measures the wire and the pipeline, not recognition quality                        |
| Translation quality                    | No vendor publishes BLEU or COMET for Urdu or Bengali, and nothing here scores it                                       |
| Mandarin and Tamil, at all             | Added without a #389-style run: pairing, latency, the Malay negation check and red-flag recall are all unknown for both |
| Sylheti and Chittagonian               | Spoken by many Bangladeshi patients, never mentioned by the vendor, and likely to fare poorly                           |
| Pashto and Sindhi                      | Not supported by the vendor                                                                                             |
| Overlapping speech, load, clinic noise | None of these occur in synthetic audio                                                                                  |

**Machine Translation Is A Third Fabrication Surface**, after recognition and before the engine. §20.3 finding 1 has already measured a translation erasing the exact phrase the chest-pain trigger matches. This does not establish translated accuracy.

### Follow-Ups

- A pilot of Qwen LiveTranslate against Soniox on native-speaker recordings. It is the one candidate with a Singapore endpoint.
- Malay as the doctor's language in the pair, since Soniox supports it and the engine reads it.
- Punjabi, which the vendor lists and nobody here has measured.
- `context.translation_terms` for clinical terms, measured before adoption.
- ~~#394, a denied first mention silencing a later genuine one in the same turn, found in review of #390.~~ Fixed in `redflag-list-v14`, with #398, the comma that never ended a denial.
- ~~#423, a denial reaching past a comma into a clause with no subject ("No fever, breathless since morning"), found in review of #221.~~ Fixed in `redflag-list-v15`.
- ~~#426, an "or", a negation or "denied" keeping a report after a comma inside the denial, found in review of #424.~~ Fixed in `redflag-list-v16`.

### Provenance Of The Sources In This Section

- Soniox: real-time translation, data residency and pricing documentation, read 28/09/26.
- Vendor language lists: Azure Speech, OpenAI `gpt-realtime-translate`, AWS Transcribe, Google Speech-to-Text and Alibaba Model Studio, read 28/09/26.
- Open-model numbers: Fleurs-SLU (arXiv 2501.06117), and "WER We Stand" (arXiv 2409.11252) for Urdu.
- Clinical guidance: NHS England interpreting guidance and its improvement framework for translation and interpreting services.

## 20.13 Evaluated 15/10/26: ElevenLabs Scribe v2 Realtime As A Soniox Replacement

**Status: `Evaluated, not adopted`.** Recorded 15/10/26. Nothing in production changes: Soniox stays for ambient, dictation and translated capture. No new audio egress was granted, and only synthetic audio was sent to ElevenLabs.

**Update 16/10/26:** batch `scribe_v2` was adopted for post-Stop refinement of untranslated ambient consultations (§20.14). The realtime verdict above is unchanged.

- **The Question.** The owner asked whether Scribe v2 Realtime can replace Soniox `stt-rt-v5`. The motive was accuracy.
- **The Hard Requirement.** Diarisation, because ambient capture is a doctor and a patient.
- **Languages That Matter.** English, Malay, Mandarin and Tamil, plus code-switching. Translation is not a priority yet.

### Scope Change And How It Is Recorded

| Stage          | What Happened                                                                                                                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| First pass     | The rule below was written before any run and the first measurement used four corpus fixtures, centred on Manglish and Malay                                                                      |
| Scope widened  | The owner then named Mandarin and Tamil as in scope, with code-switching, and the measurement was extended to them using the owner's notes on how Malaysians speak                                |
| How it is read | The rule is **evaluated unchanged on its original Manglish and Malay fixtures**. The new languages are additional evidence. The rule was not re-fitted to them                                    |
| Out of scope   | Bengali and Urdu speech, and translation. The one fixture carrying them was kept and measured, but it informs no verdict here. Scribe Realtime has no translation, recorded as a constraint below |

### Pre-Registered Decision Rule

Written before any run, before the scope widened.

| Criterion                    | Threshold                                                                                                                                                  |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ambient replacement fails if | Scribe Realtime puts a `speaker_id` on fewer than 95% of words, **or** its two-speaker word attribution trails Soniox by more than 5 points on clean turns |
| An accuracy win is           | At least 2 points of absolute WER improvement on the Manglish and Malay fixtures, consistent across runs                                                   |

### Verdict

| Question                                 | Answer                                                                                                                                                                                                                                                                                                                                       |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ambient replacement                      | **Fails On Diarisation Alone, In Every Language.** Soniox stays                                                                                                                                                                                                                                                                              |
| Accuracy motive                          | **Mixed, Not Met.** Pooled Manglish and Malay is 4.5% against 5.6%, a 1.1-point difference under the 2-point bar                                                                                                                                                                                                                             |
| Clean turns, Scribe Realtime             | Better than Soniox on Malay, Malay with English, Mandarin and Malaysian Mandarin; about level on English                                                                                                                                                                                                                                     |
| Where it is worse                        | Much worse on Tamil, loses turns under overlap, changes script under automatic language, and fabricates symptoms when tuned to commit per turn                                                                                                                                                                                               |
| Any safe configuration                   | None tested was safe across all four languages                                                                                                                                                                                                                                                                                               |
| Non-streaming option (batch `scribe_v2`) | Passes diarisation (99.9% attribution) and every clinical-meaning check. Reads every in-scope language as well as or better than Soniox except monolingual Tamil, where the differences are harmless, and the rare three-language case (14.0% against 7.1% CER). An open owner decision, not adopted, with the costs in the subsection above |
| Open question for the owner              | Prescription dictation is a single speaker in Malay and English and needs no diarisation, so it is the one surface where the clean-turn Malay edge could matter. See Follow-Ups                                                                                                                                                              |

### Method

| Piece        | What Was Done                                                                                                                                                                                                                                                                                                                       |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fixtures     | 11 in total. Four from `backend/src/fixtures/corpus.ts`: `urti-gap-heavy` (Manglish), `urti-malay-red-flag` (Malay), `urti-hard-red-flag` (English), `urti-script-mixed-paste` (out of scope, below). Mandarin and Tamil lines from `backend/src/fixtures/languages.ts`, roles alternating. Five authored for this run (next table) |
| Authored set | Shaped by the owner's notes: one base language per sentence with single English words inserted, colloquial Malay, Malaysian terms inside Mandarin, three-language sentences rare. Short, written by us, and kept with the harness outside the repo                                                                                  |
| Voices       | Two ElevenLabs TTS voice pairs (`eleven_multilingual_v2`; `eleven_v3` for non-Latin lines), doctor and patient. Each turn trimmed and joined into 16 kHz mono PCM                                                                                                                                                                   |
| Conditions   | Clean turns 600 ms apart, and turns overlapping by 300 ms where the speaker changes (mirrors #388). Ground truth per turn from clip boundaries                                                                                                                                                                                      |
| Volume       | 44 files, 19.3 minutes, two voice pairs, both conditions. 628 results, 0 failed calls                                                                                                                                                                                                                                               |
| Feeding      | Every arm got the same PCM in 250 ms real-time-paced slices, as the SPA sends it                                                                                                                                                                                                                                                    |
| Attribution  | Share of words, each placed in a ground-truth turn by its timestamp midpoint (words inside an overlap excluded), whose speaker label matches the turn under the best one-to-one label-to-role mapping                                                                                                                               |

**Authored Fixtures:**

| Fixture                           | Content                                                          |
| --------------------------------- | ---------------------------------------------------------------- |
| Malay with English words          | "saya dah demam tiga hari, pastu tekak sakit, susah nak swallow" |
| Malaysian Mandarin, English words | Local terms such as MC, panadol, office                          |
| Mandarin with English             | Mandarin base, single English words                              |
| Tamil with English                | Tamil base, single English words                                 |
| Three languages                   | Reported as the rare case                                        |

**Metrics:**

| Metric                | Use                                                                                                                                          |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| WER                   | Latin-script text, with `evals/wer.ts`                                                                                                       |
| CER                   | Anything containing Chinese                                                                                                                  |
| Tamil WER, marks kept | Computed with combining marks kept, because `evals/wer.ts` strips them and splits Tamil words at the vowel signs                             |
| Number-blind variant  | Sets digits and number words aside on both sides. Soniox writes numbers as digits ("3天", "3 hari"), which the plain metrics count as errors |
| Turn majority         | Share of turns whose majority label maps to the right role                                                                                   |

**Arms:**

| Arm                             | Configuration                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Soniox control                  | Production ambient first frame (`stt-rt-v5`, hints ms/en/zh/ta, diarisation on, endpoint detection off, the 120 `asrContextTerms` and the same `context.general`), with `audio_format: 'pcm_s16le'` instead of production's `'auto'` webm                                                                                                               |
| `scribe_v2_realtime`            | Minted through `POST /v1/single-use-token/realtime_scribe` (the browser-direct shape), `commit_strategy=vad`, `include_timestamps`, `include_language_detection`, keyterms = the first 50 of those terms of at most 20 characters (Scribe Realtime's cap). Two variants: `language_code=ms` with `secondary_languages` en/zh/ta, and automatic language |
| Best-effort Scribe arm, partial | `language_code=ms` with secondaries and `vad_silence_threshold_secs=0.5`, so it commits per turn. The 600 ms turn gaps never reach the 1.5 s default, so a default session commits the whole consultation as one segment. The machine ran low on memory and the run was stopped at 84 of 120 results, with every file run at least once                 |
| Diarize probe                   | The `ms` variant plus `diarize=true` and `num_speakers=2` on the realtime socket                                                                                                                                                                                                                                                                        |
| Batch reference                 | `scribe_v2_medical` on the finished file, `diarize=true`, `num_speakers=2`, word timestamps, all 120 terms as keyterms                                                                                                                                                                                                                                  |

**Harness Self-Check, Passed Before Any Scribe Number Was Read:**

- Soniox attributed 100% of words on clean turns, as #388 measured.
- Soniox read the Malay fixture at 7.8% WER (#218 measured 9.4% on different lines).

### Results On The Pre-Registered Fixtures

Manglish and Malay fixtures pooled, 12 results per cell. The rule is applied to this table.

| Arm                        | WER Clean | WER Overlap | Speaker Coverage | Word Attribution Clean | Word Attribution Overlap |
| -------------------------- | --------- | ----------- | ---------------- | ---------------------- | ------------------------ |
| Soniox `stt-rt-v5`         | 5.6%      | 6.1%        | 100%             | 100%                   | 100%                     |
| `scribe_v2_realtime`, ms   | 4.5%      | 21.7%       | 0%               | 0%                     | 0%                       |
| `scribe_v2_realtime`, auto | 5.9%      | 22.3%       | 0%               | 0%                     | 0%                       |
| `scribe_v2_medical`, batch | 4.5%      | 5.3%        | 100%             | 61.6%                  | 67.5%                    |

- **Per-Run WER, Both Conditions Pooled.** Soniox 5.6 / 6.1 / 5.8%; Scribe Realtime ms 13.0 / 13.0 / 13.3%; batch medical 4.4 / 5.5 / 4.8%.
- **English Fixture.** Soniox 3.1% clean / 3.5% overlap, 100% attribution. Scribe Realtime ms 2.7% / 2.7%, 0% attribution. Batch medical 1.9% / 2.7%, 91.7% / 75.7% attribution.
- **The Malay-Only Gap Of 2.6 Points** (Soniox 7.8%, Scribe Realtime ms 5.2%, clean) is a subgroup read after the fact. It is recorded as an observation and not as a win under the rule.

### Results On The Widened Scope

Additional evidence, not the basis of the verdict. Error rates in percent. Scribe RT is Scribe Realtime. "VAD 0.5 s" is the partial best-effort arm.

**Clean Turns:**

| Fixture                            | Metric          | Soniox | Scribe RT (ms) | Scribe RT (Auto) | Scribe RT (ms, VAD 0.5 s, Partial) | Batch |
| ---------------------------------- | --------------- | ------ | -------------- | ---------------- | ---------------------------------- | ----- |
| Malay                              | WER             | 7.8    | 5.2            | 9.1              | 8.8                                | 4.1   |
| Malay + English words              | WER             | 11.7   | 5.1            | 5.1              | 9.4                                | 5.1   |
| English base + Malay words         | WER             | 3.8    | 4.0            | 3.5              | 5.5                                | 4.8   |
| English                            | WER             | 3.1    | 2.7            | 4.0              | 3.5                                | 1.9   |
| Malaysian Mandarin + English words | CER             | 8.5    | 4.2            | 3.8              | 22.4                               | 1.9   |
| Mandarin                           | CER             | 7.6    | 0.0            | 0.0              | 93.5                               | 0.0   |
| Mandarin + English                 | CER             | 9.5    | 1.8            | 4.0              | 23.7                               | 7.5   |
| Tamil                              | WER, marks kept | 17.9   | 33.9           | 33.9             | 32.1                               | 10.7  |
| Tamil + English                    | WER, marks kept | 12.8   | 36.9           | 71.5             | 25.0                               | 82.7  |
| Three languages, rare              | CER             | 8.7    | 36.4           | 36.9             | 34.9                               | 16.1  |

**Turns Overlapping By 300 ms:**

| Fixture                            | Metric          | Soniox | Scribe RT (ms) | Scribe RT (Auto) | Scribe RT (ms, VAD 0.5 s, Partial) | Batch |
| ---------------------------------- | --------------- | ------ | -------------- | ---------------- | ---------------------------------- | ----- |
| Malay                              | WER             | 9.5    | 6.9            | 8.4              | 7.1                                | 4.8   |
| Malay + English words              | WER             | 11.4   | 6.1            | 6.1              | 6.1                                | 5.1   |
| English base + Malay words         | WER             | 3.5    | 33.0           | 33.0             | 20.5                               | 5.7   |
| English                            | WER             | 3.5    | 2.7            | 2.7              | 4.0                                | 2.7   |
| Malaysian Mandarin + English words | CER             | 7.5    | 10.1           | 199.8            | 10.1                               | 2.9   |
| Mandarin                           | CER             | 7.6    | 18.5           | 18.5             | 17.4                               | 0.0   |
| Mandarin + English                 | CER             | 12.6   | 1.8            | 1.8              | 7.8                                | 6.6   |
| Tamil                              | WER, marks kept | 19.6   | 85.7           | 85.7             | 100.0                              | 9.5   |
| Tamil + English                    | WER, marks kept | 16.7   | 7.7            | 48.1             | 8.7                                | 32.7  |
| Three languages, rare              | CER             | 8.8    | 23.9           | 24.9             | 30.6                               | 9.3   |

**Number-Blind, Clean Turns:**

| Fixture               | Soniox | Scribe RT (ms) |
| --------------------- | ------ | -------------- |
| Mandarin (CER)        | 3.6%   | 0.0%           |
| Tamil (WER)           | 8.0%   | 36.0%          |
| Malay (WER)           | 5.9%   | 3.5%           |
| Malay + English (WER) | 8.0%   | 5.3%           |

Digits therefore account for about half of Soniox's Mandarin and Tamil error.

**Speaker Attribution, Every In-Scope Fixture, Both Conditions:**

| Arm                          | Words Attributed                                                                  |
| ---------------------------- | --------------------------------------------------------------------------------- |
| Soniox                       | 100%                                                                              |
| Every Scribe Realtime config | 0%                                                                                |
| Batch `scribe_v2_medical`    | 51 to 92% clean and 51 to 100% overlap, with some runs returning a single speaker |

### Findings

| #   | Finding                                                                            | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **No Diarisation On The Realtime Model**                                           | 0 of 25,187 words across 364 Scribe Realtime streams carried a speaker. `diarize=true` and `num_speakers=2` on the socket are silently ignored: no error, no warning, and the `session_started` config does not echo them. ElevenLabs documents diarisation only for the batch models                                                                                                                                                                                                                                                                                                                                                  |
| 2   | **Drops A Speaker Under Overlap**                                                  | Manglish fixture: 0 of 6 doctor turns for one voice pair and 4 of 6 for the other, on every run. Tamil: the doctor's question "காய்ச்சல் இருக்கிறதா?" ("Do you have a fever?") survived in 3 of 12 results. Soniox and batch kept 12 of 12. Losing a doctor's question matters beyond WER: the red-flag engine reads the question-denial shape                                                                                                                                                                                                                                                                                         |
| 3   | **Changes Script Under Automatic Language**                                        | Tamil with English came back in Devanagari ("इन्नकी एन्ना problem"). Overlapping Malaysian Mandarin came back as pinyin ("Nihao, jingtian shi yao wèn ti"), which is where the 199.8% CER comes from                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 4   | **Fabricates And Inverts Symptoms When Committing Per Turn**                       | With 0.5 s VAD (partial arm), short Mandarin turns were relabelled Malay or English and rewritten. "喉咙痛吗？" ("Sore throat?") became "Hidung tersumbat" ("blocked nose"), a symptom nobody said. "有没有发烧？" became "You have fever?". "有，晚上会发烧" became "You, when shall we have a show?". A Mandarin result came back partly in Latin script in 4 of 8 runs. Tamil "மூச்சு விடுவதில் சிரமம் இல்லை" ("no difficulty breathing") became "சிரமம் மிகுந்து விட்டது" ("the difficulty has increased") in 2 of 8, a fabricated red-flag symptom. The setting that would fix long-segment truncation makes the output less safe |
| 5   | **Truncates Tamil Mid-Character**                                                  | The text ended in U+FFFD in 4 of 120 results for each realtime config, never on Soniox or batch                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 6   | **The Medical Batch Model Merges Voices And, With Our Malay Keyterms, Translates** | It returned the Tamil-with-English consultation as Malay ("Selamat pagi. Hari ini apa masalahnya?"), hence 82.7%. Without keyterms the medical model read Tamil with English at 1.5%, so the translation came from the medical model combined with Malay keyterms. Its diarisation is 51 to 92%, with some runs returning one voice. The standard `scribe_v2` model behaves differently: see the next subsection                                                                                                                                                                                                                       |
| 7   | **Soniox Makes Its Own Errors**                                                    | On Malay with English words, the most common Malaysian shape, Soniox heard "Ada batuk sikit" ("a little cough") as "Tak ada batuk" ("no cough") in 3 of 12 results, a negation flip. It lost "chest pain" (as "chestbone") in 3 of 12, and misheard 咳嗽 ("cough") as 可搜 in some Mandarin results. Every ElevenLabs arm kept "a little cough" and "chest pain" in 12 of 12. Scribe Realtime reads clean Malay and Mandarin better than Soniox does                                                                                                                                                                                   |
| 8   | **Commit Latency Is Not Comparable**                                               | Scribe's committed text arrived a median 1.2 to 2.0 s after the last word; Soniox's final tokens 5.3 to 5.7 s, because ambient runs with endpoint detection off by design (§20.10) and shows non-final tokens immediately. VAD commits need 1.5 s of silence, so on the overlap audio Scribe committed nothing until the stream ended                                                                                                                                                                                                                                                                                                  |

### Batch `scribe_v2`: The Non-Streaming Option (Measured 15/10/26)

The owner asked whether batch Scribe v2 can diarise as a non-streaming option: the consultation is recorded with no live text, and a diarised transcript comes back after Stop. The first pass had tested only `scribe_v2_medical`. This measurement covers the standard `scribe_v2` model. **Only the medical model collapses voices; standard `scribe_v2` diarises almost perfectly.**

**Method:** `diarize=true` on the standard model, all 44 files, two runs each: 440 calls, 0 failures.

| Config | Setting                                                                                                      |
| ------ | ------------------------------------------------------------------------------------------------------------ |
| (a)    | `scribe_v2`, `num_speakers=2` (a maximum, not an exact count), with the 120 keyterms                         |
| (b)    | `scribe_v2`, vendor defaults                                                                                 |
| (c)    | `scribe_v2`, `diarization_threshold=0.1`                                                                     |
| (d)    | `scribe_v2`, `num_speakers=2` with `detect_speaker_roles=true`, which labels speakers `agent` and `customer` |
| (e)    | `scribe_v2_medical`, defaults                                                                                |

**Diarisation, In-Scope Fixtures Pooled.** Each cell is word attribution / turn majority, then the results that came back as one voice.

| Config                                            | Clean                  | Overlap                |
| ------------------------------------------------- | ---------------------- | ---------------------- |
| Soniox                                            | 100 / 100 (0 of 60)    | 100 / 96.6 (0 of 60)   |
| Medical, `num_speakers=2` + keyterms (first pass) | 62.9 / 59.2 (45 of 60) | 64.0 / 60.2 (45 of 60) |
| Medical, defaults                                 | 63.9 / 60.6 (15 of 40) | 64.4 / 58.9 (25 of 40) |
| `scribe_v2`, `num_speakers=2` + keyterms          | 99.9 / 100 (0 of 40)   | 100 / 98.3 (0 of 40)   |
| `scribe_v2`, defaults                             | 98.3 / 98.6 (1 of 40)  | 100 / 98.3 (0 of 40)   |
| `scribe_v2`, threshold 0.1                        | 99.8 / 100 (0 of 40)   | 98.4 / 96.8 (1 of 40)  |
| `scribe_v2`, roles                                | 99.5 / 100 (0 of 40)   | 100 / 98.3 (0 of 40)   |

**Doctor And Patient, Named Directly.** `detect_speaker_roles` labelled the doctor `agent` and the patient `customer` on 99.5% of words clean and 100% overlap, read literally with no mapping. Soniox returns numbered speakers, which the app labels afterwards (`voteRolesBySpeaker`).

**Accuracy, Number-Blind.** `scribe_v2` with `num_speakers=2` and keyterms against Soniox, error rates in percent (WER, or CER for Chinese; Tamil with marks kept).

| Fixture                      | `scribe_v2` Clean | Soniox Clean | `scribe_v2` Overlap | Soniox Overlap |
| ---------------------------- | ----------------- | ------------ | ------------------- | -------------- |
| Malay                        | 4.3               | 5.9          | 6.6                 | 7.7            |
| Malay + English words        | 6.6               | 8.0          | 5.9                 | 7.6            |
| English base + Malay words   | 2.6               | 3.0          | 2.1                 | 2.6            |
| English                      | 2.2               | 3.1          | 2.2                 | 3.6            |
| Malaysian Mandarin + English | 2.6               | 6.5          | 2.6                 | 5.4            |
| Mandarin                     | 0.0               | 3.6          | 0.0                 | 3.6            |
| Mandarin + English           | 1.6               | 3.3          | 1.1                 | 6.7            |
| Tamil                        | 12.0              | 8.0          | 12.0                | 10.0           |
| Tamil + English              | 2.6               | 9.5          | 3.1                 | 13.6           |
| Three languages, rare        | 14.0              | 7.1          | 17.7                | 7.2            |

- **Tamil.** Batch's remaining Tamil differences are harmless: டாக்டர் written "doctor", and ஆமாம் written ஆமா. Soniox inserted ஞ and in one result dropped the patient's ஆமாம் ("yes").
- **Raw WER On Malay.** Worse for batch (12.7% against 7.8%) because batch spells numbers out.

**Clinical-Meaning Checks.** `scribe_v2` configs (8 results each) against Soniox (12 results).

| Check                                         | Batch `scribe_v2` | Soniox   |
| --------------------------------------------- | ----------------- | -------- |
| "Ada batuk sikit" flipped to "Tak ada batuk"  | 0 of 8            | 3 of 12  |
| "Chest pain" kept                             | 8 of 8            | 9 of 12  |
| Tamil "no difficulty breathing" kept negation | 8 of 8            | 12 of 12 |
| 咳嗽 kept                                     | 8 of 8            | 6 of 12  |
| Mandarin rewritten in Latin script            | 0 of 8            | 0 of 12  |
| Tamil with English translated into Malay      | 0 of 8            | 0 of 12  |

**Wait After Stop.** Median wall time per minute of audio:

| Config              | Seconds    |
| ------------------- | ---------- |
| `scribe_v2`         | 5.6 to 5.7 |
| `scribe_v2` + roles | 8.9        |
| `scribe_v2_medical` | 3.5 to 4.6 |

Extrapolated, a 10-minute consultation would wait about a minute. That is unmeasured: the files were at most 40 s.

**Browser-Direct Upload Is Possible.** `POST /v1/single-use-token/batch_scribe` minted a token with our key, so the audio need not pass through our servers. Not built, and not measured end to end.

**What It Would Cost The Product:**

| Cost                                             | Detail                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No live text during the consultation             | So no live panes or live red-flag hints in that mode (§20.11)                                                                                                                                                                                                                                                                                            |
| A second audio vendor                            | A new egress needing the owner's sign-off under §20.10                                                                                                                                                                                                                                                                                                   |
| Spelled-out numbers are a de-identification risk | The synthetic IC number came back as words in 8 of 8 results, once as gibberish. A detector that looks for digit patterns would not see it, so `backend/src/deid/` must be checked against spelled-out identifiers before any adoption. This is a PHI-boundary item, not formatting. #435 addresses it; see §9 "Spoken Digit Runs" for what still passes |
| Data residency                                   | Singapore residency and zero retention are Enterprise-only                                                                                                                                                                                                                                                                                               |
| Cost                                             | List price for batch Scribe v2 about $0.22 to $0.27 per hour (third-party and vendor comparison tables), against Soniox real-time at about $0.12. Keyterms add 20% and roles add 10% (vendor API reference)                                                                                                                                              |
| Chunking during the consultation                 | Speaker ids reset per request. Role labels might survive chunking; that is unmeasured                                                                                                                                                                                                                                                                    |

### Platform Constraints From Vendor Docs

Read 15/10/26, unverified by us.

| Constraint     | Detail                                                                                                                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Translation    | None on the realtime model. A constraint, not a reason: translation is not a priority yet                                                                                                  |
| Keyterms       | Capped at 50 terms of 20 characters. Soniox takes 120 plus `context.general`                                                                                                               |
| Input          | PCM or u-law only, so the browser would need a PCM path where it now forwards `MediaRecorder` output                                                                                       |
| Idle timeout   | The server closes after 15 s without a client message, which conflicts with recording pause                                                                                                |
| Data residency | Singapore (`api.sg.residency.elevenlabs.io`) is Enterprise-only, in a separate workspace with its own key, and the docs say processing may still occur outside the region                  |
| Zero retention | `enable_logging=false` is Enterprise-only                                                                                                                                                  |
| List price     | About $0.39 per audio hour against Soniox's about $0.12 (third-party and vendor comparison tables, not ElevenLabs' own pricing page; ElevenLabs advertises $0.28 on annual Business plans) |

### What It Would Have Cost To Adopt

- **The Code Hard-Wires Soniox.** `provider: z.literal('soniox')` and the websocket URL check in `shared/src/` (exported from `index.ts`), the CSP in `vercel.json`, and `no-stray-websocket.test.ts`.
- **There Is No ASR Port In Code,** despite §20's description.
- **A Second Vendor Is A New Audio Egress,** needing the owner's sign-off under §20.10.

### Out Of Scope: Bengali, Urdu And Translation

- **Not A Reason For The Verdict.** The owner placed these outside the languages that matter for ambient capture, and translation is not a priority yet.
- **Recorded So It Is Not Lost.** In `urti-script-mixed-paste`, Scribe Realtime omitted the Bengali and Urdu sentences with no marker, where Soniox returned both in the right scripts. Revisit if translated capture (§20.12) is prioritised.

### What It Does Not Establish

| Limit           | Detail                                                                                                                                   |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Real audio      | Synthetic voices only, no real consulting-room audio                                                                                     |
| Voice bias      | ElevenLabs voices may favour ElevenLabs' recogniser, which makes the Soniox advantage the more robust direction and its deficits less so |
| Codec           | PCM rather than production's webm/opus                                                                                                   |
| Coverage        | Two voice pairs. The five authored fixtures are short and written by us, not drawn from real speech                                      |
| Best-effort arm | Partial: stopped at 84 of 120 results, every file run at least once. Its findings (4 especially) rest on fewer runs                      |
| Overlap         | Synthetic 300 ms mixing, not real cross-talk                                                                                             |
| Latency         | Through the deployed path, unmeasured                                                                                                    |

### Follow-Ups

| Item                                          | Detail                                                                                                                                                                                                                                                                                                                                                                      |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dictation question (owner only)               | Prescription dictation is a single speaker in Malay and English and needs no diarisation. Using Scribe there would mean a second audio vendor, needing a fresh sign-off under §20.10, and a dictation-shaped measurement. An open question, not a build                                                                                                                     |
| Non-streaming mode (decided 16/10/26, §20.14) | Decided by §20.14, which supersedes the open question below. The owner decides whether to offer a non-streaming accuracy mode on batch `scribe_v2`. Prerequisites: the egress sign-off; checking de-identification against spelled-out identifiers; measuring on long recordings and on `MediaRecorder` webm; deciding whether live red-flag hints are dropped in that mode |
| Soniox negation flip                          | "Ada batuk sikit" read as "Tak ada batuk" on Malay with English words. A recognition error on the current provider, the same class as the devoicing family in §20.10, and `redflags/mishears.ts` cannot claim a phrase-level flip like this one                                                                                                                             |
| Harness                                       | If a vendor is re-evaluated, the same pre-registered rule and fixtures apply. The harness could be promoted into `evals/` as a Soniox arm (already listed as a §20.10 follow-up)                                                                                                                                                                                            |

### Provenance Of The Sources In This Section

- ElevenLabs realtime and batch speech-to-text API reference, models page, data residency docs and changelog, read 15/10/26.
- The harness, the authored fixtures and the raw message logs are kept outside the repo and not committed, per the `evals/asr-ab.ts` convention that billed measurement runs never enter the test suite.

## 20.14 Refinement After Stop: Batch `scribe_v2`, Browser-Direct, Under An API-Minted Token

**Status: `Decided, building`.** Recorded 16/10/26 (issue #436, `docs/decisions/` D-014). Production is inert until the gated items below are done: nothing is offered while `ELEVENLABS_API_KEY` is unset, and the measurement gate has not run. Realtime stays on Soniox (§20.10, §20.13).

- **What It Does.** Soniox streams during capture exactly as before. After Stop on an untranslated ambient consultation, the whole recording is re-transcribed with batch ElevenLabs `scribe_v2`, and that is the transcript the doctor reviews.
- **On Failure.** Any failed sanity check, timeout, Skip, or lost connection keeps the live Soniox transcript, with a notice. Never silently.
- **Default.** On when configured, with a per-device opt-out.
- **Depends On #435.** Batch writes identifiers as words, which the current de-identification gate cannot see (§20.13 measured the synthetic IC number returned as words in 8 of 8 results). This change must not merge before #435.

### The Sign-Off

| Question         | Answer                                                                                                                                                                                                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Who              | @Andersonnn7788, the repo owner, on 16/10/26 (option b)                                                                                                                                                                                                                                     |
| What it covers   | Post-Stop ambient refinement only. The upload goes browser-direct to `https://api.elevenlabs.io/v1/speech-to-text` under a single-use `batch_scribe` token our API mints and audits. Covers the new audio egress, the exact `connect-src` host, and the SPA's new cross-origin `fetch` site |
| What it does not | Realtime use, dictation, translated sessions, `scribe_v2_medical`, a relay through `/api/*`, naming the vendor on any panel (D-004), or setting any key                                                                                                                                     |
| What gates it    | Production stays off until the owner confirms the vendor account's "use data to improve models" setting is off, and the Render account holder sets `ELEVENLABS_API_KEY` (a speech-to-text-only key with a vendor credit quota). Merge waits for #435                                        |
| What prompted it | The §20.13 batch measurement: diarised, and read the four languages well. The Follow-Ups row "Non-streaming mode" asked for exactly this decision                                                                                                                                           |

### Why Browser-Direct

- A relay through `/api/*` hits Vercel's 120 s time-to-first-byte cap on the rewrite (recorded under §17), which long consultations would exceed.
- CORS preflight was verified by the owner: `access-control-allow-origin: *`.
- The cost is a second cross-origin site in the SPA, which is why it is pinned by its own guard (Controls below).

### Mechanism

1. **Stop.** The recording is taken once and feeds both the upload and playback audio. Refinement runs only when the device toggle is on, the API offers it, a recording within 1860 s exists, the consent tick is held, and the live text is non-empty. It never runs on the stream-failure path.
2. **Mint.** `POST /api/asr/batch-sessions` with `{ consent: true, durationSeconds }`. The API calls the vendor's `single-use-token/batch_scribe` endpoint with the key and returns `{ provider, uploadUrl, token, config }`.
3. **Upload.** The browser posts the recording to the literal upload URL with a fixed form (`model_id`, `diarize`, `num_speakers`, `timestamps_granularity`, `tag_audio_events`, repeated `keyterms`, `file`).
4. **Verdict.** `batch-tokens.ts` maps vendor words to the same `LiveToken` shape and runs the sanity checks below.
5. **Labelling.** The existing `tokensToSegments`, labelling pass and `voteRolesBySpeaker` run unchanged on the candidate tokens, through `draftLinesFor` (`frontend/src/audio/draft-turns.ts`), the same function `CapturePanel` stores lines with. There is one role mechanism, and it also repairs speaker renumbering after a reconnect (D-010).
6. **Check.** `POST /api/asr/refinement-check` sends the live segment texts and the refined turns that will be stored, and returns the red flags the live text fired that the refined text lost. On acceptance those exact turns are delivered and never re-labelled; on refusal the live text is labelled instead, so a refused refinement costs a second labelling pass.

**Phase.** A new `'refining'` phase sits between `'finishing'` and `'labelling'` in `AmbientCapture.tsx`, untranslated branch only. The mint and upload run under the upload timeout; the refined labelling and the check run under the labelling bound. A "Use Live Transcript" Skip button stops whichever is running and takes focus when the phase starts. Refinement never starts if the panel was unmounted after Stop. `onLiveChange(false)` now fires after delivery, in a `finally`, so Consultation Settings stay locked and the leave-page guard holds through refinement and labelling.

**Why The Check Runs After Labelling.** The clinical-safety review showed the engine is sensitive to where turns break: a negation reads back only within a turn, and a denied ability pairs adjacent turns. The recogniser's segments are not the turns the labelling pass and the voice vote make of them, so "nothing lost" on segments did not mean nothing lost in the record.

### Controls

| Control                  | How It Is Enforced                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Key never in the SPA     | `backend/src/lib/asr/elevenlabs.ts` reads `ELEVENLABS_API_KEY` through `env` only. Unset gives 503 `asr_unavailable` and `batchRefinement` is absent from the config response, so other configs are byte-identical                                                                                                                                                                                                                                                                                                                                  |
| Backend carries no audio | `elevenlabs.ts` is the only backend module that may talk to the vendor. The origin is a literal, `redirect: 'error'`, 10 s timeout, no retries, error bodies never read, status mapped to a closed reason set, response Zod-stripped to `{ token }`                                                                                                                                                                                                                                                                                                 |
| Static request config    | `BatchAsrConfigSchema` is strict with every field a literal: `scribe_v2`, diarise on, 2 speakers, word timestamps, audio events off. Keyterms are `asrContextTerms()` (up to 120, each under 50 characters, at most 5 words)                                                                                                                                                                                                                                                                                                                        |
| Bounded session          | `BatchSessionRequestSchema` is `{ consent: true, durationSeconds: 1..1860 }`. Client-asserted, bounded and audited. Static 400 messages                                                                                                                                                                                                                                                                                                                                                                                                             |
| Audited                  | `asr.batch_session_minted` `{ model, durationSeconds, consentAsserted }` or `asr.batch_session_failed` `{ reason }`, written before the response. `consultation.asr_live_used` now carries `{ batchUploaded, batchUsed }` on create and PATCH. `TranscriptSchema.batchTranscription: { used }` is present whenever an upload started                                                                                                                                                                                                                |
| Rate limited             | `batchSessionRateLimit` 5/min and `refinementCheckRateLimit` 10/min, each in its own bucket. `Cache-Control: no-store` on the mint                                                                                                                                                                                                                                                                                                                                                                                                                  |
| One cross-origin site    | `frontend/src/audio/live/elevenlabs-batch.ts` re-checks the session against `BatchSessionSchema` and `BATCH_ASR_UPLOAD_URL` before sending, uses `credentials: 'omit'`, `redirect: 'error'`, `referrerPolicy: 'no-referrer'`, keeps only `text,start,end,type,speaker_id` per word, never reads error bodies, and reports a closed failure enum (`refused`, `rejected`, `rate_limited`, `unavailable`, `invalid_response`, `aborted`)                                                                                                               |
| Exact CSP host           | `vercel.json` `connect-src` adds exactly `https://api.elevenlabs.io`, no wildcard, pinned by `backend/src/lib/asr/elevenlabs.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                               |
| Guards                   | `no-stray-fetch.test.ts` (backend) pins four entries including `elevenlabs.ts: 1`. `no-stray-provider-sdk.test.ts` adds scope `@elevenlabs/` and package `elevenlabs`. New `frontend/src/no-stray-fetch.test.ts` inventories `fetch`, `XMLHttpRequest`, `sendBeacon` and `EventSource` per file and checks every call outside the upload module and the preview stub addresses `${BASE}/api`. `no-stray-audio-persistence.test.ts` allows `live/elevenlabs-batch.ts` and its one caller, and matches raw `fetch(` and `new FormData` under `audio/` |
| Vendor-neutral UI        | The "Refine After Stop" switch and the "Refining the transcript" label name no vendor (D-004). The pin tests also reject "ElevenLabs". The setting reads on when absent and off when present but not `true` (`refineAfterStop`)                                                                                                                                                                                                                                                                                                                     |
| Fallback is visible      | The notice shows in the panel and as a toast raised after delivery, because the review page unmounts the capture panel once the transcript saves (precedent `PrescriptionTheatre`). On acceptance the unsent-tail and short-tail notices are cleared, but only when the refined words reach within 5 s of the end of the recording                                                                                                                                                                                                                  |
| Client-enforced surface  | The untranslated-ambient-only scope, the consent tick and the acceptance verdict are enforced in the SPA. The mint does not know the capture mode, and the token binds neither the mode nor the vendor parameters, so a caller holding a session could upload other audio under other settings. The 5/min limiter, the audit row and the vendor credit quota are what bound that, stated as a gap in `.claude/rules/security.md`                                                                                                                    |
| One caller               | `frontend/src/no-stray-fetch.test.ts` also pins, across the whole SPA, that only `AmbientCapture.tsx` imports the upload module or mints a batch token, so no other surface can reach the egress the grant scopes to post-Stop ambient refinement                                                                                                                                                                                                                                                                                                   |

**The Refinement Check.** The server runs `evaluateRedFlags` with `ALL_REDFLAG_TRIGGERS` over both sides, with `source: 'asr_live'` and `labelsReviewed: false` set server-side. The result is a differential: rule ids fired on live but not on refined. It writes no audit row (precedent: the live-flags route). Texts only, up to 1500 turns and 100000 characters per side.

**The Speaker Is Set Server-Side Too, And Differs By Side.** With unreviewed labels, the only label-dependent reading is the doctor-only safety-netting suppression, and it can only remove a hit.

| Side    | Read As                                                                      | Why                                                                                                                                                                                  |
| ------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Live    | Every turn the patient's, read by segment and as one whole turn, hits pooled | The most the live transcript could raise under any labelling. Segments alone are not an upper bound: a pause can split a phrase so neither half fires while the stored turn joins it |
| Refined | Every turn the doctor's                                                      | The least the refined transcript could raise, so it passes whatever its labels end up                                                                                                |

- **Why Not The Same Reading On Both Sides.** That was the first design, and the clinical-safety review found it unsound. A patient's "I coughed up blood" dropped by the refined pass stayed covered by the doctor's closing "come back if you cough up blood" read as the patient's. Nothing looked lost, and the stored transcript, with the advice labelled the doctor's, raised no haemoptysis. `asr-refinement-check.test.ts` pins that case.
- **The Cost.** A symptom named only in safety-netting advice reads as lost, so the live transcript is kept. Closing advice often names one, so this will refuse many refinements until the owner decides otherwise. It is the safe direction, and the measurement gate should count how often it fires.

### Sanity Checks

Any failure keeps the live transcript with a notice.

| #   | Check                                                                                                                                  |
| --- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Vendor returned 2xx and the wire schema parsed                                                                                         |
| 2   | At least 1 word                                                                                                                        |
| 3   | At least 95% of words carry a speaker (`MIN_SPEAKER_COVERAGE`, from the §20.13 pre-registered rule)                                    |
| 4   | Speaker count at least min(2, live voices) and never more than 2                                                                       |
| 5   | Every word timed, starts monotonic                                                                                                     |
| 6   | Reaches the live transcript's last word within 5 s (`MAX_REFINED_TAIL_SHORTFALL_MS`), so a truncated close is refused                  |
| 7   | Refined units at least 0.8 times live units (`MIN_REFINED_UNIT_RATIO`)                                                                 |
| 8   | Units per minute under 300 (`MAX_REFINED_UNITS_PER_MINUTE`). A unit is a word in spaced scripts or a Han character. Deliberately loose |
| 9   | No Bengali, Arabic or Devanagari script that the live text lacked (§20.13 finding 3)                                                   |
| 10  | The server red-flag check, on the turns that will be stored, finds no lost flags                                                       |

**What The Unit Ratio Does Not Cover.** It lets a refined transcript drop up to a fifth of what live heard. The red-flag check protects only the rule triggers, so allergies, medicines, durations and checklist facts in that fifth are unprotected until the gate sets the ratio.

**Token Mapping.** A `spacing` element folds into the next word, which keeps its own timing so the 1500 ms segment backstop still sees pauses. `speaker_N` becomes `"N+1"`, `confidence` is `null`, and `audio_event` is dropped.

### Thresholds Pending The Measurement Gate

Each is a named constant, **provisional until the measurement gate**.

| Constant                        | Value                                          | File                                      |
| ------------------------------- | ---------------------------------------------- | ----------------------------------------- |
| `MAX_BATCH_RECORDING_SECONDS`   | 1860                                           | `shared/src/batch-asr.ts`                 |
| Upload timeout                  | `min(240 s, max(60 s, 30 s + 15 s x minutes))` | `frontend/src/audio/live/batch-tokens.ts` |
| `MIN_REFINED_UNIT_RATIO`        | 0.8                                            | `frontend/src/audio/live/batch-tokens.ts` |
| `MAX_REFINED_TAIL_SHORTFALL_MS` | 5000                                           | `frontend/src/audio/live/batch-tokens.ts` |
| `MAX_REFINED_UNITS_PER_MINUTE`  | 300                                            | `frontend/src/audio/live/batch-tokens.ts` |

`MIN_SPEAKER_COVERAGE` (95%) is not provisional: it comes from the §20.13 pre-registered rule.

### Gate Results

**Not Run.** The gate needs the owner's laptop, the vendor key and synthetic audio. It also carries the browser checks for the owner's `/verify`:

- Requests fire in order: `POST /api/asr/batch-sessions`, one vendor `POST`, `refinement-check`, then `draft-turns` carrying the refined text.
- Diarised roles land correctly and playback seeks work.
- Skip, and going offline mid-refine, each give the live transcript plus a notice.
- A reload while refining prompts before leaving.
- A translated session never uploads.

### What Is Not Measured

| Unmeasured                                                                     | Consequence                                                                                                                                                                        |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| That the token is single use, and its 15-minute expiry                         | Taken from vendor docs                                                                                                                                                             |
| Whether a speech-to-text-only key can mint `batch_scribe` tokens               | A wrong assumption fails the mint and the live transcript is used                                                                                                                  |
| How the batch endpoint expects the single-use token                            | The token rides as a `token` query parameter, following the vendor's documented convention on its realtime socket. A wrong guess fails closed (401, live transcript with a notice) |
| Vendor retention of the uploaded audio and transcript, and any delete endpoint | Gated on the owner's account setting. Zero retention and Singapore residency are Enterprise-only (§20.13)                                                                          |
| Browser upload end to end                                                      | Covered only by the gate above                                                                                                                                                     |
| Long recordings                                                                | The batch evaluation files were at most 40 s                                                                                                                                       |
| `MediaRecorder` webm/opus input                                                | The evaluation used PCM                                                                                                                                                            |
| Wait time on the deployed path                                                 | Unknown until the gate                                                                                                                                                             |
| The four provisional thresholds                                                | Table above                                                                                                                                                                        |

### Known Costs

- **No Uncertainty Underlines.** Refined transcripts carry no confidence (`confidence: null`), so the underlines are lost.
- **No Model-Edit Cleanup Layer.** That pass only edits inside uncertain ranges (§20.10, #309), so it never runs on a refined transcript. The deterministic mishear proposals are unaffected, since they key on `asr_live`.
- **A Second Labelling Pass On Refusal.** The refined text is labelled before the check, so a refused refinement labels the live text as well, adding up to one more bounded wait.
- **Safety-Netting Advice Refuses Refinement.** See the refinement check above.
- **Only This Pass Is Checked.** A refined pass appended to earlier text is compared with its own live text, not across the boundary with the earlier passes. Low likelihood, recorded rather than covered.
- **Sore-Throat Score Pre-Fill.** The score reads temperature digits only (`backend/src/calculators/sore-throat-score.ts:138`, regex `\d{2}(?:\.\d{1,2})?`), so a spelled-out "thirty-eight point two" from batch no longer pre-fills it.
- **Price.** About $0.22 to $0.27/hour at list price, and keyterms add 20% (§20.13).
- **Live Panes Unchanged.** Soniox still streams during capture, so the live panes and live red-flag hints are as before.
- **Not A Diagnosis.** The doctor still reviews, edits and approves every note.

### Follow-Ups

| Item                           | Detail                                                                                                                                                                            |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spelled-out temperature        | Teach the sore-throat score to read number words. Issue to be filed                                                                                                               |
| Measurement gate               | Run it, then replace the provisional constants with measured values or confirm them                                                                                               |
| Vendor retention               | Owner confirms the account setting and records the answer here. Retention sits outside `eraseConsultation`                                                                        |
| No provider-bound reference id | The token binds neither a duration nor a reference id the provider returns, so the audit row cannot be reconciled against vendor usage the way Soniox's `client_reference_id` can |
| No spend cap                   | No global or per-actor cap. The vendor credit quota on the key and the 5/min limiter are the only bounds                                                                          |
| No server-side consent signal  | As before: consent is client-asserted and audited                                                                                                                                 |
| Spelled-out identifiers        | Depend on #435; this section is not safe to ship before it                                                                                                                        |

---
