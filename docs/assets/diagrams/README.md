# Diagrams

Every architecture and flow diagram in the docs is an SVG pair, one per GitHub theme, embedded with `<picture>` so it follows the reader's light or dark setting.

## Files

| File                                    | Shows                                                    | Used In                                                                 |
| --------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------- |
| `how-it-works-*.svg`                    | A consultation becoming an approved note                 | `README.md`                                                             |
| `tech-stack-*.svg`                      | The three tiers, the trust boundary and every processor  | `README.md`, `docs/OVERVIEW.md`                                         |
| `analyse-pipeline-*.svg`                | The analyse route, module by module                      | `README.md`, `docs/OVERVIEW.md`                                         |
| `doctor-journey-*.svg`                  | What the doctor does, from consult to locked note        | `docs/OVERVIEW.md`                                                      |
| `phi-boundary-*.svg`                    | De-identification, the single egress and re-hydration    | `docs/OVERVIEW.md`                                                      |
| `ambient-segments-*.svg`                | Segmented batch transcription as first specified (§20.7) | `docs/architecture/20-asr-contract.md`                                  |
| `arch-01-doc-map-*.svg`                 | CatatMD Documentation Map                                | `docs/architecture/01-purpose-and-relationship-to-other-docs.md`        |
| `arch-02-system-boundary-*.svg`         | System Context And Boundaries                            | `docs/architecture/02-system-context-and-component-responsibilities.md` |
| `arch-03-contract-flow-*.svg`           | Shared Contract Flow                                     | `docs/architecture/03-shared-contracts.md`                              |
| `arch-04-record-lifecycle-*.svg`        | Clinical Record And Audio Lifecycle                      | `docs/architecture/04-data-model-prisma.md`                             |
| `arch-05-phi-egress-*.svg`              | De-Identification And Model Egress                       | `docs/architecture/05-phi-boundary-type-level-contract.md`              |
| `arch-06-llm-port-*.svg`                | LLM Port And Adapter                                     | `docs/architecture/06-llm-port-and-adapter.md`                          |
| `arch-07-env-contract-*.svg`            | Environment Contract                                     | `docs/architecture/07-environment-contract.md`                          |
| `arch-08-http-request-*.svg`            | HTTP Request Middleware And Routing                      | `docs/architecture/08-http-surface-as-built.md`                         |
| `arch-09-deid-pipeline-*.svg`           | De-Identification Pipeline                               | `docs/architecture/09-de-identification-pipeline.md`                    |
| `arch-10-red-flag-engine-*.svg`         | Red-Flag Rules Engine                                    | `docs/architecture/10-red-flag-rules-engine.md`                         |
| `arch-11-guideline-corpus-*.svg`        | Guideline Retrieval And Citation                         | `docs/architecture/11-guideline-corpus.md`                              |
| `arch-12-llm-contracts-*.svg`           | LLM Prompt And Response Contracts                        | `docs/architecture/12-llm-prompt-and-response-contracts.md`             |
| `arch-13-api-contracts-*.svg`           | API Request And Response Contracts                       | `docs/architecture/13-api-contracts.md`                                 |
| `arch-14-auth-model-*.svg`              | Session Authentication And Ownership                     | `docs/architecture/14-auth-model.md`                                    |
| `arch-15-audit-logging-*.svg`           | Audit Event Chain                                        | `docs/architecture/15-audit-logging.md`                                 |
| `arch-16-security-controls-*.svg`       | Runtime Security Controls                                | `docs/architecture/16-security-controls.md`                             |
| `arch-17-environments-deployment-*.svg` | Environments And Deployment                              | `docs/architecture/17-environments-and-deployment.md`                   |
| `arch-18-capability-path-*.svg`         | Capability Traceability Path                             | `docs/architecture/18-traceability.md`                                  |
| `arch-19-decision-states-*.svg`         | Decision Register States                                 | `docs/architecture/19-open-decisions-register.md`                       |
| `arch-20-asr-path-*.svg`                | Current Speech Paths                                     | `docs/architecture/20-asr-contract.md`                                  |
| `arch-21-evidence-check-*.svg`          | Evidence-Bound Assertion Check                           | `docs/architecture/21-llm-guardrail-architecture.md`                    |
| `arch-22-safe-logging-*.svg`            | Privacy-Safe Process Logging                             | `docs/architecture/22-observability-and-privacy-safe-logging.md`        |
| `arch-23-ehr-export-*.svg`              | Specified EHR Export Path                                | `docs/architecture/23-clinic-ehr-integration-interface.md`              |
| `arch-24-backdrop-root-*.svg`           | Dropover Portal And Backdrop Root                        | `docs/architecture/24-frontend-rendering-constraints.md`                |
| `arch-25-propose-as-edit-*.svg`         | Doctor-Requested Copilot Proposal                        | `docs/architecture/25-review-copilot-tool-call-behaviour.md`            |
| `arch-26-report-print-*.svg`            | Approved Report To Browser Print                         | `docs/architecture/26-approved-note-printed-report.md`                  |

## Sources And Styling

- **Sources:** `src/<name>.<type>.json` are [Archify](https://github.com/tt-a1i/archify) candidates. Edit one, then run `node scripts/diagrams/render.mjs <name>` to rebuild its light and dark SVGs. The script header lists what it needs outside the repository: Archify, `playwright-core` and a Chromium.
- **Styling:** the script re-skins Archify's export with the tokens in [`docs/DESIGN.md`](../../DESIGN.md): ground and surface, ink, the accent for clinical logic, Advisory blue for the browser, Emergency red for trust gates and Urgent amber for third parties. Work Sans and Outfit are embedded, so the SVG renders the same everywhere.
- **Embedding:** keep the `<picture>` pattern and a full alt text, centred.

```html
<p align="center">
  <picture>
    <source
      media="(prefers-color-scheme: dark)"
      srcset="docs/assets/diagrams/tech-stack-dark.svg"
    />
    <img src="docs/assets/diagrams/tech-stack-light.svg" alt="..." width="100%" />
  </picture>
</p>
```
