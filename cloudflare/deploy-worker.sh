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
ITINERARY_SOURCE_PATH="${ITINERARY_SOURCE_PATH:-$REPO_ROOT/seville-itinerary.json}"
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

if [[ -f "$ITINERARY_SOURCE_PATH" ]]; then
    KV_COMMAND=(
        npx wrangler kv key put
        active-itinerary
        --binding ITINERARY_KV
        --path "$ITINERARY_SOURCE_PATH"
        --remote
    )

    if [[ -n "$DEPLOY_ENV" ]]; then
        KV_COMMAND+=(--env "$DEPLOY_ENV")
    fi

    echo "Seeding remote KV key 'active-itinerary' from $ITINERARY_SOURCE_PATH..."
    "${KV_COMMAND[@]}"
else
    echo "Warning: Itinerary source file not found at $ITINERARY_SOURCE_PATH"
    echo "Skipping KV seed step. Worker may return 500 until key 'active-itinerary' is populated."
fi

mkdir -p "$STAMP_DIR"
WORKER_HASH="$(shasum -a 256 "$WORKER_PATH" | awk '{print $1}')"
printf 'worker_hash=%s\nworker_name=%s\nenvironment=%s\ndeployed_at=%s\n' \
    "$WORKER_HASH" \
    "$WORKER_NAME" \
    "${DEPLOY_ENV:-default}" \
    "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
    >"$STAMP_PATH"

echo "Recorded deploy stamp at $STAMP_PATH"
