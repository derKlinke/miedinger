#!/usr/bin/env bash
set -euo pipefail

echo "warning: link-configs.sh is deprecated; copying configs instead" >&2

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

"${script_dir}/install-configs.sh" "$@"
