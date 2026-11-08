# 06. LLM Port & Adapter

Part of the [Technical Reference](../TRD.md).

**Status: `Built`**

Source: `backend/src/lib/llm/{types,openai-compatible,index}.ts`.

## Port (`LLMClient`)

```
interface LLMClient {
  readonly provider: 'qwen' | 'gemini' | 'deepseek'
  readonly model: string
  generate<T>(request: GenerateRequest<T>): Promise<T>
}
```

## `GenerateRequest<T>`

| Field          | Type           | Note                                                    |
| -------------- | -------------- | ------------------------------------------------------- |
| `operation`    | `string`       | Names the call site in logs/traces; never patient data  |
| `system`       | `string`       | System prompt                                           |
| `content`      | `Deidentified` | The only field carrying transcript-derived text, see §5 |
| `schema`       | `z.ZodType<T>` | Validated against on return                             |
| `schemaName`   | `string`       | Name given to the provider's structured-output schema   |
| `temperature?` | `number`       | Defaults to `0.2` at the adapter, not the port          |

## `LLMResponseError`

`extends Error`, carries `operation`. Thrown for all three adapter failure modes below.

## Adapter Mechanism (`OpenAICompatibleClient`)

One adapter class implements `LLMClient` for all three providers, Qwen, Gemini, and DeepSeek each expose OpenAI-compatible chat completions, so provider selection is a constructor parameter (`provider`, `model`, `apiKey`, `baseURL`), not a branch in call logic.

1. Calls `client.chat.completions.create` with `messages: [{ role: 'system', content: request.system }, { role: 'user', content: request.content }]`.
2. Requests structured output via `response_format: { type: 'json_schema', json_schema: { name: request.schemaName, strict: true, schema: z.toJSONSchema(request.schema, { target: 'draft-7' }) } }`.
3. `temperature` defaults to `0.2` when `request.temperature` is not supplied.
4. Validates the response with `request.schema.safeParse(parsed)` before returning, a non-conforming response is never returned as partially-trusted data.

### Measured Limit: Gemini Cannot Complete The Pipeline

The sentence above says provider selection is a constructor parameter. That is true of the mechanism and currently **not** true of the outcome for one provider, so the limit is recorded here rather than discovered by whoever next sets `LLM_PROVIDER=gemini`.

> **Superseded 14/08/26.** The cause is now established and fixed. This subsection is kept as filed, because its ruled-out list is what the next reader will reach for and two of its three bullets need qualifying. Read "Resolved 14/08/26" below before acting on anything here.

Measured 14/08/26 against `gemini-3.5-flash-lite` on the live OpenAI-compatible endpoint, sending each schema the pipeline actually uses, all with `strict: true`:

| Call                        | JSON Schema size | Depth | Result                                                                                              |
| --------------------------- | ---------------- | ----- | --------------------------------------------------------------------------------------------------- |
| `note_and_gaps`             | 686 B            | 7     | HTTP 200, schema-valid                                                                              |
| `suggestions_and_red_flags` | 1,312 B          | 7     | HTTP 200, schema-valid. Split into `red_flags` and `suggestions` by #340; measured before the split |
| `clinical_facts`            | 14,240 B         | 10    | **HTTP 400, empty body**                                                                            |

`clinical_facts` is the first call `analyseNote` makes, so the run dies there and nothing downstream is reached.

Three things this is **not**, each ruled out by measurement rather than assumed:

- **Not `strict`.** On a trivial schema, `strict: true`, `strict: false`, and `strict` omitted all return 200.
- **Not a JSON Schema keyword.** The passing and failing schemas use the same feature set (`$schema`, `enum`, `additionalProperties`).
- **Not the API key or the endpoint.** Two of the three real calls succeed on the same key in the same run.

The remaining difference is scale: `clinical_facts` is roughly 20x larger, three levels deeper, and carries 997 properties against 48. The 400 has an empty body naming neither a size nor a depth cap, and size, depth and property count all co-vary, so **which limit binds is not established**.

**Consequence:** Gemini is a configured provider that cannot currently run an analysis, and `AGENTS.md`'s constraint on it (local dev, synthetic data only) should be read as a rule about what it may be pointed at rather than a statement that it works. Production is unaffected: it runs Qwen, and a boot guard throws on `LLM_PROVIDER=gemini` regardless (§7).

Tracked as GitHub issue #96. The fix worth doing is shrinking or splitting `clinical_facts`, which would reduce the largest prompt in the system for every provider rather than special-casing one, and is deliberately **not** bundled with this disclosure.

### Resolved 14/08/26: `maxItems` Is Expanded Into The Schema Budget

Closes GitHub issue #96. No adapter change and no provider-specific code were required.

**The bisect.** Only `medicationsDispensed.maxItems` was varied, in the real `clinical_facts` schema, with nothing else in the request changed:

| `maxItems` | absent | 1   | 2   | 3   | 5   | 10  | 20      |
| ---------- | ------ | --- | --- | --- | --- | --- | ------- |
| Result     | 200    | 200 | 200 | 200 | 200 | 200 | **400** |

From the other side, varying only `gaps.maxItems` in `note_and_gaps`, the 686 B schema that already passes:

| `maxItems` | 30  | 100     | 300     | 1000    |
| ---------- | --- | ------- | ------- | ------- |
| Result     | 200 | **400** | **400** | **400** |

**Gemini expands a bounded array into `maxItems` copies of the item schema before measuring the result against its own budget.** A 686 B schema fails at `maxItems: 100` while a 14,240 B schema passes at `maxItems: 10`, which no explanation in bytes, depth, or authored property count survives. Going from 10 to 20 alters the schema by two bytes, adds no authored property, and flips the result.

**Two corrections to the ruled-out list above.**

- **"Not a JSON Schema keyword" is true as written and misleading in effect.** No keyword is rejected. One keyword's _value_ is the multiplier that decides the outcome, so a reader who rules out keywords rules out the cause.
- **"The remaining difference is scale" is right about the budget and wrong about its units.** What is capped is post-expansion property count. Bytes and depth co-vary with it, which is why they looked causal.

**Fix:** `medicationsDispensed` is bounded at 10 rather than 20 (`shared/src/index.ts`). That bound already existed as a runaway-decoding guard, and its own comment already argued twenty was far beyond any single GP consultation, so this tightens a Tier 1 control (§21.3) rather than weakening one, and it applies to every provider rather than special-casing Gemini. Pinned by a test in `shared/src/index.test.ts`.

**Verified through the real pipeline**, which is the standard §21.2 sets rather than a toy probe: `analyseNote` and `generateSuggestions` both complete on `gemini-3.5-flash-lite` against a synthetic fixture, returning all 34 checklist fields, a four-section SOAP note, gaps, and corpus-constrained citations. Qwen re-verified unchanged on `qwen3.7-flash`.

**Not closed by this.** Shrinking or splitting `clinical_facts` remains worth doing on its own merits, because it cuts the largest prompt in the system for every provider including the one production runs. The headroom here is thin: the budget is shared across the whole schema, so adding checklist fields can push it back over with no array involved.

### Resolved 15/08/26: Referencing The Repeated Assertion (Issue #109)

Closes GitHub issue #109. `clinical_facts` is now **3,558 B rather than 14,240 B**, a 75% cut, with the checklist contract unchanged: 34 fields, same keys, same states, nothing dropped and nothing defaulted.

**Where the bytes were.** Not nesting, and not the number of fields. The emitted schema inlined one 357 B assertion object 34 times, because `z.toJSONSchema` defaults to `reused: 'inline'`. Extracting it into `definitions` with `$ref` pointers removes the duplication and nothing else.

**The two shapes issue #109 proposed were both measured and both rejected**, which is why this is worth recording rather than only fixing:

| Shape                          | Size     | Nodes | Depth | Verdict                                                            |
| ------------------------------ | -------- | ----- | ----- | ------------------------------------------------------------------ |
| Inlined (before)               | 14,240 B | 144   | 4     | The baseline                                                       |
| Flatten the four groups        | 13,840 B | 140   | 3     | Rejected: 3%, and it rewrites `gaps/checklist.ts` to get it        |
| Split into two calls           | 8,363 B  | n/a   | n/a   | Rejected: a fourth concurrent call, and §12 already runs them wide |
| **Referenced (`definitions`)** | 3,558 B  | 48    | 3     | **Shipped**                                                        |

**Referencing is a provider capability, not a preference.** Measured 15/08/26 against each live endpoint, varying only the schema:

| Provider                | Inlined  | `definitions` + `$ref` | `$defs` + `$ref` | Unused `definitions` block |
| ----------------------- | -------- | ---------------------- | ---------------- | -------------------------- |
| `qwen3.7-flash`         | accepted | accepted               | accepted         | accepted                   |
| `gemini-3.5-flash-lite` | accepted | **HTTP 400**           | **HTTP 400**     | accepted                   |
| `deepseek-v4-flash`     | 401      | 401                    | 401              | 401                        |

Gemini accepts a `definitions` block nothing points at and rejects any pointer into one, so it is the **`$ref` it will not resolve, not the keyword**, and renaming to `$defs` does not help. DeepSeek is unmeasured: the configured key returns 401 on every request regardless of schema, so it keeps the inlined form it has always been sent rather than inheriting an assumption.

**The rule is "emit both, send the smaller", not "always reference".** Referencing is not universally smaller, and the counter-example is the call that matters most:

| Operation        | Inlined  | Referenced | Sent       |
| ---------------- | -------- | ---------- | ---------- |
| `clinical_facts` | 14,240 B | 3,558 B    | referenced |
| `note_and_gaps`  | 686 B    | 749 B      | inlined    |

`note_and_gaps` has one lightly reused shape whose pointers cost more than the duplication saves. It is also the call that writes the prose, so measuring per schema leaves its request **byte-identical to what it has always been**. That is deliberate rather than incidental: a schema change under a generative call is the shape of regression that degrades a note without failing anything, and this change now cannot reach it by construction. Emitting twice costs microseconds against a call measured in tens of seconds.

**Verified through the real pipeline**, the standard §21.2 sets. `analyseNote` on a synthetic consultation, three runs per arm:

| Arm                     | Assertions | State distribution                                    |
| ----------------------- | ---------- | ----------------------------------------------------- |
| Qwen, inlined (control) | 34, 3 of 3 | `PRESENT 6 · NOT_ASSESSED 21 · DENIED 5 · OBSERVED 2` |
| Qwen, referenced        | 34, 3 of 3 | identical to the control                              |
| Gemini, inlined         | 34         | `PRESENT 5 · NOT_ASSESSED 22 · DENIED 5 · OBSERVED 2` |

All 34 fields round-trip in **9 of 9 runs**, and the Qwen state distribution is identical across arms, which is the claim this change has to support.

**One thing measured and deliberately not claimed.** The model-authored gap count varied run to run, 2 to 4 across the nine runs, including between two arms whose `note_and_gaps` request was byte-identical. It is therefore pre-existing nondeterminism in a generative call rather than an effect of this change, and it is recorded as unexplained instead of folded into the result.

**Remaining headroom.** 48 nodes against the synthetic sweep's observed Gemini pass/fail band of 252 to 302 nodes, so on Qwen there is comfortable room for future checklist fields. It does **not** help Gemini, which still receives the 14,240 B inlined form and keeps exactly the thin margin recorded above.

## Request Bounds

**Status: `Built`** (issue #94, revised by #340). Both are constructor options on the shared adapter, so every call path inherits them and a new provider cannot be added without them.

| Bound        | Value    | SDK Default | Why                                                                                                                                                      |
| ------------ | -------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `timeout`    | `90_000` | `600_000`   | The largest value that still fits under the 120s proxy ceiling below with room for the non-model stages. Was `60_000`, which the pipeline outgrew (#340) |
| `maxRetries` | `0`      | `2`         | The SDK retries timeouts, so the retry could only repeat a slow call's failure at double the cost. CAP-5 already makes the doctor's press the only retry |

**The ceiling above these bounds is a platform limit, and it is what picks the timeout.** A Vercel rewrite to an external origin allows at most **120s to first byte**, and `vercel.json` rewrites `/api/*` to Render. `/analyze` emits one JSON at the end, so time-to-first-byte is the whole request, not just the model call. 90s leaves roughly 30s of that window for routing, auth, de-identification, retrieval, rehydration, persistence and the audit write. **A bound at 120s would sit on the cap and could never reach the browser.**

**The ceiling is still reachable, and since #373 that no longer costs the doctor anything.** A long transcript can spend the whole window, and when it does the browser's `fetch` rejects while Render keeps working: nothing cancels it, and it persists before it answers. The review page therefore reads the record's `status` rather than waiting on this response, so a cut-off request now costs a poll interval rather than the analysis (§13, "The Analysis Lease").

**Why the retry went rather than the timeout rising further.** The previous shape spent the whole budget reaching a guaranteed failure: a call needing 70s of decoding needs 70s on the second attempt too, so a slow but healthy call burned 120s and two calls' quota to fail anyway (#340, measured at `durationMs` 120421 and 120467, provider verified healthy in between). Spending the same wall clock on one longer attempt is what lets those calls finish. The cost is that a transient 429 or 5xx now fails immediately, on **every** chat operation and not just analysis.

**A second client carries its own, shorter bound.** `OpenAICompatibleEmbeddingClient` is 10s with no retries. It shipped with neither option, inheriting 10 minutes and two retries, because every assertion in `openai-compatible.test.ts` read the chat client and nothing read this one. It is shorter than the chat bound because it is not concurrent with what follows it: `runAnalysis` awaits `retrieveGuidelines` and only then calls `generateSuggestions`, so every second spent embedding is a second on the critical path, and retrieval already degrades to the curated corpus on failure.

Two clarifications, because the adjacent bound is easy to confuse with these:

- `max_tokens` (8192) bounds the response's **size**; these bound its **time**. The runaway generation measured in §19 row 19 was already contained by the former.
- Neither is a CAP-1 enforcement mechanism. Nothing fails a request at 30s; these bound the pathological case only.

**Not built:** no `AbortController`, so a client disconnect does not cancel an in-flight call. That reclaims quota on abandoned requests rather than bounding a hang, and it would have to be threaded per call site.

## Failure Modes

| Failure                   | Trigger                                                                                                                 |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Empty response            | `completion.choices[0]?.message.content` is falsy                                                                       |
| Malformed JSON            | `JSON.parse(raw)` throws                                                                                                |
| Schema-validation failure | `request.schema.safeParse(parsed)` returns `success: false`, the error message includes `z.prettifyError(result.error)` |

All three throw `LLMResponseError` with the operation name attached; there is no partial-success return path.

`getLLMClient()` (`backend/src/lib/llm/index.ts`) builds and caches a singleton client from `env.LLM_PROVIDER`, throwing on first client construction if the matching provider's API key is missing.

---
