# CatatMD Documentation

Every document in this repository, organised by the question it answers. Start with the [repository README](../README.md) for the one-page view, or [`OVERVIEW.md`](OVERVIEW.md) for the full narrative.

## Start Here

| You Are                         | Read, In Order                                                                                                                                 |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Trying the product**          | [`USER-GUIDE.md`](USER-GUIDE.md), then the [live demo](https://catatmd.vercel.app)                                                             |
| **Reviewing the engineering**   | [`../README.md`](../README.md), [`OVERVIEW.md`](OVERVIEW.md), [`TRD.md`](TRD.md), [`decisions/`](decisions/)                                   |
| **Setting up to develop**       | [`GETTING-STARTED.md`](GETTING-STARTED.md), [`DEVELOPMENT.md`](DEVELOPMENT.md), [`../.github/CONTRIBUTING.md`](../.github/CONTRIBUTING.md)     |
| **Operating the deployment**    | [`operations/`](operations/)                                                                                                                   |
| **Assessing privacy or safety** | [`DPIA.md`](DPIA.md), [`architecture/09-de-identification-pipeline.md`](architecture/), [`../docs/agents/invariants.md`](agents/invariants.md) |
| **An AI coding agent**          | [`../AGENTS.md`](../AGENTS.md), then [`agents/documents.md`](agents/documents.md)                                                              |

## By Question

| Question                                                         | Answer Lives In                                                                                                                      |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **What** is CatatMD, and what does it do?                        | [`OVERVIEW.md`](OVERVIEW.md), [`PRD.md`](PRD.md) sections 6 to 9                                                                     |
| **What** does a term mean?                                       | [`GLOSSARY.md`](GLOSSARY.md)                                                                                                         |
| **Who** is it for, and who built it?                             | [`PRD.md`](PRD.md), [`PRODUCT.md`](PRODUCT.md), the Team section of [`../README.md`](../README.md#team)                              |
| **Why** does it exist, and why this design?                      | [`PRD.md`](PRD.md) section 1, [`decisions/`](decisions/), [`research/`](research/)                                                   |
| **Why** is a given rule enforced?                                | [`agents/invariants.md`](agents/invariants.md), [`TRD.md`](TRD.md)                                                                   |
| **Where** does each piece of code live?                          | [`../README.md`](../README.md#project-structure), each module's own `README.md`, [`architecture/02-*`](architecture/)                |
| **Where** does patient data go, and in which region?             | [`DPIA.md`](DPIA.md), [`architecture/20-asr-contract.md`](architecture/), [`operations/environments.md`](operations/environments.md) |
| **When** does a consultation change state?                       | [`GLOSSARY.md`](GLOSSARY.md#consultation-lifecycle), [`architecture/13-*`](architecture/)                                            |
| **When** does a change deploy?                                   | [`operations/deployment.md`](operations/deployment.md)                                                                               |
| **How** do I use it as a doctor?                                 | [`USER-GUIDE.md`](USER-GUIDE.md)                                                                                                     |
| **How** do I run it locally?                                     | [`GETTING-STARTED.md`](GETTING-STARTED.md)                                                                                           |
| **How** do I change, test and ship code?                         | [`DEVELOPMENT.md`](DEVELOPMENT.md), [`../.github/CONTRIBUTING.md`](../.github/CONTRIBUTING.md)                                       |
| **How** does each pipeline work, and what are its contracts?     | [`TRD.md`](TRD.md) and [`architecture/`](architecture/)                                                                              |
| **How** do I deploy, migrate, monitor or respond to an incident? | [`operations/`](operations/)                                                                                                         |
| **How** should the UI look and behave?                           | [`DESIGN.md`](DESIGN.md), [`PRODUCT.md`](PRODUCT.md)                                                                                 |

## Every Document

| Document                                   | What It Owns                                                                                    |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| [`OVERVIEW.md`](OVERVIEW.md)               | The reader-facing narrative: the problem, positioning, the PHI boundary, guardrails, boundaries |
| [`PRD.md`](PRD.md)                         | Requirements, capabilities, acceptance criteria, scope, regulatory posture, known limitations   |
| [`TRD.md`](TRD.md)                         | Index of the technical reference; each section is a file in [`architecture/`](architecture/)    |
| [`DPIA.md`](DPIA.md)                       | Data-protection impact assessment: data flows, PDPA analysis, retention, rights, residual risk  |
| [`DESIGN.md`](DESIGN.md)                   | The design system: tokens, type, components, motion, accessibility                              |
| [`PRODUCT.md`](PRODUCT.md)                 | Product principles and voice that the design serves                                             |
| [`GLOSSARY.md`](GLOSSARY.md)               | One agreed name per concept, mapped to the identifier in code                                   |
| [`GETTING-STARTED.md`](GETTING-STARTED.md) | From a fresh clone to a running app and a green test run                                        |
| [`DEVELOPMENT.md`](DEVELOPMENT.md)         | The maintainer's handbook: scripts, env, database, testing, conventions, troubleshooting        |
| [`USER-GUIDE.md`](USER-GUIDE.md)           | How a doctor uses CatatMD, screen by screen                                                     |
| [`architecture/`](architecture/)           | The technical reference, one numbered section per file                                          |
| [`decisions/`](decisions/)                 | Decision records: what was decided, why, and what it does not license                           |
| [`operations/`](operations/)               | Runbooks: deployment, environments, database, monitoring, incident response                     |
| [`research/`](research/)                   | The graded desk research behind the product and clinical claims                                 |
| [`agents/`](agents/)                       | Rules and references for AI coding agents, imported by [`../AGENTS.md`](../AGENTS.md)           |
| [`assets/`](assets/), [`brand/`](brand/)   | Screenshots, diagrams, and the logo source                                                      |

## Keeping Docs True

- **Docs describe the system as it is.** Progress and to-dos live in [GitHub Issues](https://github.com/AlaskanTuna/CatatMD/issues); history lives in git.
- **A change ships with its docs.** A pull request that changes behaviour updates the matching section, module README or decision record.
- **Style:** [`agents/markdown-style.md`](agents/markdown-style.md).
