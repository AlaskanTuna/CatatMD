<a id="readme-top"></a>

# Copilot

This module renders CatatAI, the consultation review copilot.

## Module Guide

### Owns

- [CatatAI.tsx](CatatAI.tsx) renders the panel and connects it to the active consultation.
- [use-copilot.ts](use-copilot.ts) owns conversation state, SSE parsing, sending, cancellation, and proposal resolution.
- [ProposalCard.tsx](ProposalCard.tsx) renders structured proposals for clinician review.
- [Markdown.tsx](Markdown.tsx) renders copilot responses.
- [chips.ts](chips.ts) contains the panel's prompt chip data.

### Used By

routes/ConsultationReview.tsx provides the consultation and handles approved proposal changes. The component set is specific to the consultation review surface.

### Invariants

- **Consultation Scope:** CatatAI receives a consultation ID and passes it to useCopilot.
- **Clinician Control:** The copilot offers review actions. It does not approve a consultation.
- **Tour State:** The guided demo tour can disable the copilot for its ephemeral consultation.

### Tests

- **Panel:** CatatAI.test.tsx.
- **Proposals:** ProposalCard.test.tsx.
- **Response Rendering:** Markdown.test.tsx.

<p align="right"><a href="#readme-top">&uarr;</a></p>
