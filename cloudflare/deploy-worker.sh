#!/usr/bin/env bash

set -euo pipefail

if ! command -v npx >/dev/null 2>&1; then
    echo "Error: npx is required but not installed."
    exit 1
fi

WORKER_NAME="${1:-}"
DEPLOY_ENV="${2:-}"

if [[ -z "$WORKER_NAME" ]]; then
    echo "Usage: npm run deploy:worker -- <worker-name> [environment]"
    echo "Example: npm run deploy:worker -- interactive-itinerary-worker production"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WORKER_PATH="$SCRIPT_DIR/worker.js"
STAMP_DIR="$REPO_ROOT/.cloudflare"
STAMP_PATH="$STAMP_DIR/worker-deploy-stamp"

if [[ ! -f "$WORKER_PATH" ]]; then
    echo "Error: worker file not found at $WORKER_PATH"
    exit 1
fi

COMMAND=(npx wrangler deploy "$WORKER_PATH" --name "$WORKER_NAME")

if [[ -n "$DEPLOY_ENV" ]]; then
    COMMAND+=(--env "$DEPLOY_ENV")
fi

echo "Deploying Cloudflare Worker '$WORKER_NAME' from $WORKER_PATH..."
"${COMMAND[@]}"

mkdir -p "$STAMP_DIR"
WORKER_HASH="$(shasum -a 256 "$WORKER_PATH" | awk '{print $1}')"
printf 'worker_hash=%s\nworker_name=%s\nenvironment=%s\ndeployed_at=%s\n' \
    "$WORKER_HASH" \
    "$WORKER_NAME" \
    "${DEPLOY_ENV:-default}" \
    "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
    >"$STAMP_PATH"

echo "Recorded deploy stamp at $STAMP_PATH"
