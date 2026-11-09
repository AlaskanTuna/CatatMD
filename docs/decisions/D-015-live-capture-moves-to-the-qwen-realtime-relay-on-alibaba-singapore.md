# D-015: Live Capture Moves To The Qwen3-ASR Realtime Relay On Alibaba Cloud Singapore

|                |                                                                                                                                        |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Date**       | 2026-11-10                                                                                                                             |
| **Status**     | Accepted, pending the owner's approval of the pull request                                                                             |
| **Issues**     | #487                                                                                                                                   |
| **Supersedes** | D-013's "speech recognition stays on Soniox", for production while `LIVE_ASR_PROVIDER=qwen`. Everything else in D-013 and D-014 stands |

## Decision

- **Production Live Capture Runs On Qwen3-ASR Realtime** instead of Soniox, for ambient capture and prescription dictation. The destination is Alibaba Cloud Model Studio, Singapore (`dashscope-intl`), model `qwen3-asr-flash-realtime`.
- **Through A Relay On The API.** The browser streams 16 kHz PCM to a WebSocket on the API, which holds the upstream socket. Mechanism and wire contract: `../TRD.md` §20.15.
- **Asked For By Adam, The Owner, On 2026-11-10.** The request was to replace Soniox with Qwen on production, preferring a working live demo to a broken dictation feature.
- **Selected By `LIVE_ASR_PROVIDER`.** The code default is `soniox`. `render.yaml` sets `qwen`, which is what production runs.
- **Reversal Is One Variable.** Set `LIVE_ASR_PROVIDER=soniox`. No code change is needed: the Soniox code, variables and CSP host are untouched, and `vercel.json` keeps `wss://stt-rt.soniox.com`.
- **Accepted, Pending The Owner's Approval Of The Pull Request.** The owner is asked to confirm in the pull request.

**What Changes While `qwen` Is Set**, as built:

- **No Two-Way Translation.** A translation request is a 400 and the config offers no languages.
- **No Refinement After Stop.** The config reports `batchRefinement: false`.
- **No Speaker Ids From The Recogniser.** Qwen does not diarise, so the relay marks each phrase with `<end>` and the after-Stop labelling pass assigns Doctor and Patient, as it does for any speaker-less transcript.

## Why

| Reason                                                                | Consequence                                                                                                                                        |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| The owner preferred a working live demo to a broken dictation feature | Production live capture moves to the recogniser that works now                                                                                     |
| Soniox was the United States                                          | Qwen at Alibaba Cloud Singapore is in-region with Render, Supabase and the Alibaba LLM endpoint                                                    |
| A browser cannot set `Authorization` on a WebSocket                   | The key stays on the API, and the browser holds a 60 second single-use token instead                                                               |
| It was run end to end on 10/11/26                                     | Real route, token, relay and Qwen, on the synthetic dictation clip (12.9 s): 55 messages, and the socket closed 1000 106 ms after the end of audio |

## Controls

| Control                | How It Is Enforced                                                                                                                                                                  |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Relay on the API       | `backend/src/lib/asr/live-relay.ts` accepts the browser's socket and `qwen-realtime.ts` opens the upstream one. The audio is in API memory for the session and nothing is stored    |
| Pinned host            | The address is a literal in `qwen-realtime.ts`. Only the model id, restricted to a plain identifier, comes from configuration. Redirects are not followed                           |
| Single-use token       | HMAC-SHA256 over `{ sub, mode, consent, jti, exp }`, keyed from `BETTER_AUTH_SECRET`, valid 60 seconds, accepted once                                                               |
| Origin and path        | The upgrade is accepted only on `LIVE_ASR_RELAY_PATH` and only when `Origin` equals `CORS_ORIGIN`. A socket has 10 seconds to authenticate, and at most 32 may be waiting to        |
| Frame, time, byte caps | Frames of 32 KiB at most, the per-mode session cap (1800 seconds ambient, 300 dictation), and audio forwarded bounded to that cap plus 10 seconds                                   |
| No content logging     | Event types, ids, byte counts, durations and close codes only, through the `logger.ts` allowlist. The vendor's error text is never read                                             |
| Audit                  | `asr.live_session_minted` is written before the response, with the token id as `clientReferenceId` and region `sg`                                                                  |
| Guard tests            | `no-stray-fetch.test.ts` pins every `ws` import, socket construction and `dashscope` host per file, and `no-stray-provider-sdk.test.ts` pins `ws` imports to the two socket modules |

## What This Decision Does Not License

- **No Real Consultation Audio.** All consultation data is simulated. The open actions in `../DPIA.md` still gate real data.
- **No Claim About The Vendor's Retention Or Training Treatment Of Realtime Audio.** Nothing in this repository measures or verifies it.
- **No Other Audio Destination Or Surface.** The scope is this vendor, endpoint and model, for ambient capture and prescription dictation.
- **No Removal Of Soniox.** Its code, variables and CSP host stay, because reversal depends on them.
- **No Spend Cap Or Concurrent-Session Cap.** The gaps are listed in `../../.claude/rules/phi-egress.md`.
- **What Reverses It:** setting `LIVE_ASR_PROVIDER=soniox`, or the owner withdrawing the approval.
