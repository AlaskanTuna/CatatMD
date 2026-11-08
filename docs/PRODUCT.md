# PRODUCT.md

> Strategic design context for CatatMD. Answers who, what, and why. `docs/DESIGN.md` answers how it looks. Both are read before any design work.

## Register

**Product.** Design serves clinical work. Doctors use this authenticated tool between patients. The sign-in screen uses a restrained credential row rather than a hero.

## Platform

**Web.** Desktop-first, Chromium and Gecko. Responsive down to tablet; phone is legible but not the design target, because the product lives on a consulting-room desktop.

## Target Users

|                    | Primary                                                                                                     | Secondary                                             |
| ------------------ | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| **Who**            | Malaysian GPs in private practice and panel clinics                                                         | A reviewer of the code                                |
| **Context**        | Between patients, 10 to 20 consultations a session, screen shared with a real desk and a real queue outside | Reading the repo and using the guided demo tour once  |
| **Time budget**    | 30 to 60 seconds per note review                                                                            | 90 seconds to first real output                       |
| **What they need** | To see what the AI got wrong, fast, and sign off on something they can defend                               | Verify the safety controls against the implementation |

The primary user is not impressed by software. They are interrupted, accountable, and medico-legally exposed. Every second of decoration is a second not spent on the patient outside.

## Purpose

Turn a GP consultation transcript into a reviewable structured clinical note, with missing-information prompts, red-flag detection, and cited suggestions.

**The product does not diagnose.** The doctor reviews, edits, and approves every output and remains fully responsible. That is not a disclaimer bolted on; it is the shape of the interface. Approval is a deliberate act, never a default, and the UI must never imply the machine has decided anything.

## Positioning

CatatMD's design rests on four documented controls:

- Identifiers never reach the model. A de-identification gate sits in front of every call.
- Red flags are deterministic. The model may add candidates, never suppress a rule hit.
- Citations are ID-constrained. A hallucinated reference fails schema validation.
- Data stays in region. Frontend, API, and database are all Singapore.

The interface should reflect these engineering choices. **Restraint is the brand.** Visual language should match the product's documented behavior.

## Brand Personality

- **Composed, not clinical-cold.** Warm ground rather than hospital white. The doctor is at a desk, not in theatre.
- **Quiet until it matters.** One accent, used scarcely. When something is wrong, that is the only loud thing on screen.
- **Legible under pressure.** Generous type, high contrast, no density for its own sake.
- **Shows its work.** Evidence spans, guideline IDs, and `NOT_ASSESSED` fields are visible rather than hidden. The interface makes clinical evidence and review status auditable.

## Anti-References

What this must not resemble, and why:

| Anti-reference                                                                  | Why it fails here                                                                                                                                    |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Consumer health apps (illustration, mascots, encouragement)                     | Reads as a wellness product. Stream 08 concluded that a companion mascot conflicts most with the safety-first design; it is out of the current build |
| Hospital marketing sites (badge walls, phone numbers, WhatsApp FABs, carousels) | Over-signals to patients when the primary user is a doctor already using the clinical workflow                                                       |
| Generic SaaS dashboards (hero metric, gradient accents, identical card grids)   | Says nothing true about the product and everything about the template                                                                                |
| Legacy clinical systems (grey chrome, dense grids, 11px labels)                 | Familiar to the user, and the reason they hate their current software                                                                                |
| AI-forward dark tooling (terminal aesthetics, neon, monospace everywhere)       | Signals a dev tool, not a medical record a doctor signs                                                                                              |

## Strategic Design Principles

1. **Safety content is never on glass, never behind motion, never colour-only.** Red flags, gaps, and note text sit on solid opaque surfaces with an icon and a word label. Translucency is for chrome.
2. **`NOT_ASSESSED` is visible, not blank.** A field the consultation never covered must read as unestablished, never as normal. This is the single most important thing the interface does.
3. **Rule-sourced and model-sourced are visually distinct**, always, with no legend required to tell them apart.
4. **AI-generated and clinician-approved are visually distinct**, on screen and in print.
5. **Approve is the only large filled accent element on the review screen.** Nothing else competes with it, and it takes two steps.
6. **Motion degrades to an instant state change, never to no state change.** Reduced motion removes the transition, never the outcome.

## Accessibility

WCAG 2.2 AA is a requirement, not an aspiration. The specific commitments that shape the design:

- Contrast at least 4.5:1 for body text, 3:1 for UI borders and icons. Severity ramps are verified individually, in both themes.
- Severity is never signalled by colour alone. Icon plus word label, always.
- Visible, high-contrast focus ring on every interactive element.
- Target size at least 24 by 24 px for chips, expanders, and edit affordances.
- Full keyboard path from review to edit to acknowledge to approve, ordered by clinical priority.
- Approve is a deliberate two-step action, per error prevention for medical commitments.
- Status changes are announced through live regions.

## Success Criteria

The interface succeeds when a GP can complete a note review in under 60 seconds without asking what anything means, and a reviewer of the code can confirm that a red flag survives a suppression attempt without extra direction.
