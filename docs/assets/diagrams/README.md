# Diagrams

Every architecture and flow diagram in the docs is an SVG pair, one per GitHub theme, embedded with `<picture>` so it follows the reader's light or dark setting.

## Files

| File                     | Shows                                                    | Used In                                |
| ------------------------ | -------------------------------------------------------- | -------------------------------------- |
| `how-it-works-*.svg`     | A consultation becoming an approved note                 | `README.md`                            |
| `tech-stack-*.svg`       | The three tiers, the trust boundary and every processor  | `README.md`, `docs/OVERVIEW.md`        |
| `analyse-pipeline-*.svg` | The analyse route, module by module                      | `README.md`, `docs/OVERVIEW.md`        |
| `doctor-journey-*.svg`   | What the doctor does, from consult to locked note        | `docs/OVERVIEW.md`                     |
| `phi-boundary-*.svg`     | De-identification, the single egress and re-hydration    | `docs/OVERVIEW.md`                     |
| `ambient-segments-*.svg` | Segmented batch transcription as first specified (§20.7) | `docs/architecture/20-asr-contract.md` |

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
