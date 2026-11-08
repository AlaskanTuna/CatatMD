# D-003: One Longer Provider Attempt Instead Of Two Short Ones

|                |                                                       |
| -------------- | ----------------------------------------------------- |
| **Date**       | 2026-09-09                                            |
| **Status**     | Adopted                                               |
| **Issues**     | #340                                                  |
| **Supersedes** | The `60_000` / `MAX_RETRIES = 1` pair adopted for #94 |

## Decision

A provider call gets **one attempt of 90 seconds**, not two of 60. `REQUEST_TIMEOUT_MS` moves to `90_000` and `MAX_RETRIES` to `0` on the shared adapter. The embedding client, previously bound by nothing at all, gets its own 10 second bound.

## Reasoning

- **The Retry Could Never Succeed.** The SDK retries timeouts. A call needing 70 s of decoding needs 70 s on the second attempt too, so a slow but healthy call spent 120 s and two calls' quota to fail anyway. Measured at `durationMs` 120421 and 120467, provider verified healthy in between.
- **The Pipeline Outgrew The Old Bound.** `note_generation` at 45.8 s and the suggestions call at 53.8 s sit within about 6 s of a 60 s ceiling, so ordinary provider variance tips a healthy consultation into failure.
- **90 s is chosen by the ceiling above it, not by the model.** A Vercel rewrite to an external origin allows 120 s to first byte, and `/analyze` emits one JSON at the end, so time-to-first-byte is the whole request. 90 s leaves roughly 30 s for every non-model stage. A bound at 120 s would sit on the cap and could never reach the browser.
- **Losing The Retry Matches CAP-5**, which already states that nothing retries autonomously and the doctor's press is the retry.

## And Split The Slowest Call In Two

`suggestions_and_red_flags` answered both halves in one response and was the slowest call in the pipeline, which is what put it closest to the bound. It is now `red_flags` and `suggestions`, run concurrently.

- **Only The Citing Half Needs The Corpus.** A red-flag candidate is read out of the transcript, not out of a guideline, so the red-flag half stopped carrying the retrieved set as input tokens.
- **The Citing Half Is Skipped When Retrieval Returned Nothing.** The citable set is the retrieved chunks and nothing else (D-002), so those consultations were spending a model call whose answer was discarded and replaced with an empty array.
- **`outOfScope` Rides On The Half That Always Runs.** Deriving it from an empty corpus would report "outside the guideline scope" for an in-scope consultation that simply retrieved nothing, and the review screen renders those as two different sentences.
- **Suggestion Suppression Became Deterministic.** One call could suppress its own suggestions when it judged the consultation out of scope; two concurrent calls cannot, so `generateSuggestions` drops them instead of asking the model to.

## What This Decision Does Not License

- **No Move Of The Bounds To A Call Site.** They stay constructor options so every path inherits them (`../../.claude/rules/security.md`, issue #94). A per-operation bound, if one is ever wanted, is a second adapter instance with its own constructor bound, never a per-request option.
- **No Claim About The Size Of The Latency Gain.** Splitting one call's output does not imply halving its latency: both halves repeat the transcript and system preamble, the output may not divide evenly, and four concurrent generations can meet a provider concurrency or token-rate limit that one did not. It is a hypothesis until the benchmark says otherwise, and the benchmark had to be repaired first because its `retrieval` stage never ran retrieval.
- **No Claim That This Makes Analysis Fast Enough.** Whether synchronous analysis behind the Vercel rewrite is viable at all is still open, and is settled by measurement rather than by this decision.
- **No Cover For The Transient-Failure Regression.** A 429 or 5xx now fails immediately on **every** chat operation, not just analysis. That is accepted, not unnoticed.
- **No Retrospective Trust In The Timing Table.** `../TRD.md` Section 19's `retrieval` row measures the suggestions call without retrieval, so production is slower than it reads.
