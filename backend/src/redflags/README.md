# Red-flag rules engine

Deterministic escalation triggers for adult acute cough / sore throat / URTI.
Rules run **before** the model and their hits are authoritative — the LLM may
add candidates for doctor review but may never suppress or downgrade a rule hit.

Planned: a versioned trigger list (id, label, severity, matcher, clinical source)
evaluated against the transcript, emitting `RedFlag` with `source: 'rule'`.

## Files

| File          | Responsibility                                                                   |
| ------------- | -------------------------------------------------------------------------------- |
| `triggers.ts` | The versioned trigger lists and `RED_FLAG_LIST_VERSION`                          |
| `evaluate.ts` | `evaluateRedFlags` and `mergeRedFlags` (rule hits always survive the merge)      |
| `ids.ts`      | `firedRuleIds`: the rule ids a transcript raises, used to guard transcript edits |
| `mishears.ts` | `proposeMishearCorrections` over a measured confusable table                     |
| `types.ts`    | `RedFlagTrigger`                                                                 |

`transcript-cleanup/policy.ts` and `routes/asr.ts` compare `firedRuleIds` before and after a proposed correction, so no edit can silently remove a rule hit.
