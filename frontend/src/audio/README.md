<a id="readme-top"></a>

# Audio

Browser audio components for consultation capture and prescription dictation.

## Module Guide

### Purpose

This module owns the browser audio session from consent through transcript assembly. It also contains the worker protocol and audio helpers used by dictated prescriptions.

### Key Files

- [AudioCapture.tsx](AudioCapture.tsx) runs press-to-record capture and the on-device transcription worker.
- [live/AmbientCapture.tsx](live/AmbientCapture.tsx) streams ambient speech and owns post-stop refinement.
- [live/LiveConversation.tsx](live/LiveConversation.tsx) renders live transcript turns.
- [draft-turns.ts](draft-turns.ts) converts recognition output into editable speaker turns.
- [session-audio.ts](session-audio.ts) holds an in-session playback URL and revokes it when replaced or released.

### Used By

routes/CapturePanel.tsx selects the capture surface. review/prescription/use-prescription-dictation.ts reuses the worker and streaming dictation helpers for the prescription theatre.

### Invariants

- **Sockets:** live/soniox-stream.ts is the only frontend module that opens a WebSocket. live/no-stray-websocket.test.ts pins that boundary.
- **Persistence:** Do not persist recordings, transcripts, or clinical content in browser storage. The audio persistence guard allowlists only the non-clinical preferences in audio-settings.ts.
- **Network:** ../no-stray-fetch.test.ts pins request sites and limits ambient refinement upload entry points.
- **Audio Lifecycle:** Stop tracks and release temporary playback URLs when capture ends or the held recording changes.

### Tests

- **Capture:** AudioCapture.test.tsx and protocol.test.ts.
- **Live Speech:** live/AmbientCapture.test.tsx, live/LiveConversation.test.tsx, and live/no-stray-websocket.test.ts.
- **Helpers And Guards:** draft-turns.test.ts and no-stray-audio-persistence.test.ts.

<p align="right"><a href="#readme-top">&uarr;</a></p>
