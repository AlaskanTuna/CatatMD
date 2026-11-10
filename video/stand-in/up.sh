#!/usr/bin/env bash
# Starts the film's local stack: the streaming stand-in for Soniox (:8787; Qwen live, OpenAI final), the API (:3001)
# and a vite preview of the production frontend build (:4173), from STACK_DIR: a built checkout of the app at 14533dd
# with stand-in/soniox-local.patch applied (see README.md). Logs and PIDs go to .state/stack/. Stop with down.sh.
# Keys come from the environment, or else from STACK_DIR/.env by name; they are never printed.
set -euo pipefail
cd "$(dirname "$0")/.."
VIDEO=$PWD
LOGS=$VIDEO/.state/stack
STACK=${STACK_DIR:?set STACK_DIR to the patched app checkout (README.md, Local Stack)}
REFS=${SHIM_SPEAKER_REFS:-$VIDEO/stand-in/refs/speaker-1-doctor.wav,$VIDEO/stand-in/refs/speaker-2-patient.wav}
if ! git -C "$STACK" apply --reverse --check "$VIDEO/stand-in/soniox-local.patch" 2>/dev/null; then
  echo "STACK_DIR ($STACK) does not have stand-in/soniox-local.patch applied: the app would call Soniox itself" >&2
  exit 1
fi
mkdir -p "$LOGS"
key() {
  local name=$1
  if [ -n "${!name:-}" ]; then printf '%s' "${!name}"; else grep -E "^$name=" "$STACK/.env" | cut -d= -f2- | tr -d "\"'"; fi
}
start() {
  local name=$1
  shift
  setsid nohup "$@" >"$LOGS/$name.log" 2>&1 &
  echo $! >"$LOGS/$name.pid"
}
start shim env OPENAI_API_KEY="$(key OPENAI_API_KEY)" QWEN_API_KEY="$(key QWEN_API_KEY)" SHIM_SPEAKER_REFS="$REFS" \
  bun "$VIDEO/stand-in/asr-shim.ts"
cd "$STACK"
start api env PORT=3001 BETTER_AUTH_URL=http://localhost:3001 CORS_ORIGIN=http://localhost:4173 NODE_ENV=development \
  SONIOX_API_KEY=stand-in SONIOX_REGION=us ELEVENLABS_API_KEY= node backend/dist/server.js
cd frontend
start web bunx vite preview --port 4173 --strictPort --host 127.0.0.1
for _ in $(seq 1 60); do
  if curl -sf http://localhost:4173/api/health >/dev/null && curl -sf -o /dev/null -X POST http://127.0.0.1:8787/v1/auth/temporary-api-key; then
    echo "stack up: http://localhost:4173"
    exit 0
  fi
  sleep 1
done
echo "stack did not come up; see $LOGS" >&2
exit 1
