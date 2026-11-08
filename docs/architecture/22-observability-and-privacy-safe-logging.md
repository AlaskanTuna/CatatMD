# 22. Observability & Privacy-Safe Logging

Part of the [Technical Reference](../TRD.md).

**Status: `Built`** (GitHub issue #15)

Appended as a new section rather than inserted near §15, because renumbering would break the many `§19, row N` cross-references in both documents. §15 covers the **database** audit trail; this section covers **process logs**.

## Why It Is Structural, Not Conventional

The instinct when an LLM call misbehaves is to log the payload, which here would put transcript text into a log drain. `backend/src/lib/logger.ts` makes that impossible rather than discouraged:

| Control              | Mechanism                                                                                          |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| Field-name allowlist | A key absent from `FIELD_RULES` is dropped. An allowlist fails closed where a denylist fails open. |
| Per-field value rule | Every field is an enum, an id pattern, or a number. **No field accepts free text.**                |
| Message scrubbing    | The one free-text surface. Vault tokens stripped, `deid` detector run, length capped at 120.       |
| Level independence   | Redaction sits at the serialiser, so `debug` is exactly as safe as `error`.                        |

## The Finding That Shaped The Design

An earlier revision allowed `operation` to be any string and relied on the `deid` detector to catch clinical content in it. **That is not sufficient, and it was measured rather than assumed.** The detector is scored and context-sensitive (`ACCEPT_THRESHOLD`, §9):

- `"Ahmad reports cough"` fires, and is redacted.
- `"Has Ahmad had any recent travel?"` does not, and passed through.

A probabilistic check is a useful backstop and a poor boundary. Per-field value rules replaced it as the primary control.

## What Is Recorded

- **Request id** on every line, via `AsyncLocalStorage`, so one analysis is one trace. Returned as the `x-request-id` response header on every response, success or failure. It is deliberately _not_ in the JSON error envelope: `ErrorEnvelopeSchema` (§13) is a contract the SPA parses, whereas a correlation id is transport metadata.
- **Per-stage latency** via `timeStage()`: `deidentification`, `rules`, `note_generation`, `retrieval`, `persistence`.
- **Error class** from a fixed taxonomy, so model, schema-parse, rule-engine, retrieval and de-identification failures are distinguishable without opening a payload.
- **De-identification observability**: detector labels and a count, never values.

## Deliberate Omissions

- **No third-party APM.** Sending a clinical application's exceptions to an external processor is a PDPA data-processor decision with a DPIA attached (§19, row 11), not a library choice. Structured JSON on stdout, which Render already drains, satisfies the issue's "works with Render and move on" constraint without creating a new cross-border data flow.
- **No debug flag for raw content.** Named as a non-goal in the issue and enforced by test: the flag would itself become the vulnerability.
- **Per-provider-call timing is not split.** `analyseNote` issues `clinical_facts` and `note_and_gaps` concurrently (§12), and `timeStage` wraps the pair, so `note_generation` is the wall-clock of the slower half. Splitting them needs a hook inside `backend/src/analysis/`. Worth doing, because per-call variance rather than the mean is what threatens the CAP-1 budget.

## Residual Risk

The log **message** is developer-authored and interpolation into it is not reachable by field rules. A name templated into a message string is caught only if the detector scores it above threshold. The convention is therefore load-bearing: **put data in fields, not in the message.**

---
