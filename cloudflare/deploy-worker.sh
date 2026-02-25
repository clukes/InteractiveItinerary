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
VALIDATE_SCRIPT="$REPO_ROOT/scripts/validate-itinerary.cjs"
DEFAULT_PRIVATE_ITINERARY_PATHS=(
    "$REPO_ROOT/private/local-itineraries/seville-itinerary.private.json"
    "$REPO_ROOT/private/seville-itinerary.private.json"
    "$REPO_ROOT/private/seville-itinerary.json"
)
ITINERARY_SOURCE_PATH="${ITINERARY_SOURCE_PATH:-}"
STAMP_DIR="$REPO_ROOT/.cloudflare"
STAMP_PATH="$STAMP_DIR/worker-deploy-stamp"

if [[ ! -f "$WORKER_PATH" ]]; then
    echo "Error: worker file not found at $WORKER_PATH"
    exit 1
fi

# --- Pre-deploy validation gate ---
if [[ -f "$VALIDATE_SCRIPT" ]]; then
    echo "Running itinerary validation before deploy..."
    if ! node "$VALIDATE_SCRIPT"; then
        echo "Deploy aborted: itinerary validation failed."
        exit 1
    fi
else
    echo "Warning: validation script not found at $VALIDATE_SCRIPT — skipping."
fi

COMMAND=(npx wrangler deploy "$WORKER_PATH" --name "$WORKER_NAME")

if [[ -n "$DEPLOY_ENV" ]]; then
    COMMAND+=(--env "$DEPLOY_ENV")
fi

echo "Deploying Cloudflare Worker '$WORKER_NAME' from $WORKER_PATH..."
"${COMMAND[@]}"

if [[ -z "$ITINERARY_SOURCE_PATH" ]]; then
    for candidate in "${DEFAULT_PRIVATE_ITINERARY_PATHS[@]}"; do
        if [[ -f "$candidate" ]]; then
            ITINERARY_SOURCE_PATH="$candidate"
            break
        fi
    done
fi

if [[ ! -f "$ITINERARY_SOURCE_PATH" ]]; then
    echo "Error: itinerary source file not found at $ITINERARY_SOURCE_PATH"
    echo "Checked default private paths:"
    for candidate in "${DEFAULT_PRIVATE_ITINERARY_PATHS[@]}"; do
        echo "  - $candidate"
    done
    echo "Set ITINERARY_SOURCE_PATH to a private JSON file and re-run deploy."
    exit 1
fi

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

mkdir -p "$STAMP_DIR"
WORKER_HASH="$(shasum -a 256 "$WORKER_PATH" | awk '{print $1}')"
printf 'worker_hash=%s\nworker_name=%s\nenvironment=%s\ndeployed_at=%s\n' \
    "$WORKER_HASH" \
    "$WORKER_NAME" \
    "${DEPLOY_ENV:-default}" \
    "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
    >"$STAMP_PATH"

echo "Recorded deploy stamp at $STAMP_PATH"
