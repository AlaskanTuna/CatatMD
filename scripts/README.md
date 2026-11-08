<a id="readme-top"></a>

# Repository Scripts

Repository-level utilities live here. Their commands are defined in the root [package.json](../package.json).

## Floor Guard

Run bun run floor-guard to check the change diff and untracked source files. The root script invokes [floor-guard.ts](floor-guard.ts) with the --diff mode.

The --diff mode compares changes with the merge base of origin/main and HEAD. It rejects:

- New suppressions.
- Skipped or focused tests.
- Removed test assertions.
- Empty catches.
- TODO or FIXME markers.
- Deleted .test.ts or .test.tsx files.

The --hook mode reads an edit payload from standard input as a Claude Code PreToolUse request. If the edit lowers the quality floor, it returns an ask decision with the violation details.

The exact override trailer is Floor-Guard-Allow: <reason>. It changes diff violations to warnings and lets that mode exit successfully. Project rules reserve adding this trailer for a human.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Product Walkthrough Video

The [demo/](demo/) directory contains tooling for producing the product walkthrough video. It is not application runtime code.

The recorder drives a synthetic consultation workflow and writes these artifacts:

| Artifact     | Purpose                                   |
| ------------ | ----------------------------------------- |
| capture.webm | Browser capture                           |
| beats.json   | Step timing metadata                      |
| take-ok      | Success marker with value catatmd-demo-v1 |

Narration helpers apply the fixed script and generated captions, then export the MP4. The default output is CatatMD-Demo.mp4.

The browser workflow creates persistent records and can invoke billable analysis, so read [demo/README.md](demo/README.md) before using the recorder.

Run the offline tooling checks with bun run demo:offline. They use local fixtures and mocks rather than the application or a speech service.

<p align="right"><a href="#readme-top">&uarr;</a></p>
