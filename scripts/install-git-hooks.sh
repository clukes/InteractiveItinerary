#!/usr/bin/env bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOOKS_DIR="$REPO_ROOT/.githooks"

if [[ ! -d "$HOOKS_DIR" ]]; then
    echo "Error: hooks directory not found: $HOOKS_DIR"
    exit 1
fi

chmod +x "$HOOKS_DIR"/*
git -C "$REPO_ROOT" config core.hooksPath .githooks

echo "Git hooks installed. core.hooksPath -> .githooks"
