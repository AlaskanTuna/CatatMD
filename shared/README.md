<a id="readme-top"></a>

# Shared Types

@shared/types is the workspace package for Zod contracts and their inferred TypeScript types. The frontend and backend import the same schemas at their boundaries.

## Build And Resolution

The package exports dist/index.js and dist/index.d.ts. Consumers resolve @shared/types through those package exports, so dist/ must exist before they typecheck or run.

Root scripts build shared/ before frontend and backend work. The frontend development wrapper, bun run dev:frontend, also builds shared first.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Add A Schema

1. Define the Zod schema in the domain module it belongs to (table below), beside the related contract.
2. Derive its type with `z.infer<typeof Schema>`. Do not declare a duplicate type by hand.
3. If you add a new module, export it from the barrel [`src/index.ts`](src/index.ts), keeping the import graph acyclic.
4. Rebuild with `bun run --cwd shared build` so both workspaces see it.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Modules

`src/index.ts` is a barrel; every consumer imports from `@shared/types`, never from a module path.

| Module                                                       | Owns                                                                       |
| ------------------------------------------------------------ | -------------------------------------------------------------------------- |
| [`transcript.ts`](src/transcript.ts)                         | Transcript turns, speakers, text ranges, interpreted languages             |
| [`asr.ts`](src/asr.ts)                                       | Hosted speech-recognition segments and draft turns                         |
| [`live-asr.ts`](src/live-asr.ts)                             | Ambient and dictation live-session config                                  |
| [`batch-asr.ts`](src/batch-asr.ts)                           | Post-Stop batch refinement sessions                                        |
| [`transcript-corrections.ts`](src/transcript-corrections.ts) | Mishear proposals and transcript cleanup                                   |
| [`note.ts`](src/note.ts)                                     | SOAP note, note template, capture mode                                     |
| [`note-templates.ts`](src/note-templates.ts)                 | Section order per note template                                            |
| [`assertions.ts`](src/assertions.ts)                         | Assertion states and clinical assertions                                   |
| [`operational.ts`](src/operational.ts)                       | The operational block: diagnosis, medication, MC days, referral, follow-up |
| [`gaps.ts`](src/gaps.ts)                                     | Information gaps                                                           |
| [`red-flags.ts`](src/red-flags.ts)                           | Red flags                                                                  |
| [`citations.ts`](src/citations.ts)                           | Citations, suggestions, evidence links                                     |
| [`analysis.ts`](src/analysis.ts)                             | Clinical scores and the stored analysis                                    |
| [`llm-responses.ts`](src/llm-responses.ts)                   | The model response contracts the adapter validates                         |
| [`live-analysis.ts`](src/live-analysis.ts)                   | Live analysis and live flags                                               |
| [`consultation.ts`](src/consultation.ts)                     | Consultation status, title and record                                      |
| [`patient.ts`](src/patient.ts)                               | Patient demographics and NRIC                                              |
| [`medications.ts`](src/medications.ts)                       | Prescriptions, medication candidates and lines                             |
| [`copilot.ts`](src/copilot.ts)                               | CatatAI turns and requests                                                 |
| [`audit.ts`](src/audit.ts)                                   | Red-flag and gap dispositions                                              |
| [`settings.ts`](src/settings.ts)                             | Retention policy                                                           |
| [`api.ts`](src/api.ts)                                       | List, detail and notification response shapes                              |

<p align="right"><a href="#readme-top">&uarr;</a></p>
