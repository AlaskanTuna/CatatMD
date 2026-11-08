<a id="readme-top"></a>

# Guided Demo Tour

The tour module provides an in-product walkthrough of the consultation workflow.

## Module Guide

### Owns

- [DemoTour.tsx](DemoTour.tsx) defines the steps, context provider, useDemoTour hook, and tour state.
- [DemoStepBar.tsx](DemoStepBar.tsx) renders step navigation.
- [Spotlight.tsx](Spotlight.tsx) highlights the current target and offers next, back, and stop controls.
- [HelpButton.tsx](HelpButton.tsx) starts the tour.

### Used By

shell/AppShell.tsx mounts the provider and tour controls. routes/ConsultationReview.tsx and review components read the active tour state.

### Invariants

- **No Saved Consultation:** The tour uses api.analyzeEphemeral and the demo-ephemeral ID. Its analysis is not written to the database.
- **No Browser Persistence:** Tour state stays in memory. It is not written to localStorage or the query cache.
- **Route Awareness:** Tour steps can navigate through application routes and identify their targets.

### Tests

Coverage includes DemoTour.test.tsx and Spotlight.test.tsx.

<p align="right"><a href="#readme-top">&uarr;</a></p>
