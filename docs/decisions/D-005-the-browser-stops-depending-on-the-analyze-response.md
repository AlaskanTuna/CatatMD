# D-005: The Browser Stops Depending On The Analyze Response

|                |                                                                                  |
| -------------- | -------------------------------------------------------------------------------- |
| **Date**       | 2026-09-11                                                                       |
| **Status**     | Adopted                                                                          |
| **Issues**     | #373                                                                             |
| **Supersedes** | The one-shot `onError` re-read adopted for #340                                  |
| **Answers**    | D-003's open question: whether synchronous analysis behind the rewrite is viable |

## Decision

The record's `status` is what says whether analysis is running, and the review page reads it until it settles. `POST /analyze` stays synchronous and its response stays the fast path, but it is no longer the only path.

Three parts, all of which are needed for any of them to be correct:

| Part          | Change                                                                                                                     |
| ------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **The poll**  | The detail query re-reads every `ANALYSIS_POLL_MS` while the record says `analyzing`, and stops when it settles or expires |
| **The lease** | `analyzing` is honoured for `STALE_ANALYSIS_MS`, after which a fresh press re-claims the row                               |
| **The claim** | The guard and the `analyzing` write become one conditional `updateMany`, so two presses cannot both proceed                |

## Reasoning

- **The failure was reported, not predicted.** A doctor pressed Analyse on a long transcript, waited past two minutes, and got a button that spun and said "Analysis failed" at once. The analysis had finished and been saved; a refresh showed it. D-003 had already named this as the open question and declined to answer it.
- **The one-shot re-read loses a race it was written to win.** `onError` re-reads once, at t=120s, which is exactly when the pipeline is most likely to still be running. It then wrote `analyzing` into the cache, the button latched on it, and nothing re-read again. The recovery mechanism was what created the permanent spinner.
- **A poll survives what a stream does not.** Streaming `/analyze` would defeat the 120s ceiling, and `../../backend/src/routes/copilot.ts` proves the pattern works through the same rewrite. It would not survive a reload, a closed tab, or a dropped connection, and those are ordinary in a clinic. The doctor who waited and the doctor who refreshed should see the same thing.
- **The lease is what stops one wedge replacing another.** Without it the poll spins forever on a row abandoned by a restarted process, and the 409 guard refuses every retry. Sharing the constant is what makes the client's give-up point and the API's accept point the same instant rather than two numbers that drift.
- **The atomic claim came free with the lease.** The guard was being rewritten anyway, and one conditional update is simpler than read-then-check-then-write as well as correct under concurrency.

## What This Decision Does Not License

- **No autonomous retry.** The poll re-reads a record; it never re-presses. CAP-5 still makes the doctor's press the only retry, and nothing here weakens it.
- **No claim that analysis is fast enough.** The wait is unchanged. What changed is that it now ends. Making the delay legible to the doctor rather than merely survivable is #224, still open.
- **No sweeper.** The lease releases a dead claim lazily, on the next press, which is the only moment it matters. A background job to tidy `analyzing` rows would be state nobody reads.
- **No reliance on `updatedAt` beyond its current coupling.** It is the lease clock only because nothing writes the row mid-run. A mid-run write means a real `analysisStartedAt` column and a migration, not a longer lease.
- **No widening of the poll.** It exists for one status on one page. A page that polls because it might be interesting is a page that bills for nothing.
