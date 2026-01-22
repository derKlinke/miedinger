#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "${script_dir}/.." && pwd)"
config_dir="${repo_root}/configs"

target_dir=""
force="false"

usage() {
  cat <<'USAGE'
Usage: link-configs.sh [--force] [target-dir]

Creates symlinks for shared formatter configs into target directory.
Defaults to current working directory.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -f|--force)
      force="true"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      if [[ -z "${target_dir}" ]]; then
        target_dir="$1"
        shift
      else
        echo "error: unexpected argument: $1" >&2
        usage
        exit 1
      fi
      ;;
  esac
done

if [[ -z "${target_dir}" ]]; then
  target_dir="$(pwd)"
fi

target_dir="$(cd "${target_dir}" && pwd)"

if [[ ! -d "${config_dir}" ]]; then
  echo "error: config dir not found: ${config_dir}" >&2
  exit 1
fi

files=(
  .clang-format
  .markdownlint.json
  .markdownlintignore
  .prettierrc.json
  .prettierignore
  .sqlfluff
  .swiftformat
  .swiftlint.yml
)

for file in "${files[@]}"; do
  src="${config_dir}/${file}"
  dst="${target_dir}/${file}"

  if [[ ! -e "${src}" ]]; then
    echo "skip: missing ${src}" >&2
    continue
  fi

  if [[ -L "${dst}" ]]; then
    current="$(readlink "${dst}")"
    if [[ "${current}" == "${src}" ]]; then
      echo "ok: ${dst}"
      continue
    fi
  fi

  if [[ -e "${dst}" ]]; then
    if [[ "${force}" == "true" ]]; then
      rm -f "${dst}"
    else
      echo "skip: exists ${dst} (use --force)" >&2
      continue
    fi
  fi

  ln -s "${src}" "${dst}"
  echo "link: ${dst} -> ${src}"
done
