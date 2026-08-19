#!/usr/bin/env bash
# macOS double-click entry — forwards to dsh.sh
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SH="$SCRIPT_DIR/dsh.sh"
chmod +x "$SH" 2>/dev/null || true

if [[ $# -eq 0 ]]; then
  echo "DSH Mobile deploy"
  echo
  "$SH" --help
  echo
  read -r -p "Press Enter to start web + mobile in the background, or Ctrl+C to cancel..."
  exec "$SH" start
fi

exec "$SH" "$@"
