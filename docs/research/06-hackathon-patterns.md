# 06: Presentation And Demo Patterns Studied While Building CatatMD

**Stream:** Presentation and demo patterns drawn from published healthcare-AI events and product-demo guidance, adapted while building CatatMD.
**Date:** 13/08/26 · **Use:** product demo and README

## How To Read This

| Tag                      | Meaning                                                                                                                                   |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **VERIFIED**             | Published event criteria, named practitioner statements, or peer-reviewed/primary findings. URL given.                                   |
| **VERIFIED (secondary)** | Found via search summary of a real source; source URL given, but I did not fetch the primary text end to end. Treat quotes as paraphrase. |
| **INFERRED**             | My synthesis across sources. Defensible, but nobody published it as a rule.                                                               |

This stream found **no** healthcare hackathon rubric that explicitly awards points for "demonstrating a guardrail catching a failure." The support for that move is strong but indirect, so it is marked INFERRED and tied to its evidence.

---

## 1. Published Healthcare-AI Event Criteria (VERIFIED)

Five real rubrics, side by side. The convergence matters more than any single one.

| Event                                       | Criteria                                                                                                                                                                                                                | Format Constraints                                                                                                         |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Stanford health++ (2021)**                | Need Definition (10) · Quality of Implementation (10) · Technical Complexity (10) · **Progress During the Hackathon (10)** — "prototype development stage, presentation thoroughness, next steps, story of progression" | 40 pts total                                                                                                               |
| **Singapore Healthcare AI Datathon / NUS**  | Clinical Relevance and Impact · **Method Novelty — "NOT complexity"** · Result Presentation · Team's Plan for Moving Forward                                                                                            | 5-min live pitch, or ≤5-min recorded                                                                                       |
| **Healthcare AI Symposium pitch challenge** | Innovation and uniqueness · Impact on healthcare · Feasibility and scalability · Team capability · Clarity of presentation                                                                                              | 4-min pitch + 2–3 min Q&A; deck + ≤3.5-min video                                                                           |
| **Anthropic AI Hackathon (Toronto)**        | Innovation · **Technical Execution — "code quality, system design, robustness, depth of implementation, not just UI polish"** · Impact · Human Experience (incl. ethical alignment) · Presentation                      | ≤5-min demo video · GitHub repo with **readable README plus all prompts and config files** · **≤500-word written summary** |
| **MIT Hacking Medicine (Grand Hack)**       | 5-min pitch + 3 min judge Q&A; panel of clinicians, entrepreneurs, investors                                                                                                                                            | Need-first culture: pitch the **pain point, not the solution**                                                             |

Sources: [health++ 2021](https://healthplusplus21.devpost.com/) · [NUS Datathon rules](https://www.nus-datathon.com/rules-and-prizes) · [Healthcare AI Symposium pitch](https://healthsymposium.ai/pitch/) · [Anthropic Hackathon Toronto](https://anthropic-ai-hackathon-toronto.devpost.com/) · [MIT Grand Hack 2023 (Patient Safety Tech)](https://www.patientsafetytech.com/past-competitions/mithackingmedicinegrandhack2023) · [MIT Hacking Medicine model, IJTAHC](https://www.cambridge.org/core/journals/international-journal-of-technology-assessment-in-health-care/article/less-noise-more-hacking-how-to-deploy-principles-from-mits-hacking-medicine-to-accelerate-health-care/FBBA3F78A0FC31B93FD5C078657C7F78) (VERIFIED (secondary) for the "problem not solution" rule)

**What converges across all five:**

- **Need Definition is a scored line item, not a preamble.** Stanford gives it 25% of the total. NUS leads with clinical relevance. MIT makes it the entire pitch culture.
- **"Novelty, NOT complexity"** appears explicitly. A clever architecture scores nothing on its own.
- **"Next steps / plan for moving forward"** is scored at 2 of 5 events. These criteria place continued work alongside the current artifact.
- **The written artifact has a separate, mandatory limit** in some events (500 words, 3.5 min, 5 min). It needs to stand on its own rather than repeat the presentation.

---

## 2. Demo Structure

### 2.1 Published Practitioner Guidance (VERIFIED)

From [JetBrains, "How to Win a Hackathon: Notes From the Judging Table"](https://blog.jetbrains.com/ai/2026/06/how-to-win-a-hackathon-notes-from-the-judging-table/) (named judges: Avi Press, Jono Bacon, Jan-Niklas Wortmann, Colin Lowenberg):

- **Show something working within 90 seconds** (Bacon's rule).
- **Pre-fill forms, mock slow API calls, remove every stalling point.** Explicitly sanctioned — this is not cheating, it is respecting the clock.
- **"Being straightforward about what works, what doesn't" reads as confidence** (Press). Honesty is framed as a _scoring asset_, not a confession.
- **Scope control is the top failure mode.** "If it's too long, cut down on your features" (Lowenberg). Five features done badly loses to one done end to end.

From [Devpost's 5-judge roundup](https://info.devpost.com/blog/hackathon-judging-tips):

- Richard Moot (Square): _"A project that really stands out is one that was clearly considering the judging criteria."_ He also penalises over-indexing on one criterion, and back-end-heavy work with no visible surface.
- Karen Bajza-Terlouw (Databricks): _"Ambiguity is a red flag, and also projects that lack detail and code."_ And: _"the more open you can be with how you created your project, the better."_
- Moot again: judges score **the combination** — a strong video with a weak written description still fails.

### 2.2 Live vs Recorded (VERIFIED (secondary))

- The practitioner consensus is that **live demos are not worth the risk**; pre-recorded sequences and screenshots **do not count against you** — "judges appreciate foresight, not risk." ([levelup/gitconnected](https://levelup.gitconnected.com/how-to-win-a-hackathon-ee740c6d47db), [SlideModel](https://slidemodel.com/hackathon-presentation/))
- A named hybrid tactic: **record the screen capture silently, narrate it live.** Keeps the human presence, removes the crash risk.
- Devpost's own demo-video guidance: 2–5 minutes, purpose statement in the **first few seconds**, roughly **60% explaining / 40% demoing**. ([Devpost tips](https://info.devpost.com/blog/6-tips-for-making-a-hackathon-demo-video), [World's Largest Hackathon demo tips](https://worldslargesthackathon.devpost.com/updates/36832-demo-video-tips))

### 2.3 Product Demos And Investor Presentations (VERIFIED)

[YC's Demo Day guide](https://www.ycombinator.com/blog/guide-to-demo-day-pitches/) says the opposite: live product demonstrations _"seldom work in modern demo day presentations"_; don't use app screenshots; use a simple drawing; show **one** thing it does.

**Resolution (INFERRED):** YC optimises a 60-second investor filter where the product is a proxy for traction. CatatMD is a working product whose behavior is the evidence. Keep YC's **compression discipline** (one point per screen, speak slowly, cut the team slide) while retaining a working demo.

### 2.4 A Demo Sequence For CatatMD (INFERRED)

This stream suggests sequencing a CatatMD demo as **happy path → deliberate failure → the doctor's control → the honest limit**, not happy-path-only.

```
0:00–0:20  One sentence: who it is for, what it does, what it refuses to do.
0:20–1:30  Happy path, one realistic fixture, end to end. Something real on screen by 0:90.
1:30–2:30  The guardrail reel — 2–3 engineered failures, each visibly caught.
2:30–3:10  The doctor edits and approves. Show that approval is a state transition, never a default.
3:10–4:00  Limits, honestly. What is mocked, what is unvalidated, the named next step.
```

The sequence keeps the working path central, then makes review controls and limits visible.

---

## 3. Safety Framing: Showing A Guardrail Catch

### 3.1 Direct Support (VERIFIED, from buyer-facing demo guidance)

[AI Smart Ventures, "How to Evaluate AI Tool Demos Without Getting Sold"](https://aismartventures.com/posts/how-to-evaluate-ai-tool-demos-without-getting-sold/) lists credibility signals product buyers are advised to look for:

- **"The demo includes a failure case, not only a best-case output."**
- Shows what happens when input is unclear; shows data storage, retention, access controls; shows audit logs.
- **Red flags:** every output perfect in under two minutes; presenter avoids edge cases; vague on error handling; redirects to future features.

Corroborating buyer-side data point (VERIFIED (secondary)): Forrester (2025) is cited as finding **67% of AI buyers said the product performed worse than the demo within 90 days** — which is exactly why an all-green demo now reads as a _warning_, not a strength. ([The VC Corner](https://www.thevccorner.com/p/the-ai-trust-tax))

### 3.2 The Domain Evidence That Makes the Guardrail Reel Land (VERIFIED)

Clinicians know that AI scribes can fail. Showing how the product handles failures makes the safety controls concrete.

| Finding                                                                                                                                                                                                                                                                                                     | Source                                                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5 commercial ambient-scribe platforms, 14 **simulated** ambulatory encounters: **mean note error rate 26.3%**; an average of **3.0 errors per case with potential for moderate-to-severe harm** (AHRQ harm scale); only **35.8% of correctly reported elements were consistently correct across platforms** | Mayo Clin Proc Digit Health, 9 Oct 2025 — [PubMed](https://pubmed.ncbi.nlm.nih.gov/41234546/) · [PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12605248/) |
| Netherlands GP study, 12 GPs, **535 consultations**, Dec 2024–Jul 2025: documentation time **−42.7s per consultation** (p<0.0001), **total consultation time unchanged**; drawbacks were **inaccurate summaries**, barriers to discussing sensitive information, interference with practice                 | [medRxiv](https://www.medrxiv.org/content/10.1101/2025.10.30.25339135v1) → [npj Digital Medicine](https://www.nature.com/articles/s41746-026-02454-3)         |
| ~60 ambient-scribe products on market, >$600M invested in three years; burnout improves, **financial ROI unproven**                                                                                                                                                                                         | [PHTI, Mar 2025](https://phti.org/announcement/ai-scribes-reduce-clinician-burnout/)                                                                          |
| Failure taxonomy from clinician end-user feedback: **omission, commission, contextual misunderstanding, clinical reasoning gaps**                                                                                                                                                                           | Dai et al., [arXiv:2512.04118](https://arxiv.org/pdf/2512.04118) (Dec 2025)                                                                                   |
| Automation bias in AI-assisted pathology under time pressure: **7%** of initially correct reads overturned by erroneous AI advice                                                                                                                                                                           | [arXiv:2411.00998](https://arxiv.org/abs/2411.00998)                                                                                                          |

### 3.3 The Trap: "The Doctor Reviews Everything" Is Not a Safety Argument (VERIFIED)

This is a central limitation of human review and one of this stream's main findings.

[Penn LDI, "In the Loop or On the Loop"](https://ldi.upenn.edu/our-work/research-updates/in-the-loop-or-on-the-loop-the-conundrum-of-ai-clinical-decision-support/), summarising Adam Rodman: _"just giving a human an AI system doesn't inherently improve that human's performance, and it doesn't improve their performance as much as if the AI system had just run by itself."_ Humans overriding correct algorithmic guidance is documented across trading, chess/Go, sentencing, weather, and industrial QC. There is a live academic critique titled ["Clinician in the loop: a flawed solution for AI oversight"](https://www.researchgate.net/publication/404514656_Clinician_in_the_loop_a_flawed_solution_for_AI_oversight).

**Implication (INFERRED):** "the doctor reviews and approves everything" is table stakes and, on its own, a _weak_ answer. The strong answer is: **what in the design makes that review actually effective?** Concretely, name the mechanisms — deterministic rules that cannot be suppressed by the model, ID-constrained citations that make a fabricated reference a parse error, missing-info prompts that direct attention rather than assume it, visible provenance so the doctor knows what came from where. That is a safety argument. "A human checks it" is not.

### 3.4 What Governance Frameworks Expect You To Disclose (VERIFIED)

These frameworks provide a structure for documenting the product's safety and governance posture.

- **CHAI Applied Model Card** — the "nutrition label" for health AI: known risks and limitations, training data, bias mitigation, ongoing maintenance, covering CHAI's five principles (Transparency, Safety, Security & Privacy, Fairness & Bias, Usefulness). Free, open-source template. ([GitHub](https://github.com/coalition-for-health-ai/mc-schema) · [Registry](https://registry.chai.org/applied-model-card))
- **Malaysian Medical Council — Guideline on the Ethical Use of AI** (Sept 2025). Places obligations on the _practitioner_: accountability for AI-assisted decisions, independent verification of AI output, disclosure to patients, documentation of AI use, data protection, and primacy of clinical judgement. ([PDF](https://mmc.gov.my/wp-content/uploads/2025/09/MMC-Guideline-on-The-Ethical-Use-of-Artificial-Intelligence-AI-.pdf)) — VERIFIED that the document exists and covers these themes; **section-level quotes not verified**, the PDF extraction was lossy. Do not quote a clause number without re-reading it.
- **Malaysia AIGE** (MOSTI, Sept 2024) — seven principles: fairness, reliability, privacy & security, inclusiveness, transparency, accountability. Voluntary, national. ([malaysia.gov.my](https://www.malaysia.gov.my/en/my-initiative/whole-government-digital-services/tadbir-urus/national-guidelines-on-artificial-intelligence-governance-and-ethics-aige))
- **Malaysia PDPA (Amendment) Act 2024**, in force in stages Jan–Jun 2025: DPO appointment, breach notification, and a **revised s.129 cross-border transfer regime requiring Transfer Impact Assessments**. ([Mayer Brown](https://www.mayerbrown.com/en/insights/publications/2025/07/from-legislative-reform-to-practical-guidance-key-amendments-to-malaysias-pdpa-and-the-launch-of-cross-border-transfer-guidelines))
- **Singapore AIHGle 2.0** (MOH + HSA, Mar 2026) — lifecycle guidance, explicit gen-AI coverage, clarity of responsibilities between developer / deployer / user. ([PDF](https://isomer-user-content.by.gov.sg/3/23fb5b36-56b4-4abb-9370-75c9ddcaf3ed/AIHGle%202.0.pdf))

---

## 4. Clinical Input And Validation Evidence

### 4.1 Published Evidence About User Input (VERIFIED / VERIFIED (secondary))

- MIT Hacking Medicine's method is **stakeholder-first**: map patients, clinicians, hospitals, and payers; scrutinise their incentives; seek early feedback. It frames the problem around needs rather than solutions. ([IJTAHC](https://www.cambridge.org/core/journals/international-journal-of-technology-assessment-in-health-care/article/less-noise-more-hacking-how-to-deploy-principles-from-mits-hacking-medicine-to-accelerate-health-care/FBBA3F78A0FC31B93FD5C078657C7F78), VERIFIED (secondary))
- A published health-hackathon study found only **18.6% of participants were physicians**, with experienced (40+) clinicians largely absent — and named this as the quality gap to fix. ([PMC4899493](https://pmc.ncbi.nlm.nih.gov/articles/PMC4899493))
- Multi-time winner guidance treats validation as a **collectable artifact**: _"Having at least 2 of these artifacts shows the judge that you dared to take the next step."_ The source's sequence is Problem → Solution → Market → **Validation** → Demo. ([Gary Yau Chan](https://medium.com/garyyauchan/ultimate-8-step-guide-to-winning-hackathons-84c9dacbe8e))
- Hackathon rubric guidance recommends **problem fit, evidence of execution, feasibility, adoption potential, and presentation clarity**, and warns that a polished prototype does not establish user evidence or workflow fit. ([DoraHacks](https://dorahacks.io/blog/guides/hackathon-judging-plan)). **MEDIUM confidence:** this line came from a search summary; the Medium mirror I fetched did not reproduce it verbatim. Use the idea, not the quote.
- 3Cloud's healthcare-hackathon retro: one team changed its plans after a physician shared insight from her network; compliance (HIPAA, credentialing, liability) was built into the concept rather than bolted on. ([3Cloud](https://3cloudsolutions.com/resources/standing-out-at-a-healthcare-focused-hackathon/))

### 4.2 Current Clinical Validation Gap (INFERRED)

Do not claim clinician validation that did not happen. CatatMD's current evidence gap should be explicit in product documentation.

1. **State the absence plainly.** Record that no practising clinician has reviewed the product, then distinguish published evidence from product-specific validation.
2. **Cite published clinician evidence and trace design decisions to it.** The GP ambient-scribe study, the Mayo simulated-encounter study, and the PHTI report provide evidence about this product category. A requirement traced to "GPs reported inaccurate summaries as a primary drawback (npj Digit Med 2026)" is stronger than an unsupported claim.
3. **Define a validation protocol.** Specify a session, five fixtures, a rubric (see §5.3), questions, pass/fail criteria, and recruitment criteria.
4. **Maintain a falsification list.** For example: "This design is wrong if a GP says X." Include three or four entries.
5. **Use synthetic fixtures that reflect Malaysian private-GP reality.** Include code-switching, brand-name medicines, the MC request, and the walk-in cadence. (Synthetic only, per project rules.)

---

## 5. Product Documentation Patterns

### 5.1 Clear Structure And Traceability (VERIFIED / VERIFIED (secondary))

- Moot (Square), VERIFIED: standout projects _"clearly considered the judging criteria."_
- Grant-review guidance, VERIFIED (secondary): reviewers work a scoresheet, and **"if they can't find where you addressed a criterion, they'll give you a low score for that section, even if the information is buried somewhere in your narrative."** ([grants.com](https://grants.com/grant-review-process-explained-how-grant-applications-are-evaluated-scored-2026-guide/))

**INFERRED application:** use clear headings and place the evidence near the product claims it supports. This stream does not apply event-specific criteria to CatatMD documentation.

### 5.2 Patterns In AI-Engineering Work (VERIFIED)

The relevant published material is AI-engineering take-home work. A field guide analyses 100+ submissions and company rubrics ([alexeygrigorev/ai-engineering-field-guide](https://github.com/alexeygrigorev/ai-engineering-field-guide/blob/main/interview/questions/06-home-assignments.md)):

- **Evaluation methodology is the top differentiator.** _"Red flag if candidate doesn't start with evals."_ Building the eval harness before the main logic reads as production thinking.
- Scored dimensions: functional correctness end to end and at the edges · architecture and error handling ("not code golf") · **evals** · production readiness (PII handling, input sanitisation, cost, monitoring) · tests even when optional.
- README should carry: **design decisions and trade-offs (the why, versus alternatives)** · architecture walkthrough · **eval results with numbers** · limitations and what you would do with more time.
- Named failure modes: skipping evals · under-documenting decisions · too little effort overall
- _"Connect metrics to outcomes"_ — don't just report numbers, say what they mean.

### 5.3 Metrics For Clinical Note Quality (INFERRED, built on VERIFIED instruments)

Small-n numbers beat no numbers, provided the instrument is recognisable:

- **PDQI-9** (Physician Documentation Quality Instrument) is the standard note-quality rubric; modified versions add Likert criteria **plus binary hallucination detection**. Known limitation, worth acknowledging: PDQI-9 dates to 2012, was validated on a small inpatient sample, and is a poor detector of LLM-specific errors. ([arXiv:2503.16504](https://arxiv.org/abs/2503.16504) · [PMC12586549](https://pmc.ncbi.nlm.nih.gov/articles/PMC12586549/))
- **Error taxonomy:** omission / commission / partially correct, with harm potential graded on the **AHRQ harm scale** — exactly what the Mayo simulated-encounter study did. Reusing their method makes your numbers comparable to a published benchmark.
- **The metric only this project can report:** red-flag recall on a fixture set where false negatives are counted at zero tolerance, plus a PHI-egress test asserting that zero identifiers crossed the boundary. Deterministic, cheap to compute, and it measures the thing the architecture exists for.

### 5.4 Honest, Specific Limitations (INFERRED, converging support)

Press's "straightforward about what works, what doesn't" · the buyer checklist's "include a failure case" · CHAI's mandatory known-risks-and-limitations field · Bajza-Terlouw's "ambiguity is a red flag" all point one way: **a specific, severity-graded limitations table makes product evidence easier to interpret.** Vague limitations ("may need further testing") leave the risk unclear. Specific ones ("we do not handle paediatric presentations; the trigger list is v0.1 and covers N conditions; Malay-English code-switching is unmeasured") state the boundary.

---

## 6. Applying The Findings To CatatMD

These actions make the product's safety controls, evidence, and limits visible.

**Demo (highest leverage)**

- [ ] Cut to **one** fixture for the happy path. Rehearse until real output is on screen by **0:90**.
- [ ] Pre-seed the database, pre-warm caches, and stub slow calls only when the behavior remains representative of the running product.
- [ ] Build a **guardrail reel** of 2–3 engineered failures, each visibly caught: (a) an identifier-laden transcript, showing the **actual de-identified payload** that left the API; (b) the model attempting to drop or soften a red flag, with the deterministic rule still firing; (c) a free-text citation rejected at parse time. These examples show how the controls behave under failure.
- [ ] Show approval as an explicit state transition, with the audit event. Show that nothing auto-approves.
- [ ] Close on limits with a named next step. Do not end on a feature.
- [ ] **Record it, narrate live.** Keep the raw recording as the fallback if anything is live.

**Fixtures**

- [ ] Follow the published method: **simulated encounters + a per-case rubric of key elements**, so notes can be graded, not admired.
- [ ] Include at least one deliberately hard case (interruption, mumbled dose, code-switching, a symptom mentioned once in passing) and one red-flag case.
- [ ] Make Malaysian private-GP reality visible in the text itself. Synthetic only — this is a hard project rule, and it is also the honest answer to "where did this data come from."

**Product README**

- [ ] A **traceability table**: requirement → design decision → file/module → test that proves it → status. Nothing buried.
- [ ] A **trade-offs** section that names the alternatives rejected and why (provider adapter vs direct SDK; deterministic-first red flags vs LLM-only; ID-constrained citations vs free text).
- [ ] **Numbers from your own eval run** on the fixtures, with the instrument named (PDQI-9-derived dimensions; omission/commission counts; red-flag recall; PHI-egress assertions). State n. State what the numbers do _not_ establish.
- [ ] A **severity-graded limitations table**, specific enough to be uncomfortable.
- [ ] State clearly that **no clinician has reviewed this product**, then link to the validation protocol and falsification list.
- [ ] A one-page **model card** in CHAI's shape (intended use, out-of-scope use, known risks, data, maintenance).
- [ ] A short **local-fit** paragraph: MMC's practitioner obligations, AIGE's principles, PDPA s.129 / TIA for cross-border, and where the deployment sits.

**Presentation And Writing Pitfalls**

- Five half-features instead of one that works end to end.
- Back-end depth with no visible surface (Moot penalises this explicitly).
- A strong demo with a thin write-up, or vice versa.
- Marketing register. "Novelty, NOT complexity"; plain language beats "next-generation AI-powered."
- "A doctor reviews everything" offered as the safety story, unsupported by mechanism.
- A limitations section written in hedges.

---

## What This Changes

**Product Demo — four concrete deltas:**

1. **Add a guardrail reel as its own beat (~60s), between the happy path and the close.** Include three catches: PHI never leaving (show the actual outbound payload), a red flag surviving an LLM attempt to suppress it, and a free-text citation failing schema validation. This makes error handling visible and aligns with the automation-bias evidence.
2. **Aim for first real output within 90 seconds.** Pre-seed data and stub slow calls only when the behavior remains representative of the running product.
3. **Record the demo and narrate it live**, keeping the recording as a fallback. Published demo guidance describes pre-recording as a risk-reduction tactic.
4. **End on limits plus a named next step, not on a feature.** Two of the five published event rubrics score "next steps / plan for moving forward" as a line item.

**Product README — five concrete deltas:**

1. **Use clear section headings and a requirement → module → test traceability table.** Keep evidence near the product claims it supports.
2. **Add an eval section with real numbers from the fixture set**, using a named instrument (PDQI-9-derived dimensions plus omission/commission counts on the AHRQ harm scale, matching the published Mayo method) alongside the project-specific ones (red-flag recall at zero-tolerance for false negatives; PHI-egress assertions). State n and what the numbers do not establish.
3. **Upgrade the safety section from "the doctor approves everything" to "here is what makes that review effective."** Human-in-the-loop safety is contested in the literature; document the controls that make the review useful.
4. **State plainly that no clinician has reviewed the product,** then link to published clinician evidence, a validation protocol, and a falsification list. Do not imply validation that did not happen.
5. **Add a one-page CHAI-shaped model card and a short local-fit paragraph** (MMC practitioner obligations, AIGE principles, PDPA s.129 cross-border/TIA). Document the local regulatory context alongside intended use and limitations.

**Fixtures — one delta:** design them as _gradeable_ simulated encounters with a per-case key-element rubric, including one deliberately hard case and one red-flag case, rather than as artificially clean transcripts. The published studies use this method, which supports comparable results.

**Unchanged:** architecture, provider strategy, and scope. This stream informs how product behavior and limitations are documented and shown.
