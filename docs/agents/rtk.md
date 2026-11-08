# RTK

RTK is optional, and not every collaborator has it (`which rtk`). Where it is installed, a hook rewrites shell commands through it so their output is condensed before it reaches the agent. Run commands normally, with no `rtk` prefix: the hook adds it.

- Treat condensed output as the complete result. A truncated result names its own recovery path.
- Re-run a command as `rtk proxy <cmd>` only when its output is unusable: empty when output was expected, contradicting its exit code, or garbled.
- `rtk gain` shows the savings; `rtk discover` lists commands that missed the hook.
