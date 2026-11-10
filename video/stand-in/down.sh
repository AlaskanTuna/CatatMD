#!/usr/bin/env bash
# Stops the film's local stack by PID (never by pattern).
LOGS="$(dirname "$0")/../.state/stack"
for n in web api shim; do [ -f "$LOGS/$n.pid" ] && { kill -- -"$(cat "$LOGS/$n.pid")" 2>/dev/null || kill "$(cat "$LOGS/$n.pid")" 2>/dev/null; rm -f "$LOGS/$n.pid"; echo "stopped $n"; }; done
