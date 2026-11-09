<a id="readme-top"></a>

# ASR

Adapters for the speech recognisers behind hosted transcription, live capture and post-recording refinement, and the live relay that carries audio through the API.

## Owns

- Hosted transcription of a finished recording through ILMU.
- Live capture on one of two recognisers, chosen by `LIVE_ASR_PROVIDER`: Soniox, where the API mints a key and the browser holds the socket, or Qwen3-ASR realtime, where the browser streams to the API's own WebSocket relay.
- Refinement after Stop through ElevenLabs, and the controlled recognition vocabulary all of them share.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Entry Points

- [ilmu.ts](ilmu.ts): transcribeWithIlmu, getAsrDescriptor and IlmuRelayError.
- [soniox.ts](soniox.ts): mintSonioxSession, getLiveAsrDescriptor, liveSessionConfig, translatedAmbientConfig, sonioxHosts and SonioxMintError.
- [elevenlabs.ts](elevenlabs.ts): mintBatchToken, getBatchAsrDescriptor, batchRefinementConfig and ElevenLabsMintError.
- [vocabulary.ts](vocabulary.ts): asrContextTerms and dictationContextTerms.
- [live-relay-token.ts](live-relay-token.ts): mintRelayToken and verifyRelayToken, the 60 second single-use credential a browser presents to the relay.
- [qwen-realtime.ts](qwen-realtime.ts): openQwenRealtime, qwenLiveSessionConfig and getQwenLiveDescriptor. The only module that opens a socket to Qwen.
- [live-relay.ts](live-relay.ts): attachLiveRelay, createLiveRelay and liveRelayUrl. The WebSocket the browser opens, and the translation of Qwen's phrase events into Soniox-shaped messages.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Used By

- routes/asr.ts calls the adapters and the relay's token and address helpers.
- server.ts mounts the relay on the HTTP server.
- The live relay reuses liveSessionConfig for each mode's vocabulary and session cap.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Relay Behaviour

- **Upgrade:** accepted only on the relay path and only from the configured SPA origin. Any other upgrade is refused.
- **First Frame:** a text frame carrying a relay token in `api_key`. A bad token closes with 4401 after an `error_code` 401, and audio before it closes with 1002.
- **Audio:** binary frames of 16 kHz 16-bit mono PCM, 32 KiB at most, forwarded to Qwen as base64 appends.
- **Output:** Soniox-shaped messages. Each carries the finals newly settled, then the whole interim tail, with an `<end>` token after each phrase. Words are spread evenly across a phrase, because Qwen times phrases and not words.
- **Ending:** an empty text frame, the per-mode session cap, or Qwen closing settles what is pending, sends `finished` and closes with 1000. A Qwen failure sends `error_code` 502 and closes with 1011. Every way out closes the upstream socket.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Invariants

- Audio cannot be de-identified, so every audio egress is bounded, audited and consent-gated rather than gated by the PHI boundary. Provider hosts are literals in the adapters; no setting builds one.
- `qwen-realtime.ts` is the only module that opens a socket to Qwen, and `live-relay.ts` is the only one that accepts a socket from the browser. `fetch` calls are pinned per file by `no-stray-fetch.test.ts`, which also pins every `ws` import and `dashscope` host.
- The relay builds each session from the mode in its token and never from the browser's first frame.
- Never log a token, a key, a transcript or audio. The relay logs event types, ids, byte counts, durations and close codes only, and never repeats a vendor error message.
- Follow the [repository invariants](../../../../docs/agents/invariants.md) and [phi-egress.md](../../../../.claude/rules/phi-egress.md) for egress, logging and audit.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Tests

- [live-relay.test.ts](live-relay.test.ts) runs the relay against a fake Qwen on a local socket: upgrade and origin refusal, authentication, the frame limit, phrase ordering, `<end>` placement, timing, the session ending, upstream failure, orphaned sockets and log content.
- [live-relay-token.test.ts](live-relay-token.test.ts) covers the token round trip, expiry, tampering, replay and the wrong mode.
- [qwen-realtime.test.ts](qwen-realtime.test.ts) pins the destination address and the per-mode settings.
- [ilmu.test.ts](ilmu.test.ts), [soniox.test.ts](soniox.test.ts), [elevenlabs.test.ts](elevenlabs.test.ts) and [vocabulary.test.ts](vocabulary.test.ts) cover the other adapters.
- [no-stray-fetch.test.ts](no-stray-fetch.test.ts) pins the outbound `fetch`, socket and host inventory.
- Postgres and the network are not required; the upstream is faked.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Read More

- [TRD §20, ASR Contract](../../../../docs/architecture/20-asr-contract.md) and [TRD §16, Security Controls](../../../../docs/architecture/16-security-controls.md).
- [Lib](../README.md) for the rest of the backend infrastructure.

<p align="right"><a href="#readme-top">&uarr;</a></p>
