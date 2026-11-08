<a id="readme-top"></a>

# UI Primitives

Reusable presentation components and interaction helpers for the frontend.

## Module Guide

### Owns

- [Button.tsx](Button.tsx), [Card.tsx](Card.tsx), [Checkbox.tsx](Checkbox.tsx), and [Select.tsx](Select.tsx) provide common controls.
- [AssertionState.tsx](AssertionState.tsx), [UncertainText.tsx](UncertainText.tsx), and [Mark.tsx](Mark.tsx) render clinical and transcript states.
- [Pagination.tsx](Pagination.tsx), [RenameField.tsx](RenameField.tsx), [InfoTip.tsx](InfoTip.tsx), and [SelectionIsland.tsx](SelectionIsland.tsx) support common interactions.
- [Toaster.tsx](Toaster.tsx), [PageHeader.tsx](PageHeader.tsx), [Wordmark.tsx](Wordmark.tsx), [ThemeToggle.tsx](ThemeToggle.tsx), and [CursorGlow.tsx](CursorGlow.tsx) provide shared display elements.
- [use-anchored-popover.ts](use-anchored-popover.ts) manages anchored popovers.

### Used By

Routes, shell, audio, review, and copilot components import these primitives rather than defining duplicate controls.

### Invariants

- **Accessible Controls:** Preserve keyboard interaction, labels, and visible focus states when changing shared controls.
- **Assertion Vocabulary:** Keep the displayed assertion state aligned with the shared clinical state contract.
- **Popover Placement:** Select menus use the shared anchored popover helper to avoid clipping inside scrolling surfaces.

### Tests

- **Controls:** Select.test.tsx and Pagination.test.tsx.
- **Shared Interactions:** InfoTip.test.tsx and RenameField.test.tsx.

<p align="right"><a href="#readme-top">&uarr;</a></p>
