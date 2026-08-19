#!/usr/bin/env bash
# DSH Mobile deploy helper — thin wrapper around dsh-runner.mjs
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node "$SCRIPT_DIR/dsh-runner.mjs" "$@"
